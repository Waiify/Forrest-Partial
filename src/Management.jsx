import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Header from "./components/AdminHeader.jsx";
import Sidebar from "./components/Adminsidebar.jsx";

// Address sa backend server
const API_URL = "http://localhost:5000";

// Kulay ug text sa status (Active / Disabled)
const STATUS_CONFIG = {
  active: { label: "Active", dot: "bg-emerald-500", text: "text-emerald-700" },
  disabled: { label: "Disabled", dot: "bg-slate-400", text: "text-slate-600" },
};

// Empty nga form
const EMPTY_FORM = { name: "", email: "", password: "" };

// Valid email: name@domain.extension (e.g. juan@gmail.com)
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;

// Check kung valid ang email
function isValidEmail(email) {
  return EMAIL_REGEX.test(email);
}

// Para sa date format (Apr 2, 2026)
function formatDate(dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Para sa random nga temporary password
function generateTempPassword() {
  return Math.random().toString(36).slice(-10).padEnd(8, "x");
}

// FORM: para maghimo og bag-ong staff account
function CreateStaffForm({ onCreate }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [createdPassword, setCreatedPassword] = useState("");

  // Para sa pag-update sa inputs (ug i-clear ang error inig usab)
  function handleChange(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (error) setError("");
  }

  // Mo-run inig click sa "Create account"
  async function handleSubmit(e) {
    e.preventDefault();
    setCreatedPassword("");

    const email = form.email.trim();

    // Check kung naay sulod ang name ug email
    if (!form.name.trim() || !email) {
      setError("Name and email are required.");
      return;
    }
    // Check kung valid ang email
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address (e.g. juan@gmail.com).");
      return;
    }
    // Check sa password length
    if (form.password && form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setError("");
    setSaving(true);
    try {
      const generatedPassword = !form.password;
      const password = form.password || generateTempPassword();
      // I-save sa database
      await onCreate({
        name: form.name.trim(),
        email: email.toLowerCase(),
        password,
      });
      if (generatedPassword) setCreatedPassword(password);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <h2 className="text-sm font-semibold">Create staff account</h2>
      <p className="mt-1 text-xs text-slate-500">
        This creates a login the staff member will use on the website.
      </p>

      {createdPassword && (
        <div role="status" className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Staff account created. Temporary password: <strong>{createdPassword}</strong>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Full name */}
        <div>
          <label className="text-xs font-medium text-slate-600" htmlFor="staff-name">
            Full name
          </label>
          <input
            id="staff-name"
            type="text"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Juan Dela Cruz"
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
        </div>

        {/* Email */}
        <div>
          <label className="text-xs font-medium text-slate-600" htmlFor="staff-email">
            Email
          </label>
          <input
            id="staff-email"
            type="email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="juan.delacruz@yourcompany.com"
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
          />
        </div>

        {/* Password + Generate button */}
        <div>
          <label className="text-xs font-medium text-slate-600" htmlFor="staff-password">
            Temporary password
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="staff-password"
              type="text"
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder="Leave blank to auto-generate"
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
            />
            <button
              type="button"
              onClick={() => handleChange("password", generateTempPassword())}
              className="shrink-0 rounded-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Generate
            </button>
          </div>
        </div>
      </div>

      {/* Create button */}
      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create account"}
        </button>
      </div>
    </form>
  );
}

// TABLE: listahan sa tanang staff
function StaffTable({ staff, onToggleStatus }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      {/* Title ug total */}
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold">Staff accounts</h2>
        <span className="text-xs text-slate-400">{staff.length} total</span>
      </div>

      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs text-slate-500">
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Email</th>
            <th className="px-4 py-2 font-medium">Created</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 text-right font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {staff.length === 0 ? (
            // Walay staff
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                No staff accounts yet
              </td>
            </tr>
          ) : (
            // Row sa matag staff
            staff.map((s) => {
              const cfg = STATUS_CONFIG[s.status] ?? STATUS_CONFIG.disabled;
              return (
                <tr key={s._id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                  <td className="px-4 py-3 text-slate-500">{s.email}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(s.createdAt)}</td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                      <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
                    </div>
                  </td>

                  {/* Disable / Enable button */}
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onToggleStatus(s._id)}
                      className="text-xs font-medium text-slate-500 hover:text-slate-900"
                    >
                      {s.status === "active" ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// MAIN PAGE
export default function StaffAccounts() {
  const navigate = useNavigate();
  const location = useLocation();
  const active = location.pathname === "/management" || location.pathname === "/staff-management"
    ? "Staff Management"
    : "Dashboard";

  const [staff, setStaff] = useState([]); // listahan sa staff
  const [loadError, setLoadError] = useState(""); // error kung dili ma-load

  // Kuhaon ang staff gikan sa database inig abli sa page
  useEffect(() => {
    fetch(`${API_URL}/api/staff`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load staff accounts.");
        return res.json();
      })
      .then(setStaff)
      .catch((err) => setLoadError(err.message));
  }, []);

  // I-save ang bag-ong staff sa database
  async function handleCreate(newStaff) {
    const res = await fetch(`${API_URL}/api/staff`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newStaff),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || "Could not create staff account.");
    setStaff((prev) => [data, ...prev]);
  }

  // I-disable o i-enable ang staff account
  async function handleToggleStatus(id) {
    const current = staff.find((s) => s._id === id);
    if (!current) return;
    const newStatus = current.status === "active" ? "disabled" : "active";

    const res = await fetch(`${API_URL}/api/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.ok) return;
    setStaff((prev) => prev.map((s) => (s._id === id ? { ...s, status: newStatus } : s)));
  }

  // Para sa sidebar menu navigation
  function handleNavigate(section) {
    if (section === "Customers") {
      navigate("/customers");
      return;
    }
    if (section === "Capsule") {
      navigate("/capsule");
      return;
    }
    if (section === "Management" || section === "Staff Management") {
      navigate("/management");
      return;
    }
    navigate("/dashboard");
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900">
      <Sidebar active={active} onNavigate={handleNavigate} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header active={active} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="flex flex-col gap-6">
            {/* Error kung dili ma-load ang data */}
            {loadError && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
                {loadError} Make sure the server is running.
              </div>
            )}
            <CreateStaffForm onCreate={handleCreate} />
            <StaffTable staff={staff} onToggleStatus={handleToggleStatus} />
          </div>
        </main>
      </div>
    </div>
  );
}