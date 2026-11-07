import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, ChevronRight, Download, Eye, Receipt, RefreshCw, Search, X,
} from "lucide-react";

import Header from "./components/AdminHeader.jsx";
import Sidebar from "./components/Adminsidebar.jsx";
import useSettings from "./useSettings2.js";

// FIX: strip a trailing slash and make sure the URL ends in /api
const RAW_API = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(/\/+$/, "");
const API = RAW_API.endsWith("/api") ? RAW_API : `${RAW_API}/api`;
const PAGE_SIZE = 20;
const TYPES = ["Payment", "Refund", "Void"];
const METHODS = ["Cash", "GCash", "Card", "Bank Transfer", "Other"];

const TYPE_STYLES = {
  Payment: "bg-emerald-50 text-emerald-700",
  Refund: "bg-purple-50 text-purple-700",
  Void: "bg-red-50 text-red-700",
};

const inputClass =
  "h-10 w-full rounded-lg border border-[#CFE3D9] bg-white px-3 text-sm text-[#0B3B2A] outline-none focus:border-[#2F9E7A] focus:ring-2 focus:ring-[#2F9E7A]/25";

// The server checks that the person is a real admin using the logged-in user's id.
// FIX: tries several common storage keys. If your login page uses another key, add it to this list.
const USER_STORAGE_KEYS = ["user", "currentUser", "authUser", "adminUser", "admin", "forrestUser"];

function adminHeaders() {
  for (const store of [localStorage, sessionStorage]) {
    for (const key of USER_STORAGE_KEYS) {
      try {
        const raw = store.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const user = parsed?.user || parsed; // some apps save { user: {...} }
        const id = user?.id || user?._id;
        if (id) return { "x-user-id": id };
      } catch {
        // not valid JSON, try the next key
      }
    }
  }
  return {};
}

// FIX: a bare "Failed to fetch" now says what actually went wrong
async function request(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error(
      `Cannot reach the server at ${API}. Make sure the backend is running and VITE_API_URL is correct.`
    );
  }
  return response;
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `The request failed (${response.status}).`);
  return data;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date(value));
}

