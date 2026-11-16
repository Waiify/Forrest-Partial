// server/auditLog.js
// Records what each user does and lets them (and admins) read it back.
// Used the same way as Reports.js: registerAuditLog(app, { mongoose, User, requireAdmin })

module.exports = function registerAuditLog(app, { mongoose, User, requireAuditAccess, findTokenUser }) {
  const schema = new mongoose.Schema(
    {
      userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // whose log this is
      actorId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },  // set only when someone else did it (staff/admin)
      action:      { type: String, required: true, trim: true },                          // e.g. 'auth.login', 'reservation.create'
      description: { type: String, default: '' },                                         // readable sentence shown to the user
      entityType:  { type: String },
      entityId:    { type: String },
      metadata:    { type: mongoose.Schema.Types.Mixed },                                 // extra details (admins only)
      ipAddress:   { type: String },
      userAgent:   { type: String },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
  );

  schema.index({ userId: 1, createdAt: -1 });
  schema.index({ action: 1, createdAt: -1 });
  // Optional retention: uncomment to auto-delete logs older than 1 year
  // schema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 });

  // Append-only: block edits and deletes made through Mongoose
  schema.pre('save', function () {
    if (!this.isNew) throw new Error('Audit logs cannot be edited');
  });
  for (const op of ['updateOne', 'updateMany', 'findOneAndUpdate', 'replaceOne',
                    'deleteOne', 'deleteMany', 'findOneAndDelete']) {
    schema.pre(op, function () { throw new Error('Audit logs cannot be changed or deleted'); });
  }

  const AuditLog = mongoose.model('AuditLog', schema, 'AuditLogs');

  const validId = (v) => mongoose.Types.ObjectId.isValid(v);

  // Never store passwords, codes, tokens or secrets, even by accident
  const SENSITIVE = /pass|secret|token|code|key/i;
  function redact(obj) {
    if (Array.isArray(obj)) return obj.map(redact);
    if (!obj || typeof obj !== 'object' || obj instanceof Date) return obj;
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([key]) => !SENSITIVE.test(key))
        .map(([key, value]) => [key, redact(value)])
    );
  }

  function getDevice(userAgent = '') {
    const browser = /Edg\//.test(userAgent) ? 'Edge'
      : /OPR\//.test(userAgent) ? 'Opera'
        : /Firefox\//.test(userAgent) ? 'Firefox'
          : /Chrome\//.test(userAgent) ? 'Chrome'
            : /Safari\//.test(userAgent) ? 'Safari'
              : /curl\//i.test(userAgent) ? 'API client' : 'Unknown browser';
    const os = /Android/i.test(userAgent) ? 'Android'
      : /iPhone|iPad|iPod/i.test(userAgent) ? 'iOS'
        : /Windows/i.test(userAgent) ? 'Windows'
          : /Mac OS X|Macintosh/i.test(userAgent) ? 'macOS'
            : /Linux/i.test(userAgent) ? 'Linux' : 'unknown device';
    return `${browser} on ${os}`;
  }

  // Call this anywhere. It never throws, so a logging problem can't break a request.
  //   userId: whose log this belongs to (defaults to the verified user)
  async function audit(req, { userId, action, description = '', entityType, entityId, metadata } = {}) {
    try {
      const actor = req.authUser?._id ? String(req.authUser._id) : null;
      const owner = userId ? String(userId) : actor;
      if (!owner || !action) return;

      const userAgent = (req.get('user-agent') || '').slice(0, 255);
      await AuditLog.create({
        userId: owner,
        actorId: actor && actor !== owner ? actor : null,
        action,
        description,
        entityType,
        entityId: entityId ? String(entityId) : undefined,
        metadata: redact(metadata),
        ipAddress: req.ip,
        userAgent,
      });
    } catch (err) {
      console.error('Audit log failed:', err.message);
    }
  }

  // The caller must present a valid server-issued login token.
  async function requireUser(req, res, next) {
    try {
      const user = req.authUser || await findTokenUser(req);
      if (!user) return res.status(401).json({ message: 'Login required' });
      req.authUser = user;
      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }

  // Filter groups used by the page (fixed list, so nothing from the browser goes into a regex)
  const CATEGORIES = {
    auth:        '^auth\\.',
    profile:     '^profile\\.',
    reservation: '^reservation\\.',
    payment:     '^payment\\.',
    admin:       '^(settings|staff|user)\\.',
  };

  function pageParams(req, base) {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const filter = { ...base };
    const pattern = CATEGORIES[req.query.category];
    if (pattern) filter.$and = [...(filter.$and || []), { action: { $regex: pattern } }];
    return { page, limit, filter };
  }

  function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  const ACTION_LABELS = {
    'auth.login': 'Logged in',
    'auth.logout': 'Logged out',
    'auth.login_failed': 'Failed login attempt',
    'auth.login_blocked': 'Login blocked',
    'auth.signup': 'Created account',
    'auth.password_changed': 'Changed password',
    'profile.update': 'Updated profile',
    'reservation.create': 'Created reservation',
    'reservation.reschedule': 'Rescheduled reservation',
    'reservation.status': 'Changed reservation status',
    'reservation.checkin': 'Checked in to reservation',
    'payment.paid': 'Marked payment paid',
    'payment.refunded': 'Marked payment refunded',
    'payment.unpaid': 'Marked payment unpaid',
    'staff.create': 'Created staff account',
    'staff.status': 'Changed staff account status',
    'user.create': 'Created user account',
    'user.access_updated': 'Updated user access',
    'settings.update': 'Updated settings',
    'capsule.create': 'Created capsule',
    'capsule.update': 'Updated capsule',
    'capsule.archive': 'Archived capsule',
    'capsule.restore': 'Restored capsule',
  };

  function activitySearchConditions(search, matchingUsers = null) {
    return search.split(/\s+/).filter(Boolean).map((term) => {
      const regex = new RegExp(escapeRegex(term), 'i');
      const matchingActions = Object.entries(ACTION_LABELS)
        .filter(([action, label]) => regex.test(`${action} ${label}`))
        .map(([action]) => action);
      return {
        $or: [
          { action: regex },
          ...(matchingActions.length ? [{ action: { $in: matchingActions } }] : []),
          { description: regex },
          { entityType: regex },
          { userAgent: regex },
          ...(matchingUsers ? [
            { userId: { $in: matchingUsers } },
            { actorId: { $in: matchingUsers } },
          ] : []),
        ],
      };
    });
  }

  // GET: the logged-in user's own activity (any role: customer, staff or admin)
  // Includes (1) things that happened to their account and (2) things they did for others,
  // e.g. a staff member confirming a customer's booking.
  // Usage: /api/audit-logs/mine?page=1&limit=50&category=auth   (send a Bearer login token)
  app.get('/api/audit-logs/mine', requireUser, async (req, res) => {
    try {
      const me = String(req.authUser._id);
      const isCustomer = req.authUser.role === 'customer';
      const visibleActions = /^(auth|profile|reservation|payment)\./;
      const base = isCustomer
        ? { userId: me, action: { $regex: visibleActions } }
        : {
          $or: [{ userId: me }, { actorId: me }],
          action: { $regex: visibleActions },
        };
      const { page, limit, filter } = pageParams(req, base);
      const search = String(req.query.search || '').trim().slice(0, 100);
      if (search) {
        filter.$and = [...(filter.$and || []), ...activitySearchConditions(search)];
      }
      const sortDirection = req.query.sort === 'asc' ? 1 : -1;
      const [items, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ createdAt: sortDirection, _id: sortDirection })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        AuditLog.countDocuments(filter),
      ]);
      res.json({
        items: items.map((item) => {
          const ownerId = String(item.userId);
          const actor = item.actorId ? String(item.actorId) : null;
          return {
            _id: item._id,
            action: item.action,
            description: item.description,
            entityType: item.entityType,
            createdAt: item.createdAt,
            device: getDevice(item.userAgent),
            byOther: Boolean(actor) && ownerId === me,
            forOthers: Boolean(actor) && actor === me && ownerId !== me,
          };
        }),
        total,
        page,
        pages: Math.max(Math.ceil(total / limit), 1),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Could not load your activity' });
    }
  });

  // GET: all activity, including the admin's own (admin or explicitly authorized staff)
  // Optional filters: &userId=<id>  or  &role=customer|staff|admin
  app.get('/api/audit-logs', requireAuditAccess, async (req, res) => {
    try {
      const base = {};
      if (validId(req.query.userId)) {
        base.userId = req.query.userId;
      } else if (['customer', 'staff', 'admin'].includes(req.query.role)) {
        base.userId = { $in: await User.find({ role: req.query.role }).distinct('_id') };
      }
      const { page, limit, filter } = pageParams(req, base);
      const search = String(req.query.search || '').trim().slice(0, 100);
      if (search) {
        const searchTerms = search.split(/\s+/).filter(Boolean);
        const matchingUsers = await User.find({
          $and: searchTerms.map((term) => {
            const regex = new RegExp(escapeRegex(term), 'i');
            return {
              $or: [
                { firstName: regex },
                { lastName: regex },
                { email: regex },
                { role: regex },
              ],
            };
          }),
        }).distinct('_id');
        filter.$and = [
          ...(filter.$and || []),
          ...activitySearchConditions(search, matchingUsers),
        ];
      }
      const sortDirection = req.query.sort === 'asc' ? 1 : -1;
      const [items, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ createdAt: sortDirection, _id: sortDirection })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('userId', 'firstName lastName email role')
          .populate('actorId', 'firstName lastName email role')
          .lean(),
        AuditLog.countDocuments(filter),
      ]);
      res.json({
        items: items.map((item) => {
          const { userAgent, ipAddress, ...rest } = item;
          return { ...rest, device: getDevice(userAgent) };
        }),
        total,
        page,
        pages: Math.max(Math.ceil(total / limit), 1),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Could not load audit logs' });
    }
  });

  return { audit, AuditLog };
};