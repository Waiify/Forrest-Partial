const crypto = require('crypto');
const path = require('path');
const pdfmake = require('pdfmake'); // pdfmake 0.3.x

// ---------- PDF SETUP ----------
// Wrapped in try/catch so a font/pdfmake problem can never crash the whole API
// (a crash is what shows up as "Failed to fetch" on every page).
let pdfReady = false;
try {
  // Fonts ship inside the package (Roboto includes the peso sign).
  pdfmake.addFonts(require('pdfmake/fonts/Roboto'));

  // Security: block remote downloads, and only allow reading files inside the pdfmake package.
  let PKG_DIR;
  try {
    PKG_DIR = path.dirname(require.resolve('pdfmake/package.json'));
  } catch {
    // Fallback: walk up from the main entry file until we find the "pdfmake" folder
    PKG_DIR = path.dirname(require.resolve('pdfmake'));
    while (path.basename(PKG_DIR) !== 'pdfmake' && path.dirname(PKG_DIR) !== PKG_DIR) {
      PKG_DIR = path.dirname(PKG_DIR);
    }
  }
  const FONT_DIR = path.dirname(require.resolve('pdfmake/fonts/Roboto'));

  pdfmake.setUrlAccessPolicy(() => false);
  pdfmake.setLocalAccessPolicy((file) => {
    // Relative font paths are resolved inside the package (not the server's working folder)
    const candidates = [path.resolve(PKG_DIR, file), path.resolve(FONT_DIR, file), path.resolve(file)];
    const ok = candidates.some((full) => full.startsWith(PKG_DIR));
    if (!ok) console.warn('pdfmake blocked file access:', file);
    return ok;
  });
  pdfReady = true;
} catch (err) {
  console.error('PDF setup failed (PDF export will be unavailable):', err);
}

const TYPES = ['Payment', 'Refund', 'Void'];
const METHODS = ['Cash', 'GCash', 'Card', 'Bank Transfer', 'Other'];
const MAX_EXPORT_ROWS = 5000;
const API_PREFIXES = ['/api/reports', '/api/transactions'];