function formatCurrency(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency", currency: "PHP", maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

// Payments add money; refunds and voids take it back.
function signedAmount(tx) {
  return `${tx.type === "Payment" ? "+" : "−"}${formatCurrency(tx.amount)}`;
}

function StatCard({ label, value, detail, tint }) {
  return (
    <section className="rounded-2xl border border-[#DCEBE3] bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-[#6F8E7F]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#0B3B2A]">{value}</p>
      <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tint}`}>{detail}</p>
    </section>
  );
}

function DetailRow({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-[#6F8E7F]">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-[#0B3B2A]">{children || "—"}</dd>
    </div>
  );
}

// Full details for one transaction.
function DetailModal({ tx, onClose }) {
  const recordedBy = tx.recordedBy
    ? `${tx.recordedBy.firstName || ""} ${tx.recordedBy.lastName || ""}`.trim()
    : "";
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#04281A]/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="transaction-detail-title"
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[#DCEBE3] px-6 py-5">
          <div>
            <h2 id="transaction-detail-title" className="text-lg font-semibold text-[#0B3B2A]">
              Transaction details
            </h2>
            <p className="mt-1 text-sm text-[#5F7F70]">{tx.transactionNo}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[#5F7F70] hover:bg-[#EAF4EE]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5">
          <div className="mb-5 flex items-center justify-between rounded-xl bg-[#F3F9F5] px-4 py-3">
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TYPE_STYLES[tx.type]}`}>
              {tx.type}
            </span>
            <span className="text-2xl font-bold text-[#0B3B2A]">{signedAmount(tx)}</span>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <DetailRow label="Date & time">{formatDateTime(tx.createdAt)}</DetailRow>
            <DetailRow label="Payment method">{tx.method}</DetailRow>
            <DetailRow label="Customer">{tx.guestName}</DetailRow>
            <DetailRow label="Email">{tx.guestEmail}</DetailRow>
            <DetailRow label="Capsule">
              {tx.capsuleName}
              {tx.capsuleId && tx.capsuleName !== tx.capsuleId ? ` (${tx.capsuleId})` : ""}
            </DetailRow>
            <DetailRow label="Recorded by">{recordedBy}</DetailRow>
            <DetailRow label="Reservation ID">{tx.reservationId}</DetailRow>
            <DetailRow label="Note">{tx.note}</DetailRow>
          </dl>
        </div>

        <div className="flex justify-end border-t border-[#DCEBE3] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[#5F7F70] hover:bg-[#F3F9F5]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminReports() {
  const navigate = useNavigate();
  const settings = useSettings();
  // FIX: only hidden when explicitly switched off (undefined/missing counts as ON)
  const pdfEnabled = settings?.pdfExportEnabled !== false;

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ payments: 0, refunds: 0, voids: 0, net: 0, count: 0 });
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState("all");
  const [method, setMethod] = useState("all");

  function handleNavigate(section) {
    if (section === "Customers") return navigate("/customers");
    if (section === "Settings") return navigate("/settings");
    if (section === "Capsule") return navigate("/capsule");
    if (section === "Reservation") return navigate("/reservation");
    if (section === "Reports" || section === "transactions") return navigate("/reports");
    if (section === "Staff Management" || section === "Management") return navigate("/management");
    return navigate("/dashboard");
  }

  // Wait until the admin stops typing before searching
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Any filter change goes back to page 1
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, from, to, type, method]);

  // The same filters are used by the table, the totals, and the PDF export.
  const filterQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (from) params.set("from", new Date(`${from}T00:00:00`).toISOString());
    if (to) params.set("to", new Date(`${to}T23:59:59.999`).toISOString());
    if (type !== "all") params.set("type", type);
    if (method !== "all") params.set("method", method);
    return params.toString();
  }, [debouncedSearch, from, to, type, method]);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    const headers = adminHeaders();
    const withFilters = async (path, extra = "") =>
      readResponse(
        await request(`${API}${path}?${[filterQuery, extra].filter(Boolean).join("&")}`, { headers })
      );

    Promise.all([
      withFilters("/reports", `page=${page}&limit=${PAGE_SIZE}`),
      withFilters("/reports/summary"),
    ])
      .then(([list, totals]) => {
        if (!current) return;
        setItems(list.items);
        setTotal(list.total);
        setPages(list.pages);
        setSummary(totals);
      })
      .catch((err) => current && setError(err.message || "Could not load transactions."))
      .finally(() => current && setLoading(false));
    return () => {
      current = false;
    };
  }, [filterQuery, page, reloadKey]);

  const refresh = useCallback(() => setReloadKey((key) => key + 1), []);

  async function exportPdf() {
    setExporting(true);
    setError("");
    setNotice("");
    try {
      const response = await request(`${API}/reports/export?${filterQuery}`, { headers: adminHeaders() });
      if (!response.ok) await readResponse(response); // throws with the server's message
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `transactions-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setNotice("PDF downloaded.");
    } catch (err) {
      setError(err.message || "Could not export the PDF.");
    } finally {
      setExporting(false);
    }
  }

  // One-time: create ledger rows for payments that were saved before this page existed
  async function importExisting() {
    setImporting(true);
    setError("");
    setNotice("");
    try {
      const result = await readResponse(
        await request(`${API}/reports/backfill`, { method: "POST", headers: adminHeaders() })
      );
      setNotice(
        result.created
          ? `Imported ${result.created} transaction${result.created === 1 ? "" : "s"}.`
          : "Nothing to import. All paid reservations are already recorded."
      );
      refresh();
    } catch (err) {
      setError(err.message || "Could not import existing payments.");
    } finally {
      setImporting(false);
    }
  }

  const hasFilters = search || from || to || type !== "all" || method !== "all";
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="flex h-screen w-full bg-[#F4F8F5] text-[#0B3B2A]">
      <Sidebar active="Reports" onNavigate={handleNavigate} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header active="Reports" />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#0B3B2A]">Financial transactions</h2>
                <p className="mt-1 text-sm text-[#6F8E7F]">
                  Every payment, refund, and void, with the full details. Filter the list, then export it as a PDF.
                </p>
              </div>
              {pdfEnabled ? (
                <button
                  type="button"
                  onClick={exportPdf}
                  disabled={exporting || loading || total === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2F9E7A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2a8f6f] focus-visible:ring-2 focus-visible:ring-[#0B3B2A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  {exporting ? "Preparing PDF..." : "Export PDF"}
                </button>
              ) : (
                <p className="text-sm text-[#6F8E7F]">PDF export is disabled in Settings.</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Payments received"
                value={formatCurrency(summary.payments)}
                detail="Money in"
                tint="bg-emerald-50 text-emerald-700"
              />
              <StatCard
                label="Refunds and voids"
                value={formatCurrency(summary.refunds + summary.voids)}
                detail="Money out"
                tint="bg-purple-50 text-purple-700"
              />
              <StatCard
                label="Net revenue"
                value={formatCurrency(summary.net)}
                detail="Payments minus refunds and voids"
                tint="bg-blue-50 text-blue-700"
              />
              <StatCard
                label="Transactions"
                value={summary.count}
                detail={hasFilters ? "Matching filters" : "All time"}
                tint="bg-[#EAF4EE] text-[#0B4A2E]"
              />
            </div>

            <section className="overflow-hidden rounded-2xl border border-[#DCEBE3] bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCEBE3] px-5 py-4 sm:px-6">
                <div>
                  <h3 className="font-semibold text-[#0B3B2A]">Transaction history</h3>
                  <p className="mt-0.5 text-xs text-[#6F8E7F]">
                    {total === 0 ? "No transactions" : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={refresh}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#CFE3D9] px-3 py-2 text-sm font-medium text-[#315D49] hover:bg-[#F3F9F5] disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>

              <div className="flex flex-wrap items-end gap-3 border-b border-[#DCEBE3] bg-[#FAFCFA] px-5 py-4 sm:px-6">
                <label className="block min-w-48 flex-1 sm:max-w-64">
                  <span className="mb-1.5 block text-xs font-semibold text-[#5F7F70]">Search</span>
                  <span className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9BB6A8]" />
                    <input
                      className={`${inputClass} pl-9`}
                      type="search"
                      placeholder="Name, email, or transaction no."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </span>
                </label>
                <label className="block min-w-36 flex-1 sm:max-w-44">
                  <span className="mb-1.5 block text-xs font-semibold text-[#5F7F70]">From</span>
                  <input
                    className={inputClass}
                    type="date"
                    value={from}
                    max={to || undefined}
                    onChange={(event) => setFrom(event.target.value)}
                  />
                </label>
                <label className="block min-w-36 flex-1 sm:max-w-44">
                  <span className="mb-1.5 block text-xs font-semibold text-[#5F7F70]">To</span>
                  <input
                    className={inputClass}
                    type="date"
                    value={to}
                    min={from || undefined}
                    onChange={(event) => setTo(event.target.value)}
                  />
                </label>
                <label className="block min-w-36 flex-1 sm:max-w-44">
                  <span className="mb-1.5 block text-xs font-semibold text-[#5F7F70]">Type</span>
                  <select className={inputClass} value={type} onChange={(event) => setType(event.target.value)}>
                    <option value="all">All types</option>
                    {TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </label>
                <label className="block min-w-36 flex-1 sm:max-w-44">
                  <span className="mb-1.5 block text-xs font-semibold text-[#5F7F70]">Method</span>
                  <select className={inputClass} value={method} onChange={(event) => setMethod(event.target.value)}>
                    <option value="all">All methods</option>
                    {METHODS.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </label>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setFrom("");
                      setTo("");
                      setType("all");
                      setMethod("all");
                    }}
                    className="h-10 px-2 text-sm font-medium text-[#2F8060] hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {error && (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700 sm:px-6"
                  role="alert"
                >
                  <span>{error}</span>
                  <button type="button" onClick={refresh} className="font-semibold underline">
                    Try again
                  </button>
                </div>
              )}

              {notice && !error && (
                <div
                  className="flex items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50 px-5 py-3 text-sm text-emerald-700 sm:px-6"
                  role="status"
                >
                  <span>{notice}</span>
                  <button
                    type="button"
                    onClick={() => setNotice("")}
                    aria-label="Dismiss"
                    className="rounded p-0.5 hover:bg-emerald-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse text-left">
                  <thead>
                    <tr className="bg-[#F7FAF8]">
                      {["Transaction no.", "Date & time", "Customer", "Capsule", "Type", "Method", "Amount", ""].map(
                        (heading, index) => (
                          <th
                            key={heading || index}
                            className={`whitespace-nowrap border-b border-[#E6EFE9] px-4 py-3 text-xs font-semibold text-[#6F8E7F] ${
                              heading === "Amount" ? "text-right" : ""
                            }`}
                          >
                            {heading}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-14 text-center text-sm text-[#6F8E7F]">
                          Loading transactions...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-14 text-center text-sm text-[#6F8E7F]">
                          Transactions could not be loaded.
                        </td>
                      </tr>
                    ) : items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-14 text-center">
                          <Receipt className="mx-auto h-8 w-8 text-[#9BB6A8]" />
                          <p className="mt-3 font-semibold text-[#0B3B2A]">No transactions found</p>
                          <p className="mt-1 text-sm text-[#6F8E7F]">
                            {hasFilters
                              ? "Try changing or clearing the selected filters."
                              : "New transactions appear when a reservation's payment is marked Paid or Refunded."}
                          </p>
                          {!hasFilters && (
                            <button
                              type="button"
                              onClick={importExisting}
                              disabled={importing}
                              className="mt-4 rounded-lg border border-[#CFE3D9] px-4 py-2 text-sm font-semibold text-[#315D49] hover:bg-[#F3F9F5] disabled:opacity-60"
                            >
                              {importing ? "Importing..." : "Import existing payments"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : (
                      items.map((tx) => (
                        <tr key={tx._id} className="border-b border-[#EEF3F0] last:border-0 hover:bg-[#FAFCFA]">
                          <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-[#315D49]">
                            {tx.transactionNo}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-sm text-[#315D49]">
                            {formatDateTime(tx.createdAt)}
                          </td>
                          <td className="px-4 py-4">
                            <p className="whitespace-nowrap text-sm font-semibold text-[#0B3B2A]">{tx.guestName}</p>
                            <p className="mt-0.5 whitespace-nowrap text-xs text-[#6F8E7F]">{tx.guestEmail}</p>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-[#315D49]">
                            {tx.capsuleName || tx.capsuleId}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${TYPE_STYLES[tx.type]}`}
                            >
                              {tx.type}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-sm text-[#315D49]">{tx.method}</td>
                          <td
                            className={`whitespace-nowrap px-4 py-4 text-right text-sm font-semibold ${
                              tx.type === "Payment" ? "text-emerald-700" : "text-red-700"
                            }`}
                          >
                            {signedAmount(tx)}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelected(tx)}
                              className="inline-flex items-center gap-1 rounded-lg border border-[#CFE3D9] px-2.5 py-1.5 text-xs font-semibold text-[#315D49] transition hover:bg-[#F3F9F5]"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {pages > 1 && (
                <div className="flex items-center justify-between gap-3 border-t border-[#DCEBE3] px-5 py-3 sm:px-6">
                  <p className="text-xs text-[#6F8E7F]">
                    Page {page} of {pages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1 || loading}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#CFE3D9] px-3 py-1.5 text-sm font-medium text-[#315D49] hover:bg-[#F3F9F5] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(pages, p + 1))}
                      disabled={page === pages || loading}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#CFE3D9] px-3 py-1.5 text-sm font-medium text-[#315D49] hover:bg-[#F3F9F5] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {selected && <DetailModal tx={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}