'use strict';

const createUsersController = require('./usersController');
const createReservationsController = require('./reservationsController');
const createCapsulesController = require('./capsulesController');
const createSettingsController = require('./settingsController');
const createAuthenticationController = require('./authenticationController');

module.exports = function createApiControllers(context) {
  return Object.assign(
    {},
    createUsersController(context),
    createReservationsController(context),
    createCapsulesController(context),
    createSettingsController(context),
    createAuthenticationController(context),
  );
};
