import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Header from "./components/AdminHeader.jsx";
import Sidebar from "./components/Adminsidebar.jsx";

const RAW_API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
const API_URL = RAW_API.endsWith("/api") ? RAW_API : `${RAW_API}/api`;
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

async function readResponse(response, fallback) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || fallback);
  return data;
}

function PermissionEditor({ value, onChange, onSave, saving, error, showSave = true, buttonLabel = "Save access" }) {
  const permissions = { ...emptyPermissions(), ...value };

  function toggle(resource, action) {
    const selected = permissions[resource] || [];
    let actions;
    if (action === "view" && selected.includes("view")) {
      actions = [];
    } else if (action === "view") {
      actions = ["view"];
    } else if (selected.includes(action)) {
      actions = selected.filter((item) => item !== action);
    } else {
      actions = [...new Set(["view", ...selected, action])];
    }
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
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {PERMISSION_GROUPS.map((group) => (
          <fieldset key={group.id} className="rounded-lg border border-slate-200 p-3">
            <legend className="px-1 text-xs font-semibold text-slate-700">{group.label}</legend>
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-2">
              {group.actions.map((action) => (
                <label key={action} className="flex items-center gap-1.5 text-xs text-slate-600">
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
        ))}
      </div>
      {error && <p className="text-xs text-red-700" role="alert">{error}</p>}
      {showSave && (
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="rounded-lg bg-[#0B3B2A] px-3 py-2 text-xs font-semibold text-white hover:bg-[#14543D] disabled:opacity-50"
        >
          {saving ? "Saving…" : buttonLabel}
        </button>
      )}
    </div>
  );
}

function CreateUserForm({ onCreate }) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");
  const [adminCode, setAdminCode] = useState("");
  const [permissions, setPermissions] = useState(emptyPermissions);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [createdPassword, setCreatedPassword] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setCreatedPassword("");
    setSaving(true);
    try {
      const generatedPassword = password || `Forrest-${crypto.randomUUID().slice(0, 8)}!`;
      await onCreate({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password: generatedPassword,
        role,
        permissions: role === "staff" ? permissions : {},
        ...(role === "admin" ? { adminCode } : {}),
      });
      if (!password) setCreatedPassword(generatedPassword);
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setAdminCode("");
      setRole("staff");
      setPermissions(emptyPermissions());
    } catch (createError) {
      setError(createError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-[#0B3B2A]">Create user account</h2>
      <p className="mt-1 text-sm text-slate-500">
        Create a customer, staff member, or administrator. Staff access is limited to the permissions selected below.
      </p>
      {role === "admin" && (
        <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          <p>Administrator accounts have full system access. Confirm this change with your admin code.</p>
          <label className="mt-3 block font-medium">
            Admin code
            <input
              required
              type="password"
              value={adminCode}
              onChange={(event) => setAdminCode(event.target.value)}
              className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 font-normal"
              autoComplete="current-password"
            />
          </label>
        </div>
      )}
      {createdPassword && (
        <p role="status" className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
          Account created. Temporary password: <strong>{createdPassword}</strong>
        </p>
      )}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium text-slate-700">
          First name
          <input
            required
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal"
            autoComplete="given-name"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Last name
          <input
            required
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal"
            autoComplete="family-name"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal"
            autoComplete="email"
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Account type
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal"
          >
            <option value="customer">Customer</option>
            <option value="staff">Staff</option>
            <option value="admin">Administrator</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">
          Password
          <input
            type="password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Leave blank to generate one"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal"
            autoComplete="new-password"
          />
        </label>
      </div>
      {role === "staff" && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Staff permissions</h3>
          <PermissionEditor
            value={permissions}
            onChange={setPermissions}
            showSave={false}
          />
        </div>
      )}
      <button
        type="submit"
        disabled={saving}
        className="mt-4 rounded-lg bg-[#0B3B2A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#14543D] disabled:opacity-50"
      >
        {saving ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}

function UserTable({ users, currentUserId, onToggleStatus, onUpdateAccess }) {
  const [editingUser, setEditingUser] = useState(null);
  const [draftPermissions, setDraftPermissions] = useState(emptyPermissions);
  const [draftRole, setDraftRole] = useState("staff");
  const [adminCode, setAdminCode] = useState("");
  const [savingId, setSavingId] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const activeAdminCount = users.filter((user) => user.role === "admin" && user.status === "active").length;
  const filteredUsers = users.filter((user) => {
    const matchesSearch = `${user.name} ${user.email}`.toLowerCase().includes(search.trim().toLowerCase());
    return matchesSearch
      && (roleFilter === "all" || user.role === roleFilter)
      && (statusFilter === "all" || user.status === statusFilter);
  });

  useEffect(() => {
    if (!editingUser) return undefined;
    function closeOnEscape(event) {
      if (event.key === "Escape" && !savingId) setEditingUser(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [editingUser, savingId]);

  function openAccessEditor(user) {
    setError("");
    setDraftRole(user.role);
    setDraftPermissions({ ...emptyPermissions(), ...user.permissions });
    setAdminCode("");
    setEditingUser(user);
  }

  async function saveAccess(user) {
    const roleChanged = draftRole !== user.role;
    if (roleChanged) {
      const nextRole = draftRole === "admin" ? "Administrator" : draftRole;
      if (!window.confirm(`Change ${user.name}'s account type from ${user.role} to ${nextRole}?`)) {
        return;
      }
    }
    if (draftRole === "admin" && user.role !== "admin" && !adminCode.trim()) {
      setError("Enter your admin code to grant administrator access.");
      return;
    }

    setSavingId(user._id);
    setError("");
    try {
      await onUpdateAccess(user._id, {
        role: draftRole,
        ...(draftRole === "staff" ? { permissions: draftPermissions } : {}),
        ...(draftRole === "admin" && user.role !== "admin" ? { adminCode } : {}),
      });
      setEditingUser(null);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSavingId("");
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="text-base font-semibold text-[#0B3B2A]">User accounts</h2>
        <span className="text-sm text-slate-500">{users.length} total</span>
      </div>
      <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-3">
        <label className="text-xs font-medium text-slate-600">
          Search users
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or email"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-medium text-slate-600">
          Account type
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal"
          >
            <option value="all">All account types</option>
            <option value="customer">Customers</option>
            <option value="staff">Staff</option>
            <option value="admin">Administrators</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-600">
          Status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredUsers.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No user accounts match these filters.</td></tr>
            ) : filteredUsers.map((user) => {
              const isSelf = String(user._id) === currentUserId;
              const isLastActiveAdmin = user.role === "admin" && user.status === "active" && activeAdminCount <= 1;
              return (
                <tr key={user._id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{user.name}</td>
                  <td className="px-4 py-3 text-slate-600">{user.email}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{user.role}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={user.status === "active" ? "text-emerald-700" : "text-slate-500"}>
                      {user.status === "active" ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => openAccessEditor(user)}
                          className="text-xs font-medium text-[#0B3B2A] hover:underline"
                        >
                          Manage access
                        </button>
                      )}
                      {isSelf ? (
                        <span className="text-xs text-slate-400">Current account</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onToggleStatus(user)}
                          disabled={isLastActiveAdmin}
                          title={isLastActiveAdmin ? "The last active admin cannot be disabled." : undefined}
                          className="text-xs font-medium text-slate-600 hover:text-slate-900"
                        >
                          {user.status === "active" ? "Disable" : "Enable"}
                        </button>
                      )}
                      {isLastActiveAdmin && !isSelf && (
                        <span className="text-xs text-slate-400">Last active admin</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {editingUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#04281A]/50 p-4 backdrop-blur-[2px]"
          onClick={(event) => {
            if (event.target === event.currentTarget && !savingId) setEditingUser(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-access-title"
            className="w-full max-w-3xl rounded-xl bg-white p-5 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="manage-access-title" className="text-lg font-semibold text-[#0B3B2A]">
                  Manage user access
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editingUser.name} · {editingUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                disabled={Boolean(savingId)}
                aria-label="Close access settings"
                className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
              >
                ×
              </button>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Account type
              <select
                value={draftRole}
                onChange={(event) => setDraftRole(event.target.value)}
                disabled={editingUser.role === "admin" && editingUser.status === "active" && activeAdminCount <= 1}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-normal"
              >
                <option value="customer">Customer</option>
                <option value="staff">Staff</option>
                <option value="admin" disabled={editingUser.role === "admin" && editingUser.status === "active" && activeAdminCount <= 1}>
                  Administrator
                </option>
              </select>
            </label>
            {editingUser.role === "admin" && editingUser.status === "active" && activeAdminCount <= 1 && (
              <p className="mt-2 text-xs text-amber-700">This is the last active admin, so its role cannot be changed.</p>
            )}
            {draftRole === "admin" && editingUser.role !== "admin" && (
              <label className="mt-4 block text-sm font-medium text-slate-700">
                Admin code required to grant full system access
                <input
                  type="password"
                  value={adminCode}
                  onChange={(event) => setAdminCode(event.target.value)}
                  autoComplete="current-password"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal"
                />
              </label>
            )}
            {draftRole === "staff" && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-700">Staff permissions</h3>
                <PermissionEditor
                  value={draftPermissions}
                  onChange={setDraftPermissions}
                  showSave={false}
                  error={error}
                />
              </div>
            )}
            {draftRole !== "staff" && error && <p className="mt-3 text-xs text-red-700" role="alert">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                disabled={Boolean(savingId)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveAccess(editingUser)}
                disabled={savingId === editingUser._id}
                className="rounded-lg bg-[#0B3B2A] px-3 py-2 text-sm font-semibold text-white hover:bg-[#14543D] disabled:opacity-50"
              >
                {savingId === editingUser._id ? "Saving…" : "Save access"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default function Management() {
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(true);
  const currentUserId = readCurrentUserId();
  const active = location.pathname === "/management" || location.pathname === "/staff-management"
    ? "User Management"
    : "Dashboard";

  useEffect(() => {
    let activeRequest = true;
    fetch(`${API_URL}/admin/users`, { headers: adminHeaders() })
      .then((response) => readResponse(response, "Failed to load user accounts."))
      .then((data) => {
        if (activeRequest) setUsers(data);
      })
      .catch((error) => {
        if (activeRequest) setLoadError(error.message);
      })
      .finally(() => {
        if (activeRequest) setLoading(false);
      });
    return () => { activeRequest = false; };
  }, []);

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
    setUsers((previous) => previous.map((user) => user._id === id ? updated : user));
    setActionError("");
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
      await updateUser(user._id, {
        status: nextStatus,
        ...(adminCode ? { adminCode } : {}),
      });
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
            {(loadError || actionError) && (
              <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {loadError || actionError}
              </div>
            )}
            {loading ? (
              <p className="py-8 text-sm text-slate-500">Loading user accounts…</p>
            ) : !loadError && (
              <>
                <CreateUserForm onCreate={createUser} />
                <UserTable
                  users={users}
                  currentUserId={currentUserId}
                  onToggleStatus={toggleStatus}
                  onSavePermissions={(id, permissions) => updateUser(id, { permissions })}
                />
                <p className="text-xs text-slate-500">
                  Disabling an account prevents sign-in; accounts are not permanently deleted.
                </p>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
