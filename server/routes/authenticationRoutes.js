'use strict';

// Authentication API routes.
module.exports = function registerRoutes(app, context, controllers) {
  const {
    requireLogin,
  } = context;
  app.post('/verify-captcha', controllers.verifyCaptcha);
  app.post('/api/auth/logout', requireLogin, controllers.logout);
  app.post('/api/auth/signup', controllers.signup);
  app.post('/api/auth/login', controllers.login);
  app.post('/api/auth/google-sync', controllers.syncGoogleAccount);
  app.post('/api/auth/forgot-password', controllers.requestPasswordReset);
  app.post('/api/auth/verify-reset-code', controllers.verifyPasswordResetCode);
  app.post('/api/auth/reset-password', controllers.resetPassword);
};
