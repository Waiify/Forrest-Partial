import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Plus, RefreshCw, X } from "lucide-react";

import Header from "./components/AdminHeader.jsx";
import Sidebar from "./components/Adminsidebar.jsx";

const API = "http://localhost:5000/api";
const STATUSES = ["Pending", "Confirmed", "Checked in", "Completed", "Cancelled"];
const ACTIVE_STATUSES = new Set(["Pending", "Confirmed", "Checked in"]);

const STATUS_STYLES = {
  Pending: "bg-amber-50 text-amber-700",
  Confirmed: "bg-emerald-50 text-emerald-700",
  "Checked in": "bg-blue-50 text-blue-700",
  Completed: "bg-slate-100 text-slate-600",
  Cancelled: "bg-red-50 text-red-700",
};

const PAYMENT_STATUS_STYLES = {
  Unpaid: "bg-red-50 text-red-700",
  Paid: "bg-emerald-50 text-emerald-700",
  Refunded: "bg-purple-50 text-purple-700",
};

const PAYMENT_STATUSES = ["Unpaid", "Paid", "Refunded"];
const PAYMENT_METHODS = ["", "Cash", "GCash", "Card", "Online"];
const PAYMENT_METHOD_LABELS = { "": "—", Cash: "Cash", GCash: "GCash", Card: "Card", Online: "Online" };

const inputClass =
  "h-10 w-full rounded-lg border border-[#CFE3D9] bg-white px-3 text-sm text-[#0B3B2A] outline-none focus:border-[#2F9E7A] focus:ring-2 focus:ring-[#2F9E7A]/25";

// Handles API responses and reports request errors.
async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "The request failed.");
  return data;
}

async function fetchReservationData() {
  const [reservations, customers, capsules] = await Promise.all([
    fetch(`${API}/reservations`).then(readResponse),
    fetch(`${API}/users`).then(readResponse),
    fetch(`${API}/capsules?archived=false`).then(readResponse),
  ]);
  return {
    reservations,
    customers,
    capsules: capsules.filter((capsule) => ["Available", "Reserved"].includes(capsule.status)),
  };
}

// Functions for consistent date, time, and currency formatting.
function localDateValue(value) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

