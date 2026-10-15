const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS exists:", !!process.env.EMAIL_PASS);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

initializeApp({
  credential: cert(require('./serviceAccountKey.json')),
});

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('Connection error:', err));

// USER MODEL
const User = mongoose.model('User', new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  username:  { type: String, required: true, unique: true, trim: true },
  password:  { type: String, required: function () { return !this.googleId; } },
  googleId:  { type: String, unique: true, sparse: true },
  role:      { type: String, enum: ['customer', 'staff', 'admin'], default: 'customer' },
  resetCodeHash:     { type: String },
  resetCodeExpires:  { type: Date },
  resetAttempts:     { type: Number, default: 0 },
  resetTokenHash:    { type: String },
  resetTokenExpires: { type: Date },

  // Disable / Enable sa Management page
  status:    { type: String, enum: ['active', 'disabled'], default: 'active' },
}, { timestamps: true }), 'Users');


// CUSTOMERS (para sa Customers page)
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'customer' })
      .select('firstName lastName email username createdAt')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


// STAFF (para sa Management page)

const toStaff = (u) => ({
  _id: u._id,
  name: `${u.firstName} ${u.lastName}`.trim(),
  email: u.email,
  status: u.status || 'active',
  createdAt: u.createdAt,
});

// GET: staff accounts ra (role = staff)
app.get('/api/staff', async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff' }).sort({ createdAt: -1 });
    res.json(staff.map(toStaff));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST: maghimo og bag-ong staff account
app.post('/api/staff', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password || password.length < 8) {
      return res.status(400).json({ message: 'Name, email and an 8+ character password are required' });
    }

    const lowerEmail = email.toLowerCase();
    if (await User.findOne({ email: lowerEmail })) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    // Bahinon ang full name: first name ug last name
    const [firstName, ...rest] = name.trim().split(' ');

    // Maghimo og unique username gikan sa email
    const base = lowerEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || 'staff';
    let username = base, n = 0;
    while (await User.exists({ username })) username = base + (++n);

    const user = await User.create({
      firstName,
      lastName: rest.join(' ') || '-',
      email: lowerEmail,
      username,
      password: await bcrypt.hash(password, 10),
      role: 'staff',      // server ang mo-set, dili ang browser
      status: 'active',
    });

    res.status(201).json(toStaff(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH: i-disable o i-enable ang staff (staff accounts ra)
app.patch('/api/staff/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'disabled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'staff' },
      { status },
      { returnDocument: 'after' }
    );
    if (!user) return res.status(404).json({ message: 'Not found' });
    res.json(toStaff(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// CAPSULES (para sa Capsule Management page)
const Capsule = mongoose.model('Capsule', new mongoose.Schema({
  capsuleId:    { type: String, required: true, unique: true, trim: true },
  capsuleName:  { type: String, required: true, trim: true },
  room:         { type: String, default: 'Room 1' },
  type:         { type: String, enum: ['Standard', 'Premium'], default: 'Standard' },
  pricePerHour: { type: Number, required: true, min: 0 },
  status: {
  type: String,
  enum: ['Available', 'Reserved', 'Occupied', 'Coming Soon', 'Under Maintenance'],
  default: 'Available',
},
  isArchived:   { type: Boolean, default: false },
}, { timestamps: true }), 'Capsules');

const Reservation = mongoose.model('Reservation', new mongoose.Schema({
  customerId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  guestName:     { type: String, required: true, trim: true },
  guestEmail:    { type: String, required: true, trim: true, lowercase: true },
  capsuleId:     { type: String, required: true, trim: true },
  startAt:       { type: Date, required: true },
  endAt:         { type: Date, required: true },
  durationHours: { type: Number, required: true, min: 0.5, max: 24 },
  pricePerHour:  { type: Number, required: true, min: 0 },
  totalPrice:    { type: Number, required: true, min: 0 },
  status:        {
    type: String,
    enum: ['Pending', 'Confirmed', 'Checked in', 'Completed', 'Cancelled'],
    default: 'Pending',
  },
}, { timestamps: true }), 'Reservations');

// GET: ?archived=true|false
app.get('/api/capsules', async (req, res) => {
  try {
    const archived = req.query.archived === 'true';
    const filter = archived ? { isArchived: true } : { isArchived: { $ne: true } };
    const capsules = await Capsule.find(filter).sort({ capsuleId: 1 });
    res.json(capsules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load capsules' });
  }
});

app.get('/api/reservations', async (req, res) => {
  try {
    const reservations = await Reservation.find().sort({ startAt: 1, createdAt: -1 }).lean();
    res.json(reservations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load reservations' });
  }
});

app.post('/api/reservations', async (req, res) => {
  try {
    const { customerId, capsuleId, startAt, durationHours, status } = req.body;
    const hours = Number(durationHours);
    const start = new Date(startAt);
    const end = new Date(start.getTime() + hours * 60 * 60 * 1000);

    if (
      !mongoose.Types.ObjectId.isValid(customerId) ||
      !capsuleId ||
      Number.isNaN(start.getTime()) ||
      !Number.isFinite(hours) ||
      hours < 0.5 ||
      hours > 24 ||
      !['Pending', 'Confirmed'].includes(status || 'Pending')
    ) {
      return res.status(400).json({ message: 'Enter a customer, capsule, valid start time, and duration from 0.5 to 24 hours.' });
    }

    const customer = await User.findOne({ _id: customerId, role: 'customer', status: { $ne: 'disabled' } })
      .select('firstName lastName email');
    if (!customer) return res.status(404).json({ message: 'Customer not found or disabled' });

    const capsule = await Capsule.findOne({
      capsuleId: capsuleId.trim(),
      isArchived: { $ne: true },
      status: { $in: ['Available', 'Reserved'] },
    }).select('capsuleId pricePerHour');
    if (!capsule) return res.status(409).json({ message: 'This capsule is unavailable for reservations' });

    const conflict = await Reservation.exists({
      capsuleId: capsule.capsuleId,
      status: { $nin: ['Cancelled', 'Completed'] },
      startAt: { $lt: end },
      endAt: { $gt: start },
    });
    if (conflict) return res.status(409).json({ message: 'This capsule already has a reservation during that time.' });

    const reservation = await Reservation.create({
      customerId: customer._id,
      guestName: `${customer.firstName} ${customer.lastName}`.trim(),
      guestEmail: customer.email,
      capsuleId: capsule.capsuleId,
      startAt: start,
      endAt: end,
      durationHours: hours,
      pricePerHour: capsule.pricePerHour,
      totalPrice: Number((capsule.pricePerHour * hours).toFixed(2)),
      status: status || 'Pending',
    });

    res.status(201).json(reservation);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    console.error(err);
    res.status(500).json({ message: 'Could not create reservation' });
  }
});

app.patch('/api/reservations/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const allowedStatuses = ['Pending', 'Confirmed', 'Checked in', 'Completed', 'Cancelled'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid reservation status' });
    }

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

    if (['Pending', 'Confirmed', 'Checked in'].includes(status)) {
      const conflict = await Reservation.exists({
        _id: { $ne: reservation._id },
        capsuleId: reservation.capsuleId,
        status: { $nin: ['Cancelled', 'Completed'] },
        startAt: { $lt: reservation.endAt },
        endAt: { $gt: reservation.startAt },
      });
      if (conflict) {
        return res.status(409).json({ message: 'This capsule already has a reservation during that time.' });
      }
    }

    reservation.status = status;
    await reservation.save();
    res.json(reservation);
  } catch (err) {
    if (err.name === 'ValidationError' || err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid reservation' });
    }
    console.error(err);
    res.status(500).json({ message: 'Could not update reservation' });
  }
});

// POST: maghimo og bag-ong capsule
app.post('/api/capsules', async (req, res) => {
  try {
    const { capsuleId, capsuleName, room, type, pricePerHour, status } = req.body;
    if (!capsuleId || !capsuleName || pricePerHour == null) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    if (await Capsule.exists({ capsuleId: capsuleId.trim() })) {
      return res.status(409).json({ message: 'That Capsule ID already exists' });
    }
    const capsule = await Capsule.create({
      capsuleId, capsuleName, room, type, pricePerHour: Number(pricePerHour), status,
    });
    res.status(201).json(capsule);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    console.error(err);
    res.status(500).json({ message: 'Could not create capsule' });
  }
});

// PUT: i-edit ang capsule
app.put('/api/capsules/:id', async (req, res) => {
  try {
    const { capsuleName, room, type, pricePerHour, status } = req.body;
    const capsule = await Capsule.findOneAndUpdate(
      { capsuleId: req.params.id },
      { capsuleName, room, type, pricePerHour: Number(pricePerHour), status },
      { returnDocument: 'after', runValidators: true }
    );
    if (!capsule) return res.status(404).json({ message: 'Capsule not found' });
    res.json(capsule);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    console.error(err);
    res.status(500).json({ message: 'Could not update capsule' });
  }
});

// PATCH: archive / restore
async function setArchived(req, res, value) {
  try {
    const capsule = await Capsule.findOneAndUpdate(
      { capsuleId: req.params.id },
      { isArchived: value },
      { returnDocument: 'after' }
    );
    if (!capsule) return res.status(404).json({ message: 'Capsule not found' });
    res.json(capsule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Request failed' });
  }
}
app.patch('/api/capsules/:id/archive', (req, res) => setArchived(req, res, true));
app.patch('/api/capsules/:id/restore', (req, res) => setArchived(req, res, false));


// reCAPTCHA
app.post('/verify-captcha', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ success: false });

  try {
    const params = new URLSearchParams({
      secret: process.env.RECAPTCHA_SECRET,
      response: token,
    });
    const r = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      body: params,
    });
    const data = await r.json();
    res.json({ success: data.success });
  } catch (err) {
    console.error('Captcha error:', err);
    res.status(500).json({ success: false });
  }
});

