'use strict';

// Users API routes.
module.exports = function registerRoutes(app, context, controllers) {
  const {
    requireAdmin,
    requireLogin,
    requireStaffOrAdmin,
    requireStaffPermission,
  } = context;
  app.get('/api/users', requireLogin, requireStaffOrAdmin, requireStaffPermission('customers', 'view'), controllers.listCustomers);
  app.put('/api/users/:id', requireLogin, controllers.updateCustomer);
  app.get('/api/staff', requireAdmin, controllers.listStaff);
  app.post('/api/staff', requireAdmin, controllers.createStaff);
  app.patch('/api/staff/:id', requireAdmin, controllers.updateStaffStatus);
  app.get('/api/admin/users', requireAdmin, controllers.listManagedUsers);
  app.post('/api/admin/users', requireAdmin, controllers.createManagedUser);
  app.patch('/api/admin/users/:id', requireAdmin, controllers.updateManagedUser);
};
