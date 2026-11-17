'use strict';

async function providerResponse(fetch, url, options, providerName) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error(`Could not reach ${providerName} to validate the key.`);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error(`${providerName} returned an unreadable validation response.`);
  }
  return { response, data };
}

function rejectInvalidKey(message) {
  const error = new Error(message);
  error.code = 'INVALID_INTEGRATION_KEY';
  throw error;
}

async function validateIntegrationKey(integration, key, fetch, origin, recaptchaResponseToken) {
  if (typeof key !== 'string' || !key.trim()) {
    throw new Error('Enter an API key to validate.');
  }

  if (integration === 'recaptcha') {
    if (typeof recaptchaResponseToken !== 'string' || !recaptchaResponseToken) {
      throw new Error('Complete the reCAPTCHA challenge before saving this secret key.');
    }
    const params = new URLSearchParams({
      secret: key,
      response: recaptchaResponseToken,
    });
    const { response, data } = await providerResponse(
      fetch,
      'https://www.google.com/recaptcha/api/siteverify',
      { method: 'POST', body: params },
      'Google reCAPTCHA'
    );
    if (!response.ok) {
      throw new Error(`Google reCAPTCHA could not validate the key (HTTP ${response.status}).`);
    }

    const errorCodes = Array.isArray(data['error-codes']) ? data['error-codes'] : [];
    if (errorCodes.includes('invalid-input-secret')) {
      rejectInvalidKey('The key is invalid.');
    }
    if (data.success === true) return;
    throw new Error('Google reCAPTCHA could not verify this secret key and CAPTCHA response.');
  }

  if (integration === 'googleAuth') {
    const { response, data } = await providerResponse(
      fetch,
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(origin ? { Referer: origin } : {}),
        },
        body: '{}',
      },
      'Firebase Authentication'
    );
    if (response.ok) return;

    const errorCode = String(data?.error?.message || '').split(/[ :]/)[0];
    if (['API_KEY_INVALID', 'API_KEY_SERVICE_BLOCKED', 'INVALID_API_KEY'].includes(errorCode)) {
      rejectInvalidKey('The key is invalid.');
    }
    if ([
      'MISSING_EMAIL',
      'MISSING_PASSWORD',
      'OPERATION_NOT_ALLOWED',
      'ADMIN_ONLY_OPERATION',
    ].includes(errorCode)) {
      return;
    }
    throw new Error(
      errorCode
        ? `Firebase Authentication could not confirm that the API key is valid (${errorCode}).`
        : 'Firebase Authentication could not confirm that the API key is valid.'
    );
  }

  throw new Error('Unknown integration key type.');
}

module.exports = function createIntegrationKeyValidationMiddleware({ fetch, removeEnvVar }) {
  return async function validateIntegrationKeys(req, res, next) {
    const body = req.body || {};
    const recaptchaKey = body.RECAPTCHA_CUSTOM_API_KEY || body.CUSTOM_RECAPTCHA_SECRET;
    const firebaseKey = body.FIREBASE_CUSTOM_API_KEY || body.CUSTOM_FIREBASE_API_KEY;

    try {
      if (recaptchaKey) {
        try {
          await validateIntegrationKey(
            'recaptcha',
            recaptchaKey,
            fetch,
            undefined,
            body.recaptchaValidationToken
          );
        } catch (err) {
          if (
            err.code === 'INVALID_INTEGRATION_KEY'
            && recaptchaKey === (process.env.RECAPTCHA_CUSTOM_API_KEY || process.env.CUSTOM_RECAPTCHA_SECRET)
          ) {
            [
              'RECAPTCHA_CUSTOM_API_KEY',
              'CUSTOM_RECAPTCHA_SECRET',
              'RECAPTCHA_SOURCE',
            ].forEach(removeEnvVar);
          }
          throw err;
        }
      }

      if (firebaseKey) {
        await validateIntegrationKey('googleAuth', firebaseKey, fetch, req.get('origin'));
      }

      next();
    } catch (err) {
      res.status(400).json({ message: err.message || 'Could not validate integration key.' });
    }
  };
};

module.exports.validateIntegrationKey = validateIntegrationKey;
