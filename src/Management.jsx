import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Header from "./components/AdminHeader.jsx";
import Sidebar from "./components/Adminsidebar.jsx";

const RAW_API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
const API_URL = RAW_API.endsWith("/api") ? RAW_API : `${RAW_API}/api`;
const PAGE_SIZE = 10;

const ACTION_LABELS = {
  view: "View",
  create: "Add",
  update: "Update",
  delete: "Archive / delete",
  export: "Export",
};
const PERMISSION_GROUPS = [
  { id: "dashboard", label: "Dashboard", actions: ["view"] },
  { id: "reservations", label: "Reservations", actions: ["view", "create", "update"] },
  { id: "spaces", label: "Spaces and services", actions: ["view", "create", "update", "delete"] },
  { id: "customers", label: "Customers", actions: ["view"] },
  { id: "reports", label: "Reports", actions: ["view", "export"] },
  { id: "auditLogs", label: "Audit logs", actions: ["view"] },
];
const ROLE_TABS = [
  { id: "all", label: "All" },
  { id: "admin", label: "Administrators" },
  { id: "staff", label: "Staff" },
  { id: "customer", label: "Customers" },
];
const ROLE_STYLES = {
  admin: "bg-[#0B3B2A] text-white",
  staff: "bg-emerald-100 text-emerald-800",
  customer: "bg-slate-100 text-slate-700",
};
const INPUT = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 focus:border-[#0B3B2A] focus:outline-none focus:ring-2 focus:ring-[#0B3B2A]/20";

function emptyPermissions() {
  return Object.fromEntries(PERMISSION_GROUPS.map(({ id }) => [id, []]));
}

function readCurrentUserId() {
  try {
    const user = JSON.parse(sessionStorage.getItem("user") || "null");
    return String(user?.id || user?._id || "");
  } catch {
    return "";
  }
}

function adminHeaders() {
  const token = sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function initials(name = "") {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "?";
}

function accessSummary(user) {
  if (user.role === "admin") return "Full access";
  if (user.role === "customer") return "No admin access";
  const count = PERMISSION_GROUPS.filter(({ id }) => user.permissions?.[id]?.length).length;
  return count ? `${count} of ${PERMISSION_GROUPS.length} areas` : "No areas assigned";
}

async function readResponse(response, fallback) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || fallback);
  return data;
}

/* ---------- Small building blocks ---------- */

function Avatar({ name, muted }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
        muted ? "bg-slate-100 text-slate-400" : "bg-[#E3EFE9] text-[#0B3B2A]"
      }`}
    >
      {initials(name)}
    </span>
  );
}

function RoleBadge({ role }) {
  const label = role === "admin" ? "Administrator" : role === "staff" ? "Staff" : "Customer";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[role] || ROLE_STYLES.customer}`}>
      {label}
    </span>
  );
}

function StatusBadge({ status }) {
  const on = status === "active";
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${on ? "text-emerald-700" : "text-slate-500"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-emerald-500" : "bg-slate-400"}`} />
      {on ? "Active" : "Disabled"}
    </span>
  );
}

function Modal({ title, subtitle, onClose, busy, children, wide }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#04281A]/50 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${wide ? "max-w-3xl" : "max-w-xl"} rounded-xl bg-white shadow-xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#0B3B2A]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="rounded-lg px-2 py-1 text-xl leading-none text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </section>
    </div>
  );
}

