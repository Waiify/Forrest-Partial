'use strict';

const { rateLimit } = require('express-rate-limit');

module.exports = function createGoogleSignInRateLimit({
  windowMs = 15 * 60 * 1000,
  limit = 5,
} = {}) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      message: 'Too many Google sign-in attempts. Try again in 15 minutes.',
    },
  });
};
