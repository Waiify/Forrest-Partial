# Forrest Study Hub

## Run locally

Install the frontend dependencies:

```sh
npm install
npm ci --prefix server
```

Start the API in one terminal:

```sh
npm run server
```

Start the Vite website in another terminal:

```sh
npm run dev
```

The website is served at `http://localhost:5173` and the API at `http://localhost:5000`. The API requires its MongoDB settings and a stable, random `JWT_SECRET` in `server/.env`, plus the Firebase Admin service-account file at `server/serviceAccountKey.json`. Generate a secret with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. In development, the API can start without it, but login tokens will stop working after a backend restart. If deployed behind a trusted reverse proxy, set `TRUST_PROXY_HOPS` to the number of proxy hops so audit logs can record the visitor's IP.

## Reservation QR check-in

When a reservation is confirmed, its QR credential is stored as a SHA-256 hash. The customer sees and can download the QR code in **My Reservations**; only the reservation owner can issue or view it. Staff with reservation view and update permissions, and admins, can open **QR Scanner** from the staff sidebar and scan it using a camera-enabled browser. Camera access requires HTTPS in production (localhost is allowed for development). Administrators can turn QR issuance and check-in on or off in Settings.

QR codes are single-use and expire when the reservation ends. Cancelling or rescheduling invalidates the current code, and issuing a replacement invalidates the previous one. Successful scans set the reservation status to **Checked in** and are recorded in the existing audit log. No additional environment variables are required.

The **Google Drive** Settings switch controls whether exported PDF reports are also saved to Drive. Turning it off leaves PDF downloads available but blocks Drive authorization and uploads.

Settings access requires an admin login, a one-time code sent to an address from the comma-separated `DEVELOPER_OTP_EMAILS` allowlist in `server/.env`, and the admin code. OTP delivery tries the custom email account first and falls back to the original `EMAIL_USER` / `EMAIL_PASS` credentials, independent of the Email integration toggle. The unlock lasts 15 minutes. Set `ADMIN_CODE` directly in `server/.env`; it is stored as plain text, so protect that file and do not commit it.

## Google Drive report backups

The backend reads `server/.env` (not the repository-root `.env`). Create `server/.env` if it does not exist, preserve the backend's existing settings there, and add these values. Do not use `VITE_` variable names because the OAuth client secret and token-encryption key must remain server-only:

```dotenv
GOOGLE_DRIVE_CLIENT_ID=your-oauth-client-id
GOOGLE_DRIVE_CLIENT_SECRET=your-oauth-client-secret
GOOGLE_DRIVE_REDIRECT_URI=http://localhost:5000/api/drive/oauth2callback
GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY=generate-a-64-character-hex-key
GOOGLE_DRIVE_ACCOUNT_EMAIL=forestcoworkingspace2026@gmail.com
FRONTEND_URL=http://localhost:5173
```

After setup, an admin can review the active Google Drive credentials in **Settings > Integrations > Google Drive**, reveal them on demand, and add or switch to a complete custom credential set. The client ID, client secret, redirect URI, token-encryption key, and designated account email can be customized. If the encryption key is changed, reconnect Google Drive so its stored OAuth tokens can be encrypted with the new key.

Generate the encryption key with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. Back up this key securely and keep it stable: OAuth tokens are encrypted in MongoDB with AES-256-GCM and cannot be decrypted after the key is lost or changed. `server/.env` is ignored by Git.

Start the backend and frontend, sign in as an admin, open Reports, then choose **Connect Google Drive** and authorize `forestcoworkingspace2026@gmail.com`. The callback verifies the Google account, and the backend stores encrypted tokens in MongoDB. PDF report exports continue to download normally and are also uploaded into an app-created `Forrest Reports` Drive folder. Expired access tokens are refreshed automatically. Staff who already have the `reports:export` permission can export reports and trigger uploads but cannot authorize or replace the Drive account.

The upload service accepts PDF, CSV, and Excel MIME types. This project currently generates only the PDF financial report; it does not add or replace CSV/Excel report-generation features.

### Setup and test

1. Install the frontend and backend packages with `npm install` and `npm ci --prefix server`.
2. Create `server/.env` if needed, retain the backend's required existing settings, and add the Google values above. Generate the encryption key locally; never paste credentials into chat or frontend variables.
3. In Google Cloud, confirm the OAuth client's authorized redirect URI is exactly `http://localhost:5000/api/drive/oauth2callback`.
4. Run `npm run server` and `npm run dev` in separate terminals.
5. Sign in as an admin, open Reports, connect the designated Google account, then export a PDF. Confirm both that the PDF downloads and that a copy appears in the Drive folder. The page reports whether Drive saved the copy.

If authorization reports a redirect mismatch, compare the redirect URI character-for-character in `server/.env` and Google Cloud. If it reports the wrong account, authorize as the configured Forrest account. If the PDF downloads but Drive upload fails, check the backend log and verify MongoDB connectivity, Drive API access, and that the encryption key has not changed. The local download intentionally remains available when Google Drive is unavailable.

## Checks

```sh
npm run build
npm run lint
```
