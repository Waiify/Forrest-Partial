# Forrest Study Hub

## Run locally

Install the frontend dependencies:

```sh
npm install
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

Settings access requires an admin login, a one-time code sent to an address from the comma-separated `DEVELOPER_OTP_EMAILS` allowlist in `server/.env`, and the admin code. OTP delivery tries the custom email account first and falls back to the original `EMAIL_USER` / `EMAIL_PASS` credentials, independent of the Email integration toggle. The unlock lasts 15 minutes. Set `ADMIN_CODE` directly in `server/.env`; it is stored as plain text, so protect that file and do not commit it.

## Checks

```sh
npm run build
npm run lint
```