// AUTH
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, username, password } = req.body;

    if (!email || !password || password.length < 8) {
      return res.status(400).json({ message: 'Email and a password of 8+ characters are required' });
    }

    const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (exists) return res.status(409).json({ message: 'Email or username already in use' });

    const hashed = await bcrypt.hash(password, 10);
    await User.create({ firstName, lastName, email, username, password: hashed });

    res.status(201).json({ message: 'Account created' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// UNIFIED LOGIN: usa ra ka login para sa customer, staff, ug admin
// Ang server ang mo-determine sa role base sa database.
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, adminCode } = req.body;
    const normalizedEmail = (email || '').trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });
    const ok = user && user.password && await bcrypt.compare(password, user.password);

    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

    // Dili makasulod ang disabled nga account
    if (user.status === 'disabled') {
      return res.status(403).json({ message: 'This account has been disabled' });
    }

    const staffEmails = new Set(
      (process.env.STAFF_EMAILS || '')
        .split(',')
        .map((staffEmail) => staffEmail.trim().toLowerCase())
        .filter(Boolean)
    );
    const role = staffEmails.has(normalizedEmail) ? 'staff' : user.role;

    // Admin: kinahanglan pa gihapon ang admin code
    if (role === 'admin') {
      if (!adminCode) return res.json({ requiresAdminCode: true });
      if (adminCode !== process.env.ADMIN_CODE) {
        return res.status(401).json({ message: 'Invalid admin code' });
      }
    }

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/google-sync', async (req, res) => {
  try {
    const decoded = await getAuth().verifyIdToken(req.body.idToken);
    if (!decoded.email_verified) return res.status(401).json({ message: 'Email not verified' });

    const email = decoded.email.toLowerCase();
    let user = await User.findOne({ email });

    if (!user) {
      const base = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || 'user';
      let username = base, n = 0;
      while (await User.exists({ username })) username = base + (++n);

      user = await User.create({
        firstName: decoded.name?.split(' ')[0] || 'User',
        lastName: decoded.name?.split(' ').slice(1).join(' ') || '-',
        email,
        username,
        googleId: decoded.uid,
      });
    } else if (!user.googleId) {
      user.googleId = decoded.uid;
      await user.save();
    }

    // Google sign-in para sa customers ra (staff/admin kinahanglan email + password)
    if (user.role !== 'customer') {
      return res.status(403).json({ message: 'Staff and admin accounts must log in with email and password' });
    }

    // Dili makasulod ang disabled nga account
    if (user.status === 'disabled') {
      return res.status(403).json({ message: 'This account has been disabled' });
    }

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(401).json({ message: 'Google sign-in failed' });
  }
});

