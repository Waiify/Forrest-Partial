import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import originalConfig from "./firebase.config.json";

const RAW_API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
const API = RAW_API.endsWith("/api") ? RAW_API : `${RAW_API}/api`;
let clientKeysPromise;
let authPromise;

export function getClientKeys() {
  if (!clientKeysPromise) {
    clientKeysPromise = fetch(`${API}/client-keys`, { cache: "no-store" }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `Could not load client API keys (${response.status}).`);
      }
      return data;
    });
  }
  return clientKeysPromise;
}

export function getFirebaseAuth() {
  if (!authPromise) {
    authPromise = getClientKeys().then((keys) => {
      const app = initializeApp({
        ...originalConfig,
        apiKey: keys.googleAuthApiKey || originalConfig.apiKey,
      });
      return getAuth(app);
    });
  }
  return authPromise;
}

export const googleProvider = new GoogleAuthProvider();