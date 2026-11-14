const fetch = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const fs = require('fs');
const registerTransactions = require('./Reports');

// Which credentials are in use. Custom values (saved from the Admin Settings page) are kept
// next to the originals in .env, and the admin can switch between the two at any time.
function hasCustomEmail() {
  return Boolean(process.env.CUSTOM_EMAIL_USER || process.env.CUSTOM_EMAIL_PASS);
}
function usingCustomEmail() {
  return hasCustomEmail() && process.env.EMAIL_SOURCE !== 'original';
}
function getMailAuth() {
  if (usingCustomEmail()) {
    return {
      user: process.env.CUSTOM_EMAIL_USER || process.env.EMAIL_USER,
      pass: process.env.CUSTOM_EMAIL_PASS || process.env.EMAIL_PASS,
    };
  }
  return { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS };
}

function hasCustomCaptcha() {
  return Boolean(process.env.CUSTOM_RECAPTCHA_SECRET);
}
function usingCustomCaptcha() {
  return hasCustomCaptcha() && process.env.RECAPTCHA_SOURCE !== 'original';
}
function getRecaptchaSecret() {
  return usingCustomCaptcha() ? process.env.CUSTOM_RECAPTCHA_SECRET : process.env.RECAPTCHA_SECRET;
}

// Created on every send, so changes apply without restarting the server
function createTransporter() {
  return nodemailer.createTransport({ service: 'gmail', auth: getMailAuth() });
}

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

// PUT: update customer profile
app.put('/api/users/:id', async (req, res) => {

  try {
    const { firstName, lastName, username } = req.body;

    // Basic validation
    if (!firstName || !lastName || !username) {
      return res.status(400).json({
        message: 'First name, last name, and username are required',
      });
    }

    // Check if another user is already using the username
    const existingUsername = await User.findOne({
      username: username.trim(),
      _id: { $ne: req.params.id },
    });

    if (existingUsername) {
      return res.status(409).json({
        message: 'Username already in use',
      });
    }

    // Update customer
    const user = await User.findOneAndUpdate(
      {
        _id: req.params.id,
        role: 'customer',
      },
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
      },
      {
        new: true,
        runValidators: true,
      }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'Customer not found',
      });
    }

    res.json({
      message: 'Profile updated successfully',
      user,
    });

  } catch (err) {
    console.error('Profile update error:', err);

    if (err.code === 11000) {
      return res.status(409).json({
        message: 'Username already in use',
      });
    }

    res.status(500).json({
      message: 'Server error',
    });
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
  // Payment tracking (monitored on the admin Reservation page)
  paymentStatus: { type: String, enum: ['Unpaid', 'Paid', 'Refunded'], default: 'Unpaid' },
}, { timestamps: true }), 'Reservations');

// TRANSACTIONS (admin Transactions page: finance ledger in its own "Transactions" collection)
// requireAdmin is defined further down; function declarations are hoisted, so this is safe.
const { recordPaymentChange } = registerTransactions(app, {
  mongoose, User, Capsule, Reservation, requireAdmin, getSettings,
});

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

// GET: one customer's own reservations (customer "My Reservations" page)
// Usage: /api/reservations/mine?customerId=<user id>
app.get('/api/reservations/mine', async (req, res) => {
  try {
    const { customerId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: 'A valid customerId is required' });
    }
    const reservations = await Reservation.find({ customerId }).sort({ startAt: 1 }).lean();
    res.json(reservations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load your reservations' });
  }
});