function formatTime(value) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCurrency(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

// Component for displaying reservation summary statistics.
function StatCard({ label, value, detail, tint }) {
  return (
    <section className="rounded-2xl border border-[#DCEBE3] bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-[#6F8E7F]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#0B3B2A]">{value}</p>
      <p className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tint}`}>
        {detail}
      </p>
    </section>
  );
}

// Form component for creating a reservation, including input validation.
function ReservationModal({ customers, capsules, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    customerId: "",
    capsuleId: "",
    startAt: "",
    durationHours: "1",
    status: "Pending",
  });
  const [error, setError] = useState("");

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");

    const hours = Number(form.durationHours);
    if (!form.customerId || !form.capsuleId || !form.startAt) {
      setError("Choose a customer, capsule, and start time.");
      return;
    }
    if (!Number.isFinite(hours) || hours < 0.5 || hours > 24) {
      setError("Duration must be between 0.5 and 24 hours.");
      return;
    }

    try {
      await onSave({
        customerId: form.customerId,
        capsuleId: form.capsuleId,
        startAt: new Date(form.startAt).toISOString(),
        durationHours: hours,
        status: form.status,
      });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#04281A]/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-form-title"
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[#DCEBE3] px-6 py-5">
          <div>
            <h2 id="reservation-form-title" className="text-lg font-semibold text-[#0B3B2A]">
              New reservation
            </h2>
            <p className="mt-1 text-sm text-[#5F7F70]">Create a booking for an existing customer.</p>
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

        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#0B3B2A]">Customer</span>
            <select
              className={inputClass}
              value={form.customerId}
              onChange={(event) => update("customerId", event.target.value)}
              required
            >
              <option value="">Select a customer</option>
              {customers.map((customer) => (
                <option key={customer._id} value={customer._id}>
                  {customer.firstName} {customer.lastName} · {customer.email}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#0B3B2A]">Capsule</span>
            <select
              className={inputClass}
              value={form.capsuleId}
              onChange={(event) => update("capsuleId", event.target.value)}
              required
            >
              <option value="">Select a capsule</option>
              {capsules.map((capsule) => (
                <option key={capsule.capsuleId} value={capsule.capsuleId}>
                  {capsule.capsuleName} · {formatCurrency(capsule.pricePerHour)}/hr
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#0B3B2A]">Start date and time</span>
            <input
              className={inputClass}
              type="datetime-local"
              value={form.startAt}
              onChange={(event) => update("startAt", event.target.value)}
              required
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#0B3B2A]">Duration (hours)</span>
            <input
              className={inputClass}
              type="number"
              min="0.5"
              max="24"
              step="0.5"
              value={form.durationHours}
              onChange={(event) => update("durationHours", event.target.value)}
              required
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-[#0B3B2A]">Initial status</span>
            <select
              className={inputClass}
              value={form.status}
              onChange={(event) => update("status", event.target.value)}
            >
              <option>Pending</option>
              <option>Confirmed</option>
            </select>
          </label>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2" role="alert">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[#DCEBE3] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-[#5F7F70] hover:bg-[#F3F9F5]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || customers.length === 0 || capsules.length === 0}
            className="rounded-lg bg-[#2F9E7A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2a8f6f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Create reservation"}
          </button>
        </div>
      </form>
    </div>
  );
}

// Main admin page for viewing, creating, filtering, and updating reservations.
export default function AdminReservation() {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [dateFilter, setDateFilter] = useState("");
  const [capsuleFilter, setCapsuleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  // Retrieves the latest reservation, customer, and capsule data.
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchReservationData();
      setReservations(data.reservations);
      setCustomers(data.customers);
      setCapsules(data.capsules);
    } catch (err) {
      setError(err.message || "Could not load reservation data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let current = true;
    fetchReservationData()
      .then((data) => {
        if (!current) return;
        setReservations(data.reservations);
        setCustomers(data.customers);
        setCapsules(data.capsules);
      })
      .catch((err) => {
        if (current) setError(err.message || "Could not load reservation data.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, []);

  function handleNavigate(section) {
    if (section === "Customers") return navigate("/customers");
    if (section === "Capsule") return navigate("/capsule");
    if (section === "Reservation") return navigate("/reservation");
    if (section === "Staff Management" || section === "Management") return navigate("/management");
    return navigate("/dashboard");
  }

  // Applies all selected filters to the reservation list.
  const filteredReservations = useMemo(
    () => reservations.filter((reservation) => {
      if (dateFilter && localDateValue(reservation.startAt) !== dateFilter) return false;
      if (capsuleFilter !== "all" && reservation.capsuleId !== capsuleFilter) return false;
      if (statusFilter !== "all" && reservation.status !== statusFilter) return false;
      if (paymentFilter !== "all" && (reservation.paymentStatus || "Unpaid") !== paymentFilter) return false;
      return true;
    }),
    [reservations, dateFilter, capsuleFilter, statusFilter, paymentFilter]
  );

  const pendingCount = reservations.filter((item) => item.status === "Pending").length;
  const activeCount = reservations.filter((item) => ACTIVE_STATUSES.has(item.status)).length;
  const paidCount = reservations.filter((item) => item.paymentStatus === "Paid").length;

  // Saves a new reservation and refreshes the displayed data.
  async function createReservation(data) {
    setSaving(true);
    try {
      await readResponse(await fetch(`${API}/reservations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }));
      setShowForm(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  // Updates a reservation booking status.
  async function updateStatus(reservation, status) {
    setActionError("");
    setUpdatingId(reservation._id);
    try {
      const updated = await readResponse(await fetch(`${API}/reservations/${reservation._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }));
      setReservations((current) =>
        current.map((item) => item._id === updated._id ? updated : item)
      );
    } catch (err) {
      setActionError(err.message || "Could not update reservation.");
    } finally {
      setUpdatingId("");
    }
  }

  // Updates the payment status and/or method for a reservation.
  async function updatePayment(reservation, patch) {
    setActionError("");
    setUpdatingId(reservation._id + "-pay");
    try {
      const updated = await readResponse(
        await fetch(`${API}/reservations/${reservation._id}/payment`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })
      );
      setReservations((current) =>
        current.map((item) => item._id === updated._id ? updated : item)
      );
    } catch (err) {
      setActionError(err.message || "Could not update payment.");
    } finally {
      setUpdatingId("");
    }
  }

  const hasFilters =
    dateFilter || capsuleFilter !== "all" || statusFilter !== "all" || paymentFilter !== "all";

  return (
    <div className="flex h-screen w-full bg-[#F4F8F5] text-[#0B3B2A]">
      {/* Admin navigation sidebar. */}
      <Sidebar active="Reservation" onNavigate={handleNavigate} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header active="Reservation" />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#0B3B2A]">Reservation schedule</h2>
                <p className="mt-1 text-sm text-[#6F8E7F]">
                  Create bookings, monitor status, track payments, and update reservations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#2F9E7A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#2a8f6f] focus-visible:ring-2 focus-visible:ring-[#0B3B2A] focus-visible:ring-offset-2"
              >
                <Plus className="h-4 w-4" />
                New reservation
              </button>
            </div>

            {/* Stat cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="All reservations"
                value={reservations.length}
                detail="Saved bookings"
                tint="bg-[#EAF4EE] text-[#0B4A2E]"
              />
              <StatCard
                label="Needs confirmation"
                value={pendingCount}
                detail="Pending"
                tint="bg-amber-50 text-amber-700"
              />
              <StatCard
                label="Active bookings"
                value={activeCount}
                detail="Pending, confirmed, or checked in"
                tint="bg-blue-50 text-blue-700"
              />
              <StatCard
                label="Payments confirmed"
                value={paidCount}
                detail={`of ${reservations.filter((r) => r.status !== "Cancelled").length} non-cancelled`}
                tint="bg-emerald-50 text-emerald-700"
              />
            </div>

            {/* Reservations table */}
            <section className="overflow-hidden rounded-2xl border border-[#DCEBE3] bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCEBE3] px-5 py-4 sm:px-6">
                <div>
                  <h3 className="font-semibold text-[#0B3B2A]">All bookings</h3>
                  <p className="mt-0.5 text-xs text-[#6F8E7F]">
                    {filteredReservations.length}{" "}
                    {filteredReservations.length === 1 ? "reservation" : "reservations"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadData}
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#CFE3D9] px-3 py-2 text-sm font-medium text-[#315D49] hover:bg-[#F3F9F5] disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-end gap-3 border-b border-[#DCEBE3] bg-[#FAFCFA] px-5 py-4 sm:px-6">
                <label className="block min-w-36 flex-1 sm:max-w-48">
                  <span className="mb-1.5 block text-xs font-semibold text-[#5F7F70]">Date</span>
                  <input
                    className={inputClass}
                    type="date"
                    value={dateFilter}
                    onChange={(event) => setDateFilter(event.target.value)}
                    aria-label="Filter by date"
                  />
                </label>
                <label className="block min-w-36 flex-1 sm:max-w-48">
                  <span className="mb-1.5 block text-xs font-semibold text-[#5F7F70]">Capsule</span>
                  <select
                    className={inputClass}
                    value={capsuleFilter}
                    onChange={(event) => setCapsuleFilter(event.target.value)}
                  >
                    <option value="all">All capsules</option>
                    {capsules.map((capsule) => (
                      <option key={capsule.capsuleId} value={capsule.capsuleId}>
                        {capsule.capsuleName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block min-w-36 flex-1 sm:max-w-48">
                  <span className="mb-1.5 block text-xs font-semibold text-[#5F7F70]">Booking status</span>
                  <select
                    className={inputClass}
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="all">All statuses</option>
                    {STATUSES.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label className="block min-w-36 flex-1 sm:max-w-48">
                  <span className="mb-1.5 block text-xs font-semibold text-[#5F7F70]">Payment</span>
                  <select
                    className={inputClass}
                    value={paymentFilter}
                    onChange={(event) => setPaymentFilter(event.target.value)}
                  >
                    <option value="all">All payments</option>
                    {PAYMENT_STATUSES.map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setDateFilter("");
                      setCapsuleFilter("all");
                      setStatusFilter("all");
                      setPaymentFilter("all");
                    }}
                    className="h-10 px-2 text-sm font-medium text-[#2F8060] hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {(error || actionError) && (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700 sm:px-6"
                  role="alert"
                >
                  <span>{error || actionError}</span>
                  {error && (
                    <button type="button" onClick={loadData} className="font-semibold underline">
                      Try again
                    </button>
                  )}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] border-collapse text-left">
                  <thead>
                    <tr className="bg-[#F7FAF8]">
                      {[
                        "Customer",
                        "Capsule",
                        "Date & time",
                        "Duration",
                        "Amount",
                        "Booking status",
                        "Payment",
                        "Method",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="border-b border-[#E6EFE9] px-4 py-3 text-xs font-semibold text-[#6F8E7F] whitespace-nowrap"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-14 text-center text-sm text-[#6F8E7F]">
                          Loading reservations...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-14 text-center text-sm text-[#6F8E7F]">
                          Reservation data could not be loaded.
                        </td>
                      </tr>
                    ) : filteredReservations.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-14 text-center">
                          <CalendarDays className="mx-auto h-8 w-8 text-[#9BB6A8]" />
                          <p className="mt-3 font-semibold text-[#0B3B2A]">No reservations found</p>
                          <p className="mt-1 text-sm text-[#6F8E7F]">
                            {reservations.length === 0
                              ? "Create a reservation to get started."
                              : "Try changing or clearing the selected filters."}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredReservations.map((reservation) => {
                        const isBusy =
                          updatingId === reservation._id ||
                          updatingId === reservation._id + "-pay";
                        const payStatus = reservation.paymentStatus || "Unpaid";
                        const payMethod = reservation.paymentMethod || "";
                        return (
                          <tr
                            key={reservation._id}
                            className="border-b border-[#EEF3F0] last:border-0 hover:bg-[#FAFCFA]"
                          >
                            {/* Customer */}
                            <td className="px-4 py-4">
                              <p className="whitespace-nowrap text-sm font-semibold text-[#0B3B2A]">
                                {reservation.guestName}
                              </p>
                              <p className="mt-0.5 whitespace-nowrap text-xs text-[#6F8E7F]">
                                {reservation.guestEmail}
                              </p>
                            </td>
                            {/* Capsule */}
                            <td className="px-4 py-4 text-sm font-medium text-[#315D49] whitespace-nowrap">
                              {reservation.capsuleId}
                            </td>
                            {/* Date & time */}
                            <td className="whitespace-nowrap px-4 py-4">
                              <p className="text-sm font-medium text-[#315D49]">
                                {formatDate(reservation.startAt)}
                              </p>
                              <p className="mt-0.5 text-xs text-[#6F8E7F]">
                                {formatTime(reservation.startAt)} – {formatTime(reservation.endAt)}
                              </p>
                            </td>
                            {/* Duration */}
                            <td className="whitespace-nowrap px-4 py-4 text-sm text-[#315D49]">
                              {reservation.durationHours}{" "}
                              {reservation.durationHours === 1 ? "hr" : "hrs"}
                            </td>
                            {/* Amount */}
                            <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-[#315D49]">
                              {formatCurrency(reservation.totalPrice)}
                            </td>
                            {/* Booking status dropdown */}
                            <td className="px-4 py-4">
                              <select
                                aria-label={`Booking status for ${reservation.guestName}`}
                                className={`rounded-full border-0 px-2.5 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#2F9E7A]/30 ${
                                  STATUS_STYLES[reservation.status] || "bg-slate-100 text-slate-600"
                                }`}
                                value={reservation.status}
                                disabled={isBusy}
                                onChange={(event) =>
                                  updateStatus(reservation, event.target.value)
                                }
                              >
                                {STATUSES.map((status) => (
                                  <option key={status}>{status}</option>
                                ))}
                              </select>
                            </td>
                            {/* Payment status dropdown */}
                            <td className="px-4 py-4">
                              <select
                                aria-label={`Payment status for ${reservation.guestName}`}
                                className={`rounded-full border-0 px-2.5 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#2F9E7A]/30 ${
                                  PAYMENT_STATUS_STYLES[payStatus] || "bg-slate-100 text-slate-600"
                                }`}
                                value={payStatus}
                                disabled={isBusy}
                                onChange={(event) =>
                                  updatePayment(reservation, { paymentStatus: event.target.value })
                                }
                              >
                                {PAYMENT_STATUSES.map((s) => (
                                  <option key={s}>{s}</option>
                                ))}
                              </select>
                            </td>
                            {/* Payment method dropdown */}
                            <td className="px-4 py-4">
                              <select
                                aria-label={`Payment method for ${reservation.guestName}`}
                                className="rounded-lg border border-[#CFE3D9] bg-white px-2.5 py-1.5 text-xs text-[#315D49] outline-none focus:ring-2 focus:ring-[#2F9E7A]/30 disabled:opacity-60"
                                value={payMethod}
                                disabled={isBusy}
                                onChange={(event) =>
                                  updatePayment(reservation, { paymentMethod: event.target.value })
                                }
                              >
                                {PAYMENT_METHODS.map((m) => (
                                  <option key={m} value={m}>
                                    {PAYMENT_METHOD_LABELS[m]}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </main>
      </div>

      {/* Displays the reservation form when requested by the administrator. */}
      {showForm && (
        <ReservationModal
          customers={customers}
          capsules={capsules}
          saving={saving}
          onClose={() => setShowForm(false)}
          onSave={createReservation}
        />
      )}
    </div>
  );
}
