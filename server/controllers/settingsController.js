'use strict';

module.exports = function createSettingsController(context) {
  const {
    JWT_SECRET,
    SETTING_KEYS,
    Settings,
    SettingsOtpChallenge,
    SettingsUnlockSession,
    audit,
    checkAdminCode,
    credentialsPayload,
    crypto,
    developerOtpRecipients,
    getGoogleAuthApiKey,
    getGoogleDriveCredentialValues,
    getGoogleMapsApiKey,
    getMailAuth,
    getSettings,
    hasCustomCaptcha,
    hasCustomEmail,
    hasCustomGoogleAuthKey,
    hasCustomGoogleMapsKey,
    jwt,
    maskEmail,
    otpHash,
    pickSettings,
    readSettingsUnlockClaims,
    removeEnvVar,
    saveGoogleDriveCustomCredentials,
    sendSettingsOtp,
    setEnvVar,
    switchGoogleDriveCredentialSource,
  } = context;
  return {
    listSettingsOtpRecipients: (req, res) => {
      const recipients = developerOtpRecipients();
      if (!recipients) {
        return res.status(503).json({ message: 'DEVELOPER_OTP_EMAILS is missing or invalid on the server' });
      }
      res.set('Cache-Control', 'no-store');
      res.json({ recipients: recipients.map((email, index) => ({ id: String(index), masked: maskEmail(email) })) });
    },
    getSettingsUnlockStatus: async (req, res) => {
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
              { returnDocument: 'after' }
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
    },
    sendSettingsOtp: async (req, res) => {
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
          { upsert: !existing, returnDocument: 'after', setDefaultsOnInsert: true }
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
    },
    verifySettingsOtp: async (req, res) => {
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
              { returnDocument: 'after' }
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
          { returnDocument: 'after' }
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
    },
    completeSettingsUnlock: async (req, res) => {
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
          { returnDocument: 'after' }
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
    },
    lockSettings: async (req, res) => {
      try {
        const claims = readSettingsUnlockClaims(req, true);
        if (claims && claims.sub === String(req.authUser._id)) {
          const session = await SettingsUnlockSession.findOneAndUpdate(
            { userId: req.authUser._id, tokenId: claims.jti, revokedAt: null },
            { $set: { revokedAt: new Date() } },
            { returnDocument: 'after' }
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
    },
    getPublicSettings: async (req, res) => {
      try {
        const settings = await getSettings();
        res.json(pickSettings(settings));
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Could not load settings' });
      }
    },
    getSettings: async (req, res) => {
      try {
        const settings = await getSettings();
        res.set('Cache-Control', 'no-store');
        res.json(pickSettings(settings));
      } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Could not load settings' });
      }
    },
    updateSettings: async (req, res) => {
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
    },
    getClientKeys: (req, res) => {
      res.set('Cache-Control', 'no-store');
      res.json({
        googleAuthApiKey: getGoogleAuthApiKey(),
        googleMapsApiKey: getGoogleMapsApiKey(),
      });
    },
    getCredentialSettings: (req, res) => {
      res.set('Cache-Control', 'no-store');
      res.json(credentialsPayload());
    },
    revealCredential: async (req, res) => {
      res.set('Cache-Control', 'no-store');
      const field = req.query.field;
      if (!['emailPass', 'googleDrive'].includes(field)) {
        return res.status(400).json({ message: 'Unknown field' });
      }
      if (
        field === 'googleDrive'
        && req.query.source !== undefined
        && !['original', 'custom'].includes(req.query.source)
      ) {
        return res.status(400).json({ message: 'source must be original or custom' });
      }
      // AUDIT: record that a secret was viewed (never the secret itself)
      await audit(req, {
        action: 'settings.credentials_reveal',
        description: field === 'emailPass'
          ? 'Viewed email password'
          : `Viewed ${req.query.source === 'custom' ? 'custom' : 'active'} Google Drive credentials`,
      });
      const value = field === 'emailPass'
        ? getMailAuth().pass || ''
        : getGoogleDriveCredentialValues(req.query.source);
      return res.json({ value });
    },
    switchCredentialSource: async (req, res) => {
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
        } else if (target === 'googleDrive') {
          try {
            switchGoogleDriveCredentialSource(source);
          } catch (err) {
            return res.status(400).json({ message: err.message || 'Could not switch Google Drive credentials' });
          }
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
    },
    updateCredentials: async (req, res) => {
      try {
        const str = (v) => (typeof v === 'string' ? v.trim() : '');
        const newUser = str(req.body.CUSTOM_EMAIL_USER);
        const newPass = typeof req.body.CUSTOM_EMAIL_PASS === 'string' ? req.body.CUSTOM_EMAIL_PASS : '';
        const newCaptcha = str(req.body.RECAPTCHA_CUSTOM_API_KEY || req.body.CUSTOM_RECAPTCHA_SECRET);
        const newFirebaseApiKey = str(req.body.FIREBASE_CUSTOM_API_KEY || req.body.CUSTOM_FIREBASE_API_KEY);
        const newMapsApiKey = str(req.body.GOOGLE_MAPS_CUSTOM_API_KEY || req.body.CUSTOM_GOOGLE_MAPS_API_KEY);
        const captchaRequested = Boolean(newCaptcha);
        const firebaseApiKeyRequested = Boolean(newFirebaseApiKey);
        const mapsApiKeyRequested = Boolean(newMapsApiKey);
        const driveCredentialsProvided = [
          'CUSTOM_GOOGLE_DRIVE_CLIENT_ID',
          'CUSTOM_GOOGLE_DRIVE_CLIENT_SECRET',
          'CUSTOM_GOOGLE_DRIVE_REDIRECT_URI',
          'CUSTOM_GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY',
          'CUSTOM_GOOGLE_DRIVE_ACCOUNT_EMAIL',
        ].some((key) => Object.prototype.hasOwnProperty.call(req.body, key));
    
        const mail = getMailAuth();
        const userChanged = Boolean(newUser) && newUser !== mail.user;
        const passChanged = Boolean(newPass) && newPass !== mail.pass;
        const captchaChanged = Boolean(newCaptcha) &&
          newCaptcha !== (process.env.RECAPTCHA_CUSTOM_API_KEY || process.env.CUSTOM_RECAPTCHA_SECRET);
        const firebaseApiKeyChanged = Boolean(newFirebaseApiKey) &&
          newFirebaseApiKey !== (process.env.FIREBASE_CUSTOM_API_KEY || process.env.CUSTOM_FIREBASE_API_KEY);
        const mapsApiKeyChanged = Boolean(newMapsApiKey) &&
          newMapsApiKey !== (process.env.GOOGLE_MAPS_CUSTOM_API_KEY || process.env.CUSTOM_GOOGLE_MAPS_API_KEY);
    
        if (
          !userChanged
          && !passChanged
          && !captchaRequested
          && !firebaseApiKeyRequested
          && !mapsApiKeyRequested
          && !driveCredentialsProvided
        ) {
          return res.status(400).json({ message: 'Nothing to update' });
        }
        if (userChanged && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newUser)) {
          return res.status(400).json({ message: 'Enter a valid email address' });
        }
        if (driveCredentialsProvided) saveGoogleDriveCustomCredentials(req.body);
    
        if (userChanged || passChanged) {
          // The custom set is always saved as a full pair (email + password)
          setEnvVar('CUSTOM_EMAIL_USER', userChanged ? newUser : (process.env.CUSTOM_EMAIL_USER || mail.user));
          setEnvVar('CUSTOM_EMAIL_PASS', passChanged ? newPass : (process.env.CUSTOM_EMAIL_PASS || mail.pass));
          setEnvVar('EMAIL_SOURCE', 'custom');
        }
        if (captchaRequested) {
          if (captchaChanged) {
            setEnvVar('RECAPTCHA_CUSTOM_API_KEY', newCaptcha);
            if (process.env.CUSTOM_RECAPTCHA_SECRET) removeEnvVar('CUSTOM_RECAPTCHA_SECRET');
          }
          setEnvVar('RECAPTCHA_SOURCE', 'custom');
        }
        if (firebaseApiKeyRequested) {
          if (firebaseApiKeyChanged) {
            setEnvVar('FIREBASE_CUSTOM_API_KEY', newFirebaseApiKey);
            if (process.env.CUSTOM_FIREBASE_API_KEY) removeEnvVar('CUSTOM_FIREBASE_API_KEY');
          }
          setEnvVar('FIREBASE_API_KEY_SOURCE', 'custom');
        }
        if (mapsApiKeyRequested) {
          if (mapsApiKeyChanged) {
            setEnvVar('GOOGLE_MAPS_CUSTOM_API_KEY', newMapsApiKey);
            if (process.env.CUSTOM_GOOGLE_MAPS_API_KEY) removeEnvVar('CUSTOM_GOOGLE_MAPS_API_KEY');
          }
          setEnvVar('GOOGLE_MAPS_API_KEY_SOURCE', 'custom');
        }
    
        // AUDIT (says what changed, never the values)
        const changed = [
          userChanged && 'email address',
          passChanged && 'email password',
          captchaRequested && 'reCAPTCHA secret',
          firebaseApiKeyRequested && 'Firebase API key',
          mapsApiKeyRequested && 'Google Maps API key',
          driveCredentialsProvided && 'Google Drive credentials',
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
    },
    deleteCredentials: async (req, res) => {
      try {
        const which = req.body?.which;
        if (which !== 'recaptcha') {
          ['CUSTOM_EMAIL_USER', 'CUSTOM_EMAIL_PASS', 'EMAIL_SOURCE'].forEach(removeEnvVar);
        }
        if (which !== 'email') {
          [
            'RECAPTCHA_CUSTOM_API_KEY',
            'CUSTOM_RECAPTCHA_SECRET',
            'RECAPTCHA_SOURCE',
          ].forEach(removeEnvVar);
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
    }
  };
};
