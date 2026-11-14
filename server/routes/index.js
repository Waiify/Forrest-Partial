'use strict';

const createApiControllers = require('../controllers/apiControllers');
const registerUsersRoutes = require('./userRoutes');
const registerCapsulesRoutes = require('./capsuleRoutes');
const registerReservationsRoutes = require('./reservationRoutes');
const registerSettingsRoutes = require('./settingsRoutes');
const registerAuthenticationRoutes = require('./authenticationRoutes');

module.exports = function registerRoutes(app, context) {
  const controllers = createApiControllers(context);
  registerUsersRoutes(app, context, controllers);
  registerCapsulesRoutes(app, context, controllers);
  registerReservationsRoutes(app, context, controllers);
  registerSettingsRoutes(app, context, controllers);
  registerAuthenticationRoutes(app, context, controllers);
};
