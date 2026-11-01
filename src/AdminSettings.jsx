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
  const [pendingToggle, setPendingToggle] = useState(null);
  const [adminCode, setAdminCode] = useState("");
  const [codeError, setCodeError] = useState("");

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

  function requestToggle(item) {
    const next = !settings[item.key];
    if (!next && item.confirmOff && !window.confirm(item.confirmOff)) return;

    setActionError("");
    setCodeError("");
    setAdminCode("");
    setPendingToggle({ item, next });
  }

  // The server verifies the admin code before saving the setting.
  async function confirmToggle(event) {
    event.preventDefault();
    if (!pendingToggle) return;

    const { item, next } = pendingToggle;
    setSavingKey(item.key);
    try {
      const updated = await readResponse(
        await fetch(`${API}/settings`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ [item.key]: next, adminCode }),
        })
      );
      setSettings(updated);
      setPendingToggle(null);
      setAdminCode("");
    } catch (err) {
      setCodeError(err.message || "Could not save the setting.");
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
                Turn on or off services.
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
                              onChange={() => requestToggle(item)}
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
      {pendingToggle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#04281A]/50 p-4 backdrop-blur-[2px]">
          <form
            onSubmit={confirmToggle}
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-code-title"
            className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
          >
            <div className="border-b border-[#DCEBE3] px-6 py-5">
              <h2 id="admin-code-title" className="text-lg font-semibold text-[#0B3B2A]">
                Confirm settings change
              </h2>
              <p className="mt-1 text-sm text-[#5F7F70]">
                Enter your admin code to turn {pendingToggle.item.label} {pendingToggle.next ? "on" : "off"}.
              </p>
            </div>
            <div className="space-y-3 px-6 py-5">
              <label htmlFor="settings-admin-code" className="block text-sm font-medium text-[#0B3B2A]">
                Admin code
              </label>
              <input
                id="settings-admin-code"
                type="password"
                autoComplete="current-password"
                value={adminCode}
                onChange={(event) => setAdminCode(event.target.value)}
                required
                autoFocus
                className="h-10 w-full rounded-lg border border-[#CFE3D9] bg-white px-3 text-sm text-[#0B3B2A] outline-none focus:border-[#2F9E7A] focus:ring-2 focus:ring-[#2F9E7A]/25"
              />
              {codeError && (
                <p className="text-sm text-red-700" role="alert">
                  {codeError}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-[#DCEBE3] px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setPendingToggle(null);
                  setAdminCode("");
                  setCodeError("");
                }}
                disabled={savingKey !== ""}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[#5F7F70] hover:bg-[#F3F9F5] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingKey !== "" || !adminCode}
                className="rounded-lg bg-[#2F9E7A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2a8f6f] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingKey ? "Verifying..." : "Confirm"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}