module.exports = function registerTransactions(app, { mongoose, User, Capsule, Reservation, requireAdmin, getSettings }) {
  // ---------- MODELS ----------
  const transactionSchema = new mongoose.Schema({
    transactionNo: { type: String, required: true, unique: true },
    reservationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Reservation', required: true, index: true },
    customerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Snapshot of the details at the time, so old records never change if a customer/capsule is edited later
    guestName:     { type: String, trim: true },
    guestEmail:    { type: String, trim: true, lowercase: true },
    capsuleId:     { type: String, trim: true },
    capsuleName:   { type: String, trim: true },
    type:          { type: String, enum: TYPES, required: true },
    method:        { type: String, enum: METHODS, default: 'Cash' },
    amount:        { type: Number, required: true, min: 0 }, // always positive; "type" decides the direction
    note:          { type: String, trim: true, default: '' },
    recordedBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }, { timestamps: true });
  transactionSchema.index({ createdAt: -1 });
  transactionSchema.index({ type: 1, createdAt: -1 });
  const Transaction = mongoose.model('Transaction', transactionSchema, 'Transactions');

  // Audit trail: who exported what, and when
  const ExportLog = mongoose.model('TransactionExportLog', new mongoose.Schema({
    exportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    filters:    { type: Object },
    rowCount:   { type: Number },
  }, { timestamps: true }), 'TransactionExportLogs');

  // ---------- HELPERS ----------
  const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const httpError = (status, message) => Object.assign(new Error(message), { status });
  const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const newTransactionNo = () => {
    const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `TXN-${d}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  };

  // Turns ?from&to&type&method&search into a MongoDB filter
  function buildFilter(q) {
    const filter = {};
    const range = {};
    if (q.from) {
      const from = new Date(q.from);
      if (Number.isNaN(from.getTime())) throw httpError(400, 'Invalid "from" date');
      range.$gte = from;
    }
    if (q.to) {
      const to = new Date(q.to);
      if (Number.isNaN(to.getTime())) throw httpError(400, 'Invalid "to" date');
      range.$lte = to;
    }
    if (Object.keys(range).length) filter.createdAt = range;

    if (q.type && q.type !== 'all') {
      if (!TYPES.includes(q.type)) throw httpError(400, 'Invalid type');
      filter.type = q.type;
    }
    if (q.method && q.method !== 'all') {
      if (!METHODS.includes(q.method)) throw httpError(400, 'Invalid method');
      filter.method = q.method;
    }
    const search = typeof q.search === 'string' ? q.search.trim().slice(0, 80) : '';
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      filter.$or = [
        { guestName: rx }, { guestEmail: rx }, { transactionNo: rx },
        { capsuleId: rx }, { capsuleName: rx },
      ];
    }
    return filter;
  }

  async function summarize(filter) {
    const rows = await Transaction.aggregate([
      { $match: filter },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]);
    const by = Object.fromEntries(rows.map((r) => [r._id, r]));
    const payments = round2(by.Payment?.total || 0);
    const refunds = round2(by.Refund?.total || 0);
    const voids = round2(by.Void?.total || 0);
    return {
      payments, refunds, voids,
      net: round2(payments - refunds - voids),
      count: rows.reduce((n, r) => n + r.count, 0),
    };
  }

  const sendError = (res, err, fallback) => {
    if (err.status) return res.status(err.status).json({ message: err.message });
    console.error(err);
    return res.status(500).json({ message: fallback });
  };
  const registerRoute = (method, route, ...handlers) => {
    for (const prefix of API_PREFIXES) {
      app[method](`${prefix}${route}`, ...handlers);
    }
  };

  // ---------- LEDGER WRITER (called by the payment route in index.js) ----------
  // Paid (from Unpaid/Refunded) -> Payment | Paid -> Refunded -> Refund | Paid -> Unpaid -> Void (correction)
  async function recordPaymentChange(reservation, previous, next, adminId, method) {
    let type = null;
    if (next === 'Paid') type = 'Payment';
    else if (previous === 'Paid' && next === 'Refunded') type = 'Refund';
    else if (previous === 'Paid' && next === 'Unpaid') type = 'Void';
    if (!type) return null; // e.g. Unpaid -> Refunded moves no money

    let amount = reservation.totalPrice;
    if (type !== 'Payment') {
      // Refund/void exactly what was actually received, even if the booking was rescheduled since
      const lastPayment = await Transaction.findOne({ reservationId: reservation._id, type: 'Payment' })
        .sort({ createdAt: -1 }).lean();
      if (lastPayment) amount = lastPayment.amount;
    }

    const capsule = await Capsule.findOne({ capsuleId: reservation.capsuleId }).select('capsuleName').lean();
    const recordedBy = adminId && mongoose.Types.ObjectId.isValid(adminId) ? adminId : undefined;

    return Transaction.create({
      transactionNo: newTransactionNo(),
      reservationId: reservation._id,
      customerId: reservation.customerId,
      guestName: reservation.guestName,
      guestEmail: reservation.guestEmail,
      capsuleId: reservation.capsuleId,
      capsuleName: capsule?.capsuleName || reservation.capsuleId,
      type,
      method: METHODS.includes(method) ? method : 'Cash',
      amount: round2(amount),
      note: type === 'Void' ? 'Payment status set back to Unpaid' : '',
      recordedBy,
    });
  }

  // ---------- ROUTES (admin only) ----------
  // GET /api/transactions?page=1&limit=20&from&to&type&method&search
  registerRoute('get', '', requireAdmin, async (req, res) => {
    try {
      const filter = buildFilter(req.query);
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
      const [items, total] = await Promise.all([
        Transaction.find(filter)
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * limit).limit(limit)
          .populate('recordedBy', 'firstName lastName')
          .lean(),
        Transaction.countDocuments(filter),
      ]);
      res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
    } catch (err) {
      sendError(res, err, 'Could not load transactions');
    }
  });

  // GET /api/transactions/summary  (same filters, totals across ALL matching rows, not just one page)
  registerRoute('get', '/summary', requireAdmin, async (req, res) => {
    try {
      res.json(await summarize(buildFilter(req.query)));
    } catch (err) {
      sendError(res, err, 'Could not load summary');
    }
  });

  // GET /api/transactions/export  -> PDF download (same filters)
  registerRoute('get', '/export', requireAdmin, async (req, res) => {
    try {
      // Only blocked when it was explicitly switched off (a missing value counts as ON)
      if ((await getSettings()).pdfExportEnabled === false) {
        throw httpError(403, 'PDF export is currently disabled');
      }
      if (!pdfReady) {
        throw httpError(500, 'PDF engine failed to start. Check the server console for "PDF setup failed".');
      }
      const filter = buildFilter(req.query);
      const count = await Transaction.countDocuments(filter);
      if (count === 0) throw httpError(404, 'No transactions match these filters.');
      if (count > MAX_EXPORT_ROWS) {
        throw httpError(413, `Too many rows (${count}). Narrow the date range to ${MAX_EXPORT_ROWS} or fewer.`);
      }

      const adminId = req.get('x-user-id');
      const [summary, admin] = await Promise.all([
        summarize(filter),
        User.findById(adminId).select('firstName lastName email').lean(),
      ]);
      await ExportLog.create({
        exportedBy: adminId,
        filters: { from: req.query.from, to: req.query.to, type: req.query.type, method: req.query.method, search: req.query.search },
        rowCount: count,
      });

      const rows = await Transaction.find(filter).sort({ createdAt: -1, _id: -1 }).lean();
      const buffer = await buildPdf({ rows, summary, admin, query: req.query });

      const fileDate = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="transactions-${fileDate}.pdf"`);
      res.send(buffer);
    } catch (err) {
      if (res.headersSent) { console.error(err); return res.destroy(); }
      sendError(res, err, 'Could not export transactions');
    }
  });

  // POST /api/transactions/backfill  (run once): creates ledger rows for reservations
  // that were marked Paid/Refunded BEFORE this feature existed. Safe to run again.
  registerRoute('post', '/backfill', requireAdmin, async (req, res) => {
    try {
      const adminId = req.get('x-user-id');
      const reservations = await Reservation.find({ paymentStatus: { $in: ['Paid', 'Refunded'] } }).lean();
      let created = 0;
      for (const r of reservations) {
        if (await Transaction.exists({ reservationId: r._id })) continue;
        const capsule = await Capsule.findOne({ capsuleId: r.capsuleId }).select('capsuleName').lean();
        const base = {
          reservationId: r._id, customerId: r.customerId, guestName: r.guestName, guestEmail: r.guestEmail,
          capsuleId: r.capsuleId, capsuleName: capsule?.capsuleName || r.capsuleId,
          method: 'Cash', amount: round2(r.totalPrice), recordedBy: adminId,
        };
        await Transaction.create({
          ...base, transactionNo: newTransactionNo(), type: 'Payment',
          note: 'Imported from existing reservation', createdAt: r.updatedAt || r.createdAt,
        });
        created += 1;
        if (r.paymentStatus === 'Refunded') {
          await Transaction.create({
            ...base, transactionNo: newTransactionNo(), type: 'Refund',
            note: 'Imported from existing reservation', createdAt: r.updatedAt || new Date(),
          });
          created += 1;
        }
      }
      res.json({ created });
    } catch (err) {
      sendError(res, err, 'Could not import existing payments');
    }
  });

  // ---------- PDF (pdfmake) ----------
  const php = (n) => `₱${Number(n || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const signed = (tx) => `${tx.type === 'Payment' ? '+' : '-'}${php(tx.amount)}`;
  const stamp = (d) => new Date(d).toLocaleString('en-PH', {
    timeZone: 'Asia/Manila', year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  function buildPdf({ rows, summary, admin, query }) {
    const GREEN = '#0B3B2A', MUTED = '#6F8E7F', TEXT = '#315D49';
    const TYPE_COLOR = { Payment: '#0B7A4B', Refund: '#7E3FB5', Void: '#B42318' };

    const filterBits = [];
    if (query.from || query.to) {
      filterBits.push(`Period: ${query.from ? stamp(query.from) : 'start'} to ${query.to ? stamp(query.to) : 'now'}`);
    }
    if (query.type && query.type !== 'all') filterBits.push(`Type: ${query.type}`);
    if (query.method && query.method !== 'all') filterBits.push(`Method: ${query.method}`);
    if (query.search) filterBits.push(`Search: "${String(query.search).slice(0, 80)}"`);
    const adminName = admin ? `${admin.firstName} ${admin.lastName}`.trim() : 'Unknown';

    const stats = [
      ['Payments received', php(summary.payments)],
      ['Refunds', php(summary.refunds)],
      ['Voids', php(summary.voids)],
      ['Net revenue', php(summary.net)],
      ['Transactions', String(summary.count)],
    ];

    const header = ['Transaction no.', 'Date & time', 'Customer', 'Capsule', 'Type', 'Method', 'Note', 'Amount'].map(
      (label) => ({
        text: label, bold: true, fontSize: 8, color: GREEN,
        alignment: label === 'Amount' ? 'right' : 'left',
      })
    );

    const body = [
      header,
      ...rows.map((tx) => [
        { text: tx.transactionNo, fontSize: 8, color: TEXT },
        { text: stamp(tx.createdAt), fontSize: 8, color: TEXT },
        {
          stack: [
            { text: tx.guestName || '-', bold: true, fontSize: 8, color: GREEN },
            { text: tx.guestEmail || '', fontSize: 7, color: MUTED },
          ],
        },
        { text: tx.capsuleName || tx.capsuleId || '-', fontSize: 8, color: TEXT },
        { text: tx.type, bold: true, fontSize: 8, color: TYPE_COLOR[tx.type] },
        { text: tx.method || '-', fontSize: 8, color: TEXT },
        { text: tx.note || '-', fontSize: 7, color: TEXT },
        { text: signed(tx), bold: true, fontSize: 8, color: TYPE_COLOR[tx.type], alignment: 'right' },
      ]),
    ];

    const docDefinition = {
      pageSize: 'A4',
      pageOrientation: 'landscape',
      pageMargins: [36, 36, 36, 48],
      info: { title: 'Financial transactions report', author: 'Forrest co-working space' },
      defaultStyle: { font: 'Roboto', fontSize: 8 },
      content: [
        { text: 'Forrest co-working space', fontSize: 16, bold: true, color: GREEN },
        { text: 'Financial transactions report', fontSize: 11, color: TEXT, margin: [0, 2, 0, 6] },
        { text: `Generated ${stamp(new Date())}  |  Exported by ${adminName}`, fontSize: 8, color: MUTED },
        {
          text: filterBits.length ? filterBits.join('  |  ') : 'Filters: none (all transactions)',
          fontSize: 8, color: MUTED,
        },
        {
          margin: [0, 12, 0, 14],
          table: {
            widths: stats.map(() => '*'),
            body: [
              stats.map(([label, value]) => ({
                stack: [
                  { text: label, fontSize: 8, color: MUTED },
                  { text: value, fontSize: 12, bold: true, color: GREEN, margin: [0, 2, 0, 0] },
                ],
              })),
            ],
          },
          layout: {
            fillColor: () => '#F3F9F5',
            hLineColor: () => '#DCEBE3',
            vLineColor: () => '#DCEBE3',
            paddingLeft: () => 8, paddingRight: () => 8, paddingTop: () => 6, paddingBottom: () => 6,
          },
        },
        {
          table: {
            headerRows: 1, // repeats on every page
            dontBreakRows: true,
            widths: [100, 95, '*', 70, 50, 70, 110, 90],
            body,
          },
          layout: {
            fillColor: (i) => (i === 0 ? '#EAF4EE' : i % 2 === 0 ? '#F9FBFA' : null),
            hLineWidth: () => 0.5,
            vLineWidth: () => 0,
            hLineColor: () => '#E6EFE9',
            paddingTop: () => 5, paddingBottom: () => 5,
          },
        },
      ],
      footer: (currentPage, pageCount) => ({
        margin: [36, 12, 36, 0],
        columns: [
          { text: 'Confidential - for admin use only', color: MUTED, fontSize: 8 },
          { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', color: MUTED, fontSize: 8 },
        ],
      }),
    };

    return pdfmake.createPdf(docDefinition).getBuffer().then((buffer) => Buffer.from(buffer));
  }

  return { Transaction, recordPaymentChange };
};