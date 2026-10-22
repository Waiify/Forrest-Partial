import { useEffect, useState } from "react";

// Set VITE_API_URL in your .env file for deployment (e.g. https://your-api.com/api).
const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Everything counts as ON until the server says otherwise. If the request fails,
// the options stay visible, and the server still blocks anything the admin turned off.
const DEFAULTS = {
  googleAuthEnabled: true,
  recaptchaEnabled: true,
  emailEnabled: true,
  smsEnabled: true,
};

// Reads the admin's on/off settings from the server.
export default function useSettings() {
  const [settings, setSettings] = useState(DEFAULTS);

  useEffect(() => {
    let current = true;
    fetch(`${API}/settings`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Request failed"))))
      .then((data) => {
        if (current) setSettings({ ...DEFAULTS, ...data });
      })
      .catch(() => {
        // Keep the defaults.
      });
    return () => {
      current = false;
    };
  }, []);

  return settings;
}