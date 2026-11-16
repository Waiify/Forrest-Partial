'use strict';

// Settings API routes.
module.exports = function registerRoutes(app, context, controllers) {
  const {
    requireAdmin,
    requireSettingsUnlock,
    verifyAdminCode,
  } = context;
  app.get('/api/settings/unlock/recipients', requireAdmin, controllers.listSettingsOtpRecipients);
  app.get('/api/settings/unlock/status', requireAdmin, controllers.getSettingsUnlockStatus);
  app.post('/api/settings/unlock/otp/send', requireAdmin, controllers.sendSettingsOtp);
  app.post('/api/settings/unlock/otp/verify', requireAdmin, controllers.verifySettingsOtp);
  app.post('/api/settings/unlock/complete', requireAdmin, controllers.completeSettingsUnlock);
  app.post('/api/settings/unlock/lock', requireAdmin, controllers.lockSettings);
  app.get('/api/public/settings', controllers.getPublicSettings);
  app.get('/api/settings', requireSettingsUnlock, controllers.getSettings);
  app.patch('/api/settings', requireSettingsUnlock, controllers.updateSettings);
  app.get('/api/client-keys', controllers.getClientKeys);
  app.get('/api/settings/credentials', requireSettingsUnlock, controllers.getCredentialSettings);
  app.get('/api/settings/credentials/reveal', requireSettingsUnlock, controllers.revealCredential);
  app.put('/api/settings/credentials/source', requireSettingsUnlock, controllers.switchCredentialSource);
  app.patch('/api/settings/credentials', requireSettingsUnlock, verifyAdminCode, controllers.updateCredentials);
  app.delete('/api/settings/credentials', requireSettingsUnlock, verifyAdminCode, controllers.deleteCredentials);
};
