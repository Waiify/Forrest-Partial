'use strict';

const assert = require('node:assert/strict');
const express = require('express');
const test = require('node:test');
const createGoogleSignInRateLimit = require('./googleSignInRateLimit');

test('allows five Google sign-in requests per IP and blocks the sixth', async (t) => {
  const app = express();
  app.post('/google-sync', createGoogleSignInRateLimit({ windowMs: 60_000, limit: 5 }), (req, res) => {
    res.sendStatus(204);
  });

  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  t.after(() => new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  }));

  const { port } = server.address();
  const responses = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    responses.push(await fetch(`http://127.0.0.1:${port}/google-sync`, { method: 'POST' }));
  }

  assert.deepEqual(responses.slice(0, 5).map((response) => response.status), [204, 204, 204, 204, 204]);
  assert.equal(responses[5].status, 429);
  assert.match((await responses[5].json()).message, /Too many Google sign-in attempts/);
});
