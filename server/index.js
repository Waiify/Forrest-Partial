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
const registerGoogleDrive = require('./GoogleDrive');
const createAuthMiddleware = require('./middleware/auth');
const createSettingsAccess = require('./middleware/settingsAccess');
const registerRoutes = require('./routes');

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

// Original mail password: accepts EMAIL_PASS (new name) or EMAIL_APP_PASSWORD (old name)
const ORIGINAL_MAIL_PASS = process.env.EMAIL_PASS || process.env.EMAIL_APP_PASSWORD;

// Startup debug logs (from the old server.js). Never prints the password itself.
console.log('Email sender configured:', Boolean(process.env.EMAIL_USER));
console.log('Original email password exists:', !!ORIGINAL_MAIL_PASS);

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
      pass: process.env.CUSTOM_EMAIL_PASS || ORIGINAL_MAIL_PASS,
    };
  }
  return { user: process.env.EMAIL_USER, pass: ORIGINAL_MAIL_PASS };
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

const {
  STAFF_PERMISSION_ACTIONS,
  LEGACY_STAFF_PERMISSIONS,
  findTokenUser,
  createLoginToken,
  requireLogin,
  requireStaffOrAdmin,
  hasPermission,
  requirePermission,
  requireStaffPermission,
  requireAdmin,
  attachApiIdentity,
} = createAuthMiddleware({ User, JWT_SECRET });

app.use('/api', attachApiIdentity());

// AUDIT LOG: model, audit() helper, and the endpoints
//   GET /api/audit-logs/mine  -> the logged-in user's own activity
//   GET /api/audit-logs       -> everyone's activity (admin only)

const { audit } = registerAuditLog(app, {
  mongoose,
  User,
  requireAuditAccess: requirePermission('auditLogs', 'view'),
  findTokenUser,
});

const {
  checkAdminCode,
  verifyAdminCode,
  readSettingsUnlockClaims,
  requireSettingsUnlock,
  developerOtpRecipients,
  maskEmail,
  otpHash,
  sendSettingsOtp,
} = createSettingsAccess({
  ADMIN_CODE,
  AdminCodeAttempt,
  SettingsUnlockSession,
  JWT_SECRET,
  audit,
  requireAdmin,
  ORIGINAL_MAIL_PASS,
  nodemailer,
});

const {
  uploadReportToDrive,
  getCredentialStatus: googleDriveCredentialStatus,
  getCredentialValues: getGoogleDriveCredentialValues,
  saveCustomCredentials: saveGoogleDriveCustomCredentials,
  switchCredentialSource: switchGoogleDriveCredentialSource,
} = registerGoogleDrive(app, {
  mongoose,
  User,
  requireLogin,
  requirePermission,
  getSettings,
  setEnvVar,
});

const toStaff = (u) => ({
  _id: u._id,
  name: `${u.firstName} ${u.lastName}`.trim(),
  email: u.email,
  status: u.status || 'active',
  createdAt: u.createdAt,
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
  qrTokenHash:   { type: String, select: false },
  qrExpiresAt:   { type: Date, select: false },
  qrUsedAt:      { type: Date },
  // Payment tracking (monitored on the admin Reservation page)
  paymentStatus: { type: String, enum: ['Unpaid', 'Paid', 'Refunded'], default: 'Unpaid' },
}, { timestamps: true }), 'Reservations');

function createReservationQrToken() {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    hash: crypto.createHash('sha256').update(token).digest('hex'),
  };
}

// TRANSACTIONS (admin Transactions page: finance ledger in its own "Transactions" collection)
// Admin authorization is provided by middleware/auth.js.
const { recordPaymentChange } = registerTransactions(app, {
  mongoose,
  User,
  Capsule,
  Reservation,
  requireAdmin,
  requirePermission,
  getSettings,
  uploadReportToDrive,
});

// SETTINGS (admin Settings page: turn integrations on or off)
// FIX: added 'googleMapsEnabled' and 'pdfExportEnabled' (the Settings and Reports pages depend on them)
const SETTING_KEYS = [
  'googleAuthEnabled',
  'recaptchaEnabled',
  'emailEnabled',
  'smsEnabled',
  'googleMapsEnabled',
  'pdfExportEnabled',
  'googleDriveEnabled',
  'qrCodeEnabled',
];

const Settings = mongoose.model('Settings', new mongoose.Schema({
  key:               { type: String, default: 'app', unique: true },
  googleAuthEnabled: { type: Boolean, default: true },
  recaptchaEnabled:  { type: Boolean, default: true },
  emailEnabled:      { type: Boolean, default: true },
  smsEnabled:        { type: Boolean, default: true },
  googleMapsEnabled: { type: Boolean, default: true },
  pdfExportEnabled:  { type: Boolean, default: true },
  googleDriveEnabled:{ type: Boolean, default: true },
  qrCodeEnabled:     { type: Boolean, default: true },
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

// Settings authorization and OTP helpers live in middleware/settingsAccess.js.

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
    googleDrive: googleDriveCredentialStatus(),
    googleAuth: {
      source: usingCustomGoogleAuthKey() ? 'custom' : 'original',
      hasCustom: hasCustomGoogleAuthKey(),
      keySet: Boolean(googleAuthApiKey),
      preview: maskedKeyPreview(googleAuthApiKey),
    },
  };
}

// Client API keys are required by the browser SDKs; they are public identifiers, not secrets.

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

const routeContext = {
  Capsule,
  JWT_SECRET,
  LEGACY_STAFF_PERMISSIONS,
  Reservation,
  SETTING_KEYS,
  Settings,
  SettingsOtpChallenge,
  SettingsUnlockSession,
  User,
  audit,
  bcrypt,
  checkAdminCode,
  createLoginToken,
  createReservationQrToken,
  createTransporter,
  credentialsPayload,
  crypto,
  developerOtpRecipients,
  fetch,
  getAuth,
  getGoogleAuthApiKey,
  getGoogleDriveCredentialValues,
  getGoogleMapsApiKey,
  getMailAuth,
  getRecaptchaSecret,
  getSettings,
  hasCustomCaptcha,
  hasCustomEmail,
  hasCustomGoogleAuthKey,
  hasCustomGoogleMapsKey,
  hasPermission,
  jwt,
  maskEmail,
  mongoose,
  normalizeStaffPermissions,
  otpHash,
  pickSettings,
  readSettingsUnlockClaims,
  recordPaymentChange,
  removeEnvVar,
  requireAdmin,
  requireLogin,
  requirePermission,
  requireSettingsUnlock,
  requireStaffOrAdmin,
  requireStaffPermission,
  saveGoogleDriveCustomCredentials,
  sendSettingsOtp,
  setArchived,
  setEnvVar,
  switchGoogleDriveCredentialSource,
  toManagedUser,
  toStaff,
  verifyAdminCode,
};
registerRoutes(app, routeContext);

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

app.listen(process.env.PORT || 5000, () =>
  console.log(`API running on http://localhost:${process.env.PORT || 5000}`)
);