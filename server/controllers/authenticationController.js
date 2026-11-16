'use strict';

module.exports = function createAuthenticationController(context) {
  const {
    LEGACY_STAFF_PERMISSIONS,
    SettingsUnlockSession,
    User,
    audit,
    bcrypt,
    checkAdminCode,
    createLoginToken,
    createTransporter,
    crypto,
    fetch,
    getAuth,
    getMailAuth,
    getRecaptchaSecret,
    getSettings,
  } = context;
  return {
    verifyCaptcha: async (req, res) => {
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
    },
    logout: async (req, res) => {
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
    },
    signup: async (req, res) => {
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
    },
    login: async (req, res) => {
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
    },
    syncGoogleAccount: async (req, res) => {
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
    },
    requestPasswordReset: async (req, res) => {
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
          from: `"Forrest Co-Working Space" <${mailUser}>`,
          to: user.email,
          subject: 'Your Forrest password reset code',
          text: `Your verification code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
        });
    
        res.json(genericReply);
      } catch (err) {
        console.error('Forgot password error:', err.message);
        res.status(500).json({ message: 'Could not send the code. Please try again.' });
      }
    },
    verifyPasswordResetCode: async (req, res) => {
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
    },
    resetPassword: async (req, res) => {
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
    }
  };
};
