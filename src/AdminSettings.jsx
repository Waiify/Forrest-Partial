import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "./components/AdminHeader.jsx";
import Sidebar from "./components/Adminsidebar.jsx";

// Set VITE_API_URL in your .env file for deployment (e.g. https://your-api.com/api).
const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// The toggles, grouped by purpose.
const GROUPS = [
  {
    title: "Authentication",
    items: [
      {
        key: "googleAuthEnabled",
        label: "Google sign-in",
        description:
          "Let customers sign in or sign up with their Google account. Email and password login always stays available.",
      },
    ],
  },
  {
    title: "Security",
    items: [
      {
        key: "recaptchaEnabled",
        label: "reCAPTCHA",
        description: "Ask customers to pass a human check on sign-in and sign-up.",
        confirmOff:
          "Turning off reCAPTCHA removes bot protection and allows automated sign-ups. Turn it off anyway?",
      },
    ],
  },
  {
    title: "Notifications",
    items: [
      {
        key: "emailEnabled",
        label: "Email",
        description: "Send emails from the system, including password reset codes.",
        confirmOff:
          "With email off, customers can't receive password reset codes. Turn it off anyway?",
      },
      {
        key: "smsEnabled",
        label: "SMS",
        description: "Send text message notifications.",
      },
    ],
  },
];

// The server only lets admins change settings. It checks the logged-in user's id,
// which this reads from browser storage. If your login saves the user under a different
// key, add that key to the list below.
const USER_STORAGE_KEYS = ["user", "currentUser", "authUser", "adminUser"];

function authHeaders() {
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of USER_STORAGE_KEYS) {
      try {
        const user = JSON.parse(storage.getItem(key) || "null");
        const id = user?.id || user?._id;
        if (id) return { "x-user-id": id };
      } catch {
        // Ignore values that are not JSON.
      }
    }
  }
  return {};
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status} ${response.statusText})`);
  }
  return data;
}

function Toggle({ checked, disabled, label, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F9E7A]/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? "bg-[#2F9E7A]" : "bg-[#CFE3D9]"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function AdminSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [savingKey, setSavingKey] = useState("");

  function handleNavigate(section) {
    if (section === "Customers") return navigate("/customers");
    if (section === "Capsule") return navigate("/capsule");
    if (section === "Reservation") return navigate("/reservation");
    if (section === "Settings") return navigate("/settings");
    if (section === "Staff Management" || section === "Management") return navigate("/management");
    return navigate("/dashboard");
  }

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setSettings(await readResponse(await fetch(`${API}/settings`)));
    } catch (err) {
      setError(err.message || "Could not load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let current = true;
    fetch(`${API}/settings`)
      .then(readResponse)
      .then((data) => {
        if (current) setSettings(data);
      })
      .catch((err) => {
        if (current) setError(err.message || "Could not load settings.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, []);

  // Saves one toggle right away. The switch only changes after the server confirms.
  async function toggle(item) {
    const next = !settings[item.key];
    if (!next && item.confirmOff && !window.confirm(item.confirmOff)) return;

    setActionError("");
    setSavingKey(item.key);
    try {
      const updated = await readResponse(
        await fetch(`${API}/settings`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ [item.key]: next }),
        })
      );
      setSettings(updated);
    } catch (err) {
      setActionError(err.message || "Could not save the setting.");
    } finally {
      setSavingKey("");
    }
  }

  return (
    <div className="flex h-screen w-full bg-[#F4F8F5] text-[#0B3B2A]">
      <Sidebar active="Settings" onNavigate={handleNavigate} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header active="Settings" />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-3xl space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#0B3B2A]">Settings</h2>
              <p className="mt-1 text-sm text-[#6F8E7F]">
                Turn sign-in, security, and notification services on or off. Changes save right away.
              </p>
            </div>

            {(error || actionError) && (
              <div
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
                role="alert"
              >
                <span>{error || actionError}</span>
                {error && (
                  <button type="button" onClick={loadSettings} className="font-semibold underline">
                    Try again
                  </button>
                )}
              </div>
            )}

            {loading ? (
              <p className="py-10 text-center text-sm text-[#6F8E7F]">Loading settings...</p>
            ) : settings ? (
              GROUPS.map((group) => (
                <section
                  key={group.title}
                  className="overflow-hidden rounded-2xl border border-[#DCEBE3] bg-white shadow-sm"
                >
                  <h3 className="border-b border-[#DCEBE3] px-5 py-4 font-semibold text-[#0B3B2A] sm:px-6">
                    {group.title}
                  </h3>
                  <ul className="divide-y divide-[#EEF3F0]">
                    {group.items.map((item) => {
                      const on = Boolean(settings[item.key]);
                      return (
                        <li
                          key={item.key}
                          className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[#0B3B2A]">{item.label}</p>
                            <p className="mt-0.5 text-sm text-[#6F8E7F]">{item.description}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span
                              className={`w-8 text-right text-xs font-semibold ${
                                on ? "text-[#2F9E7A]" : "text-[#6F8E7F]"
                              }`}
                            >
                              {savingKey === item.key ? "..." : on ? "On" : "Off"}
                            </span>
                            <Toggle
                              checked={on}
                              disabled={savingKey !== ""}
                              label={`${item.label} ${on ? "on" : "off"}`}
                              onChange={() => toggle(item)}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}