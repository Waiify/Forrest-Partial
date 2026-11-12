'use strict';

const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const fetch = (...args) => import('node-fetch').then(({ default: fetchImpl }) => fetchImpl(...args));
const CONNECTION_ID = 'forrest-reports';
const ACCOUNT_EMAIL = (process.env.GOOGLE_DRIVE_ACCOUNT_EMAIL || 'forestcoworkingspace2026@gmail.com').trim().toLowerCase();
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

function configurationError(message) {
  return Object.assign(new Error(message), { status: 503 });
}

module.exports = function registerGoogleDrive(app, { mongoose, User, requireLogin, requirePermission }) {
  const connectionSchema = new mongoose.Schema({
    _id: { type: String, default: CONNECTION_ID },
    encryptedTokens: { type: String, required: true },
    accountEmail: { type: String, required: true },
    folderId: String,
  }, { collection: 'GoogleDriveConnections' });
  const oauthStateSchema = new mongoose.Schema({
    stateHash: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
  }, { collection: 'GoogleDriveOAuthStates' });
  oauthStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  const DriveConnection = mongoose.models.GoogleDriveConnection
    || mongoose.model('GoogleDriveConnection', connectionSchema);
  const DriveOAuthState = mongoose.models.GoogleDriveOAuthState
    || mongoose.model('GoogleDriveOAuthState', oauthStateSchema);

  function getConfiguration() {
    const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI;
    const encryptionKey = process.env.GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY;

    if (!clientId || !clientSecret || !redirectUri) {
      throw configurationError('Google Drive OAuth is not configured on the server.');
    }
    if (!/^[\da-f]{64}$/i.test(encryptionKey || '')) {
      throw configurationError('Google Drive token encryption is not configured on the server.');
    }

    let callback;
    try {
      callback = new URL(redirectUri);
    } catch {
      throw configurationError('GOOGLE_DRIVE_REDIRECT_URI must be an absolute URL.');
    }
    if (callback.protocol !== 'https:' && !(callback.protocol === 'http:' && callback.hostname === 'localhost')) {
      throw configurationError('Google Drive redirect URI must use HTTPS, except for localhost development.');
    }

    return {
      clientId,
      clientSecret,
      redirectUri,
      encryptionKey: Buffer.from(encryptionKey, 'hex'),
    };
  }

  function createOAuthClient(configuration = getConfiguration()) {
    return new OAuth2Client(configuration.clientId, configuration.clientSecret, configuration.redirectUri);
  }

  function encryptTokens(tokens) {
    const { encryptionKey } = getConfiguration();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(tokens), 'utf8'),
      cipher.final(),
    ]);
    return [iv.toString('hex'), cipher.getAuthTag().toString('hex'), ciphertext.toString('base64')].join('.');
  }

  function decryptTokens(encryptedTokens) {
    const { encryptionKey } = getConfiguration();
    const [ivHex, tagHex, ciphertext] = encryptedTokens.split('.');
    if (!ivHex || !tagHex || !ciphertext) throw new Error('Stored Google Drive credentials are invalid.');

    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');
    return JSON.parse(plaintext);
  }

  async function saveTokens(incomingTokens, accountEmail) {
    const existing = await DriveConnection.findById(CONNECTION_ID);
    const previousTokens = existing?.encryptedTokens ? decryptTokens(existing.encryptedTokens) : {};
    const storedTokens = Object.fromEntries(
      Object.entries(incomingTokens).filter(([key]) =>
        ['access_token', 'refresh_token', 'scope', 'token_type', 'expiry_date'].includes(key)
      )
    );
    const tokens = { ...previousTokens, ...storedTokens };
    if (!storedTokens.refresh_token && previousTokens.refresh_token) {
      tokens.refresh_token = previousTokens.refresh_token;
    }

    const connection = existing || new DriveConnection({ _id: CONNECTION_ID });
    connection.encryptedTokens = encryptTokens(tokens);
    connection.accountEmail = accountEmail;
    await connection.save();
    return { connection, tokens };
  }

  async function refreshTokens(client, connection, tokens) {
    if (!tokens.refresh_token) {
      throw new Error('Google Drive authorization has expired. An admin must reconnect the account.');
    }

    client.setCredentials(tokens);
    const refreshed = await client.refreshAccessToken();
    const mergedTokens = { ...tokens, ...refreshed.credentials };
    if (!mergedTokens.refresh_token) mergedTokens.refresh_token = tokens.refresh_token;
    connection.encryptedTokens = encryptTokens(mergedTokens);
    await connection.save();
    client.setCredentials(mergedTokens);
    return mergedTokens;
  }

  async function getConnectionClient() {
    const configuration = getConfiguration();
    const connection = await DriveConnection.findById(CONNECTION_ID);
    if (!connection) return null;
    if (connection.accountEmail.toLowerCase() !== ACCOUNT_EMAIL) {
      throw new Error('The saved Google Drive connection does not match the designated account.');
    }

    const tokens = decryptTokens(connection.encryptedTokens);
    const client = createOAuthClient(configuration);
    client.setCredentials(tokens);
    if (!tokens.access_token || !tokens.expiry_date || tokens.expiry_date <= Date.now() + 60_000) {
      await refreshTokens(client, connection, tokens);
    }
    return { client, connection };
  }

  async function authorizedFetch(client, url, options = {}) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { token } = await client.getAccessToken();
      if (!token) throw new Error('Google Drive did not provide an access token.');
      const response = await fetch(url, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(30_000),
      });
      if (response.status !== 401 || attempt === 1) return response;
      await response.arrayBuffer();
      const connection = await DriveConnection.findById(CONNECTION_ID);
      if (!connection) throw new Error('Google Drive is no longer connected.');
      await refreshTokens(client, connection, decryptTokens(connection.encryptedTokens));
    }
    throw new Error('Google Drive authorization failed.');
  }

  async function parseDriveResponse(response, operation) {
    const body = await response.text();
    let data = {};
    try {
      data = body ? JSON.parse(body) : {};
    } catch {
      throw new Error(`Google Drive returned an invalid response while ${operation}.`);
    }
    if (!response.ok) {
      const detail = data.error?.message || `HTTP ${response.status}`;
      throw new Error(`Google Drive could not ${operation}: ${detail}`);
    }
    return data;
  }

  async function getOrCreateFolder(client, connection) {
    if (connection.folderId) return connection.folderId;

    const query = encodeURIComponent(`name = 'Forrest Reports' and mimeType = '${FOLDER_MIME_TYPE}' and trashed = false`);
    const listResponse = await authorizedFetch(
      client,
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&pageSize=10`
    );
    const result = await parseDriveResponse(listResponse, 'find the reports folder');
    let folder = result.files?.[0];
    if (!folder) {
      const createResponse = await authorizedFetch(client, 'https://www.googleapis.com/drive/v3/files?fields=id,name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Forrest Reports', mimeType: FOLDER_MIME_TYPE }),
      });
      folder = await parseDriveResponse(createResponse, 'create the reports folder');
    }
    if (!folder?.id) throw new Error('Google Drive did not return a reports folder ID.');

    connection.folderId = folder.id;
    await connection.save();
    return folder.id;
  }

  async function uploadReportToDrive({ buffer, filename, mimeType }) {
    if (!Buffer.isBuffer(buffer)) throw new TypeError('Report content must be a Buffer.');
    if (!SUPPORTED_MIME_TYPES.has(mimeType)) throw new TypeError('This report file type is not supported by Google Drive upload.');
    if (typeof filename !== 'string' || !filename.trim() || /[/\\\r\n]/.test(filename)) {
      throw new TypeError('A valid report filename is required.');
    }

    const connected = await getConnectionClient();
    if (!connected) return { status: 'not-connected' };

    const { client, connection } = connected;
    const folderId = await getOrCreateFolder(client, connection);
    const boundary = `forrest-${crypto.randomBytes(16).toString('hex')}`;
    const metadata = JSON.stringify({ name: filename, mimeType, parents: [folderId] });
    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
      buffer,
      Buffer.from(`\r\n--${boundary}--`),
    ]);

    const response = await authorizedFetch(
      client,
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink',
      {
        method: 'POST',
        headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
        body,
      }
    );
    const uploaded = await parseDriveResponse(response, 'upload the report');
    if (!uploaded.id) throw new Error('Google Drive did not confirm the report upload.');
    return { status: 'uploaded', fileId: uploaded.id };
  }

  app.get('/api/drive/status', requireLogin, requirePermission('reports', 'export'), async (req, res) => {
    try {
      let configured = false;
      try {
        getConfiguration();
        configured = true;
      } catch (err) {
        if (err.status !== 503) throw err;
      }
      const connection = configured ? await DriveConnection.findById(CONNECTION_ID).select('accountEmail') : null;
      res.json({
        configured,
        connected: Boolean(connection && connection.accountEmail.toLowerCase() === ACCOUNT_EMAIL),
        accountEmail: connection?.accountEmail || null,
      });
    } catch (err) {
      console.error('Could not read Google Drive connection status:', err);
      res.status(500).json({ message: 'Could not read Google Drive connection status.' });
    }
  });

  app.get('/api/drive/authorize', requireLogin, requirePermission('reports', 'export'), async (req, res) => {
    try {
      if (req.authUser.role !== 'admin') {
        return res.status(403).json({ message: 'Only an admin can connect the Forrest Google Drive account.' });
      }
      const configuration = getConfiguration();
      const state = crypto.randomBytes(32).toString('hex');
      await DriveOAuthState.create({
        stateHash: crypto.createHash('sha256').update(state).digest('hex'),
        userId: req.authUser._id,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      const client = createOAuthClient(configuration);
      const authorizationUrl = client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: true,
        login_hint: ACCOUNT_EMAIL,
        scope: [DRIVE_SCOPE, 'openid', 'email'],
        state,
      });
      res.json({ authorizationUrl });
    } catch (err) {
      console.error('Could not start Google Drive authorization:', err);
      res.status(err.status || 500).json({ message: err.status ? err.message : 'Could not start Google Drive authorization.' });
    }
  });

  app.get('/api/drive/oauth2callback', async (req, res) => {
    try {
      if (req.query.error) return res.status(400).send('Google Drive authorization was not completed. You can close this window.');
      const state = typeof req.query.state === 'string' ? req.query.state : '';
      const code = typeof req.query.code === 'string' ? req.query.code : '';
      if (!state || !code) return res.status(400).send('Google Drive authorization response is incomplete.');

      const stateHash = crypto.createHash('sha256').update(state).digest('hex');
      const oauthState = await DriveOAuthState.findOneAndDelete({
        stateHash,
        expiresAt: { $gt: new Date() },
      });
      if (!oauthState) return res.status(400).send('Google Drive authorization expired or was already used. Start again from Reports.');

      const admin = await User.findOne({
        _id: oauthState.userId,
        role: 'admin',
        status: { $ne: 'disabled' },
      }).select('_id').lean();
      if (!admin) return res.status(403).send('Only an active admin can connect Google Drive.');

      const configuration = getConfiguration();
      const client = createOAuthClient(configuration);
      const { tokens } = await client.getToken(code);
      if (!tokens.id_token) throw new Error('Google did not return a verified account identity.');
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: configuration.clientId });
      const identity = ticket.getPayload();
      const email = identity?.email?.toLowerCase();
      if (!identity?.email_verified || email !== ACCOUNT_EMAIL) {
        return res.status(403).send(`Authorize Google Drive with ${ACCOUNT_EMAIL}.`);
      }

      await saveTokens(tokens, email);
      const reportsUrl = new URL('/reports', process.env.FRONTEND_URL || 'http://localhost:5173');
      reportsUrl.searchParams.set('drive', 'connected');
      res.redirect(reportsUrl.toString());
    } catch (err) {
      console.error('Google Drive OAuth callback failed:', err);
      res.status(500).send('Could not complete Google Drive authorization. Check the backend logs and try again.');
    }
  });

  return { uploadReportToDrive };
};
