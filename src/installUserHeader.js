// src/installUserHeader.js
// Adds the server-issued session token to same-origin API requests.
// Import it once, at the very top of main.jsx:   import "./installUserHeader.js";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const API_ORIGIN = new URL(API_URL).origin;

const originalFetch = window.fetch.bind(window);

window.fetch = (input, init = {}) => {
  try {
    const url = typeof input === "string" ? input : input?.url || String(input);
    const targetOrigin = new URL(url, window.location.href).origin;
    const token = sessionStorage.getItem("token");

    if (token && targetOrigin === API_ORIGIN) {
      const headers = new Headers(init.headers || (typeof input === "object" ? input.headers : undefined));
      if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
      return originalFetch(input, { ...init, headers });
    }
  } catch {
    // never block a request because of this helper
  }
  return originalFetch(input, init);
};