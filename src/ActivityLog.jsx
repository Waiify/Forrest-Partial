import { useEffect, useState } from "react";

const API_ROOT = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
const API_URL = API_ROOT.endsWith("/api") ? API_ROOT : `${API_ROOT}/api`;

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown date" : date.toLocaleString();
}

function getUserLabel(user) {
  if (!user || typeof user !== "object") return "";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return name || user.email || "";
}

function getActivityDescription(item) {
  if (item.description) return item.description;

  const actionLabels = {
    "auth.login": "Logged in",
    "auth.logout": "Logged out",
    "auth.login_failed": "Failed login attempt",
    "auth.login_blocked": "Login blocked",
    "auth.signup": "Created account",
    "auth.password_changed": "Changed password",
    "profile.update": "Updated profile",
    "reservation.create": "Created reservation",
    "reservation.reschedule": "Rescheduled reservation",
    "reservation.status": "Changed reservation status",
    "payment.paid": "Marked payment paid",
    "payment.refunded": "Marked payment refunded",
    "payment.unpaid": "Marked payment unpaid",
    "staff.create": "Created staff account",
    "staff.status": "Changed staff account status",
    "settings.update": "Updated settings",
    "capsule.create": "Created capsule",
    "capsule.update": "Updated capsule",
    "capsule.archive": "Archived capsule",
    "capsule.restore": "Restored capsule",
  };
  if (actionLabels[item.action]) return actionLabels[item.action];

  return String(item.action || "Activity recorded")
    .split(".")
    .join(" ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ActivityLog({ userId, scope = "mine" }) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(25);
  const [sortOrder, setSortOrder] = useState("desc");
  const [role, setRole] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (searchInput.trim() === search) return undefined;
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
      setStatus("loading");
      setReloadKey((key) => key + 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, searchInput]);

  useEffect(() => {
    const controller = new AbortController();
    const endpoint = scope === "all" ? "/audit-logs" : "/audit-logs/mine";

    async function loadActivity() {
      try {
        const token = sessionStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const params = new URLSearchParams({
          page: String(page),
          limit: String(limit),
          sort: sortOrder,
        });
        if (scope === "all") {
          if (role) params.set("role", role);
        }
        if (search) params.set("search", search);
        const response = await fetch(`${API_URL}${endpoint}?${params}`, {
          headers,
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.message || `Could not load activity (${response.status}).`);
        }
        if (!Array.isArray(data?.items)) {
          throw new Error("The server returned an invalid activity response.");
        }

        setItems(data.items);
        setPages(data.pages);
        setTotal(data.total);
        setError("");
        setStatus("loaded");
      } catch (loadError) {
        if (loadError.name === "AbortError") return;
        setError(loadError.message || "Could not load activity.");
        setStatus("error");
      }
    }

    loadActivity();
    return () => controller.abort();
  }, [limit, page, reloadKey, role, scope, search, sortOrder, userId]);

  function refresh() {
    setItems([]);
    setPage(1);
    setPages(1);
    setTotal(0);
    setStatus("loading");
    setReloadKey((key) => key + 1);
  }

  function updateAdminFilter(update) {
    update();
    setPage(1);
    setStatus("loading");
    setReloadKey((key) => key + 1);
  }

  function updateSearch(value) {
    setSearch(value);
    setSearchInput(value);
    setPage(1);
    setStatus("loading");
    setReloadKey((key) => key + 1);
  }

  function goToPage(nextPage) {
    setPage(nextPage);
    setStatus("loading");
  }

  function searchActivity(event) {
    event.preventDefault();
    updateSearch(searchInput.trim());
  }

  function getContext(item) {
    if (scope === "all") return "";
    if (item.forOthers) return "For a customer";
    if (item.byOther) return "Done by staff or admin";
    return "";
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#0B3B2A]">
            {scope === "all" ? "Audit Logs" : "Recent Activity"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {scope === "all" ? "Recent activity across all accounts." : "Your recent account activity."}
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={status === "loading"}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <form onSubmit={searchActivity} className="flex min-w-0 flex-1 gap-2">
            <label className="sr-only" htmlFor="activity-log-search">Search activity logs</label>
            <input
              id="activity-log-search"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder={scope === "all" ? "Search activity, account, or email" : "Search your activity"}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#0B3B2A] focus:ring-2 focus:ring-[#0B3B2A]/10"
            />
            <button
              type="submit"
              className="rounded-lg bg-[#0B3B2A] px-4 py-2 text-sm font-medium text-white hover:bg-[#14543D]"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap gap-3">
            {scope === "all" && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <span>User type</span>
                <select
                  value={role}
                  onChange={(event) => updateAdminFilter(() => setRole(event.target.value))}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <option value="">All users</option>
                  <option value="customer">Customers</option>
                  <option value="staff">Staff</option>
                  <option value="admin">Admins</option>
                </select>
              </label>
            )}
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span>Time</span>
              <select
                value={sortOrder}
                onChange={(event) => updateAdminFilter(() => setSortOrder(event.target.value))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <span>Rows</span>
              <select
                value={limit}
                onChange={(event) => updateAdminFilter(() => setLimit(Number(event.target.value)))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </label>
          </div>
      </div>

      {status === "loading" && <p className="py-6 text-sm text-slate-500">Loading activity…</p>}
      {status === "error" && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}
      {status === "loaded" && items.length === 0 && (
        <p className="py-6 text-sm text-slate-500">
          {search ? "No activity matches your search." : "No activity has been recorded yet."}
        </p>
      )}
      {status === "loaded" && items.length > 0 && (
        <div className="overflow-x-auto">
          <table className={`w-full ${scope === "all" ? "min-w-[800px]" : "min-w-[700px]"} text-left text-sm`}>
            <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3 font-medium">Activity</th>
                {scope === "all" && (
                  <>
                    <th className="px-3 py-3 font-medium">Account</th>
                    <th className="px-3 py-3 font-medium">Performed by</th>
                  </>
                )}
                {scope !== "all" && <th className="px-3 py-3 font-medium">Details</th>}
                <th className="px-3 py-3 font-medium">Date</th>
                <th className="px-3 py-3 font-medium">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <tr key={item._id || `${item.action}-${item.createdAt}-${index}`}>
                  <td className="px-3 py-3">
                    <p className="font-medium text-slate-800">{getActivityDescription(item)}</p>
                  </td>
                  {scope === "all" && (
                    <>
                      <td className="px-3 py-3 text-slate-600">
                        {getUserLabel(item.userId) || "Unknown account"}
                        {item.userId?.role && (
                          <span className="ml-1 text-xs text-slate-400">({item.userId.role})</span>
                        )}
                        {item.userId?.email && (
                          <span className="block text-xs text-slate-400">{item.userId.email}</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {item.actorId
                          ? `${getUserLabel(item.actorId) || "Unknown account"}${item.actorId.role ? ` (${item.actorId.role})` : ""}`
                          : getUserLabel(item.userId) || "Unknown account"}
                      </td>
                    </>
                  )}
                  {scope !== "all" && (
                    <td className="px-3 py-3 text-slate-600">{getContext(item) || "—"}</td>
                  )}
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                    {formatDate(item.createdAt)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">{item.device || "Unknown device"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {status === "loaded" && items.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
          <span>
            Showing {(page - 1) * limit + 1}–{(page - 1) * limit + items.length} of {total} activities
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(Math.max(page - 1, 1))}
              disabled={page <= 1 || status === "loading"}
              className="rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-1">Page {page} of {pages}</span>
            <button
              type="button"
              onClick={() => goToPage(Math.min(page + 1, pages))}
              disabled={page >= pages || status === "loading"}
              className="rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
      {error && status === "loaded" && (
        <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>
      )}
    </section>
  );
}
