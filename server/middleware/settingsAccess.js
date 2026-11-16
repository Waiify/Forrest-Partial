'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');

module.exports = function createSettingsAccess({
  ADMIN_CODE,
  AdminCodeAttempt,
  SettingsUnlockSession,
  JWT_SECRET,
  audit,
  requireAdmin,
  ORIGINAL_MAIL_PASS,
  nodemailer,
}) {
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
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
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
    const original = { user: process.env.EMAIL_USER, pass: ORIGINAL_MAIL_PASS };
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
          from: `"Forrest Co-Working Space" <${account.user}>`,
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

  return {
    checkAdminCode,
    verifyAdminCode,
    readSettingsUnlockClaims,
    requireSettingsUnlock,
    developerOtpRecipients,
    maskEmail,
    otpHash,
    sendSettingsOtp,
  };
};