// mag send ug 6 digit code sa user's email
app.post('/api/auth/forgot-password', async (req, res) => {
  const genericReply = { message: 'If that email has an account, a code has been sent.' };
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const user = await User.findOne({ email });

    if (!user || !user.password) return res.json(genericReply);

    const code = String(crypto.randomInt(100000, 1000000));
    user.resetCodeHash = await bcrypt.hash(code, 10);
    user.resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.resetAttempts = 0;
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    await transporter.sendMail({
      from: `"Forrest" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Your Forrest password reset code',
      text: `Your verification code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    });

    res.json(genericReply);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not send the code. Please try again.' });
  }
});

// e verify or check ang code nga gi send sa email
app.post('/api/auth/verify-reset-code', async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const code = String(req.body.code || '');
    const user = await User.findOne({ email });

    const invalid = () => res.status(400).json({ message: 'Invalid or expired code' });

    if (!user || !user.resetCodeHash || user.resetCodeExpires < new Date()) return invalid();
    if (user.resetAttempts >= 5) {
      return res.status(429).json({ message: 'Too many attempts. Request a new code.' });
    }

    const ok = await bcrypt.compare(code, user.resetCodeHash);
    if (!ok) {
      user.resetAttempts += 1;
      await user.save();
      return invalid();
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetTokenExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.resetCodeHash = undefined;
    user.resetCodeExpires = undefined;
    await user.save();

    res.json({ resetToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// mag set ug new password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const email = (req.body.email || '').toLowerCase().trim();
    const { resetToken, newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const user = await User.findOne({ email });
    const tokenHash = crypto.createHash('sha256').update(String(resetToken || '')).digest('hex');

    if (!user || !user.resetTokenHash || user.resetTokenExpires < new Date() ||
        user.resetTokenHash !== tokenHash) {
      return res.status(400).json({ message: 'Reset session expired. Please start again.' });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    user.resetAttempts = 0;
    await user.save();

    res.json({ message: 'Password updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

app.listen(process.env.PORT || 5000, () =>
  console.log(`API running on http://localhost:${process.env.PORT || 5000}`)
);