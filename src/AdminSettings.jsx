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
  {
    title: "Integrations",
    items: [
      {
        key: "googleMapsEnabled",
        label: "Google Maps",
        description: "Show Google Maps on the public landing page.",
      },
      {
        key: "pdfExportEnabled",
        label: "PDF export",
        description: "Allow admins to export financial reports as PDF files.",
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

// Fetches one secret (email password or reCAPTCHA secret) only when the admin presses "Show".
async function fetchSecret(field) {
  const data = await readResponse(
    await fetch(`${API}/settings/credentials/reveal?field=${field}`, { headers: authHeaders() })
  );
  return data.value || "";
}

const inputClass =
  "h-10 w-full rounded-lg border border-[#CFE3D9] bg-white px-3 text-sm text-[#0B3B2A] outline-none placeholder:text-[#9DB5A8] focus:border-[#2F9E7A] focus:ring-2 focus:ring-[#2F9E7A]/25 disabled:opacity-60";

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

// Original / Custom switch. "Custom" is disabled until a custom value has been saved.
function SourceSwitch({ source, hasCustom, disabled, onChange }) {
  const options = [
    { value: "original", label: "Original (.env)" },
    { value: "custom", label: "Custom" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Credentials in use"
      className="inline-flex rounded-lg border border-[#CFE3D9] bg-[#F4F8F5] p-0.5"
    >
      {options.map((option) => {
        const active = source === option.value;
        const unavailable = option.value === "custom" && !hasCustom;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled || unavailable}
            title={unavailable ? "No custom credentials saved yet" : undefined}
            onClick={() => !active && onChange(option.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
              active ? "bg-[#2F9E7A] text-white shadow-sm" : "text-[#5F7F70] hover:bg-white"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

// Password-style input with a Show / Hide button.
function SecretInput({ id, value, shown, disabled, placeholder, onChange, onToggle }) {
  return (
    <div className="relative mt-1">
      <input
        id={id}
        type={shown ? "text" : "password"}
        autoComplete="new-password"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} pr-16`}
      />
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-[#2F9E7A] hover:underline disabled:opacity-60"
      >
        {shown ? "Hide" : "Show"}
      </button>
    </div>
  );
}

// Asks for the admin code. Only opened when the admin saves a change.
function AdminCodeModal({ title, description, busy, error, confirmLabel, onCancel, onConfirm }) {
  const [code, setCode] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#04281A]/50 p-4 backdrop-blur-[2px]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onConfirm(code);
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-code-title"
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
      >
        <div className="border-b border-[#DCEBE3] px-6 py-5">
          <h2 id="admin-code-title" className="text-lg font-semibold text-[#0B3B2A]">
            {title}
          </h2>
          <p className="mt-1 text-sm text-[#5F7F70]">{description}</p>
        </div>
        <div className="space-y-3 px-6 py-5">
          <label htmlFor="settings-admin-code" className="block text-sm font-medium text-[#0B3B2A]">
            Admin code
          </label>
          <input
            id="settings-admin-code"
            type="password"
            autoComplete="current-password"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            required
            autoFocus
            className="h-10 w-full rounded-lg border border-[#CFE3D9] bg-white px-3 text-sm text-[#0B3B2A] outline-none focus:border-[#2F9E7A] focus:ring-2 focus:ring-[#2F9E7A]/25"
          />
          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-[#DCEBE3] px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[#5F7F70] hover:bg-[#F3F9F5] disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !code}
            className="rounded-lg bg-[#2F9E7A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2a8f6f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Verifying..." : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [savingKey, setSavingKey] = useState("");

  // One admin-code dialog for everything: { kind: "toggle", item, next } | { kind: "email" } | { kind: "captcha" }
  const [modal, setModal] = useState(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [modalError, setModalError] = useState("");

  // Email sender account
  const [creds, setCreds] = useState({
    user: "",
    savedUser: "",
    source: "original",
    hasCustom: false,
    passSet: false,
  });
  const [pass, setPass] = useState("");
  const [savedPass, setSavedPass] = useState(""); // the password as loaded by "Show", to detect edits
  const [showPass, setShowPass] = useState(false);
  const [credsLoading, setCredsLoading] = useState(true);
  const [credBusy, setCredBusy] = useState(false);
  const [credMsg, setCredMsg] = useState(null); // { type: "ok" | "error", text }

  // reCAPTCHA secret key
  const [captcha, setCaptcha] = useState({ source: "original", hasCustom: false, secretSet: false });
  const [secret, setSecret] = useState("");
  const [savedSecret, setSavedSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [captchaBusy, setCaptchaBusy] = useState(false);
  const [captchaMsg, setCaptchaMsg] = useState(null);

  function applyEmail(data) {
    setCreds({
      user: data.user || "",
      savedUser: data.user || "",
      source: data.source === "custom" ? "custom" : "original",
      hasCustom: Boolean(data.hasCustom),
      passSet: Boolean(data.passSet),
    });
    setPass("");
    setSavedPass("");
    setShowPass(false);
  }

  function applyCaptcha(data) {
    setCaptcha({
      source: data?.source === "custom" ? "custom" : "original",
      hasCustom: Boolean(data?.hasCustom),
      secretSet: Boolean(data?.secretSet),
    });
    setSecret("");
    setSavedSecret("");
    setShowSecret(false);
  }

  function handleNavigate(section) {
    if (section === "Customers") return navigate("/customers");
    if (section === "Capsule") return navigate("/capsule");
    if (section === "Reservation") return navigate("/reservation");
    if (section === "Settings") return navigate("/settings");
    if (section === "Reports" || section === "transactions") return navigate("/reports");
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

  // Load the credentials in effect: the custom ones if the admin switched to them, otherwise the originals
  useEffect(() => {
    let current = true;
    fetch(`${API}/settings/credentials`, { headers: authHeaders() })
      .then(readResponse)
      .then((data) => {
        if (!current) return;
        applyEmail(data);
        applyCaptcha(data.recaptcha);
      })
      .catch((err) => {
        if (current) setCredMsg({ type: "error", text: err.message || "Could not load credentials." });
      })
      .finally(() => {
        if (current) setCredsLoading(false);
      });
    return () => {
      current = false;
    };
  }, []);

  // ---- Toggles ----
  function requestToggle(item) {
    const next = !settings[item.key];
    if (!next && item.confirmOff && !window.confirm(item.confirmOff)) return;

    setActionError("");
    setModalError("");
    setModal({ kind: "toggle", item, next });
  }

  // ---- Email account ----
  const emailChanged = creds.user.trim() !== "" && creds.user.trim() !== creds.savedUser;
  const passChanged = pass !== "" && pass !== savedPass;
  const credsDirty = emailChanged || passChanged;

  async function togglePass() {
    if (showPass) {
      setShowPass(false);
      return;
    }
    if (pass === "" && creds.passSet) {
      try {
        const value = await fetchSecret("emailPass");
        setPass(value);
        setSavedPass(value);
      } catch (err) {
        setCredMsg({ type: "error", text: err.message || "Could not load the password." });
        return;
      }
    }
    setShowPass(true);
  }

  // Switching needs no admin code. Saved custom values are kept either way.
  async function switchEmailSource(source) {
    if (credsDirty && !window.confirm("Discard your unsaved changes?")) return;
    setCredMsg(null);
    setCredBusy(true);
    try {
      const data = await readResponse(
        await fetch(`${API}/settings/credentials/source`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ target: "email", source }),
        })
      );
      applyEmail(data);
      setCredMsg({
        type: "ok",
        text: source === "custom" ? "Now using the custom credentials." : "Now using the original credentials.",
      });
    } catch (err) {
      setCredMsg({ type: "error", text: err.message || "Could not switch credentials." });
    } finally {
      setCredBusy(false);
    }
  }

  function requestSaveCreds(event) {
    event.preventDefault();
    setCredMsg(null);
    if (!credsDirty) return;
    setModalError("");
    setModal({ kind: "email" });
  }

  // ---- reCAPTCHA secret ----
  const secretDirty = secret !== "" && secret !== savedSecret;

  async function toggleSecret() {
    if (showSecret) {
      setShowSecret(false);
      return;
    }
    if (secret === "" && captcha.secretSet) {
      try {
        const value = await fetchSecret("recaptchaSecret");
        setSecret(value);
        setSavedSecret(value);
      } catch (err) {
        setCaptchaMsg({ type: "error", text: err.message || "Could not load the secret key." });
        return;
      }
    }
    setShowSecret(true);
  }

  async function switchCaptchaSource(source) {
    if (secretDirty && !window.confirm("Discard your unsaved changes?")) return;
    setCaptchaMsg(null);
    setCaptchaBusy(true);
    try {
      const data = await readResponse(
        await fetch(`${API}/settings/credentials/source`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ target: "recaptcha", source }),
        })
      );
      applyCaptcha(data.recaptcha);
      setCaptchaMsg({
        type: "ok",
        text: source === "custom" ? "Now using the custom secret key." : "Now using the original secret key.",
      });
    } catch (err) {
      setCaptchaMsg({ type: "error", text: err.message || "Could not switch the secret key." });
    } finally {
      setCaptchaBusy(false);
    }
  }

  function requestSaveCaptcha(event) {
    event.preventDefault();
    setCaptchaMsg(null);
    if (!secretDirty) return;
    setModalError("");
    setModal({ kind: "captcha" });
  }

  // ---- Admin code dialog: runs the pending action, the server verifies the code ----
  async function confirmModal(code) {
    if (!modal) return;
    setModalBusy(true);
    setModalError("");
    if (modal.kind === "toggle") setSavingKey(modal.item.key);

    try {
      if (modal.kind === "toggle") {
        const updated = await readResponse(
          await fetch(`${API}/settings`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ [modal.item.key]: modal.next, adminCode: code }),
          })
        );
        setSettings(updated);
      } else if (modal.kind === "email") {
        const body = { adminCode: code };
        if (emailChanged) body.CUSTOM_EMAIL_USER = creds.user.trim();
        if (passChanged) body.CUSTOM_EMAIL_PASS = pass;
        const data = await readResponse(
          await fetch(`${API}/settings/credentials`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(body),
          })
        );
        applyEmail(data);
        setCredMsg({ type: "ok", text: "Saved. These custom credentials are now in use." });
      } else if (modal.kind === "captcha") {
        const data = await readResponse(
          await fetch(`${API}/settings/credentials`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ adminCode: code, CUSTOM_RECAPTCHA_SECRET: secret.trim() }),
          })
        );
        applyCaptcha(data.recaptcha);
        setCaptchaMsg({ type: "ok", text: "Saved. This custom secret key is now in use." });
      }
      setModal(null);
    } catch (err) {
      setModalError(err.message || "Could not save.");
    } finally {
      setModalBusy(false);
      setSavingKey("");
    }
  }

  function closeModal() {
    setModal(null);
    setModalError("");
  }

  const modalText = !modal
    ? null
    : modal.kind === "toggle"
      ? {
          title: "Confirm settings change",
          description: `Enter your admin code to turn ${modal.item.label} ${modal.next ? "on" : "off"}.`,
          confirmLabel: "Confirm",
        }
      : modal.kind === "email"
        ? {
            title: "Save email credentials",
            description: "Enter your admin code to save these as the custom email credentials.",
            confirmLabel: "Save credentials",
          }
        : {
            title: "Save reCAPTCHA secret key",
            description: "Enter your admin code to save this as the custom reCAPTCHA secret key.",
            confirmLabel: "Save secret key",
          };

  // reCAPTCHA secret key, shown inside the reCAPTCHA toggle row
  const captchaPanel = (
    <form onSubmit={requestSaveCaptcha} className="mt-4 space-y-4 border-t border-[#EEF3F0] pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="max-w-md text-sm text-[#6F8E7F]">
                    The server-side key that verifies sign-in and sign-up checks. It must belong to the
                    same reCAPTCHA site as the site key in your frontend.
                  </p>
                  <SourceSwitch
                    source={captcha.source}
                    hasCustom={captcha.hasCustom}
                    disabled={credsLoading || captchaBusy}
                    onChange={switchCaptchaSource}
                  />
                </div>

                <div>
                  <label htmlFor="captcha-secret" className="block text-sm font-medium text-[#0B3B2A]">
                    Secret key
                  </label>
                  <SecretInput
                    id="captcha-secret"
                    value={secret}
                    shown={showSecret}
                    disabled={credsLoading || captchaBusy}
                    placeholder={captcha.secretSet ? "••••••••" : "Enter the secret key"}
                    onChange={setSecret}
                    onToggle={toggleSecret}
                  />
                  <p className="mt-1 text-xs text-[#6F8E7F]">
                    {captcha.source === "custom"
                      ? "This is the custom key (CUSTOM_RECAPTCHA_SECRET)."
                      : "This is the original key from .env (RECAPTCHA_SECRET)."}
                  </p>
                </div>

                {!captcha.hasCustom && (
                  <p className="text-xs text-[#6F8E7F]">
                    No custom key yet. Enter a new key and save to create one.
                  </p>
                )}

                {captchaMsg && (
                  <p
                    role="status"
                    className={`text-sm ${captchaMsg.type === "ok" ? "text-[#2F9E7A]" : "text-red-700"}`}
                  >
                    {captchaMsg.text}
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={credsLoading || captchaBusy || !secretDirty}
                    className="rounded-lg bg-[#2F9E7A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2a8f6f] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Save secret key
                  </button>
                </div>
              </form>
  );

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
                Turn on or off services and manage the email account and reCAPTCHA key the system uses.
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
                        <li key={item.key} className="px-5 py-4 sm:px-6">
                          <div className="flex items-center justify-between gap-4">
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
                          </div>
                          {item.key === "recaptchaEnabled" && captchaPanel}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            ) : null}

            {/* Email sender account */}
            <section className="overflow-hidden rounded-2xl border border-[#DCEBE3] bg-white shadow-sm">
              <h3 className="border-b border-[#DCEBE3] px-5 py-4 font-semibold text-[#0B3B2A] sm:px-6">
                Email sender account
              </h3>
              <form onSubmit={requestSaveCreds} className="space-y-4 px-5 py-5 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-[#6F8E7F]">
                    The account that sends password reset codes.
                  </p>
                  <SourceSwitch
                    source={creds.source}
                    hasCustom={creds.hasCustom}
                    disabled={credsLoading || credBusy}
                    onChange={switchEmailSource}
                  />
                </div>

                <div>
                  <label htmlFor="cred-user" className="block text-sm font-medium text-[#0B3B2A]">
                    Email address
                  </label>
                  <input
                    id="cred-user"
                    type="email"
                    autoComplete="off"
                    value={creds.user}
                    disabled={credsLoading || credBusy}
                    onChange={(event) => setCreds((c) => ({ ...c, user: event.target.value }))}
                    className={`mt-1 ${inputClass}`}
                  />
                  <p className="mt-1 text-xs text-[#6F8E7F]">
                    {creds.source === "custom"
                      ? "Showing the custom email."
                      : "Showing the original email from .env."}
                  </p>
                </div>

                <div>
                  <label htmlFor="cred-pass" className="block text-sm font-medium text-[#0B3B2A]">
                    Password
                  </label>
                  <SecretInput
                    id="cred-pass"
                    value={pass}
                    shown={showPass}
                    disabled={credsLoading || credBusy}
                    placeholder={creds.passSet ? "••••••••" : "Enter a password"}
                    onChange={setPass}
                    onToggle={togglePass}
                  />
                  <p className="mt-1 text-xs text-[#6F8E7F]">
                    {creds.source === "custom"
                      ? "This is the custom password."
                      : "This is the original password from .env."}{" "}
                    For Gmail, use a 16-character app password.
                  </p>
                </div>

                {!creds.hasCustom && (
                  <p className="text-xs text-[#6F8E7F]">
                    No custom credentials yet. Change the email or password and save to create them.
                  </p>
                )}

                {credMsg && (
                  <p
                    role="status"
                    className={`text-sm ${credMsg.type === "ok" ? "text-[#2F9E7A]" : "text-red-700"}`}
                  >
                    {credMsg.text}
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={credsLoading || credBusy || !credsDirty}
                    className="rounded-lg bg-[#2F9E7A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2a8f6f] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Save credentials
                  </button>
                </div>
              </form>
            </section>
          </div>
        </main>
      </div>

      {modal && (
        <AdminCodeModal
          key={modal.kind + (modal.item?.key || "")}
          title={modalText.title}
          description={modalText.description}
          confirmLabel={modalText.confirmLabel}
          busy={modalBusy}
          error={modalError}
          onCancel={closeModal}
          onConfirm={confirmModal}
        />
      )}
    </div>
  );
} 