// GET: which capsules are booked and when (customer "Capsule Availability" page)
// Public on purpose, so it returns no customer details, only the capsule and the time range.
// Usage: /api/availability?from=<ISO date>&to=<ISO date>
app.get('/api/availability', async (req, res) => {
  try {
    const from = new Date(req.query.from);
    const to = new Date(req.query.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return res.status(400).json({ message: 'from and to must be valid dates' });
    }
    const bookings = await Reservation.find({
      status: { $in: ['Pending', 'Confirmed', 'Checked in'] },
      startAt: { $lt: to },
      endAt: { $gt: from },
    }).select('capsuleId startAt endAt -_id').lean();
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load availability' });
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

// PATCH: change a reservation's status and/or reschedule it (new startAt and/or durationHours)
app.patch('/api/reservations/:id', async (req, res) => {
  try {
    const { status, startAt, durationHours } = req.body;
    const allowedStatuses = ['Pending', 'Confirmed', 'Checked in', 'Completed', 'Cancelled'];
    const activeStatuses = ['Pending', 'Confirmed', 'Checked in'];
    const rescheduling = startAt !== undefined || durationHours !== undefined;

    if (status !== undefined && !allowedStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid reservation status' });
    }
    if (status === undefined && !rescheduling) {
      return res.status(400).json({ message: 'Nothing to update' });
    }

    const reservation = await Reservation.findById(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Reservation not found' });

    const nextStatus = status ?? reservation.status;
    let nextStart = reservation.startAt;
    let nextEnd = reservation.endAt;
    let nextHours = reservation.durationHours;

    if (rescheduling) {
      if (!['Pending', 'Confirmed'].includes(reservation.status)) {
        return res.status(409).json({ message: 'Only pending or confirmed reservations can be rescheduled.' });
      }

      nextStart = startAt !== undefined ? new Date(startAt) : reservation.startAt;
      nextHours = durationHours !== undefined ? Number(durationHours) : reservation.durationHours;

      if (
        Number.isNaN(nextStart.getTime()) ||
        !Number.isFinite(nextHours) ||
        nextHours < 0.5 ||
        nextHours > 24
      ) {
        return res.status(400).json({ message: 'Enter a valid start time and a duration from 0.5 to 24 hours.' });
      }
      if (nextStart < new Date()) {
        return res.status(400).json({ message: "The new start time can't be in the past." });
      }

      nextEnd = new Date(nextStart.getTime() + nextHours * 60 * 60 * 1000);
    }

    // The capsule must be free during the (new) time
    if (activeStatuses.includes(nextStatus)) {
      const conflict = await Reservation.exists({
        _id: { $ne: reservation._id },
        capsuleId: reservation.capsuleId,
        status: { $nin: ['Cancelled', 'Completed'] },
        startAt: { $lt: nextEnd },
        endAt: { $gt: nextStart },
      });
      if (conflict) {
        return res.status(409).json({ message: 'This capsule already has a reservation during that time.' });
      }
    }

    reservation.status = nextStatus;
    if (rescheduling) {
      reservation.startAt = nextStart;
      reservation.endAt = nextEnd;
      reservation.durationHours = nextHours;
      reservation.totalPrice = Number((reservation.pricePerHour * nextHours).toFixed(2));
    }
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

// PATCH: update payment status
// Also writes a row to the Transactions collection (Payment / Refund / Void) when money moves.
app.patch('/api/reservations/:id/payment', async (req, res) => {
  try {
    const { paymentStatus, method } = req.body;
    if (!['Unpaid', 'Paid', 'Refunded'].includes(paymentStatus)) {
      return res.status(400).json({ message: 'Invalid payment status' });
    }

    const existing = await Reservation.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Reservation not found' });

    const previous = existing.paymentStatus || 'Unpaid';
    // Only update if the status is still what we just read (stops double clicks from recording twice).
    // Older documents may have no paymentStatus at all, which counts as Unpaid.
    const match = previous === 'Unpaid' ? { $in: ['Unpaid', null] } : previous;
    const reservation = await Reservation.findOneAndUpdate(
      { _id: existing._id, paymentStatus: match },
      { paymentStatus },
      { returnDocument: 'after', runValidators: true }
    );
    if (!reservation) {
      return res.status(409).json({ message: 'The payment was changed already. Refresh and try again.' });
    }

    if (previous !== paymentStatus) {
      try {
        await recordPaymentChange(reservation, previous, paymentStatus, req.get('x-user-id'), method);
      } catch (ledgerErr) {
        // The payment status is saved; log the problem so the missing ledger row can be fixed
        console.error('Could not record transaction for reservation', reservation._id, ledgerErr);
      }
    }

    res.json(reservation);
  } catch (err) {
    if (err.name === 'ValidationError' || err.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid reservation' });
    }
    console.error(err);
    res.status(500).json({ message: 'Could not update payment' });
  }
});

// SETTINGS (admin Settings page: turn integrations on or off)
// FIX: added 'googleMapsEnabled' and 'pdfExportEnabled' (the Settings and Reports pages depend on them)
const SETTING_KEYS = ['googleAuthEnabled', 'recaptchaEnabled', 'emailEnabled', 'smsEnabled', 'googleMapsEnabled', 'pdfExportEnabled'];

const Settings = mongoose.model('Settings', new mongoose.Schema({
  key:               { type: String, default: 'app', unique: true },
  googleAuthEnabled: { type: Boolean, default: true },
  recaptchaEnabled:  { type: Boolean, default: true },
  emailEnabled:      { type: Boolean, default: true },
  smsEnabled:        { type: Boolean, default: true },
  googleMapsEnabled: { type: Boolean, default: true },
  pdfExportEnabled:  { type: Boolean, default: true },
}, { timestamps: true }), 'Settings');

// A missing value (older settings document) counts as ON
const pickSettings = (doc) => Object.fromEntries(SETTING_KEYS.map((k) => [k, doc[k] !== false]));

// Returns the settings, creating the document with defaults the first time.
// If the database call fails, everything counts as ON so security is never weakened by an error.
async function getSettings() {
  try {
    return await Settings.findOneAndUpdate(
      { key: 'app' },
      { $setOnInsert: { key: 'app' } },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  } catch (err) {
    console.error('Could not load settings:', err);
    return Object.fromEntries(SETTING_KEYS.map((k) => [k, true]));
  }
}

// Only a real, enabled admin account may change settings.
// The admin page sends the logged-in user's id in the x-user-id header.
async function requireAdmin(req, res, next) {
  try {
    const id = req.get('x-user-id');
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(401).json({ message: 'Admin login required' });
    }
    const admin = await User.findOne({ _id: id, role: 'admin', status: { $ne: 'disabled' } }).select('_id');
    if (!admin) return res.status(403).json({ message: 'Admin access only' });
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

// Checks the admin code sent in the request body (constant-time comparison)
function verifyAdminCode(req, res, next) {
  const expected = process.env.ADMIN_CODE;
  if (!expected) return res.status(500).json({ message: 'Admin code verification is not configured' });
  const provided = typeof req.body?.adminCode === 'string' ? Buffer.from(req.body.adminCode) : Buffer.alloc(0);
  const expectedBuf = Buffer.from(expected);
  if (provided.length !== expectedBuf.length || !crypto.timingSafeEqual(provided, expectedBuf)) {
    return res.status(401).json({ message: 'Invalid admin code' });
  }
  next();
}

// GET: public, so the login and signup pages can hide turned-off options
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json(pickSettings(settings));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load settings' });
  }
});

// PATCH: admin only
app.patch('/api/settings', requireAdmin, verifyAdminCode, async (req, res) => {
  try {
    const update = {};
    for (const key of SETTING_KEYS) {
      if (req.body[key] === undefined) continue;
      if (typeof req.body[key] !== 'boolean') {
        return res.status(400).json({ message: `${key} must be true or false` });
      }
      update[key] = req.body[key];
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'Nothing to update' });
    }
    const settings = await Settings.findOneAndUpdate(
      { key: 'app' },
      { $set: update },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    res.json(pickSettings(settings));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update settings' });
  }
});

// EMAIL CREDENTIALS (admin Settings page)
// Originals (EMAIL_USER / EMAIL_PASS) are never touched; edits go to CUSTOM_EMAIL_USER / CUSTOM_EMAIL_PASS.
const ENV_PATH = __dirname + '/.env';

function quoteEnv(value) {
  const v = String(value);
  if (/[\r\n]/.test(v)) throw new Error('Value cannot contain line breaks');
  for (const q of ['"', "'", '`']) if (!v.includes(q)) return q + v + q;
  throw new Error('Value cannot contain all three quote types');
}

function readEnvLines() {
  try { return fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/); } catch { return []; }
}

function setEnvVar(key, value) {
  const lines = readEnvLines().filter((l) => !l.startsWith(key + '='));
  lines.push(`${key}=${quoteEnv(value)}`);
  fs.writeFileSync(ENV_PATH, lines.join('\n').replace(/\n*$/, '\n'));
  process.env[key] = String(value);
}

function removeEnvVar(key) {
  const lines = readEnvLines().filter((l) => !l.startsWith(key + '='));
  fs.writeFileSync(ENV_PATH, lines.join('\n').replace(/\n*$/, '\n'));
  delete process.env[key];
}

function credentialsPayload() {
  const mail = getMailAuth();
  return {
    user: mail.user || '',
    source: usingCustomEmail() ? 'custom' : 'original',
    hasCustom: hasCustomEmail(),
    passSet: Boolean(mail.pass),
    recaptcha: {
      source: usingCustomCaptcha() ? 'custom' : 'original',
      hasCustom: hasCustomCaptcha(),
      secretSet: Boolean(getRecaptchaSecret()),
    },
  };
}

// GET: what is currently in effect (passwords and secret keys are not included)
app.get('/api/settings/credentials', requireAdmin, (req, res) => {
  res.json(credentialsPayload());
});

// GET: show one secret on demand (the admin presses "Show" on the page)
app.get('/api/settings/credentials/reveal', requireAdmin, (req, res) => {
  res.set('Cache-Control', 'no-store');
  const field = req.query.field;
  if (field === 'emailPass') return res.json({ value: getMailAuth().pass || '' });
  if (field === 'recaptchaSecret') return res.json({ value: getRecaptchaSecret() || '' });
  res.status(400).json({ message: 'Unknown field' });
});

// PUT: switch between the original (.env) and the saved custom credentials. No admin code needed.
app.put('/api/settings/credentials/source', requireAdmin, (req, res) => {
  try {
    const { target, source } = req.body || {};
    if (!['original', 'custom'].includes(source)) {
      return res.status(400).json({ message: 'source must be "original" or "custom"' });
    }
    if (target === 'email') {
      if (source === 'custom' && !hasCustomEmail()) {
        return res.status(400).json({ message: 'No custom email credentials saved yet' });
      }
      setEnvVar('EMAIL_SOURCE', source);
    } else if (target === 'recaptcha') {
      if (source === 'custom' && !hasCustomCaptcha()) {
        return res.status(400).json({ message: 'No custom reCAPTCHA secret saved yet' });
      }
      setEnvVar('RECAPTCHA_SOURCE', source);
    } else {
      return res.status(400).json({ message: 'Unknown target' });
    }
    res.json(credentialsPayload());
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not switch credentials' });
  }
});

// PATCH: save custom values (admin code required). Saving also switches to the custom values.
app.patch('/api/settings/credentials', requireAdmin, verifyAdminCode, (req, res) => {
  try {
    const str = (v) => (typeof v === 'string' ? v.trim() : '');
    const newUser = str(req.body.CUSTOM_EMAIL_USER);
    const newPass = typeof req.body.CUSTOM_EMAIL_PASS === 'string' ? req.body.CUSTOM_EMAIL_PASS : '';
    const newCaptcha = str(req.body.CUSTOM_RECAPTCHA_SECRET);

    const mail = getMailAuth();
    const userChanged = Boolean(newUser) && newUser !== mail.user;
    const passChanged = Boolean(newPass) && newPass !== mail.pass;
    const captchaChanged = Boolean(newCaptcha) && newCaptcha !== getRecaptchaSecret();

    if (!userChanged && !passChanged && !captchaChanged) {
      return res.status(400).json({ message: 'Nothing to update' });
    }
    if (userChanged && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser)) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }

    if (userChanged || passChanged) {
      // The custom set is always saved as a full pair (email + password)
      setEnvVar('CUSTOM_EMAIL_USER', userChanged ? newUser : (process.env.CUSTOM_EMAIL_USER || mail.user));
      setEnvVar('CUSTOM_EMAIL_PASS', passChanged ? newPass : (process.env.CUSTOM_EMAIL_PASS || mail.pass));
      setEnvVar('EMAIL_SOURCE', 'custom');
    }
    if (captchaChanged) {
      setEnvVar('CUSTOM_RECAPTCHA_SECRET', newCaptcha);
      setEnvVar('RECAPTCHA_SOURCE', 'custom');
    }

    res.json(credentialsPayload());
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Could not save credentials' });
  }
});

// DELETE: remove the saved custom values for good (body.which: "email" | "recaptcha", otherwise both)
app.delete('/api/settings/credentials', requireAdmin, verifyAdminCode, (req, res) => {
  try {
    const which = req.body?.which;
    if (which !== 'recaptcha') {
      ['CUSTOM_EMAIL_USER', 'CUSTOM_EMAIL_PASS', 'EMAIL_SOURCE'].forEach(removeEnvVar);
    }
    if (which !== 'email') {
      ['CUSTOM_RECAPTCHA_SECRET', 'RECAPTCHA_SOURCE'].forEach(removeEnvVar);
    }
    res.json(credentialsPayload());
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not reset credentials' });
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
  if (!(await getSettings()).recaptchaEnabled) return res.json({ success: true, skipped: true });
  if (!token) return res.status(400).json({ success: false });

  try {
    const params = new URLSearchParams({
      secret: getRecaptchaSecret(),
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
    if (!(await getSettings()).googleAuthEnabled) {
      return res.status(403).json({ message: 'Google sign-in is currently disabled' });
    }
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

    if (!(await getSettings()).emailEnabled) {
      return res.status(503).json({ message: 'Password reset by email is currently unavailable.' });
    }

    if (!user || !user.password) return res.json(genericReply);

    const code = String(crypto.randomInt(100000, 1000000));
    user.resetCodeHash = await bcrypt.hash(code, 10);
    user.resetCodeExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.resetAttempts = 0;
    user.resetTokenHash = undefined;
    user.resetTokenExpires = undefined;
    await user.save();

    const { user: mailUser } = getMailAuth();
    await createTransporter().sendMail({
      from: `"Forrest" <${mailUser}>`,
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