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
const jwt = require('jsonwebtoken');
const fs = require('fs');
const registerTransactions = require('./Reports');
const registerAuditLog = require('./AuditLogs');

const ADMIN_CODE = process.env.ADMIN_CODE || '';

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
if (process.env.JWT_SECRET && Buffer.byteLength(process.env.JWT_SECRET) < 32) {
  throw new Error('JWT_SECRET must be at least 32 bytes');
}
if (!process.env.JWT_SECRET) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be configured in production');
  }
  console.warn('JWT_SECRET is not configured; login tokens will be invalidated when the server restarts.');
}

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

function hasCustomGoogleAuthKey() {
  return Boolean(process.env.CUSTOM_FIREBASE_API_KEY);
}
function usingCustomGoogleAuthKey() {
  return hasCustomGoogleAuthKey() && process.env.FIREBASE_API_KEY_SOURCE !== 'original';
}
function getGoogleAuthApiKey() {
  return usingCustomGoogleAuthKey()
    ? process.env.CUSTOM_FIREBASE_API_KEY
    : require('../src/firebase.config.json').apiKey;
}

// Created on every send, so changes apply without restarting the server
function createTransporter() {
  return nodemailer.createTransport({ service: 'gmail', auth: getMailAuth() });
}

initializeApp({
  credential: cert(require('./serviceAccountKey.json')),
});

const app = express();
const trustedProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
if (!Number.isInteger(trustedProxyHops) || trustedProxyHops < 0) {
  throw new Error('TRUST_PROXY_HOPS must be a non-negative integer');
}
if (trustedProxyHops > 0) app.set('trust proxy', trustedProxyHops);
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
  permissions: { type: mongoose.Schema.Types.Mixed, default: {} },
  resetCodeHash:     { type: String },
  resetCodeExpires:  { type: Date },
  resetAttempts:     { type: Number, default: 0 },
  resetTokenHash:    { type: String },
  resetTokenExpires: { type: Date },

  // Disable / Enable sa Management page
  status:    { type: String, enum: ['active', 'disabled'], default: 'active' },
}, { timestamps: true }), 'Users');

const SettingsOtpChallenge = mongoose.model('SettingsOtpChallenge', new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  codeHash: String,
  recipientId: String,
  expiresAt: Date,
  resendAfter: Date,
  attempts: { type: Number, default: 0 },
  locked: { type: Boolean, default: false },
  proofId: String,
  proofExpiresAt: Date,
  proofConsumedAt: Date,
}, { timestamps: true, collection: 'SettingsOtpChallenges' }));
SettingsOtpChallenge.schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const SettingsUnlockSession = mongoose.model('SettingsUnlockSession', new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenId: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
  revokedAt: Date,
}, { timestamps: true, collection: 'SettingsUnlockSessions' }));

const AdminCodeAttempt = mongoose.model('AdminCodeAttempt', new mongoose.Schema({
  _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  attempts: { type: Number, default: 0 },
  lockedUntil: Date,
}, { timestamps: true, collection: 'AdminCodeAttempts' }));

async function findTokenUser(req) {
  const authorization = req.get('authorization') || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) return null;

  try {
    const payload = jwt.verify(match[1], JWT_SECRET);
    if (!payload || typeof payload !== 'object' || typeof payload.sub !== 'string') return null;
    const user = await User.findOne({
      _id: payload.sub,
      status: { $ne: 'disabled' },
    }).select('_id role firstName lastName email permissions');
    if (!user) return null;
    const staffEmails = new Set(
      (process.env.STAFF_EMAILS || '')
        .split(',')
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    );
    if (staffEmails.has(user.email.toLowerCase())) user.role = 'staff';
    return user;
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') return null;
    throw err;
  }
}

function createLoginToken(user) {
  return jwt.sign({ sub: String(user._id) }, JWT_SECRET, { expiresIn: '7d' });
}

async function requireLogin(req, res, next) {
  try {
    const user = req.authUser || await findTokenUser(req);
    if (!user) return res.status(401).json({ message: 'Login required' });
    req.authUser = user;
    next();
  } catch (err) {
    console.error('Could not verify account:', err);
    res.status(500).json({ message: 'Could not verify account' });
  }
}

function requireStaffOrAdmin(req, res, next) {
  if (!req.authUser) return res.status(401).json({ message: 'Login required' });
  if (!['staff', 'admin'].includes(req.authUser.role)) {
    return res.status(403).json({ message: 'Staff access only' });
  }
  next();
}

const STAFF_PERMISSION_ACTIONS = {
  dashboard: ['view'],
  reservations: ['view', 'create', 'update'],
  spaces: ['view', 'create', 'update', 'delete'],
  customers: ['view'],
  reports: ['view', 'export'],
  auditLogs: ['view'],
};

const LEGACY_STAFF_PERMISSIONS = {
  dashboard: ['view'],
  reservations: ['view', 'create', 'update'],
  spaces: ['view', 'create', 'update', 'delete'],
  customers: ['view'],
};

function hasPermission(user, resource, action) {
  if (user?.role === 'admin') return true;
  if (user?.role !== 'staff') return false;
  const permissions = user.permissions && Object.keys(user.permissions).length
    ? user.permissions
    : LEGACY_STAFF_PERMISSIONS;
  const allowedActions = permissions[resource];
  if (!Array.isArray(allowedActions) || !allowedActions.includes(action)) return false;
  if (resource === 'dashboard' && action === 'view') {
    return Boolean(permissions.reservations?.includes('view') && permissions.spaces?.includes('view'));
  }
  if (resource === 'reservations' && action === 'create') {
    return Boolean(permissions.customers?.includes('view') && permissions.spaces?.includes('view'));
  }
  return action === 'view' || allowedActions.includes('view');
}

function requirePermission(resource, action) {
  return (req, res, next) => {
    const user = req.authUser;
    if (!user) return res.status(401).json({ message: 'Login required' });
    if (!['admin', 'staff'].includes(user.role)) {
      return res.status(403).json({ message: 'Staff access only' });
    }
    if (!hasPermission(user, resource, action)) {
      return res.status(403).json({ message: `You do not have permission to ${action} ${resource}` });
    }
    next();
  };
}

