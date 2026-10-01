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
console.log("EMAIL_PASS length:", process.env.EMAIL_PASS?.length);
const transporter = nodemailer.createTransport({  
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const adminApp = initializeApp({
  credential: cert(require('./serviceAccountKey.json')),
});


const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('Connection error:', err));

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
}, { timestamps: true }));


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

app.get('/api/health', (req, res) => res.json({ ok: true }));

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

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email || '').toLowerCase() });
    const ok = user && await bcrypt.compare(password, user.password);

    if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { email, password, adminCode } = req.body;

    const user = await User.findOne({
      email: (email || '').toLowerCase()
    });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    const passwordOk = await bcrypt.compare(password, user.password);

    if (!passwordOk) {
      return res.status(401).json({
        message: 'Invalid email or password'
      });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({
        message: 'This account is not an administrator'
      });
    }

        if (adminCode !== process.env.ADMIN_CODE) {
      console.log('SUBMITTED:', JSON.stringify(adminCode));
      console.log('EXPECTED:', JSON.stringify(process.env.ADMIN_CODE));
      return res.status(401).json({
        message: 'Invalid admin code'
      });
    }

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        username: user.username,
        role: user.role
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: 'Server error'
    });
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

// e verify or check ang codenga gi send sa email
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
