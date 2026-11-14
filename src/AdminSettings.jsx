import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Cloud, QrCode } from "lucide-react";

import Header from "./components/AdminHeader.jsx";
import Sidebar from "./components/Adminsidebar.jsx";
import Swal from "sweetalert2";

// Strip a trailing slash and make sure the URL ends in /api
// (set VITE_API_URL in your .env for deployment, e.g. https://your-api.com or https://your-api.com/api)
const RAW_API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
const API = RAW_API.endsWith("/api") ? RAW_API : `${RAW_API}/api`;

/* -------------------------------------------------------------------------- */
/* Logos (inline SVG so they never break and need no network or extra files)   */
/* -------------------------------------------------------------------------- */

function GoogleLogo({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function GoogleMapsLogo({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path fill="#34A853" d="M12 22s-1.6-1.85-3.1-4.1L12 14.6z" />
      <path fill="#FBBC05" d="M5.2 14.6C4.4 13.3 4 11.9 4 10.5c0-.5.05-1 .15-1.45L9 13.6 12 14.6l-3.1 3.3c-1.4-1.3-2.6-2.1-3.7-3.3z" />
      <path fill="#4285F4" d="M4.15 9.05A8 8 0 0 1 12 2.5c1.1 0 2.1.2 3 .6L9 13.6z" />
      <path fill="#EA4335" d="M12 2.5a8 8 0 0 1 8 8c0 1.5-.5 3-1.2 4.3-.9 1.7-2.2 3.4-3.7 5.2L12 22v-7.4l3-1 3.3-3.1c.1-.3.2-.7.2-1A6.5 6.5 0 0 0 12 2.5z" opacity=".9" />
      <circle cx="12" cy="10.2" r="2.6" fill="#fff" />
    </svg>
  );
}

function RecaptchaLogo({ className = "h-6 w-6" }) {
  const arrow = "12,2.4 15.8,5 12,7.6";
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" strokeWidth="2.6" aria-hidden="true">
      <path d="M12 5 A7 7 0 0 1 18.06 15.5" stroke="#4285F4" />
      <path d="M18.06 15.5 A7 7 0 0 1 5.94 15.5" stroke="#1C3AA9" />
      <path d="M5.94 15.5 A7 7 0 0 1 12 5" stroke="#ABABAB" />
      <polygon points={arrow} fill="#4285F4" stroke="none" transform="rotate(120 12 12)" />
      <polygon points={arrow} fill="#1C3AA9" stroke="none" transform="rotate(240 12 12)" />
      <polygon points={arrow} fill="#ABABAB" stroke="none" />
    </svg>
  );
}

function EmailLogo({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <rect x="2.5" y="5" width="19" height="14" rx="2.2" fill="#fff" stroke="#EA4335" strokeWidth="1.8" />
      <path d="M3.5 7l8.5 6.2L20.5 7" stroke="#EA4335" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PdfLogo({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#E5484D" />
      <path d="M14 2v5h5" fill="#F7A9AB" />
      <text x="11.5" y="17" fontSize="6" fontWeight="700" fill="#fff" textAnchor="middle" fontFamily="Arial, sans-serif">
        PDF
      </text>
    </svg>
  );
}

function Chevron({ open }) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={`h-5 w-5 shrink-0 text-[#6F8E7F] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 8l5 5 5-5" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Config                                                                      */
/* -------------------------------------------------------------------------- */

// The toggles, grouped by purpose. `sourceNoun` is used for the "Original key / Custom key" badge.
const GROUPS = [
  {
    title: "Sign-in and security",
    items: [
      {
        key: "googleAuthEnabled",
        label: "Google sign-in",
        Logo: GoogleLogo,
        sourceNoun: "key",
        description:
          "Let customers sign in or sign up with their Google account. Email and password login always stays available.",
      },
      {
        key: "recaptchaEnabled",
        label: "reCAPTCHA",
        Logo: RecaptchaLogo,
        sourceNoun: "key",
        description: "Ask customers to pass a human check on sign-in and sign-up.",
        confirmOff:
          "Turning off reCAPTCHA removes bot protection and allows automated sign-ups.",
      },
    ],
  },
  {
    title: "Notifications",
    items: [
      {
        key: "emailEnabled",
        label: "Email",
        Logo: EmailLogo,
        sourceNoun: "account",
        description: "Send emails from the system, including password reset codes.",
        confirmOff:
          "With email off, customers can't receive password reset codes.",
      },
    ],
  },
  {
    title: "Integrations",
    items: [
      {
        key: "googleMapsEnabled",
        label: "Google Maps",
        Logo: GoogleMapsLogo,
        sourceNoun: "key",
        description: "Show Google Maps on the public landing page.",
      },
      {
        key: "googleDriveEnabled",
        label: "Google Drive",
        Logo: Cloud,
        description: "Save exported financial reports to the connected Google Drive account.",
        confirmOff:
          "PDF reports will still download, but new copies will not be saved to Google Drive.",
      },
      {
        key: "qrCodeEnabled",
        label: "Reservation QR codes",
        Logo: QrCode,
        description: "Issue customer reservation QR codes and allow staff to scan them for check-in.",
        confirmOff:
          "Customers will no longer see reservation QR codes, and staff QR check-in will be disabled.",
      },
    ],
  },
  {
    title: "Features",
    items: [
      {
        key: "pdfExportEnabled",
        label: "PDF export",
        Logo: PdfLogo,
        description: "Allow admins to export financial reports as PDF files.",
      },
    ],
  },
];

function loginHeaders() {
  const token = sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function authHeaders() {
  const unlockToken = sessionStorage.getItem("settingsUnlockToken");
  return {
    ...loginHeaders(),
    ...(unlockToken ? { "x-settings-unlock-token": unlockToken } : {}),
  };
}

// A bare "Failed to fetch" now says what actually went wrong
async function request(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    throw new Error(
      `Cannot reach the server at ${API}. Make sure the backend is running and VITE_API_URL is correct.`
    );
  }
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (
      response.status === 423 &&
      data.message === "Settings session is locked or expired" &&
      typeof window !== "undefined"
    ) {
      window.dispatchEvent(new Event("settings-unlock-expired"));
    }
    const error = new Error(data.message || `Request failed (${response.status} ${response.statusText})`);
    if (data.retryAfterSeconds) error.retryAfterSeconds = data.retryAfterSeconds;
    throw error;
  }
  return data;
}

// A setting is only OFF when it is explicitly false (a missing value counts as ON, same as the server).
const isOn = (settings, key) => settings?.[key] !== false;

// Compact SweetAlert2 look: small popup that sits at the top of the screen.
const compactSwal = Swal.mixin({
  position: "top",
  width: 360,
  padding: "0.75rem 1rem 1rem",
  backdrop: "rgba(4, 40, 26, 0.35)",
  customClass: {
    popup: "!rounded-xl !text-sm",
    icon: "!text-[0.6rem] !mb-1",
    title: "!p-0 !pt-1 !text-base !font-semibold !text-[#0B3B2A]",
    htmlContainer: "!m-0 !mt-1 !text-sm !text-[#5F7F70]",
    actions: "!mt-3",
    confirmButton: "!px-4 !py-2 !text-sm",
    cancelButton: "!px-4 !py-2 !text-sm",
  },
});

// Small success message at the top, closes by itself.
const toast = Swal.mixin({
  toast: true,
  position: "top",
  showConfirmButton: false,
  timer: 2500,
  timerProgressBar: true,
  customClass: { popup: "!rounded-lg !text-sm" },
});

function notifySuccess(title, timer = 2500) {
  toast.fire({ icon: "success", title, timer });
}

// Reusable confirmation dialog. Resolves to true if the admin confirms.
async function confirmDialog({
  title,
  text,
  confirmText = "Yes, turn off",
  confirmColor = "#DC2626", // red for risky actions
}) {
  const result = await compactSwal.fire({
    icon: "warning",
    title,
    text,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: "Cancel",
    confirmButtonColor: confirmColor,
    cancelButtonColor: "#6F8E7F",
    reverseButtons: true,
    focusCancel: true, // Enter cancels by default, so it's harder to confirm by accident
  });
  return result.isConfirmed;
}

// Fetches one secret (email password or reCAPTCHA secret) only when the admin presses "Show".
async function fetchSecret(field) {
  const data = await readResponse(
    await request(`${API}/settings/credentials/reveal?field=${field}`, { headers: authHeaders() })
  );
  return data.value || "";
}

// Preview for one side (original / custom). The server returns the preview of the ACTIVE source;
// if it also sends `originalPreview` / `customPreview`, the inactive side is shown too.
function previewFor(state, which) {
  if (state.source === which) return state.preview || "";
  return (which === "original" ? state.originalPreview : state.customPreview) || "";
}

/* -------------------------------------------------------------------------- */
/* Small UI pieces                                                             */
/* -------------------------------------------------------------------------- */

const inputClass =
  "h-10 w-full rounded-lg border border-[#CFE3D9] bg-white px-3 text-sm text-[#0B3B2A] outline-none placeholder:text-[#9DB5A8] focus:border-[#2F9E7A] focus:ring-2 focus:ring-[#2F9E7A]/25 disabled:opacity-60";

const primaryButton =
  "rounded-lg bg-[#2F9E7A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2a8f6f] disabled:cursor-not-allowed disabled:opacity-60";

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

// Two side-by-side cards: Original (.env) and Custom. Each has its own "Use ..." button.
function SourceCards({ label, noun, state, disabled, onChange, originalHint, customHint }) {
  const cards = [
    { value: "original", title: "Original", hint: originalHint },
    { value: "custom", title: "Custom", hint: customHint },
  ];

  return (
    <div role="group" aria-label={label} className="grid gap-3 sm:grid-cols-2">
      {cards.map((card) => {
        const active = state.source === card.value;
        const unavailable = card.value === "custom" && !state.hasCustom;
        const preview = previewFor(state, card.value);
        const emptyText = unavailable
          ? `No custom ${noun} saved yet`
          : active
            ? `No ${noun} configured`
            : "Preview appears after you switch to it";

        return (
          <div
            key={card.value}
            className={`flex flex-col rounded-xl border p-4 transition ${
              active
                ? "border-[#2F9E7A] bg-[#F1FAF6] ring-1 ring-[#2F9E7A]/30"
                : "border-[#DCEBE3] bg-white"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-[#0B3B2A]">{card.title}</p>
              {active && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#2F9E7A] px-2 py-0.5 text-[11px] font-semibold text-white">
                  <svg viewBox="0 0 20 20" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 10.5l4 4 8-9" />
                  </svg>
                  In use
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[#6F8E7F]">{card.hint}</p>

            <p
              className={`mt-3 flex min-h-[2.5rem] items-center break-all whitespace-pre-line rounded-lg border border-[#CFE3D9] bg-white px-3 py-2 text-xs ${
                preview ? "font-mono text-[#0B3B2A]" : "italic text-[#9DB5A8]"
              }`}
            >
              {preview || emptyText}
            </p>

            <button
              type="button"
              disabled={disabled || unavailable || active}
              onClick={() => onChange(card.value)}
              className={`mt-3 rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${
                active
                  ? "bg-transparent text-[#2F9E7A]"
                  : "border border-[#2F9E7A] bg-white text-[#2F9E7A] hover:bg-[#2F9E7A] hover:text-white disabled:border-[#CFE3D9] disabled:bg-[#F4F8F5] disabled:text-[#9DB5A8] disabled:hover:bg-[#F4F8F5] disabled:hover:text-[#9DB5A8]"
              }`}
            >
              {active ? "Currently in use" : `Use ${card.title.toLowerCase()} ${noun}`}
            </button>
          </div>
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

// Reusable panel for the three "API key" integrations (reCAPTCHA, Google sign-in, Google Maps).
function ApiKeyPanel({
  description,
  noun = "key",
  state,
  disabled,
  input,
  onInput,
  inputId,
  message,
  originalHint,
  customHint,
  onSwitch,
  onSave,
}) {
  return (
    <div className="space-y-5">
      {description && <p className="max-w-xl text-sm text-[#6F8E7F]">{description}</p>}

      <SourceCards
        label="Key in use"
        noun={noun}
        state={state}
        disabled={disabled}
        onChange={onSwitch}
        originalHint={originalHint}
        customHint={customHint}
      />

      <form
        onSubmit={onSave}
        className="space-y-3 rounded-xl border border-dashed border-[#CFE3D9] bg-white p-4"
      >
        <label htmlFor={inputId} className="block text-sm font-medium text-[#0B3B2A]">
          {state.hasCustom ? "Replace custom key" : "Add a custom key"}
        </label>
        <input
          id={inputId}
          type="password"
          autoComplete="new-password"
          value={input}
          disabled={disabled}
          placeholder={state.hasCustom ? "Enter a new key to replace the saved one" : "Paste your key here"}
          onChange={(event) => onInput(event.target.value)}
          className={inputClass}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          {message ? (
            <p
              role="status"
              className={`text-sm ${message.type === "ok" ? "text-[#2F9E7A]" : "text-red-700"}`}
            >
              {message.text}
            </p>
          ) : (
            <span />
          )}
          <button type="submit" disabled={disabled || !input.trim()} className={primaryButton}>
            Save custom key
          </button>
        </div>
      </form>
    </div>
  );
}

// One integration: logo, name, status, on/off switch. Click the left side to open the details.
function IntegrationCard({ item, on, saving, open, expandable, badge, toggleDisabled, onExpand, onToggle, children }) {
  const { Logo } = item;

  const info = (
    <>
      <span
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#DCEBE3] bg-white shadow-sm transition ${
          on ? "" : "opacity-50 grayscale"
        }`}
      >
        <Logo />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-[#0B3B2A]">{item.label}</span>
          {badge && (
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                badge.custom ? "bg-[#E3F4EC] text-[#1F7A5C]" : "bg-[#EEF3F0] text-[#5F7F70]"
              }`}
            >
              {badge.text}
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-sm text-[#6F8E7F]">{item.description}</span>
      </span>
    </>
  );

  return (
    <li
      className={`rounded-2xl border bg-white transition ${
        open ? "border-[#2F9E7A]/50 shadow-md" : "border-[#DCEBE3] shadow-sm"
      }`}
    >
      <div className="flex items-center gap-3 p-4 sm:p-5">
        {expandable ? (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={`panel-${item.key}`}
            onClick={onExpand}
            className="-m-1 flex min-w-0 flex-1 items-center gap-4 rounded-xl p-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F9E7A]/40"
          >
            {info}
            <span className="hidden text-xs font-semibold text-[#2F9E7A] sm:inline">
              {open ? "Close" : "Manage"}
            </span>
            <Chevron open={open} />
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-4">{info}</div>
        )}

        <div className="flex shrink-0 items-center gap-3 border-l border-[#EEF3F0] pl-3">
          <span
            className={`w-8 text-right text-xs font-semibold ${on ? "text-[#2F9E7A]" : "text-[#6F8E7F]"}`}
          >
            {saving ? "..." : on ? "On" : "Off"}
          </span>
          <Toggle
            checked={on}
            disabled={toggleDisabled}
            label={`${item.label} ${on ? "on" : "off"}`}
            onChange={onToggle}
          />
        </div>
      </div>

      {open && expandable && (
        <div
          id={`panel-${item.key}`}
          className="rounded-b-2xl border-t border-[#DCEBE3] bg-[#F8FBF9] px-4 py-5 sm:px-5"
        >
          {!on && (
            <p className="mb-4 rounded-lg bg-[#EEF3F0] px-3 py-2 text-xs text-[#5F7F70]">
              {item.label} is turned off. You can still manage its keys here.
            </p>
          )}
          {children}
        </div>
      )}
    </li>
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
          <button type="submit" disabled={busy || !code} className={primaryButton}>
            {busy ? "Verifying..." : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function AdminSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [unlockChecking, setUnlockChecking] = useState(true);
  const [settingsUnlocked, setSettingsUnlocked] = useState(false);
  const [unlockExpiresAt, setUnlockExpiresAt] = useState(0);
  const [unlockRemaining, setUnlockRemaining] = useState(0);
  const [unlockStep, setUnlockStep] = useState("recipient");
  const [unlockRecipients, setUnlockRecipients] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const [otpProof, setOtpProof] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [unlockAdminCode, setUnlockAdminCode] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [resendRemaining, setResendRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [savingKey, setSavingKey] = useState("");

  // Which integration card is open (one at a time keeps the page tidy).
  const [openKey, setOpenKey] = useState("");

  // Secret changes still require an admin-code dialog.
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
    originalPreview: "",
    customPreview: "",
  });
  const [pass, setPass] = useState("");
  const [savedPass, setSavedPass] = useState(""); // the password as loaded by "Show", to detect edits
  const [showPass, setShowPass] = useState(false);
  const [credsLoading, setCredsLoading] = useState(true);
  const [credBusy, setCredBusy] = useState(false);
  const [credMsg, setCredMsg] = useState(null); // { type: "ok" | "error", text }

  // reCAPTCHA secret key
  const [captcha, setCaptcha] = useState({ source: "original", hasCustom: false, keySet: false, preview: "" });
  const [secret, setSecret] = useState("");
  const [captchaBusy, setCaptchaBusy] = useState(false);
  const [captchaMsg, setCaptchaMsg] = useState(null);

  // Google sign-in (Firebase) + Google Maps keys
  const [googleAuthKey, setGoogleAuthKey] = useState({
    source: "original",
    hasCustom: false,
    keySet: false,
    preview: "",
  });
  const [googleAuthKeyInput, setGoogleAuthKeyInput] = useState("");
  const [mapsKey, setMapsKey] = useState({
    source: "original",
    hasCustom: false,
    keySet: false,
    preview: "",
  });
  const [mapsKeyInput, setMapsKeyInput] = useState("");
  const [googleDriveCredentials, setGoogleDriveCredentials] = useState({
    source: "original",
    hasCustom: false,
    keySet: false,
    preview: "",
  });
  const [googleDriveInputs, setGoogleDriveInputs] = useState({
    clientId: "",
    clientSecret: "",
    redirectUri: "",
    encryptionKey: "",
    accountEmail: "",
  });
  const [googleDriveValues, setGoogleDriveValues] = useState(null);
  const [googleDriveValuesSource, setGoogleDriveValuesSource] = useState("");
  const [googleDriveRevealBusy, setGoogleDriveRevealBusy] = useState(false);
  const [showDriveClientSecret, setShowDriveClientSecret] = useState(false);
  const [showDriveEncryptionKey, setShowDriveEncryptionKey] = useState(false);
  const [apiKeyBusy, setApiKeyBusy] = useState("");
  const [apiKeyMessages, setApiKeyMessages] = useState({});

  function applyEmail(data) {
    setCreds({
      user: data.user || "",
      savedUser: data.user || "",
      source: data.source === "custom" ? "custom" : "original",
      hasCustom: Boolean(data.hasCustom),
      passSet: Boolean(data.passSet),
      originalPreview: data.originalUser || "",
      customPreview: data.customUser || "",
    });
    setPass("");
    setSavedPass("");
    setShowPass(false);
  }

  function applyCaptcha(data) {
    setCaptcha({
      source: data?.source === "custom" ? "custom" : "original",
      hasCustom: Boolean(data?.hasCustom),
      keySet: Boolean(data?.secretSet),
      preview: data?.preview || "",
      originalPreview: data?.originalPreview || "",
      customPreview: data?.customPreview || "",
    });
    setSecret("");
  }

  function applyMapsKey(data) {
    setMapsKey({
      source: data?.source === "custom" ? "custom" : "original",
      hasCustom: Boolean(data?.hasCustom),
      keySet: Boolean(data?.keySet),
      preview: data?.preview || "",
      originalPreview: data?.originalPreview || "",
      customPreview: data?.customPreview || "",
    });
    setMapsKeyInput("");
  }

  function applyGoogleDriveCredentials(data) {
    setGoogleDriveCredentials({
      source: data?.source === "custom" ? "custom" : "original",
      hasCustom: Boolean(data?.hasCustom),
      keySet: Boolean(data?.keySet),
      preview: data?.preview || "",
      originalPreview: data?.originalPreview || "",
      customPreview: data?.customPreview || "",
    });
    setGoogleDriveInputs({
      clientId: "",
      clientSecret: "",
      redirectUri: "",
      encryptionKey: "",
      accountEmail: "",
    });
    setGoogleDriveValues(null);
    setGoogleDriveValuesSource("");
    setGoogleDriveRevealBusy(false);
    setShowDriveClientSecret(false);
    setShowDriveEncryptionKey(false);
  }

  function applyGoogleAuthKey(data) {
    setGoogleAuthKey({
      source: data?.source === "custom" ? "custom" : "original",
      hasCustom: Boolean(data?.hasCustom),
      keySet: Boolean(data?.keySet),
      preview: data?.preview || "",
      originalPreview: data?.originalPreview || "",
      customPreview: data?.customPreview || "",
    });
    setGoogleAuthKeyInput("");
  }

  function handleNavigate(section) {
    if (section === "Customers") return navigate("/customers");
    if (section === "Capsule") return navigate("/capsule");
    if (section === "Reservation") return navigate("/reservation");
    if (section === "Settings") return navigate("/settings");
    if (section === "Reports" || section === "transactions") return navigate("/reports");
    if (section === "User Management" || section === "Staff Management" || section === "Management") return navigate("/management");
    return navigate("/dashboard");
  }

  const loadUnlockRecipients = useCallback(async () => {
    try {
      const data = await readResponse(
        await request(`${API}/settings/unlock/recipients`, { headers: loginHeaders() })
      );
      setUnlockRecipients(data.recipients || []);
      setSelectedRecipient(data.recipients?.[0]?.id || "");
      setUnlockError("");
    } catch (err) {
      setUnlockError(err.message || "Could not load developer recipients.");
    }
  }, []);

  const lockLocally = useCallback(() => {
    sessionStorage.removeItem("settingsUnlockToken");
    setSettingsUnlocked(false);
    setUnlockExpiresAt(0);
    setUnlockRemaining(0);
    setSettings(null);
    setUnlockStep("recipient");
    setOtpProof("");
    setOtpCode("");
    setUnlockAdminCode("");
    setUnlockError("");
    setUnlockRecipients([]);
    setModal(null);
    setPass("");
    setSecret("");
    setGoogleAuthKeyInput("");
    setMapsKeyInput("");
    setGoogleDriveInputs({
      clientId: "",
      clientSecret: "",
      redirectUri: "",
      encryptionKey: "",
      accountEmail: "",
    });
    setGoogleDriveValues(null);
    setGoogleDriveValuesSource("");
    setGoogleDriveRevealBusy(false);
    setShowDriveClientSecret(false);
    setShowDriveEncryptionKey(false);
    setCredsLoading(true);
  }, []);

  useEffect(() => {
    let active = true;
    async function checkUnlock() {
      const token = sessionStorage.getItem("settingsUnlockToken");
      if (!token) {
        if (active) {
          setSettingsUnlocked(false);
          setUnlockChecking(false);
          await loadUnlockRecipients();
        }
        return;
      }

      try {
        const data = await readResponse(
          await request(`${API}/settings/unlock/status`, {
            headers: { ...loginHeaders(), "x-settings-unlock-token": token },
          })
        );
        if (!active) return;
        if (data.unlocked) {
          setSettingsUnlocked(true);
          setUnlockExpiresAt(new Date(data.expiresAt).getTime());
        } else {
          lockLocally();
          await loadUnlockRecipients();
        }
      } catch (err) {
        if (active) {
          lockLocally();
          setUnlockError(err.message || "Could not verify the Settings session.");
        }
      } finally {
        if (active) setUnlockChecking(false);
      }
    }
    checkUnlock();
    return () => {
      active = false;
    };
  }, [loadUnlockRecipients, lockLocally]);

  useEffect(() => {
    if (!settingsUnlocked || !unlockExpiresAt) return undefined;
    let expirationHandled = false;
    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((unlockExpiresAt - Date.now()) / 1000));
      setUnlockRemaining(remaining);
      if (remaining === 0 && !expirationHandled) {
        expirationHandled = true;
        const token = sessionStorage.getItem("settingsUnlockToken");
        if (token) {
          request(`${API}/settings/unlock/lock`, {
            method: "POST",
            headers: { ...loginHeaders(), "x-settings-unlock-token": token },
          }).catch((err) => console.error("Could not audit expired Settings session:", err));
        }
        lockLocally();
        loadUnlockRecipients();
      }
    };
    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [settingsUnlocked, unlockExpiresAt, lockLocally, loadUnlockRecipients]);

  useEffect(() => {
    const onExpired = () => lockLocally();
    window.addEventListener("settings-unlock-expired", onExpired);
    return () => window.removeEventListener("settings-unlock-expired", onExpired);
  }, [lockLocally]);

  useEffect(() => {
    if (resendRemaining <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setResendRemaining((remaining) => Math.max(0, remaining - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendRemaining]);

  async function sendOtp() {
    setUnlockError("");
    setUnlockBusy(true);
    try {
      await readResponse(
        await request(`${API}/settings/unlock/otp/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...loginHeaders() },
          body: JSON.stringify({ recipientId: selectedRecipient }),
        })
      );
      setUnlockStep("otp");
      setResendRemaining(60);
    } catch (err) {
      setUnlockError(err.message || "Could not send verification code.");
      if (err.retryAfterSeconds) setResendRemaining(err.retryAfterSeconds);
    } finally {
      setUnlockBusy(false);
    }
  }

  async function verifyOtp(event) {
    event.preventDefault();
    setUnlockError("");
    setUnlockBusy(true);
    try {
      const data = await readResponse(
        await request(`${API}/settings/unlock/otp/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...loginHeaders() },
          body: JSON.stringify({ code: otpCode }),
        })
      );
      setOtpProof(data.otpProof);
      setOtpCode("");
      setUnlockStep("adminCode");
    } catch (err) {
      setUnlockError(err.message || "Could not verify the code.");
    } finally {
      setUnlockBusy(false);
    }
  }

  async function completeUnlock(event) {
    event.preventDefault();
    setUnlockError("");
    setUnlockBusy(true);
    try {
      const data = await readResponse(
        await request(`${API}/settings/unlock/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...loginHeaders() },
          body: JSON.stringify({ otpProof, adminCode: unlockAdminCode }),
        })
      );
      sessionStorage.setItem("settingsUnlockToken", data.unlockToken);
      setUnlockExpiresAt(new Date(data.expiresAt).getTime());
      setSettingsUnlocked(true);
      setUnlockAdminCode("");
      setUnlockError("");
    } catch (err) {
      setUnlockError(err.message || "Could not unlock Settings.");
    } finally {
      setUnlockBusy(false);
    }
  }

  async function lockSettings() {
    const token = sessionStorage.getItem("settingsUnlockToken");
    if (token) {
      try {
        await readResponse(
          await request(`${API}/settings/unlock/lock`, {
            method: "POST",
            headers: { ...loginHeaders(), "x-settings-unlock-token": token },
          })
        );
      } catch (err) {
        setActionError(err.message || "Could not lock Settings on the server.");
      }
    }
    lockLocally();
    await loadUnlockRecipients();
  }

  const loadSettings = useCallback(async () => {
    if (!settingsUnlocked) return;
    setLoading(true);
    setError("");
    try {
      setSettings(await readResponse(await request(`${API}/settings`, { headers: authHeaders() })));
    } catch (err) {
      setError(err.message || "Could not load settings.");
    } finally {
      setLoading(false);
    }
  }, [settingsUnlocked]);

  useEffect(() => {
    if (settingsUnlocked) {
      loadSettings();
    } else {
      setSettings(null);
      setLoading(false);
    }
  }, [loadSettings, settingsUnlocked]);

  // Load the credentials in effect: the custom ones if the admin switched to them, otherwise the originals
  useEffect(() => {
    if (!settingsUnlocked) {
      setCredsLoading(false);
      return undefined;
    }
    let current = true;
    request(`${API}/settings/credentials`, { headers: authHeaders() })
      .then(readResponse)
      .then((data) => {
        if (!current) return;
        applyEmail(data);
        applyCaptcha(data.recaptcha);
        applyMapsKey(data.googleMaps);
        applyGoogleDriveCredentials(data.googleDrive);
        applyGoogleAuthKey(data.googleAuth);
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
  }, [settingsUnlocked]);

  // ---- Toggles ----
  async function requestToggle(item) {
    const next = !isOn(settings, item.key);

    if (!next && item.confirmOff) {
      const ok = await confirmDialog({
        title: `Turn off ${item.label}?`,
        text: item.confirmOff,
      });
      if (!ok) return;
    }

    setActionError("");
    setSavingKey(item.key);
    try {
      const updated = await readResponse(
        await request(`${API}/settings`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ [item.key]: next }),
        })
      );
      setSettings(updated);
      notifySuccess(`${item.label} turned ${next ? "on" : "off"}`);
    } catch (err) {
      setActionError(err.message || "Could not update the integration.");
    } finally {
      setSavingKey("");
    }
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
    if (credsDirty) {
      const ok = await confirmDialog({
        title: "Discard unsaved changes?",
        text: "Your edits to the email credentials will be lost.",
        confirmText: "Discard",
      });
      if (!ok) return;
    }
    setCredMsg(null);
    setCredBusy(true);
    try {
      const data = await readResponse(
        await request(`${API}/settings/credentials/source`, {
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
      notifySuccess(source === "custom" ? "Now using the custom credentials" : "Now using the original credentials");
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
  const secretDirty = secret.trim() !== "";

  async function switchCaptchaSource(source) {
    if (secretDirty) {
      const ok = await confirmDialog({
        title: "Discard unsaved changes?",
        text: "The secret key you typed will be lost.",
        confirmText: "Discard",
      });
      if (!ok) return;
    }
    setCaptchaMsg(null);
    setCaptchaBusy(true);
    try {
      const data = await readResponse(
        await request(`${API}/settings/credentials/source`, {
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
      notifySuccess(source === "custom" ? "Now using the custom secret key" : "Now using the original secret key");
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

  // ---- Google sign-in + Google Maps keys ----
  async function switchApiKeySource(target, source) {
    const keyInput = target === "googleAuth" ? googleAuthKeyInput : mapsKeyInput;
    if (keyInput.trim()) {
      const ok = await confirmDialog({
        title: "Discard unsaved key?",
        text: "The key you typed will be lost.",
        confirmText: "Discard",
      });
      if (!ok) return;
    }
    setApiKeyMessages((messages) => ({ ...messages, [target]: null }));
    setApiKeyBusy(target);
    try {
      const data = await readResponse(
        await request(`${API}/settings/credentials/source`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ target, source }),
        })
      );
      if (target === "googleAuth") applyGoogleAuthKey(data.googleAuth);
      else applyMapsKey(data.googleMaps);
      notifySuccess(`Switched to the ${source} key`, 1500);
      setApiKeyMessages((messages) => ({
        ...messages,
        [target]: {
          type: "ok",
          text: `Switched to the ${source} key. Reloading to apply it...`,
        },
      }));
      window.setTimeout(() => window.location.reload(), 1600);
    } catch (err) {
      setApiKeyMessages((messages) => ({
        ...messages,
        [target]: { type: "error", text: err.message || "Could not switch API keys." },
      }));
    } finally {
      setApiKeyBusy("");
    }
  }

  function requestSaveApiKey(event, target) {
    event.preventDefault();
    const value = target === "googleAuth" ? googleAuthKeyInput : mapsKeyInput;
    if (!value.trim()) return;
    setApiKeyMessages((messages) => ({ ...messages, [target]: null }));
    setModalError("");
    setModal({ kind: target });
  }

  async function switchGoogleDriveSource(source) {
    if (Object.values(googleDriveInputs).some((value) => value.trim())) {
      const ok = await confirmDialog({
        title: "Discard unsaved credentials?",
        text: "The Google Drive credential values you entered will be lost.",
        confirmText: "Discard",
      });
      if (!ok) return;
    }

    setApiKeyMessages((messages) => ({ ...messages, googleDrive: null }));
    setApiKeyBusy("googleDrive");
    try {
      const data = await readResponse(
        await request(`${API}/settings/credentials/source`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ target: "googleDrive", source }),
        })
      );
      applyGoogleDriveCredentials(data.googleDrive);
      setApiKeyMessages((messages) => ({
        ...messages,
        googleDrive: {
          type: "ok",
          text: `Now using the ${source} Google Drive credentials.`,
        },
      }));
      notifySuccess(`Switched to the ${source} Google Drive credentials`, 1500);
    } catch (err) {
      setApiKeyMessages((messages) => ({
        ...messages,
        googleDrive: { type: "error", text: err.message || "Could not switch Google Drive credentials." },
      }));
    } finally {
      setApiKeyBusy("");
    }
  }

  async function revealGoogleDriveCredentials(source) {
    if (googleDriveValues && googleDriveValuesSource === source) {
      setGoogleDriveValues(null);
      setGoogleDriveValuesSource("");
      return;
    }
    setGoogleDriveRevealBusy(true);
    setGoogleDriveValues(null);
    setGoogleDriveValuesSource("");
    setApiKeyMessages((messages) => ({ ...messages, googleDrive: null }));
    try {
      const data = await readResponse(
        await request(`${API}/settings/credentials/reveal?field=googleDrive&source=${source}`, {
          headers: authHeaders(),
        })
      );
      setGoogleDriveValues(data.value);
      setGoogleDriveValuesSource(source);
    } catch (err) {
      setApiKeyMessages((messages) => ({
        ...messages,
        googleDrive: { type: "error", text: err.message || "Could not reveal Google Drive credentials." },
      }));
    } finally {
      setGoogleDriveRevealBusy(false);
    }
  }

  function requestSaveGoogleDriveCredentials(event) {
    event.preventDefault();
    if (!Object.values(googleDriveInputs).some((value) => value.trim())) return;
    setApiKeyMessages((messages) => ({ ...messages, googleDrive: null }));
    setModalError("");
    setModal({ kind: "googleDrive" });
  }

  // ---- Admin code dialog: runs the pending action, the server verifies the code ----
  async function confirmModal(code) {
    if (!modal) return;
    setModalBusy(true);
    setModalError("");
    try {
      if (modal.kind === "email") {
        const body = { adminCode: code };
        if (emailChanged) body.CUSTOM_EMAIL_USER = creds.user.trim();
        if (passChanged) body.CUSTOM_EMAIL_PASS = pass;
        const data = await readResponse(
          await request(`${API}/settings/credentials`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(body),
          })
        );
        applyEmail(data);
        setCredMsg({ type: "ok", text: "Saved. These custom credentials are now in use." });
        notifySuccess("Email credentials saved");
      } else if (modal.kind === "captcha") {
        const data = await readResponse(
          await request(`${API}/settings/credentials`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({ adminCode: code, CUSTOM_RECAPTCHA_SECRET: secret.trim() }),
          })
        );
        applyCaptcha(data.recaptcha);
        setCaptchaMsg({ type: "ok", text: "Saved. This custom secret key is now in use." });
        notifySuccess("reCAPTCHA secret key saved");
      } else if (
        modal.kind === "googleAuth"
        || modal.kind === "googleMaps"
        || modal.kind === "googleDrive"
      ) {
        const isGoogleAuth = modal.kind === "googleAuth";
        const isGoogleDrive = modal.kind === "googleDrive";
        const body = isGoogleDrive
          ? {
              adminCode: code,
              CUSTOM_GOOGLE_DRIVE_CLIENT_ID: googleDriveInputs.clientId.trim(),
              CUSTOM_GOOGLE_DRIVE_CLIENT_SECRET: googleDriveInputs.clientSecret.trim(),
              CUSTOM_GOOGLE_DRIVE_REDIRECT_URI: googleDriveInputs.redirectUri.trim(),
              CUSTOM_GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY: googleDriveInputs.encryptionKey.trim(),
              CUSTOM_GOOGLE_DRIVE_ACCOUNT_EMAIL: googleDriveInputs.accountEmail.trim(),
            }
          : {
              adminCode: code,
              [isGoogleAuth ? "CUSTOM_FIREBASE_API_KEY" : "CUSTOM_GOOGLE_MAPS_API_KEY"]:
                (isGoogleAuth ? googleAuthKeyInput : mapsKeyInput).trim(),
            };
        const data = await readResponse(
          await request(`${API}/settings/credentials`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(body),
          })
        );
        if (isGoogleDrive) applyGoogleDriveCredentials(data.googleDrive);
        else if (isGoogleAuth) applyGoogleAuthKey(data.googleAuth);
        else applyMapsKey(data.googleMaps);
        notifySuccess(
          isGoogleDrive
            ? "Google Drive credentials saved"
            : isGoogleAuth
              ? "Firebase API key saved"
              : "Google Maps API key saved",
          1500,
        );
        setApiKeyMessages((messages) => ({
          ...messages,
          [modal.kind]: {
            type: "ok",
            text: isGoogleDrive
              ? "Saved and switched to custom credentials. If the encryption key changed, reconnect Google Drive."
              : "Saved and switched to the custom key. Reloading to apply it...",
          },
        }));
        if (!isGoogleDrive) window.setTimeout(() => window.location.reload(), 1600);
      }
      setModal(null);
    } catch (err) {
      if (["googleAuth", "googleMaps", "googleDrive"].includes(modal.kind)) {
        setApiKeyMessages((messages) => ({
          ...messages,
          [modal.kind]: { type: "error", text: err.message || "Could not save the API key." },
        }));
      } else {
        setModalError(err.message || "Could not save.");
      }
    } finally {
      setModalBusy(false);
    }
  }

  function closeModal() {
    setModal(null);
    setModalError("");
  }

  const modalText = !modal
    ? null
    : modal.kind === "email"
        ? {
            title: "Save email credentials",
            description: "Enter your admin code to save these as the custom email credentials.",
            confirmLabel: "Save credentials",
          }
        : modal.kind === "captcha"
          ? {
              title: "Save reCAPTCHA secret key",
              description: "Enter your admin code to save this as the custom reCAPTCHA secret key.",
              confirmLabel: "Save secret key",
            }
          : modal.kind === "googleDrive"
            ? {
                title: "Save Google Drive credentials",
                description: "Enter your admin code to save and activate these custom credentials.",
                confirmLabel: "Save credentials",
              }
            : {
                title: modal.kind === "googleAuth" ? "Save Firebase API key" : "Save Google Maps API key",
                description: "Enter your admin code to save and activate this custom API key.",
                confirmLabel: "Save API key",
              };

  /* ---------------------------- Expandable panels --------------------------- */

  const credsDisabled = credsLoading || apiKeyBusy !== "";
  const googleDriveInputsDirty = Object.values(googleDriveInputs).some((value) => value.trim());

  const captchaPanel = (
    <ApiKeyPanel
      description="The server-side key that verifies sign-in and sign-up checks. It must belong to the same reCAPTCHA site as the site key in your frontend."
      state={captcha}
      disabled={credsLoading || captchaBusy}
      input={secret}
      onInput={setSecret}
      inputId="captcha-secret"
      message={captchaMsg}
      originalHint="RECAPTCHA_SECRET from .env"
      customHint="CUSTOM_RECAPTCHA_SECRET"
      onSwitch={switchCaptchaSource}
      onSave={requestSaveCaptcha}
    />
  );

  const googleSignInKeyPanel = (
    <ApiKeyPanel
      description="The Firebase API key that powers Google sign-in on the customer login and sign-up pages."
      state={googleAuthKey}
      disabled={credsDisabled}
      input={googleAuthKeyInput}
      onInput={setGoogleAuthKeyInput}
      inputId="custom-firebase-api-key"
      message={apiKeyMessages.googleAuth}
      originalHint="From firebase.config.json"
      customHint="CUSTOM_FIREBASE_API_KEY in server/.env"
      onSwitch={(source) => switchApiKeySource("googleAuth", source)}
      onSave={(event) => requestSaveApiKey(event, "googleAuth")}
    />
  );

  const mapsKeyPanel = (
    <ApiKeyPanel
      description="The API key used to load Google Maps on the public landing page."
      state={mapsKey}
      disabled={credsDisabled}
      input={mapsKeyInput}
      onInput={setMapsKeyInput}
      inputId="custom-google-maps-key"
      message={apiKeyMessages.googleMaps}
      originalHint="VITE_GOOGLE_MAPS_API_KEY from root .env"
      customHint="CUSTOM_GOOGLE_MAPS_API_KEY in server/.env"
      onSwitch={(source) => switchApiKeySource("googleMaps", source)}
      onSave={(event) => requestSaveApiKey(event, "googleMaps")}
    />
  );

  const googleDrivePanel = (
    <div className="space-y-5">
      <p className="max-w-xl text-sm text-[#6F8E7F]">
        Manage the OAuth client, callback URL, token encryption key, and designated Google account used for report backups.
        Changing the token encryption key requires reconnecting Google Drive.
      </p>

      <SourceCards
        label="Google Drive credentials in use"
        noun="credentials"
        state={googleDriveCredentials}
        disabled={credsDisabled}
        onChange={switchGoogleDriveSource}
        originalHint="GOOGLE_DRIVE_* values from server/.env"
        customHint="Custom values saved from this page"
      />

      <div className="space-y-3 rounded-xl border border-[#DCEBE3] bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#0B3B2A]">Google Drive credentials</p>
            <p className="mt-0.5 text-xs text-[#6F8E7F]">
              Values are hidden until explicitly revealed. Revealing is recorded in the audit log.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={credsLoading || googleDriveRevealBusy}
              onClick={() => revealGoogleDriveCredentials(googleDriveCredentials.source)}
              className="rounded-lg border border-[#CFE3D9] px-3 py-2 text-xs font-semibold text-[#2F8060] hover:bg-[#F3F9F5] disabled:opacity-60"
            >
              {googleDriveRevealBusy
                ? "Loading..."
                : googleDriveValuesSource === googleDriveCredentials.source
                  ? "Hide active credentials"
                  : "Show active credentials"}
            </button>
            {googleDriveCredentials.hasCustom && googleDriveCredentials.source !== "custom" && (
              <button
                type="button"
                disabled={credsLoading || googleDriveRevealBusy}
                onClick={() => revealGoogleDriveCredentials("custom")}
                className="rounded-lg border border-[#CFE3D9] px-3 py-2 text-xs font-semibold text-[#2F8060] hover:bg-[#F3F9F5] disabled:opacity-60"
              >
                {googleDriveValuesSource === "custom" ? "Hide custom credentials" : "Show custom credentials"}
              </button>
            )}
          </div>
        </div>
        {googleDriveValues && (
          <dl className="grid gap-3 rounded-lg bg-[#F8FBF9] p-3 text-xs sm:grid-cols-2">
            <div className="sm:col-span-2">
              <dt className="font-semibold text-[#5F7F70]">Source</dt>
              <dd className="mt-1 text-[#0B3B2A]">
                {googleDriveValuesSource === "custom" ? "Custom" : "Original"}
              </dd>
            </div>
            {[
              ["OAuth client ID", googleDriveValues.clientId],
              ["OAuth client secret", googleDriveValues.clientSecret],
              ["Redirect URI", googleDriveValues.redirectUri],
              ["Token encryption key", googleDriveValues.encryptionKey],
              ["Google account email", googleDriveValues.accountEmail],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="font-semibold text-[#5F7F70]">{label}</dt>
                <dd className="mt-1 break-all font-mono text-[#0B3B2A]">{value || "Not configured"}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <form
        onSubmit={requestSaveGoogleDriveCredentials}
        className="space-y-4 rounded-xl border border-dashed border-[#CFE3D9] bg-white p-4"
      >
        <p className="text-sm font-medium text-[#0B3B2A]">
          {googleDriveCredentials.hasCustom ? "Edit custom credentials" : "Create custom credentials"}
        </p>

        <div>
          <label htmlFor="drive-client-id" className="block text-sm font-medium text-[#0B3B2A]">
            OAuth client ID
          </label>
          <input
            id="drive-client-id"
            value={googleDriveInputs.clientId}
            disabled={credsDisabled}
            placeholder={googleDriveCredentials.hasCustom ? "Leave blank to keep the saved value" : "Enter OAuth client ID"}
            onChange={(event) => setGoogleDriveInputs((current) => ({ ...current, clientId: event.target.value }))}
            className={`mt-1 ${inputClass}`}
          />
        </div>

        <div>
          <label htmlFor="drive-client-secret" className="block text-sm font-medium text-[#0B3B2A]">
            OAuth client secret
          </label>
          <SecretInput
            id="drive-client-secret"
            value={googleDriveInputs.clientSecret}
            shown={showDriveClientSecret}
            disabled={credsDisabled}
            placeholder={googleDriveCredentials.hasCustom ? "Leave blank to keep the saved value" : "Enter OAuth client secret"}
            onChange={(value) => setGoogleDriveInputs((current) => ({ ...current, clientSecret: value }))}
            onToggle={() => setShowDriveClientSecret((shown) => !shown)}
          />
        </div>

        <div>
          <label htmlFor="drive-redirect-uri" className="block text-sm font-medium text-[#0B3B2A]">
            Redirect URI
          </label>
          <input
            id="drive-redirect-uri"
            type="url"
            value={googleDriveInputs.redirectUri}
            disabled={credsDisabled}
            placeholder={googleDriveCredentials.hasCustom ? "Leave blank to keep the saved value" : "https://your-api.example/api/drive/oauth2callback"}
            onChange={(event) => setGoogleDriveInputs((current) => ({ ...current, redirectUri: event.target.value }))}
            className={`mt-1 ${inputClass}`}
          />
        </div>

        <div>
          <label htmlFor="drive-encryption-key" className="block text-sm font-medium text-[#0B3B2A]">
            Token encryption key (64 hex characters)
          </label>
          <SecretInput
            id="drive-encryption-key"
            value={googleDriveInputs.encryptionKey}
            shown={showDriveEncryptionKey}
            disabled={credsDisabled}
            placeholder={googleDriveCredentials.hasCustom ? "Leave blank to keep the saved value" : "Enter the 64-character encryption key"}
            onChange={(value) => setGoogleDriveInputs((current) => ({ ...current, encryptionKey: value }))}
            onToggle={() => setShowDriveEncryptionKey((shown) => !shown)}
          />
        </div>

        <div>
          <label htmlFor="drive-account-email" className="block text-sm font-medium text-[#0B3B2A]">
            Designated Google account email
          </label>
          <input
            id="drive-account-email"
            type="email"
            value={googleDriveInputs.accountEmail}
            disabled={credsDisabled}
            placeholder={googleDriveCredentials.hasCustom ? "Leave blank to keep the saved value" : "Enter the Google account authorized for Drive"}
            onChange={(event) => setGoogleDriveInputs((current) => ({ ...current, accountEmail: event.target.value }))}
            className={`mt-1 ${inputClass}`}
          />
        </div>

        {apiKeyMessages.googleDrive && (
          <p
            role="status"
            className={`text-sm ${apiKeyMessages.googleDrive.type === "ok" ? "text-[#2F9E7A]" : "text-red-700"}`}
          >
            {apiKeyMessages.googleDrive.text}
          </p>
        )}

        <div className="flex justify-end border-t border-[#EEF3F0] pt-4">
          <button
            type="submit"
            disabled={credsDisabled || !googleDriveInputsDirty}
            className={primaryButton}
          >
            Save custom credentials
          </button>
        </div>
      </form>
    </div>
  );

  const emailPanel = (
    <div className="space-y-5">
      <p className="max-w-xl text-sm text-[#6F8E7F]">
        The account that sends password reset codes. For Gmail, use a 16-character app password.
      </p>

      <SourceCards
        label="Email account in use"
        noun="credentials"
        state={{ ...creds, preview: creds.savedUser }}
        disabled={credsLoading || credBusy}
        onChange={switchEmailSource}
        originalHint="EMAIL_USER and EMAIL_PASS from .env"
        customHint="Saved from this page"
      />

      <form
        onSubmit={requestSaveCreds}
        className="space-y-4 rounded-xl border border-dashed border-[#CFE3D9] bg-white p-4"
      >
        <p className="text-sm font-medium text-[#0B3B2A]">
          {creds.hasCustom ? "Edit custom credentials" : "Create custom credentials"}
        </p>

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
              : "This is the original password from .env."}
          </p>
        </div>

        {!creds.hasCustom && (
          <p className="text-xs text-[#6F8E7F]">
            No custom credentials yet. Change the email or password and save to create them.
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {credMsg ? (
            <p
              role="status"
              className={`text-sm ${credMsg.type === "ok" ? "text-[#2F9E7A]" : "text-red-700"}`}
            >
              {credMsg.text}
            </p>
          ) : (
            <span />
          )}
          <button type="submit" disabled={credsLoading || credBusy || !credsDirty} className={primaryButton}>
            Save credentials
          </button>
        </div>
      </form>
    </div>
  );

  const panels = {
    googleAuthEnabled: googleSignInKeyPanel,
    recaptchaEnabled: captchaPanel,
    emailEnabled: emailPanel,
    googleMapsEnabled: mapsKeyPanel,
    googleDriveEnabled: googleDrivePanel,
  };

  const sources = {
    googleAuthEnabled: googleAuthKey.source,
    recaptchaEnabled: captcha.source,
    emailEnabled: creds.source,
    googleMapsEnabled: mapsKey.source,
    googleDriveEnabled: googleDriveCredentials.source,
  };

  const unlockTimeText = `${Math.floor(unlockRemaining / 60)}:${String(unlockRemaining % 60).padStart(2, "0")}`;

  function badgeFor(item) {
    if (credsLoading || !panels[item.key]) return null;
    const custom = sources[item.key] === "custom";
    return {
      custom,
      text: `${custom ? "Custom" : "Original"} ${item.sourceNoun}`,
    };
  }

  /* --------------------------------- Render --------------------------------- */

  return (
    <div className="flex h-screen w-full bg-[#F4F8F5] text-[#0B3B2A]">
      <Sidebar active="Settings" onNavigate={handleNavigate} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header active="Settings" />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {settingsUnlocked ? (
          <div className="mx-auto max-w-3xl space-y-8">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-[#BDE3D1] bg-[#ECF8F1] px-4 py-3 text-sm text-[#0B3B2A]">
              <span className="font-medium">Settings unlocked · {unlockTimeText} left</span>
              <button
                type="button"
                onClick={lockSettings}
                className="rounded-lg border border-[#8EB9A3] bg-white px-3 py-1.5 text-xs font-semibold hover:bg-[#F4F8F5]"
              >
                Lock
              </button>
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#0B3B2A]">Settings</h2>
              <p className="mt-1 text-sm text-[#6F8E7F]">
                Turn services on or off. Open an integration to see which key it uses and switch
                between the original and a custom one.
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
              <div className="space-y-3" aria-busy="true" aria-label="Loading settings">
                {[0, 1, 2, 3].map((n) => (
                  <div key={n} className="h-20 animate-pulse rounded-2xl border border-[#DCEBE3] bg-white" />
                ))}
              </div>
            ) : settings ? (
              GROUPS.map((group) => (
                <section key={group.title}>
                  <h3 className="mb-3 px-1 text-sm font-semibold text-[#5F7F70]">{group.title}</h3>
                  <ul className="space-y-3">
                    {group.items.map((item) => {
                      const on = isOn(settings, item.key);
                      const panel = panels[item.key];
                      return (
                        <IntegrationCard
                          key={item.key}
                          item={item}
                          on={on}
                          saving={savingKey === item.key}
                          open={openKey === item.key}
                          expandable={Boolean(panel)}
                          badge={badgeFor(item)}
                          toggleDisabled={savingKey !== ""}
                          onExpand={() => setOpenKey((k) => (k === item.key ? "" : item.key))}
                          onToggle={() => requestToggle(item)}
                        >
                          {panel}
                        </IntegrationCard>
                      );
                    })}
                  </ul>
                </section>
              ))
            ) : null}
          </div>
          ) : (
            <div className="mx-auto max-w-3xl rounded-xl border border-[#DCEBE3] bg-white p-6 text-sm text-[#5F7F70]">
              Verify your identity to access integration settings.
            </div>
          )}
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

      {(unlockChecking || !settingsUnlocked) && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#04281A]/60 p-4 backdrop-blur-[2px]">
          {unlockChecking ? (
            <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
              <p className="text-sm font-medium text-[#0B3B2A]">Checking Settings access...</p>
            </div>
          ) : (
            <form
              onSubmit={unlockStep === "otp" ? verifyOtp : unlockStep === "adminCode" ? completeUnlock : (event) => {
                event.preventDefault();
                sendOtp();
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="settings-unlock-title"
              className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            >
              <div className="border-b border-[#DCEBE3] px-6 py-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#2F9E7A]">Settings unlock</p>
                <h2 id="settings-unlock-title" className="mt-1 text-lg font-bold text-[#0B3B2A]">
                  {unlockStep === "recipient"
                    ? "Verify with a developer"
                    : unlockStep === "otp"
                      ? "Enter the 6-digit code"
                      : "Confirm with your admin code"}
                </h2>
                <p className="mt-1 text-sm text-[#5F7F70]">
                  {unlockStep === "recipient"
                    ? "Choose where the verification code should be sent."
                    : unlockStep === "otp"
                      ? "Enter the code sent to the selected developer address."
                      : "The code is valid for one Settings session, which expires after 15 minutes."}
                </p>
              </div>

              <div className="space-y-4 px-6 py-5">
                {unlockStep === "recipient" && (
                  <>
                    {unlockRecipients.length ? (
                      <fieldset className="space-y-2">
                        <legend className="mb-2 text-sm font-medium text-[#0B3B2A]">Developer address</legend>
                        {unlockRecipients.map((recipient) => (
                          <label
                            key={recipient.id}
                            className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#CFE3D9] px-3 py-2 text-sm"
                          >
                            <input
                              type="radio"
                              name="developer-recipient"
                              value={recipient.id}
                              checked={selectedRecipient === recipient.id}
                              onChange={() => setSelectedRecipient(recipient.id)}
                            />
                            <span>{recipient.masked}</span>
                          </label>
                        ))}
                      </fieldset>
                    ) : (
                      <p className="text-sm text-[#5F7F70]">
                        No developer recipients are available. Ask an administrator to configure DEVELOPER_OTP_EMAILS on the server.
                      </p>
                    )}
                  </>
                )}

                {unlockStep === "otp" && (
                  <div>
                    <label htmlFor="settings-unlock-otp" className="mb-1 block text-sm font-medium text-[#0B3B2A]">
                      Verification code
                    </label>
                    <input
                      id="settings-unlock-otp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      pattern="[0-9]{6}"
                      value={otpCode}
                      onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                      autoFocus
                      className={inputClass}
                    />
                  </div>
                )}

                {unlockStep === "adminCode" && (
                  <div>
                    <label htmlFor="settings-unlock-admin-code" className="mb-1 block text-sm font-medium text-[#0B3B2A]">
                      Admin code
                    </label>
                    <input
                      id="settings-unlock-admin-code"
                      type="password"
                      autoComplete="current-password"
                      value={unlockAdminCode}
                      onChange={(event) => setUnlockAdminCode(event.target.value)}
                      required
                      autoFocus
                      className={inputClass}
                    />
                  </div>
                )}

                {unlockError && <p className="text-sm text-red-700" role="alert">{unlockError}</p>}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#DCEBE3] px-6 py-4">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  disabled={unlockBusy}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-[#5F7F70] hover:bg-[#F3F9F5]"
                >
                  Leave Settings
                </button>
                <div className="flex items-center gap-2">
                  {unlockStep === "otp" && (
                    <button
                      type="button"
                      disabled={unlockBusy || resendRemaining > 0}
                      onClick={sendOtp}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-[#2F9E7A] disabled:opacity-50"
                    >
                      {resendRemaining > 0 ? `Resend in ${resendRemaining}s` : "Resend code"}
                    </button>
                  )}
                  {unlockStep === "adminCode" && (
                    <button
                      type="button"
                      disabled={unlockBusy}
                      onClick={() => setUnlockStep("otp")}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-[#5F7F70] hover:bg-[#F3F9F5]"
                    >
                      Back
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={
                      unlockBusy ||
                      (unlockStep === "recipient" &&
                        (!selectedRecipient || unlockRecipients.length === 0 || resendRemaining > 0)) ||
                      (unlockStep === "otp" && otpCode.length !== 6) ||
                      (unlockStep === "adminCode" && !unlockAdminCode)
                    }
                    className={primaryButton}
                  >
                    {unlockBusy
                      ? "Verifying..."
                      : unlockStep === "recipient"
                        ? resendRemaining > 0 ? `Try again in ${resendRemaining}s` : "Send code"
                        : unlockStep === "otp"
                          ? "Verify code"
                          : "Unlock Settings"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}