function PermissionEditor({ value, onChange }) {
  const permissions = { ...emptyPermissions(), ...value };

  function toggle(resource, action) {
    const selected = permissions[resource] || [];
    let actions;
    if (action === "view" && selected.includes("view")) actions = [];
    else if (action === "view") actions = ["view"];
    else if (selected.includes(action)) actions = selected.filter((item) => item !== action);
    else actions = [...new Set(["view", ...selected, action])];

    const updated = { ...permissions, [resource]: actions };
    if (resource === "dashboard" && action === "view" && actions.includes("view")) {
      updated.reservations = [...new Set(["view", ...(updated.reservations || [])])];
      updated.spaces = [...new Set(["view", ...(updated.spaces || [])])];
    }
    if (resource === "reservations" && action === "create" && actions.includes("create")) {
      updated.customers = [...new Set(["view", ...(updated.customers || [])])];
      updated.spaces = [...new Set(["view", ...(updated.spaces || [])])];
    }
    if (["reservations", "spaces"].includes(resource) && action === "view" && !actions.includes("view")) {
      updated.dashboard = [];
    }
    if (["customers", "spaces"].includes(resource) && action === "view" && !actions.includes("view")) {
      updated.reservations = (updated.reservations || []).filter((item) => item !== "create");
    }
    onChange(updated);
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {PERMISSION_GROUPS.map((group) => {
        const count = permissions[group.id]?.length || 0;
        return (
          <fieldset
            key={group.id}
            className={`rounded-lg border p-3 ${count ? "border-[#0B3B2A]/30 bg-[#F3F8F5]" : "border-slate-200"}`}
          >
            <legend className="px-1 text-xs font-semibold text-slate-700">{group.label}</legend>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-2">
              {group.actions.map((action) => (
                <label key={action} className="flex items-center gap-1.5 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={permissions[group.id]?.includes(action) || false}
                    onChange={() => toggle(group.id, action)}
                    className="accent-[#0B3B2A]"
                  />
                  {ACTION_LABELS[action]}
                </label>
              ))}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}

/* ---------- Create user ---------- */

function CreateUserModal({ onCreate, onClose }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "", role: "staff", adminCode: "" });
  const [permissions, setPermissions] = useState(emptyPermissions);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState(false);
  const set = (key) => (event) => setForm((previous) => ({ ...previous, [key]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const generated = !form.password;
      const password = form.password || `Forrest-${crypto.randomUUID().slice(0, 8)}!`;
      await onCreate({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        password,
        role: form.role,
        permissions: form.role === "staff" ? permissions : {},
        ...(form.role === "admin" ? { adminCode: form.adminCode } : {}),
      });
      setCreated({ email: form.email.trim().toLowerCase(), password: generated ? password : "" });
    } catch (createError) {
      setError(createError.message);
    } finally {
      setSaving(false);
    }
  }

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(created.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable; password is still visible */
    }
  }

  if (created) {
    return (
      <Modal title="Account created" onClose={onClose}>
        <p className="text-sm text-slate-600">
          <strong className="text-slate-800">{created.email}</strong> can now sign in.
        </p>
        {created.password && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-medium text-emerald-800">Temporary password — shown only once</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <code className="break-all text-sm font-semibold text-emerald-900">{created.password}</code>
              <button
                type="button"
                onClick={copyPassword}
                className="shrink-0 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#0B3B2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#14543D]"
          >
            Done
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="Add user"
      subtitle="Staff can only open the areas you select below."
      onClose={onClose}
      busy={saving}
      wide={form.role === "staff"}
    >
      <form onSubmit={submit}>
        {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            First name
            <input required value={form.firstName} onChange={set("firstName")} className={INPUT} autoComplete="given-name" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Last name
            <input required value={form.lastName} onChange={set("lastName")} className={INPUT} autoComplete="family-name" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Email
            <input required type="email" value={form.email} onChange={set("email")} className={INPUT} autoComplete="email" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Account type
            <select value={form.role} onChange={set("role")} className={INPUT}>
              <option value="customer">Customer</option>
              <option value="staff">Staff</option>
              <option value="admin">Administrator</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Password
            <input
              type="password"
              minLength={8}
              value={form.password}
              onChange={set("password")}
              placeholder="Leave blank to generate one"
              className={INPUT}
              autoComplete="new-password"
            />
          </label>
        </div>

        {form.role === "admin" && (
          <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            <p>Administrators have full system access. Enter your admin code to confirm.</p>
            <input
              required
              type="password"
              aria-label="Admin code"
              placeholder="Admin code"
              value={form.adminCode}
              onChange={set("adminCode")}
              className={INPUT}
              autoComplete="current-password"
            />
          </div>
        )}

        {form.role === "staff" && (
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Staff permissions</h3>
            <PermissionEditor value={permissions} onChange={setPermissions} />
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#0B3B2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#14543D] disabled:opacity-50"
          >
            {saving ? "Creating…" : "Create account"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ---------- Manage access ---------- */

function AccessModal({ user, lockedRole, onSave, onClose }) {
  const [role, setRole] = useState(user.role);
  const [permissions, setPermissions] = useState({ ...emptyPermissions(), ...user.permissions });
  const [adminCode, setAdminCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const needsCode = role === "admin" && user.role !== "admin";
  const unchanged = role === user.role && role !== "staff";

  async function save() {
    if (role !== user.role) {
      const nextLabel = role === "admin" ? "Administrator" : role;
      if (!window.confirm(`Change ${user.name}'s account type from ${user.role} to ${nextLabel}?`)) return;
    }
    if (needsCode && !adminCode.trim()) {
      setError("Enter your admin code to grant administrator access.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(user._id, {
        role,
        ...(role === "staff" ? { permissions } : {}),
        ...(needsCode ? { adminCode } : {}),
      });
      onClose();
    } catch (saveError) {
      setError(saveError.message);
      setSaving(false);
    }
  }

  return (
    <Modal title="Manage access" subtitle={`${user.name} · ${user.email}`} onClose={onClose} busy={saving} wide>
      <label className="block text-sm font-medium text-slate-700">
        Account type
        <select value={role} onChange={(event) => setRole(event.target.value)} disabled={lockedRole} className={INPUT}>
          <option value="customer">Customer</option>
          <option value="staff">Staff</option>
          <option value="admin">Administrator</option>
        </select>
      </label>
      {lockedRole && (
        <p className="mt-2 text-xs text-amber-700">This is the last active admin, so its account type cannot change.</p>
      )}
      {needsCode && (
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Admin code (required to grant full system access)
          <input
            type="password"
            value={adminCode}
            onChange={(event) => setAdminCode(event.target.value)}
            autoComplete="current-password"
            className={INPUT}
          />
        </label>
      )}
      {role === "staff" && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Staff permissions</h3>
          <PermissionEditor value={permissions} onChange={setPermissions} />
        </div>
      )}
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          disabled={saving || unchanged}
          className="rounded-lg bg-[#0B3B2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#14543D] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </Modal>
  );
}

/* ---------- Table ---------- */

function SortHeader({ label, field, sort, onSort, className = "" }) {
  const current = sort.key === field;
  return (
    <th
      className={`px-4 py-3 font-medium ${className}`}
      aria-sort={current ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-1 hover:text-slate-900">
        {label}
        <span aria-hidden="true" className={current ? "text-[#0B3B2A]" : "text-slate-300"}>
          {current && sort.dir === "desc" ? "▼" : "▲"}
        </span>
      </button>
    </th>
  );
}

function UserTable({ users, currentUserId, onToggleStatus, onUpdateAccess }) {
  const [editingUser, setEditingUser] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);

  const activeAdminCount = users.filter((user) => user.role === "admin" && user.status === "active").length;
  const counts = useMemo(() => {
    const result = { all: users.length, admin: 0, staff: 0, customer: 0 };
    users.forEach((user) => { if (result[user.role] !== undefined) result[user.role] += 1; });
    return result;
  }, [users]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const value = (user) => (sort.key === "createdAt"
      ? new Date(user.createdAt).getTime() || 0
      : String(user[sort.key] || "").toLowerCase());
    return users
      .filter((user) => (
        `${user.name} ${user.email}`.toLowerCase().includes(query)
        && (roleFilter === "all" || user.role === roleFilter)
        && (statusFilter === "all" || user.status === statusFilter)
      ))
      .sort((a, b) => {
        const [x, y] = [value(a), value(b)];
        const order = x < y ? -1 : x > y ? 1 : 0;
        return sort.dir === "asc" ? order : -order;
      });
  }, [users, search, roleFilter, statusFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const filtersActive = search || roleFilter !== "all" || statusFilter !== "all";

  useEffect(() => { setPage(1); }, [search, roleFilter, statusFilter]);

  function toggleSort(key) {
    setSort((previous) => (previous.key === key
      ? { key, dir: previous.dir === "asc" ? "desc" : "asc" }
      : { key, dir: "asc" }));
  }

  function clearFilters() {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Filter by account type" className="flex flex-wrap gap-1">
          {ROLE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={roleFilter === tab.id}
              onClick={() => setRoleFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                roleFilter === tab.id ? "bg-[#0B3B2A] text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs ${roleFilter === tab.id ? "text-white/70" : "text-slate-400"}`}>
                {counts[tab.id]}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="search"
            aria-label="Search users"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name or email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-[#0B3B2A] focus:outline-none focus:ring-2 focus:ring-[#0B3B2A]/20 sm:w-64"
          />
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#0B3B2A] focus:outline-none focus:ring-2 focus:ring-[#0B3B2A]/20"
          >
            <option value="all">Any status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
            <tr>
              <SortHeader label="User" field="name" sort={sort} onSort={toggleSort} />
              <SortHeader label="Type" field="role" sort={sort} onSort={toggleSort} />
              <th className="px-4 py-3 font-medium">Access</th>
              <SortHeader label="Status" field="status" sort={sort} onSort={toggleSort} />
              <SortHeader label="Created" field="createdAt" sort={sort} onSort={toggleSort} />
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-14 text-center">
                  <p className="font-medium text-slate-700">No users found</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {filtersActive ? "Try a different search or filter." : "Add a user to get started."}
                  </p>
                  {filtersActive && (
                    <button type="button" onClick={clearFilters} className="mt-3 text-sm font-medium text-[#0B3B2A] hover:underline">
                      Clear filters
                    </button>
                  )}
                </td>
              </tr>
            ) : visible.map((user) => {
              const isSelf = String(user._id) === currentUserId;
              const isDisabled = user.status !== "active";
              const isLastActiveAdmin = user.role === "admin" && !isDisabled && activeAdminCount <= 1;
              return (
                <tr key={user._id} className={isDisabled ? "bg-slate-50/60" : "hover:bg-slate-50/60"}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={user.name} muted={isDisabled} />
                      <div className="min-w-0">
                        <p className={`truncate font-medium ${isDisabled ? "text-slate-500" : "text-slate-900"}`}>
                          {user.name}
                          {isSelf && <span className="ml-2 text-xs font-normal text-slate-400">You</span>}
                        </p>
                        <p className="truncate text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><RoleBadge role={user.role} /></td>
                  <td className="px-4 py-3 text-slate-600">{accessSummary(user)}</td>
                  <td className="px-4 py-3"><StatusBadge status={user.status} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {isSelf ? (
                        <span className="text-xs text-slate-400">Your account</span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setEditingUser(user)}
                            className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-[#0B3B2A] hover:bg-[#F3F8F5]"
                          >
                            Manage access
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleStatus(user)}
                            disabled={isLastActiveAdmin}
                            title={isLastActiveAdmin ? "The last active admin cannot be disabled." : undefined}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
                              isDisabled ? "text-emerald-700 hover:bg-emerald-50" : "text-red-700 hover:bg-red-50"
                            }`}
                          >
                            {isDisabled ? "Enable" : "Disable"}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
        <span>
          {filtered.length === 0
            ? "0 users"
            : `${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs">Page {currentPage} of {pageCount}</span>
          <button
            type="button"
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage >= pageCount}
            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium hover:bg-slate-50 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {editingUser && (
        <AccessModal
          key={editingUser._id}
          user={editingUser}
          lockedRole={editingUser.role === "admin" && editingUser.status === "active" && activeAdminCount <= 1}
          onSave={onUpdateAccess}
          onClose={() => setEditingUser(null)}
        />
      )}
    </div>
  );
}

/* ---------- Page ---------- */

function SummaryStrip({ users }) {
  const active = users.filter((user) => user.status === "active").length;
  const items = [
    { label: "Total accounts", value: users.length },
    { label: "Active", value: active },
    { label: "Disabled", value: users.length - active },
    { label: "Staff", value: users.filter((user) => user.role === "staff").length },
    { label: "Administrators", value: users.filter((user) => user.role === "admin").length },
  ];
  return (
    <dl className="grid grid-cols-2 divide-x divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="px-5 py-4">
          <dt className="text-xs text-slate-500">{item.label}</dt>
          <dd className="mt-1 text-2xl font-semibold text-[#0B3B2A]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function Management() {
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const currentUserId = readCurrentUserId();
  const active = location.pathname === "/management" || location.pathname === "/staff-management"
    ? "User Management"
    : "Dashboard";

  useEffect(() => {
    let activeRequest = true;
    fetch(`${API_URL}/admin/users`, { headers: adminHeaders() })
      .then((response) => readResponse(response, "Failed to load user accounts."))
      .then((data) => { if (activeRequest) setUsers(data); })
      .catch((error) => { if (activeRequest) setLoadError(error.message); })
      .finally(() => { if (activeRequest) setLoading(false); });
    return () => { activeRequest = false; };
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function createUser(user) {
    const created = await readResponse(
      await fetch(`${API_URL}/admin/users`, {
        method: "POST",
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(user),
      }),
      "Could not create account."
    );
    setUsers((previous) => [created, ...previous]);
  }

  async function updateUser(id, update) {
    const updated = await readResponse(
      await fetch(`${API_URL}/admin/users/${id}`, {
        method: "PATCH",
        headers: { ...adminHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(update),
      }),
      "Could not update account."
    );
    setUsers((previous) => previous.map((user) => (user._id === id ? updated : user)));
    setActionError("");
    return updated;
  }

  async function saveAccess(id, update) {
    const updated = await updateUser(id, update);
    setNotice(`Access updated for ${updated.name}.`);
    return updated;
  }

  async function toggleStatus(user) {
    const nextStatus = user.status === "active" ? "disabled" : "active";
    if (
      nextStatus === "disabled" &&
      !window.confirm(`Disable ${user.name}'s account? They will no longer be able to sign in.`)
    ) {
      return;
    }
    const adminCode = user.role === "admin" && nextStatus === "active"
      ? window.prompt("Enter your admin code to restore administrator access.")
      : null;
    if (user.role === "admin" && nextStatus === "active" && adminCode === null) return;
    setActionError("");
    try {
      await updateUser(user._id, { status: nextStatus, ...(adminCode ? { adminCode } : {}) });
      setNotice(`${user.name} is now ${nextStatus === "active" ? "active" : "disabled"}.`);
    } catch (error) {
      setActionError(error.message);
    }
  }

  function handleNavigate(section) {
    if (section === "Customers") return navigate("/customers");
    if (section === "Capsule") return navigate("/capsule");
    if (section === "Management" || section === "Staff Management" || section === "User Management") {
      return navigate("/management");
    }
    if (section === "Reservation") return navigate("/reservation");
    if (section === "Reports" || section === "transactions") return navigate("/reports");
    if (section === "Audit Logs") return navigate("/audit-logs");
    if (section === "Settings") return navigate("/settings");
    navigate("/dashboard");
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900">
      <Sidebar active={active} onNavigate={handleNavigate} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header active={active} />
        <main className="flex-1 overflow-y-auto p-6 pb-24 md:p-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-[#0B3B2A]">User management</h1>
                <p className="mt-1 max-w-xl text-sm text-slate-500">
                  Add accounts, choose what staff can open, and disable access. Disabled accounts can’t sign in but are never deleted.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreating(true)}
                disabled={loading || Boolean(loadError)}
                className="rounded-lg bg-[#0B3B2A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#14543D] disabled:opacity-50"
              >
                Add user
              </button>
            </div>

            {notice && (
              <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {notice}
              </div>
            )}
            {(loadError || actionError) && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {loadError || actionError}
              </div>
            )}

            {loading ? (
              <div className="space-y-3" aria-busy="true" aria-label="Loading user accounts">
                <div className="h-20 animate-pulse rounded-xl bg-slate-200/70" />
                <div className="h-72 animate-pulse rounded-xl bg-slate-200/70" />
              </div>
            ) : !loadError && (
              <>
                <SummaryStrip users={users} />
                <UserTable
                  users={users}
                  currentUserId={currentUserId}
                  onToggleStatus={toggleStatus}
                  onUpdateAccess={saveAccess}
                />
              </>
            )}
          </div>
        </main>
      </div>
      {creating && (
        <CreateUserModal
          onCreate={createUser}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
} 