function requireStaffPermission(resource, action) {
  return (req, res, next) => {
    if (req.authUser?.role !== 'staff' || hasPermission(req.authUser, resource, action)) {
      return next();
    }
    return res.status(403).json({ message: `You do not have permission to ${action} ${resource}` });
  };
}

app.use('/api', async (req, res, next) => {
  try {
    req.authUser = await findTokenUser(req);
    next();
  } catch (err) {
    console.error('Could not verify API identity:', err);
    res.status(500).json({ message: 'Could not verify account' });
  }
});

// AUDIT LOG: model, audit() helper, and the endpoints
//   GET /api/audit-logs/mine  -> the logged-in user's own activity
//   GET /api/audit-logs       -> everyone's activity (admin only)
// requireAdmin is defined further down; function declarations are hoisted, so this is safe.
const { audit } = registerAuditLog(app, {
  mongoose,
  User,
  requireAuditAccess: requirePermission('auditLogs', 'view'),
  findTokenUser,
});


// CUSTOMERS (para sa Customers page)
app.get('/api/users', requireLogin, requireStaffOrAdmin, requireStaffPermission('customers', 'view'), async (req, res) => {
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
app.put('/api/users/:id', requireLogin, async (req, res) => {

  try {
    if (req.authUser.role !== 'admin' && String(req.authUser._id) !== req.params.id) {
      return res.status(403).json({ message: 'You can only update your own profile' });
    }
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

    const previousProfile = await User.findById(req.params.id)
      .select('firstName lastName username')
      .lean();

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
    ).select('firstName lastName email username role status createdAt updatedAt');

    if (!user) {
      return res.status(404).json({
        message: 'Customer not found',
      });
    }

    // AUDIT
    const changedFields = [];
    if (previousProfile && `${previousProfile.firstName} ${previousProfile.lastName}` !== `${user.firstName} ${user.lastName}`) {
      changedFields.push('name');
    }
    if (previousProfile?.username !== user.username) changedFields.push('username');
    await audit(req, {
      userId: user._id,
      action: 'profile.update',
      description: `Updated ${changedFields.length ? changedFields.join(' and ') : 'profile'}`,
      metadata: { changedFields },
    });

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
app.get('/api/staff', requireAdmin, async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff' }).sort({ createdAt: -1 });
    res.json(staff.map(toStaff));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST: maghimo og bag-ong staff account
app.post('/api/staff', requireAdmin, async (req, res) => {
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

    // AUDIT
    await audit(req, {
      action: 'staff.create',
      description: `Created staff account ${lowerEmail}`,
      entityType: 'user',
      entityId: user._id,
    });

    res.status(201).json(toStaff(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH: i-disable o i-enable ang staff (staff accounts ra)
app.patch('/api/staff/:id', requireAdmin, async (req, res) => {
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

    // AUDIT
    await audit(req, {
      action: 'staff.status',
      description: `Set staff account ${user.email} to ${status}`,
      entityType: 'user',
      entityId: user._id,
    });

    res.json(toStaff(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

function normalizeStaffPermissions(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Staff permissions must be an object');
  }
  for (const resource of Object.keys(value)) {
    if (!Object.prototype.hasOwnProperty.call(STAFF_PERMISSION_ACTIONS, resource)) {
      throw new Error(`Unknown permission area: ${resource}`);
    }
  }
  return Object.fromEntries(
    Object.entries(STAFF_PERMISSION_ACTIONS).map(([resource, allowedActions]) => {
      const actions = value[resource] ?? [];
      if (!Array.isArray(actions) || actions.some((action) => !allowedActions.includes(action))) {
        throw new Error(`Invalid permissions for ${resource}`);
      }
      return [resource, [...new Set(actions)]];
    })
  );
}

function toManagedUser(user) {
  return {
    _id: user._id,
    name: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    role: user.role,
    status: user.status || 'active',
    permissions: user.role === 'staff' && (!user.permissions || !Object.keys(user.permissions).length)
      ? LEGACY_STAFF_PERMISSIONS
      : user.permissions || {},
    createdAt: user.createdAt,
  };
}

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('firstName lastName email role status permissions createdAt')
      .sort({ createdAt: -1 }).lean();
    res.json(users.map(toManagedUser));
  } catch (err) {
    console.error('Could not load managed users:', err);
    res.status(500).json({ message: 'Could not load users' });
  }
});

app.post('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    let firstName = typeof req.body.firstName === 'string' ? req.body.firstName.trim() : '';
    let lastName = typeof req.body.lastName === 'string' ? req.body.lastName.trim() : '';
    if (!firstName && !lastName && typeof req.body.name === 'string') {
      const [legacyFirstName, ...legacyLastName] = req.body.name.trim().split(/\s+/);
      firstName = legacyFirstName || '';
      lastName = legacyLastName.join(' ') || '-';
    }
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    const role = req.body.role;
    if (!firstName || !lastName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8) {
      return res.status(400).json({ message: 'First name, last name, a valid email, and a password of at least 8 characters are required' });
    }
    if (!['customer', 'staff', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Choose a valid account type' });
    }
    if (await User.exists({ email })) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    const permissions = role === 'staff' ? normalizeStaffPermissions(req.body.permissions) : {};
    const usernameBase = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '') || 'user';
    let username = usernameBase;
    let suffix = 0;
    while (await User.exists({ username })) username = `${usernameBase}${++suffix}`;

    const user = await User.create({
      firstName,
      lastName,
      email,
      username,
      password: await bcrypt.hash(password, 10),
      role,
      permissions,
      status: 'active',
    });
    await audit(req, {
      action: 'user.create',
      description: `Created ${role} account ${email}`,
      entityType: 'user',
      entityId: user._id,
    });
    res.status(201).json(toManagedUser(user));
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Email or username already in use' });
    if (err.message?.startsWith('Staff permissions') || err.message?.startsWith('Unknown permission') || err.message?.startsWith('Invalid permissions')) {
      return res.status(400).json({ message: err.message });
    }
    console.error('Could not create user:', err);
    res.status(500).json({ message: 'Could not create account' });
  }
});

app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const update = {};
    if (req.body.status !== undefined) {
      if (!['active', 'disabled'].includes(req.body.status)) {
        return res.status(400).json({ message: 'Invalid status' });
      }
      if (req.body.status === 'disabled' && String(user._id) === String(req.authUser._id)) {
        return res.status(403).json({ message: 'You cannot disable your own account' });
      }
      if (user.role === 'admin' && req.body.status === 'disabled') {
        const activeAdmins = await User.countDocuments({ role: 'admin', status: { $ne: 'disabled' } });
        if (activeAdmins <= 1) {
          return res.status(409).json({ message: 'The last active admin account cannot be disabled' });
        }
      }
      update.status = req.body.status;
    }
    if (req.body.permissions !== undefined) {
      if (user.role !== 'staff') {
        return res.status(400).json({ message: 'Custom permissions can only be assigned to staff accounts' });
      }
      update.permissions = normalizeStaffPermissions(req.body.permissions);
    }
    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: 'No account changes provided' });
    }
    Object.assign(user, update);
    await user.save();
    await audit(req, {
      action: req.body.permissions !== undefined ? 'user.permissions' : 'user.status',
      description: req.body.permissions !== undefined
        ? `Updated permissions for ${user.email}`
        : `Set account ${user.email} to ${user.status}`,
      entityType: 'user',
      entityId: user._id,
    });
    res.json(toManagedUser(user));
  } catch (err) {
    if (err.message?.startsWith('Staff permissions') || err.message?.startsWith('Unknown permission') || err.message?.startsWith('Invalid permissions')) {
      return res.status(400).json({ message: err.message });
    }
    console.error('Could not update user:', err);
    res.status(500).json({ message: 'Could not update account' });
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
  mongoose,
  User,
  Capsule,
  Reservation,
  requireAdmin,
  requirePermission,
  getSettings,
});

// GET: ?archived=true|false
app.get('/api/capsules', async (req, res) => {
  if (req.authUser?.role === 'staff' && !hasPermission(req.authUser, 'spaces', 'view')) {
    return res.status(403).json({ message: 'You do not have permission to view spaces' });
  }
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

app.get('/api/reservations', requireLogin, requireStaffPermission('reservations', 'view'), async (req, res) => {
  try {
    const filter = req.authUser.role === 'customer' ? { customerId: req.authUser._id } : {};
    const reservations = await Reservation.find(filter).sort({ startAt: 1, createdAt: -1 }).lean();
    res.json(reservations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load reservations' });
  }
});

// GET: one customer's own reservations (customer "My Reservations" page)
// Usage: /api/reservations/mine?customerId=<user id>
app.get('/api/reservations/mine', requireLogin, requireStaffPermission('reservations', 'view'), async (req, res) => {
  try {
    const { customerId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: 'A valid customerId is required' });
    }
    if (req.authUser.role === 'customer' && String(req.authUser._id) !== String(customerId)) {
      return res.status(403).json({ message: 'You can only view your own reservations' });
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

app.post('/api/reservations', requireLogin, requireStaffPermission('reservations', 'create'), async (req, res) => {
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
    if (req.authUser.role === 'customer' && String(req.authUser._id) !== customerId) {
      return res.status(403).json({ message: 'You can only book for your own account' });
    }
    if (req.authUser.role === 'customer' && status && status !== 'Pending') {
      return res.status(403).json({ message: 'Customer bookings must start as pending' });
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

    // AUDIT
    await audit(req, {
      userId: customer._id,
      action: 'reservation.create',
      description: `Booked capsule ${reservation.capsuleId} for ${hours}h`,
      entityType: 'reservation',
      entityId: reservation._id,
      metadata: { startAt: start, durationHours: hours, totalPrice: reservation.totalPrice },
    });

    res.status(201).json(reservation);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    console.error(err);
    res.status(500).json({ message: 'Could not create reservation' });
  }
});

// PATCH: change a reservation's status and/or reschedule it (new startAt and/or durationHours)
app.patch('/api/reservations/:id', requireLogin, requireStaffPermission('reservations', 'update'), async (req, res) => {
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
    const isCustomerOwner = req.authUser.role === 'customer'
      && String(req.authUser._id) === String(reservation.customerId);
    const canManage = ['staff', 'admin'].includes(req.authUser.role);
    if (!isCustomerOwner && !canManage) {
      return res.status(403).json({ message: 'You cannot update this reservation' });
    }
    if (req.authUser.role === 'customer' && status && status !== 'Cancelled') {
      return res.status(403).json({ message: 'Customers may only cancel their reservation' });
    }

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

    const previousStatus = reservation.status; // AUDIT: remember the old status
    reservation.status = nextStatus;
    if (rescheduling) {
      reservation.startAt = nextStart;
      reservation.endAt = nextEnd;
      reservation.durationHours = nextHours;
      reservation.totalPrice = Number((reservation.pricePerHour * nextHours).toFixed(2));
    }
    await reservation.save();

    // AUDIT (logged under the customer who owns the reservation)
    if (rescheduling) {
      await audit(req, {
        userId: reservation.customerId,
        action: 'reservation.reschedule',
        description: `Rescheduled reservation for capsule ${reservation.capsuleId}`,
        entityType: 'reservation',
        entityId: reservation._id,
        metadata: { startAt: nextStart, durationHours: nextHours },
      });
    }
    if (previousStatus !== nextStatus) {
      await audit(req, {
        userId: reservation.customerId,
        action: 'reservation.status',
        description: `Reservation for capsule ${reservation.capsuleId} changed from ${previousStatus} to ${nextStatus}`,
        entityType: 'reservation',
        entityId: reservation._id,
        metadata: { from: previousStatus, to: nextStatus },
      });
    }

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
app.patch('/api/reservations/:id/payment', requireLogin, requireStaffOrAdmin, requirePermission('reservations', 'update'), async (req, res) => {
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
      // AUDIT (logged under the customer who owns the reservation)
      await audit(req, {
        userId: reservation.customerId,
        action: `payment.${paymentStatus.toLowerCase()}`,
        description: `Payment marked ${paymentStatus} (was ${previous}) for capsule ${reservation.capsuleId}`,
        entityType: 'reservation',
        entityId: reservation._id,
        metadata: { amount: reservation.totalPrice, method },
      });

      try {
        await recordPaymentChange(reservation, previous, paymentStatus, String(req.authUser._id), method);
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
async function requireAdmin(req, res, next) {
  try {
    const user = req.authUser || await findTokenUser(req);
    if (!user) return res.status(401).json({ message: 'Admin login required' });
    if (user.role !== 'admin') return res.status(403).json({ message: 'Admin access only' });
    req.authUser = user;
    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}

async function checkAdminCode(req, userId, provided, failureAction = 'settings.admin_code_failed') {
  if (!ADMIN_CODE) {
    return { status: 500, message: 'Admin code is not configured (set ADMIN_CODE)' };
  }
  const attempt = await AdminCodeAttempt.findById(userId);
  if (attempt?.lockedUntil && attempt.lockedUntil > new Date()) {
    return { status: 423, message: 'Admin code is temporarily locked. Try again later.' };
  }

  const providedBuffer = typeof provided === 'string' ? Buffer.from(provided) : Buffer.alloc(0);
  const adminCodeBuffer = Buffer.from(ADMIN_CODE);
  const valid = providedBuffer.length === adminCodeBuffer.length
    && crypto.timingSafeEqual(providedBuffer, adminCodeBuffer);
  if (valid) {
    await AdminCodeAttempt.findByIdAndUpdate(
      userId,
      { $set: { attempts: 0, lockedUntil: null } },
      { upsert: true }
    );
    return null;
  }

  const updated = await AdminCodeAttempt.findByIdAndUpdate(
    userId,
    { $inc: { attempts: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const isLocked = updated.attempts >= 5;
  if (isLocked) {
    await AdminCodeAttempt.findByIdAndUpdate(userId, {
      $set: { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) },
    });
  }
  await audit(req, {
    userId,
    action: isLocked ? 'settings.admin_code_locked' : failureAction,
    description: isLocked
      ? 'Admin code locked after repeated failed attempts'
      : 'Incorrect admin code',
  });
  return {
    status: isLocked ? 423 : 401,
    message: isLocked
      ? 'Admin code is temporarily locked after repeated failed attempts.'
      : 'Invalid admin code',
  };
}

async function verifyAdminCode(req, res, next) {
  try {
    const failure = await checkAdminCode(req, String(req.authUser._id), req.body?.adminCode);
    if (failure) return res.status(failure.status).json({ message: failure.message });
    next();
  } catch (err) {
    console.error('Could not verify admin code:', err);
    res.status(500).json({ message: 'Could not verify admin code' });
  }
}

function readSettingsUnlockClaims(req, ignoreExpiration = false) {
  const token = req.get('x-settings-unlock-token') || '';
  if (!token) return null;
  try {
    const claims = jwt.verify(token, JWT_SECRET, { ignoreExpiration });
    if (
      typeof claims !== 'object' ||
      claims.purpose !== 'settings-unlock' ||
      typeof claims.sub !== 'string' ||
      typeof claims.jti !== 'string'
    ) return null;
    return claims;
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') return null;
    throw err;
  }
}

function requireSettingsUnlock(req, res, next) {
  requireAdmin(req, res, () => {
    (async () => {
      const claims = readSettingsUnlockClaims(req);
      if (!claims || claims.sub !== String(req.authUser._id)) {
        return res.status(423).json({ message: 'Settings session is locked or expired' });
      }
      const session = await SettingsUnlockSession.findOne({
        userId: req.authUser._id,
        tokenId: claims.jti,
        revokedAt: null,
        expiresAt: { $gt: new Date() },
      });
      if (!session) return res.status(423).json({ message: 'Settings session is locked or expired' });
      req.settingsUnlock = session;
      next();
    })().catch((err) => {
      console.error('Could not verify settings unlock:', err);
      res.status(500).json({ message: 'Could not verify Settings session' });
    });
  });
}

function developerOtpRecipients() {
  const configured = (process.env.DEVELOPER_OTP_EMAILS || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
  if (!configured.length || configured.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return null;
  }
  return configured;
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  return `${local[0]}***@${domain}`;
}

function otpHash(userId, code) {
  return crypto.createHmac('sha256', JWT_SECRET).update(`${userId}:${code}`).digest('hex');
}

async function sendSettingsOtp(email, code) {
  const original = { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS };
  const custom = { user: process.env.CUSTOM_EMAIL_USER, pass: process.env.CUSTOM_EMAIL_PASS };
  const accounts = [custom, original].filter(
    (account, index, list) =>
      account.user && account.pass &&
      list.findIndex((other) => other.user === account.user && other.pass === account.pass) === index
  );
  if (!accounts.length) throw new Error('Original email credentials are not configured');

  let lastError;
  for (const account of accounts) {
    try {
      const transporter = nodemailer.createTransport({ service: 'gmail', auth: account });
      await transporter.sendMail({
        from: account.user,
        to: email,
        subject: 'Settings verification code',
        text: `Your Settings verification code is ${code}. It expires in 5 minutes. If you did not request it, ignore this email.`,
      });
      return;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Could not send Settings verification email');
}

app.get('/api/settings/unlock/recipients', requireAdmin, (req, res) => {
  const recipients = developerOtpRecipients();
  if (!recipients) {
    return res.status(503).json({ message: 'DEVELOPER_OTP_EMAILS is missing or invalid on the server' });
  }
  res.set('Cache-Control', 'no-store');
  res.json({ recipients: recipients.map((email, index) => ({ id: String(index), masked: maskEmail(email) })) });
});

app.get('/api/settings/unlock/status', requireAdmin, async (req, res) => {
  try {
    const claims = readSettingsUnlockClaims(req);
    if (!claims || claims.sub !== String(req.authUser._id)) {
      const expiredClaims = readSettingsUnlockClaims(req, true);
      if (expiredClaims?.sub === String(req.authUser._id)) {
        const expiredSession = await SettingsUnlockSession.findOneAndUpdate(
          {
            userId: req.authUser._id,
            tokenId: expiredClaims.jti,
            revokedAt: null,
            expiresAt: { $lte: new Date() },
          },
          { $set: { revokedAt: new Date() } },
          { new: true }
        );
        if (expiredSession) {
          await audit(req, { action: 'settings.lock', description: 'Settings session expired' });
        }
      }
      return res.json({ unlocked: false });
    }
    const session = await SettingsUnlockSession.findOne({
      userId: req.authUser._id,
      tokenId: claims.jti,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });
    res.set('Cache-Control', 'no-store');
    res.json(session ? { unlocked: true, expiresAt: session.expiresAt } : { unlocked: false });
  } catch (err) {
    console.error('Could not load Settings unlock status:', err);
    res.status(500).json({ message: 'Could not load Settings session' });
  }
});

app.post('/api/settings/unlock/otp/send', requireAdmin, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const recipients = developerOtpRecipients();
  if (!recipients) {
    return res.status(503).json({ message: 'DEVELOPER_OTP_EMAILS is missing or invalid on the server' });
  }
  const recipientId = typeof req.body?.recipientId === 'string' ? req.body.recipientId : '';
  const recipientIndex = Number(recipientId);
  if (
    !/^\d+$/.test(recipientId) ||
    !Number.isSafeInteger(recipientIndex) ||
    String(recipientIndex) !== recipientId ||
    !recipients[recipientIndex]
  ) {
    return res.status(400).json({ message: 'Choose a configured developer recipient' });
  }

  const now = new Date();
  const userId = req.authUser._id;
  try {
    const existing = await SettingsOtpChallenge.findById(userId);
    if (existing?.resendAfter && existing.resendAfter > now) {
      const retryAfterSeconds = Math.ceil((existing.resendAfter - now) / 1000);
      return res.status(429).json({ message: 'Please wait before requesting another code', retryAfterSeconds });
    }

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
    const challengeFilter = existing
      ? { _id: userId, resendAfter: { $lte: now } }
      : { _id: userId };
    const challenge = await SettingsOtpChallenge.findOneAndUpdate(
      challengeFilter,
      {
        $set: {
          codeHash: otpHash(userId, code),
          recipientId,
          expiresAt,
          resendAfter: new Date(now.getTime() + 60 * 1000),
          attempts: 0,
          locked: false,
          proofId: null,
          proofExpiresAt: null,
          proofConsumedAt: null,
        },
      },
      { upsert: !existing, new: true, setDefaultsOnInsert: true }
    );
    if (!challenge) {
      return res.status(429).json({ message: 'Please wait before requesting another code', retryAfterSeconds: 60 });
    }

    try {
      await sendSettingsOtp(recipients[recipientIndex], code);
    } catch (err) {
      await SettingsOtpChallenge.findByIdAndUpdate(userId, { $set: { codeHash: null } });
      await audit(req, {
        action: 'settings.otp_failed',
        description: 'Could not send Settings verification code',
      });
      console.error('Settings verification email failed:', err.message);
      return res.status(502).json({
        message: 'Could not send the verification email. Try again after 60 seconds.',
        retryAfterSeconds: 60,
      });
    }

    await audit(req, {
      action: 'settings.otp_sent',
      description: `Sent Settings verification code to developer recipient ${recipientIndex + 1}`,
    });
    res.json({ message: 'Verification code sent', retryAfterSeconds: 60 });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(429).json({ message: 'Please wait before requesting another code', retryAfterSeconds: 60 });
    }
    console.error('Could not create Settings OTP:', err);
    res.status(500).json({ message: 'Could not send verification code' });
  }
});

app.post('/api/settings/unlock/otp/verify', requireAdmin, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const userId = req.authUser._id;
  const code = typeof req.body?.code === 'string' ? req.body.code : '';
  try {
    const challenge = await SettingsOtpChallenge.findById(userId);
    const now = new Date();
    if (challenge?.locked) {
      await audit(req, { action: 'settings.otp_failed', description: 'Verification code rejected: challenge locked' });
      return res.status(423).json({ message: 'Verification code is locked. Request a new code after the resend wait.' });
    }

    const expectedHash = challenge?.codeHash || '';
    const actualHash = /^\d{6}$/.test(code) ? otpHash(userId, code) : '';
    const matches = Boolean(
      challenge &&
      expectedHash &&
      challenge.expiresAt > now &&
      actualHash &&
      crypto.timingSafeEqual(Buffer.from(expectedHash, 'hex'), Buffer.from(actualHash, 'hex'))
    );
    if (!matches) {
      const updatedChallenge = challenge
        ? await SettingsOtpChallenge.findByIdAndUpdate(
          userId,
          { $inc: { attempts: 1 } },
          { new: true }
        )
        : null;
      const attempts = updatedChallenge?.attempts || 1;
      const locked = attempts >= 5;
      if (challenge) {
        if (locked) {
          await SettingsOtpChallenge.findByIdAndUpdate(userId, { $set: { locked: true } });
        }
      }
      await audit(req, {
        action: 'settings.otp_failed',
        description: 'Incorrect or expired Settings verification code',
      });
      if (locked) {
        await audit(req, {
          action: 'settings.otp_locked',
          description: 'Settings verification code locked after five failed attempts',
        });
        return res.status(423).json({ message: 'Too many incorrect codes. Request a new code after the resend wait.' });
      }
      return res.status(401).json({ message: 'Invalid or expired verification code', attemptsRemaining: Math.max(0, 5 - attempts) });
    }

    const proofId = crypto.randomUUID();
    const proofExpiresAt = new Date(now.getTime() + 5 * 60 * 1000);
    const consumed = await SettingsOtpChallenge.findOneAndUpdate(
      { _id: userId, codeHash: expectedHash, expiresAt: { $gt: now }, locked: false },
      {
        $set: {
          codeHash: null,
          proofId,
          proofExpiresAt,
          proofConsumedAt: null,
          expiresAt: proofExpiresAt,
        },
      },
      { new: true }
    );
    if (!consumed) {
      await audit(req, { action: 'settings.otp_failed', description: 'Verification code was already used or expired' });
      return res.status(401).json({ message: 'Verification code is no longer valid. Request a new code.' });
    }
    const otpProof = jwt.sign(
      { sub: String(userId), purpose: 'settings-otp-verified', jti: proofId },
      JWT_SECRET,
      { expiresIn: '5m' }
    );
    res.json({ otpProof });
  } catch (err) {
    console.error('Could not verify Settings OTP:', err);
    res.status(500).json({ message: 'Could not verify the code' });
  }
});

app.post('/api/settings/unlock/complete', requireAdmin, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const userId = req.authUser._id;
  try {
    const proofToken = typeof req.body?.otpProof === 'string' ? req.body.otpProof : '';
    let proof;
    try {
      proof = jwt.verify(proofToken, JWT_SECRET);
    } catch {
      return res.status(401).json({ message: 'Verification code step expired. Request a new code.' });
    }
    if (
      typeof proof !== 'object' ||
      proof.purpose !== 'settings-otp-verified' ||
      proof.sub !== String(userId) ||
      typeof proof.jti !== 'string'
    ) {
      return res.status(401).json({ message: 'Invalid verification session' });
    }

    const codeFailure = await checkAdminCode(req, String(userId), req.body?.adminCode);
    if (codeFailure) return res.status(codeFailure.status).json({ message: codeFailure.message });

    const now = new Date();
    const consumedProof = await SettingsOtpChallenge.findOneAndUpdate(
      {
        _id: userId,
        proofId: proof.jti,
        proofConsumedAt: null,
        proofExpiresAt: { $gt: now },
      },
      { $set: { proofConsumedAt: now } },
      { new: true }
    );
    if (!consumedProof) {
      return res.status(401).json({ message: 'Verification session was already used or expired' });
    }

    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000);
    await SettingsUnlockSession.create({ userId, tokenId, expiresAt });
    const unlockToken = jwt.sign(
      { sub: String(userId), purpose: 'settings-unlock', jti: tokenId },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
    await audit(req, { action: 'settings.unlock', description: 'Unlocked Settings for 15 minutes' });
    res.set('Cache-Control', 'no-store');
    res.json({ unlockToken, expiresAt });
  } catch (err) {
    console.error('Could not unlock Settings:', err);
    res.status(500).json({ message: 'Could not unlock Settings' });
  }
});

app.post('/api/settings/unlock/lock', requireAdmin, async (req, res) => {
  try {
    const claims = readSettingsUnlockClaims(req, true);
    if (claims && claims.sub === String(req.authUser._id)) {
      const session = await SettingsUnlockSession.findOneAndUpdate(
        { userId: req.authUser._id, tokenId: claims.jti, revokedAt: null },
        { $set: { revokedAt: new Date() } },
        { new: true }
      );
      if (session) {
        const expired = claims.exp && claims.exp * 1000 <= Date.now();
        await audit(req, {
          action: 'settings.lock',
          description: expired ? 'Settings session expired' : 'Locked Settings session',
        });
      }
    }
    res.json({ locked: true });
  } catch (err) {
    console.error('Could not lock Settings:', err);
    res.status(500).json({ message: 'Could not lock Settings' });
  }
});

// Public pages only receive on/off flags needed to hide disabled integrations.
app.get('/api/public/settings', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json(pickSettings(settings));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load settings' });
  }
});

app.get('/api/settings', requireSettingsUnlock, async (req, res) => {
  try {
    const settings = await getSettings();
    res.set('Cache-Control', 'no-store');
    res.json(pickSettings(settings));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load settings' });
  }
});

// PATCH: only an unlocked admin may change integration settings.
app.patch('/api/settings', requireSettingsUnlock, async (req, res) => {
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

    for (const [key, value] of Object.entries(update)) {
      await audit(req, {
        action: 'settings.toggle',
        description: `Turned ${key} ${value ? 'on' : 'off'}`,
        metadata: { setting: key, enabled: value },
      });
    }

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

function getOriginalGoogleMapsApiKey() {
  if (process.env.VITE_GOOGLE_MAPS_API_KEY) return process.env.VITE_GOOGLE_MAPS_API_KEY;
  try {
    const rootEnv = require('dotenv').parse(fs.readFileSync(__dirname + '/../.env'));
    return rootEnv.VITE_GOOGLE_MAPS_API_KEY || '';
  } catch (err) {
    if (err.code === 'ENOENT') return '';
    throw err;
  }
}

function hasCustomGoogleMapsKey() {
  return Boolean(process.env.CUSTOM_GOOGLE_MAPS_API_KEY);
}
function usingCustomGoogleMapsKey() {
  return hasCustomGoogleMapsKey() && process.env.GOOGLE_MAPS_API_KEY_SOURCE !== 'original';
}
function getGoogleMapsApiKey() {
  return usingCustomGoogleMapsKey()
    ? process.env.CUSTOM_GOOGLE_MAPS_API_KEY
    : getOriginalGoogleMapsApiKey();
}

function maskedKeyPreview(key) {
  const visibleLength = Math.ceil(key.length / 2);
  return key ? key.slice(0, visibleLength) + '•'.repeat(key.length - visibleLength) : '';
}

function credentialsPayload() {
  const mail = getMailAuth();
  const recaptchaSecret = getRecaptchaSecret() || '';
  const googleMapsApiKey = getGoogleMapsApiKey();
  const googleAuthApiKey = getGoogleAuthApiKey();
  return {
    user: mail.user || '',
    source: usingCustomEmail() ? 'custom' : 'original',
    hasCustom: hasCustomEmail(),
    passSet: Boolean(mail.pass),
    recaptcha: {
      source: usingCustomCaptcha() ? 'custom' : 'original',
      hasCustom: hasCustomCaptcha(),
      secretSet: Boolean(recaptchaSecret),
      preview: maskedKeyPreview(recaptchaSecret),
    },
    googleMaps: {
      source: usingCustomGoogleMapsKey() ? 'custom' : 'original',
      hasCustom: hasCustomGoogleMapsKey(),
      keySet: Boolean(googleMapsApiKey),
      preview: maskedKeyPreview(googleMapsApiKey),
    },
    googleAuth: {
      source: usingCustomGoogleAuthKey() ? 'custom' : 'original',
      hasCustom: hasCustomGoogleAuthKey(),
      keySet: Boolean(googleAuthApiKey),
      preview: maskedKeyPreview(googleAuthApiKey),
    },
  };
}

// Client API keys are required by the browser SDKs; they are public identifiers, not secrets.
app.get('/api/client-keys', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    googleAuthApiKey: getGoogleAuthApiKey(),
    googleMapsApiKey: getGoogleMapsApiKey(),
  });
});

// GET: credential metadata and masked key previews
app.get('/api/settings/credentials', requireSettingsUnlock, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(credentialsPayload());
});

// GET: reveal the email password on demand.
app.get('/api/settings/credentials/reveal', requireSettingsUnlock, async (req, res) => {
  res.set('Cache-Control', 'no-store');
  const field = req.query.field;
  if (field !== 'emailPass') return res.status(400).json({ message: 'Unknown field' });
  // AUDIT: record that a secret was viewed (never the secret itself)
  await audit(req, {
    action: 'settings.credentials_reveal',
    description: 'Viewed email password',
  });
  return res.json({ value: getMailAuth().pass || '' });
});

// PUT: switch between the original (.env) and the saved custom credentials. No admin code needed.
app.put('/api/settings/credentials/source', requireSettingsUnlock, async (req, res) => {
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
    } else if (target === 'googleAuth') {
      if (source === 'custom' && !hasCustomGoogleAuthKey()) {
        return res.status(400).json({ message: 'No custom Firebase API key saved yet' });
      }
      setEnvVar('FIREBASE_API_KEY_SOURCE', source);
    } else if (target === 'googleMaps') {
      if (source === 'custom' && !hasCustomGoogleMapsKey()) {
        return res.status(400).json({ message: 'No custom Google Maps API key saved yet' });
      }
      setEnvVar('GOOGLE_MAPS_API_KEY_SOURCE', source);
    } else {
      return res.status(400).json({ message: 'Unknown target' });
    }

    // AUDIT
    await audit(req, {
      action: 'settings.credentials_switch',
      description: `Switched ${target} credentials to ${source}`,
    });

    res.json(credentialsPayload());
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not switch credentials' });
  }
});

// PATCH: save custom values (admin code required). Saving also switches to the custom values.
app.patch('/api/settings/credentials', requireSettingsUnlock, verifyAdminCode, async (req, res) => {
  try {
    const str = (v) => (typeof v === 'string' ? v.trim() : '');
    const newUser = str(req.body.CUSTOM_EMAIL_USER);
    const newPass = typeof req.body.CUSTOM_EMAIL_PASS === 'string' ? req.body.CUSTOM_EMAIL_PASS : '';
    const newCaptcha = str(req.body.CUSTOM_RECAPTCHA_SECRET);
    const newFirebaseApiKey = str(req.body.CUSTOM_FIREBASE_API_KEY);
    const newMapsApiKey = str(req.body.CUSTOM_GOOGLE_MAPS_API_KEY);

    const mail = getMailAuth();
    const userChanged = Boolean(newUser) && newUser !== mail.user;
    const passChanged = Boolean(newPass) && newPass !== mail.pass;
    const captchaChanged = Boolean(newCaptcha) && newCaptcha !== getRecaptchaSecret();
    const firebaseApiKeyChanged = Boolean(newFirebaseApiKey) &&
      newFirebaseApiKey !== process.env.CUSTOM_FIREBASE_API_KEY;
    const mapsApiKeyChanged = Boolean(newMapsApiKey) &&
      newMapsApiKey !== process.env.CUSTOM_GOOGLE_MAPS_API_KEY;

    if (!userChanged && !passChanged && !captchaChanged && !firebaseApiKeyChanged && !mapsApiKeyChanged) {
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
    if (firebaseApiKeyChanged) {
      setEnvVar('CUSTOM_FIREBASE_API_KEY', newFirebaseApiKey);
      setEnvVar('FIREBASE_API_KEY_SOURCE', 'custom');
    }
    if (mapsApiKeyChanged) {
      setEnvVar('CUSTOM_GOOGLE_MAPS_API_KEY', newMapsApiKey);
      setEnvVar('GOOGLE_MAPS_API_KEY_SOURCE', 'custom');
    }

    // AUDIT (says what changed, never the values)
    const changed = [
      userChanged && 'email address',
      passChanged && 'email password',
      captchaChanged && 'reCAPTCHA secret',
      firebaseApiKeyChanged && 'Firebase API key',
      mapsApiKeyChanged && 'Google Maps API key',
    ].filter(Boolean);
    await audit(req, {
      action: 'settings.credentials_update',
      description: `Updated credentials: ${changed.join(', ')}`,
    });

    res.json(credentialsPayload());
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: err.message || 'Could not save credentials' });
  }
});

// DELETE: remove the saved custom values for good (body.which: "email" | "recaptcha", otherwise both)
app.delete('/api/settings/credentials', requireSettingsUnlock, verifyAdminCode, async (req, res) => {
  try {
    const which = req.body?.which;
    if (which !== 'recaptcha') {
      ['CUSTOM_EMAIL_USER', 'CUSTOM_EMAIL_PASS', 'EMAIL_SOURCE'].forEach(removeEnvVar);
    }
    if (which !== 'email') {
      ['CUSTOM_RECAPTCHA_SECRET', 'RECAPTCHA_SOURCE'].forEach(removeEnvVar);
    }

    // AUDIT
    await audit(req, {
      action: 'settings.credentials_delete',
      description: `Removed custom credentials: ${which || 'email and reCAPTCHA'}`,
    });

    res.json(credentialsPayload());
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not reset credentials' });
  }
});

// POST: maghimo og bag-ong capsule
app.post('/api/capsules', requireLogin, requireStaffOrAdmin, requirePermission('spaces', 'create'), async (req, res) => {
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
    await audit(req, {
      action: 'capsule.create',
      description: `Created capsule ${capsule.capsuleId}`,
      entityType: 'capsule',
      entityId: capsule._id,
      metadata: { capsuleName: capsule.capsuleName, room: capsule.room, type: capsule.type, pricePerHour: capsule.pricePerHour },
    });
    res.status(201).json(capsule);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ message: err.message });
    console.error(err);
    res.status(500).json({ message: 'Could not create capsule' });
  }
});

// PUT: i-edit ang capsule
app.put('/api/capsules/:id', requireLogin, requireStaffOrAdmin, requirePermission('spaces', 'update'), async (req, res) => {
  try {
    const { capsuleName, room, type, pricePerHour, status } = req.body;
    const capsule = await Capsule.findOneAndUpdate(
      { capsuleId: req.params.id },
      { capsuleName, room, type, pricePerHour: Number(pricePerHour), status },
      { returnDocument: 'after', runValidators: true }
    );
    if (!capsule) return res.status(404).json({ message: 'Capsule not found' });
    await audit(req, {
      action: 'capsule.update',
      description: `Updated capsule ${capsule.capsuleId}`,
      entityType: 'capsule',
      entityId: capsule._id,
      metadata: { capsuleName: capsule.capsuleName, room: capsule.room, type: capsule.type, pricePerHour: capsule.pricePerHour, status: capsule.status },
    });
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
    await audit(req, {
      action: value ? 'capsule.archive' : 'capsule.restore',
      description: `${value ? 'Archived' : 'Restored'} capsule ${capsule.capsuleId}`,
      entityType: 'capsule',
      entityId: capsule._id,
    });
    res.json(capsule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Request failed' });
  }
}
app.patch('/api/capsules/:id/archive', requireLogin, requireStaffOrAdmin, requirePermission('spaces', 'delete'), (req, res) => setArchived(req, res, true));
app.patch('/api/capsules/:id/restore', requireLogin, requireStaffOrAdmin, requirePermission('spaces', 'delete'), (req, res) => setArchived(req, res, false));


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
app.post('/api/auth/logout', requireLogin, async (req, res) => {
  const now = new Date();
  const revoked = await SettingsUnlockSession.updateMany(
    { userId: req.authUser._id, revokedAt: null },
    { $set: { revokedAt: now } }
  );
  if (revoked.modifiedCount > 0) {
    await audit(req, { action: 'settings.lock', description: 'Locked Settings session on logout' });
  }
  await audit(req, { action: 'auth.logout', description: 'Logged out' });
  res.json({ message: 'Logged out' });
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { firstName, lastName, email, username, password } = req.body;

    if (!email || !password || password.length < 8) {
      return res.status(400).json({ message: 'Email and a password of 8+ characters are required' });
    }

    const exists = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username }] });
    if (exists) return res.status(409).json({ message: 'Email or username already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const created = await User.create({ firstName, lastName, email, username, password: hashed });

    // AUDIT
    await audit(req, { userId: created._id, action: 'auth.signup', description: 'Account created' });

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

    if (!ok) {
      // AUDIT: failed attempt on a real account (shows up in that user's own log)
      if (user) {
        await audit(req, {
          userId: user._id,
          action: 'auth.login_failed',
          description: 'Failed login attempt (wrong password)',
        });
      }
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Dili makasulod ang disabled nga account
    if (user.status === 'disabled') {
      await audit(req, {
        userId: user._id,
        action: 'auth.login_blocked',
        description: 'Login blocked: account is disabled',
      });
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
      const codeFailure = await checkAdminCode(req, String(user._id), adminCode, 'auth.admin_code_failed');
      if (codeFailure) return res.status(codeFailure.status).json({ message: codeFailure.message });
    }

    // AUDIT
    await audit(req, { userId: user._id, action: 'auth.login', description: `Logged in as ${role}` });

    res.json({
      token: createLoginToken(user),
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        role,
        permissions: role === 'staff' && user.permissions && Object.keys(user.permissions).length
          ? user.permissions
          : role === 'staff' ? LEGACY_STAFF_PERMISSIONS : {},
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
    let isNewUser = false;

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
      isNewUser = true;
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
      await audit(req, {
        userId: user._id,
        action: 'auth.login_blocked',
        description: 'Google login blocked: account is disabled',
      });
      return res.status(403).json({ message: 'This account has been disabled' });
    }

    // AUDIT
    if (isNewUser) {
      await audit(req, { userId: user._id, action: 'auth.signup', description: 'Account created with Google' });
    }
    await audit(req, { userId: user._id, action: 'auth.login', description: 'Logged in with Google' });

    res.json({
      token: createLoginToken(user),
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

    // AUDIT
    await audit(req, {
      userId: user._id,
      action: 'auth.password_reset_requested',
      description: 'Requested a password reset code',
    });

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
      // AUDIT
      await audit(req, {
        userId: user._id,
        action: 'auth.reset_code_failed',
        description: 'Entered a wrong password reset code',
      });
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

    // AUDIT
    await audit(req, {
      userId: user._id,
      action: 'auth.password_changed',
      description: 'Password changed using a reset code',
    });

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