'use strict';

// Reservations API routes.
module.exports = function registerRoutes(app, context, controllers) {
  const {
    requireLogin,
    requirePermission,
    requireStaffOrAdmin,
    requireStaffPermission,
  } = context;
  app.get('/api/reservations', requireLogin, requireStaffPermission('reservations', 'view'), controllers.listReservations);
  app.get('/api/reservations/mine', requireLogin, requireStaffPermission('reservations', 'view'), controllers.listMyReservations);
  app.post('/api/reservations/:id/qr', requireLogin, controllers.issueReservationQr);
  app.post('/api/reservations/check-in', requireLogin, requirePermission('reservations', 'update'), controllers.checkInReservation);
  app.get('/api/availability', controllers.getCapsuleAvailability);
  app.post('/api/reservations', requireLogin, requireStaffPermission('reservations', 'create'), controllers.createReservation);
  app.patch('/api/reservations/:id', requireLogin, requireStaffPermission('reservations', 'update'), controllers.updateReservation);
  app.patch('/api/reservations/:id/payment', requireLogin, requireStaffOrAdmin, requirePermission('reservations', 'update'), controllers.updateReservationPayment);
};
