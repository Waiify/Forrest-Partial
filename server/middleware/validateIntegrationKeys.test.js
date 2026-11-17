'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const createIntegrationKeyValidationMiddleware = require('./validateIntegrationKeys');
const validateIntegrationKey = createIntegrationKeyValidationMiddleware.validateIntegrationKey;

function providerStub({ ok, status = 200, body }) {
  return async () => ({
    ok,
    status,
    json: async () => body,
  });
}

test('rejects invalid reCAPTCHA secrets', async () => {
  await assert.rejects(
    validateIntegrationKey('recaptcha', 'invalid-secret', providerStub({
      ok: true,
      body: { success: false, 'error-codes': ['invalid-input-secret'] },
    }), undefined, 'real-response-token'),
    (error) => {
      assert.equal(error.message, 'The key is invalid.');
      assert.equal(error.code, 'INVALID_INTEGRATION_KEY');
      return true;
    }
  );
});

test('accepts a reCAPTCHA secret only when Google verifies a real response token', async () => {
  await validateIntegrationKey('recaptcha', 'valid-secret', providerStub({
    ok: true,
    body: { success: true },
  }), undefined, 'real-response-token');
});

test('does not accept an invalid reCAPTCHA secret with a synthetic token', async () => {
  await assert.rejects(
    validateIntegrationKey('recaptcha', 'invalid-secret', providerStub({
      ok: true,
      body: { success: false, 'error-codes': ['invalid-input-response'] },
    }), undefined, 'synthetic-response-token'),
    /could not verify/
  );
});

test('rejects invalid Firebase API keys without submitting a user account', async () => {
  let requestBody;
  const fetch = async (_url, options) => {
    requestBody = options.body;
    return {
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'API_KEY_INVALID' } }),
    };
  };

  await assert.rejects(
    validateIntegrationKey('googleAuth', 'invalid-key', fetch),
    /The key is invalid/
  );
  assert.equal(requestBody, '{}');
});

test('accepts recognized Firebase keys when the empty validation request needs credentials', async () => {
  await validateIntegrationKey('googleAuth', 'valid-key', providerStub({
    ok: false,
    status: 400,
    body: { error: { message: 'MISSING_EMAIL : Missing email.' } },
  }));
});

test('accepts recognized Firebase keys when account creation is admin-only', async () => {
  await validateIntegrationKey('googleAuth', 'valid-key', providerStub({
    ok: false,
    status: 400,
    body: { error: { message: 'ADMIN_ONLY_OPERATION' } },
  }));
});

test('validation middleware blocks saving and removes a rejected stored reCAPTCHA key', async () => {
  const originalKey = process.env.RECAPTCHA_CUSTOM_API_KEY;
  const originalSource = process.env.RECAPTCHA_SOURCE;
  process.env.RECAPTCHA_CUSTOM_API_KEY = 'invalid-saved-key';
  process.env.RECAPTCHA_SOURCE = 'custom';
  const removed = [];
  let nextCalled = false;
  const middleware = createIntegrationKeyValidationMiddleware({
    fetch: providerStub({
      ok: true,
      body: { success: false, 'error-codes': ['invalid-input-secret'] },
    }),
    removeEnvVar: (name) => {
      removed.push(name);
      delete process.env[name];
    },
  });
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  try {
    await middleware({
      body: {
        RECAPTCHA_CUSTOM_API_KEY: 'invalid-saved-key',
        recaptchaValidationToken: 'real-response-token',
      },
      get: () => undefined,
    }, response, () => {
      nextCalled = true;
    });
    assert.equal(response.statusCode, 400);
    assert.equal(response.body.message, 'The key is invalid.');
    assert.equal(nextCalled, false);
    assert.deepEqual(removed, [
      'RECAPTCHA_CUSTOM_API_KEY',
      'CUSTOM_RECAPTCHA_SECRET',
      'RECAPTCHA_SOURCE',
    ]);
  } finally {
    if (originalKey === undefined) delete process.env.RECAPTCHA_CUSTOM_API_KEY;
    else process.env.RECAPTCHA_CUSTOM_API_KEY = originalKey;
    if (originalSource === undefined) delete process.env.RECAPTCHA_SOURCE;
    else process.env.RECAPTCHA_SOURCE = originalSource;
  }
});
