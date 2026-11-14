'use strict';

// Capsules API routes.
module.exports = function registerRoutes(app, context, controllers) {
  const {
    requireLogin,
    requirePermission,
    requireStaffOrAdmin,
  } = context;
  app.get('/api/capsules', controllers.listCapsules);
  app.post('/api/capsules', requireLogin, requireStaffOrAdmin, requirePermission('spaces', 'create'), controllers.createCapsule);
  app.put('/api/capsules/:id', requireLogin, requireStaffOrAdmin, requirePermission('spaces', 'update'), controllers.updateCapsule);
  app.patch('/api/capsules/:id/archive', requireLogin, requireStaffOrAdmin, requirePermission('spaces', 'delete'), controllers.archiveCapsule);
  app.patch('/api/capsules/:id/restore', requireLogin, requireStaffOrAdmin, requirePermission('spaces', 'delete'), controllers.restoreCapsule);
};
