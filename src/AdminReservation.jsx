import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarClock,
  CalendarDays,
  BarChart3,
  Check,
  Clock3,
  CreditCard,
  Eye,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  X,
} from "lucide-react";

import Header from "./components/AdminHeader.jsx";
import Sidebar from "./components/Adminsidebar.jsx";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const STATUSES = ["Pending", "Confirmed", "Checked in", "Completed", "Cancelled"];
const BOOKABLE_CAPSULE_STATUSES = ["Available", "Reserved"];
const OVERDUE_STATUSES = ["Checked in", "Completed"];
const RESCHEDULABLE_STATUSES = ["Pending", "Confirmed"];

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

const inputClass =
  "h-10 w-full rounded-lg border border-[#CFE3D9] bg-white px-3 text-sm text-[#0B3B2A] outline-none focus:border-[#2F9E7A] focus:ring-2 focus:ring-[#2F9E7A]/25";

// Handles API responses and reports request errors.
async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "The request failed.");
  return data;
}


async function fetchCapsules() {
  return fetch(`${API}/capsules?archived=false`).then(readResponse);
}

async function fetchReservationData() {
  const [reservations, customers, allCapsules] = await Promise.all([
    fetch(`${API}/reservations`).then(readResponse),
    fetch(`${API}/users`).then(readResponse),
    fetchCapsules(),
  ]);
  return {
    reservations,
    customers,
    allCapsules,
    bookableCapsules: allCapsules.filter((capsule) =>
      BOOKABLE_CAPSULE_STATUSES.includes(capsule.status)
    ),
  };
}

// Functions for consistent date, time, and currency formatting.
function localDateValue(value) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function localDateTimeValue(value) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
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

function sumPrice(list) {
  return list.reduce((total, item) => total + (Number(item.totalPrice) || 0), 0);
}

function isHistoricalReservation(reservation, now = Date.now()) {
  return (
    ["Completed", "Cancelled"].includes(reservation.status) ||
    new Date(reservation.endAt).getTime() <= now
  );
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

function MetricBar({ label, value, maxValue, tint = "bg-[#2F9E7A]" }) {
  const width = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
        <span className="truncate text-[#315D49]">{label}</span>
        <span className="shrink-0 font-semibold text-[#0B3B2A]">{value}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-[#EAF4EE]"
        role="meter"
        aria-label={`${label}: ${value}`}
        aria-valuemin={0}
        aria-valuemax={maxValue || 1}
        aria-valuenow={value}
      >
        <div className={`h-full rounded-full ${tint}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function ReservationAnalytics({ reservations, capsuleNames }) {
  const monthlyBookings = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: new Intl.DateTimeFormat(undefined, { month: "short" }).format(date),
        count: 0,
      };
    });
    const countsByMonth = new Map(months.map((month) => [month.key, month]));

    reservations.forEach((reservation) => {
      const createdAt = new Date(reservation.createdAt || reservation.startAt);
      if (Number.isNaN(createdAt.getTime())) return;
      const month = countsByMonth.get(`${createdAt.getFullYear()}-${createdAt.getMonth()}`);
      if (month) month.count += 1;
    });

    return months;
  }, [reservations]);

  const statusCounts = useMemo(
    () =>
      STATUSES.map((status) => ({
        label: status,
        count: reservations.filter((reservation) => reservation.status === status).length,
      })),
    [reservations]
  );

  const paymentCounts = useMemo(
    () =>
      PAYMENT_STATUSES.map((status) => ({
        label: status,
        count: reservations.filter(
          (reservation) => (reservation.paymentStatus || "Unpaid") === status
        ).length,
      })),
    [reservations]
  );

  const capsuleCounts = useMemo(() => {
    const counts = new Map();
    reservations.forEach((reservation) => {
      const id = reservation.capsuleId || "unknown";
      counts.set(id, (counts.get(id) || 0) + 1);
    });
    return [...counts.entries()]
      .map(([id, count]) => ({
        label: capsuleNames[id] || id,
        count,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 5);
  }, [reservations, capsuleNames]);

  const maxMonthlyBookings = Math.max(...monthlyBookings.map((month) => month.count), 1);
  const maxStatusCount = Math.max(...statusCounts.map((status) => status.count), 1);
  const maxPaymentCount = Math.max(...paymentCounts.map((payment) => payment.count), 1);
  const maxCapsuleCount = Math.max(...capsuleCounts.map((capsule) => capsule.count), 1);

  return (
    <section aria-labelledby="reservation-analytics-title" className="space-y-4">
      <div>
        <h3 id="reservation-analytics-title" className="text-lg font-bold text-[#0B3B2A]">
          Reservation analytics
        </h3>
        <p className="mt-1 text-sm text-[#6F8E7F]">
          Booking trends and current status breakdowns across all reservations.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-[#DCEBE3] bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-5 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-[#2F8060]" />
            <div>
              <h4 className="font-semibold text-[#0B3B2A]">Monthly bookings</h4>
              <p className="text-xs text-[#6F8E7F]">Created in the last six months</p>
            </div>
          </div>
          <div
            className="grid min-h-40 grid-cols-6 items-end gap-3"
            role="img"
            aria-label="Monthly reservation counts for the last six months"
          >
            {monthlyBookings.map((month) => (
              <div key={month.key} className="flex h-full flex-col items-center justify-end gap-2">
                <span className="text-xs font-semibold text-[#315D49]">{month.count}</span>
                <div className="flex h-24 w-full items-end rounded-t-md bg-[#F3F9F5]">
                  <div
                    className="w-full rounded-t-md bg-[#2F9E7A] transition-all"
                    style={{
                      height: `${month.count ? Math.max((month.count / maxMonthlyBookings) * 100, 5) : 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-[#6F8E7F]">{month.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#DCEBE3] bg-white p-5 shadow-sm">
          <h4 className="font-semibold text-[#0B3B2A]">Booking status</h4>
          <p className="mb-5 mt-1 text-xs text-[#6F8E7F]">Current reservations by status</p>
          <div className="space-y-4">
            {statusCounts.map((status) => (
              <MetricBar
                key={status.label}
                label={status.label}
                value={status.count}
                maxValue={maxStatusCount}
                tint={
                  status.label === "Cancelled"
                    ? "bg-red-400"
                    : status.label === "Pending"
                    ? "bg-amber-400"
                    : status.label === "Completed"
                    ? "bg-slate-400"
                    : "bg-[#2F9E7A]"
                }
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#DCEBE3] bg-white p-5 shadow-sm">
          <h4 className="font-semibold text-[#0B3B2A]">Payment status</h4>
          <p className="mb-5 mt-1 text-xs text-[#6F8E7F]">Current payment breakdown</p>
          <div className="space-y-4">
            {paymentCounts.map((payment) => (
              <MetricBar
                key={payment.label}
                label={payment.label}
                value={payment.count}
                maxValue={maxPaymentCount}
                tint={
                  payment.label === "Paid"
                    ? "bg-[#2F9E7A]"
                    : payment.label === "Refunded"
                    ? "bg-purple-400"
                    : "bg-red-400"
                }
              />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#DCEBE3] bg-white p-5 shadow-sm lg:col-span-2">
          <h4 className="font-semibold text-[#0B3B2A]">Most booked capsules</h4>
          <p className="mb-5 mt-1 text-xs text-[#6F8E7F]">Top five by reservation count</p>
          {capsuleCounts.length === 0 ? (
            <p className="rounded-lg bg-[#F5FAF7] px-4 py-6 text-center text-sm text-[#6F8E7F]">
              Capsule analytics will appear when reservations are available.
            </p>
          ) : (
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {capsuleCounts.map((capsule) => (
                <MetricBar
                  key={capsule.label}
                  label={capsule.label}
                  value={capsule.count}
                  maxValue={maxCapsuleCount}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function ReservationDetailsModal({ reservation, capsuleName, onClose }) {
  if (!reservation) return null;

  const paymentStatus = reservation.paymentStatus || "Unpaid";
  const bookingStatusStyle =
    STATUS_STYLES[reservation.status] || "bg-slate-100 text-slate-600";
  const paymentStatusStyle =
    PAYMENT_STATUS_STYLES[paymentStatus] || "bg-slate-100 text-slate-600";
  const details = [
    ["Reservation ID", reservation._id, CreditCard],
    ["Customer", reservation.guestName, UserRound],
    ["Email", reservation.guestEmail, UserRound],
    ["Capsule", capsuleName, CalendarDays],
    ["Date", formatDate(reservation.startAt), CalendarDays],
    ["Time", `${formatTime(reservation.startAt)} – ${formatTime(reservation.endAt)}`, Clock3],
    [
      "Duration",
      `${reservation.durationHours} ${reservation.durationHours === 1 ? "hour" : "hours"}`,
      Clock3,
    ],
    ["Rate", `${formatCurrency(reservation.pricePerHour)} per hour`, CreditCard],
    ["Total", formatCurrency(reservation.totalPrice), CreditCard],
    [
      "Created",
      reservation.createdAt ? formatDate(reservation.createdAt) : "Unavailable",
      CalendarClock,
    ],
    [
      "Last updated",
      reservation.updatedAt ? formatDate(reservation.updatedAt) : "Unavailable",
      CalendarClock,
    ],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#04281A]/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-details-title"
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[#DCEBE3] px-6 py-5">
          <div>
            <h2 id="reservation-details-title" className="text-lg font-semibold text-[#0B3B2A]">
              Reservation details
            </h2>
            <p className="mt-1 text-sm text-[#5F7F70]">
              Review the customer and booking record.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reservation details"
            className="rounded-lg p-1.5 text-[#5F7F70] hover:bg-[#EAF4EE]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-6 pt-5">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${bookingStatusStyle}`}>
            {reservation.status}
          </span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${paymentStatusStyle}`}>
            {paymentStatus}
          </span>
        </div>

        <dl className="grid gap-3 px-6 py-5 sm:grid-cols-2">
          {details.map(([label, value, Icon], index) => {
            return (
              <div
                key={label}
                className={`rounded-xl bg-[#F5FAF7] p-4 ${index === 0 ? "sm:col-span-2" : ""}`}
              >
                <dt className="flex items-center gap-2 text-xs font-medium text-[#6F8E7F]">
                  <Icon className="h-4 w-4 text-[#2F8060]" />
                  {label}
                </dt>
                <dd className="mt-2 break-words text-sm font-semibold text-[#0B3B2A]">
                  {value || "Unavailable"}
                </dd>
              </div>
            );
          })}
        </dl>

        <div className="flex justify-end border-t border-[#DCEBE3] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#2F9E7A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2a8f6f]"
          >
            Close
          </button>
        </div>
      </section>
    </div>
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
 
// Form component for moving an existing reservation to a new date, time, or duration.
function RescheduleModal({ reservation, capsuleName, onClose, onSave, saving }) {
  // If the current booking is already in the past, start the field empty
  // so the admin has to pick a valid (current or future) time.
  const initialStart = localDateTimeValue(reservation.startAt);
  const nowValue = localDateTimeValue(new Date());

  const [form, setForm] = useState({
    startAt: initialStart < nowValue ? "" : initialStart,
    durationHours: String(reservation.durationHours ?? 1),
  });
  const [error, setError] = useState("");

  // Earliest selectable value: the current minute. Recomputed on every render.
  const minStart = localDateTimeValue(new Date());

  // Close with Escape.
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");

    const hours = Number(form.durationHours);
    if (!form.startAt) {
      setError("Choose a new start date and time.");
      return;
    }
    if (Number.isNaN(new Date(form.startAt).getTime())) {
      setError("Enter a valid start date and time.");
      return;
    }
    if (!Number.isFinite(hours) || hours < 0.5 || hours > 24) {
      setError("Duration must be between 0.5 and 24 hours.");
      return;
    }
    if (form.startAt < localDateTimeValue(new Date())) {
      setError("Past dates and times can't be selected. Choose a time from now onward.");
      return;
    }

    const unchanged =
      new Date(form.startAt).getTime() === new Date(reservation.startAt).getTime() &&
      hours === Number(reservation.durationHours);
    if (unchanged) {
      setError("Pick a different date, time, or duration to reschedule.");
      return;
    }

    try {
      await onSave({
        startAt: new Date(form.startAt).toISOString(),
        durationHours: hours,
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
        aria-labelledby="reschedule-form-title"
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[#DCEBE3] px-6 py-5">
          <div>
            <h2 id="reschedule-form-title" className="text-lg font-semibold text-[#0B3B2A]">
              Reschedule reservation
            </h2>
            <p className="mt-1 text-sm text-[#5F7F70]">
              {reservation.guestName} · {capsuleName}
            </p>
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
          <div className="rounded-lg bg-[#F3F9F5] px-3 py-2.5 text-sm text-[#315D49] sm:col-span-2">
            <span className="font-semibold">Current booking: </span>
            {formatDate(reservation.startAt)}, {formatTime(reservation.startAt)} –{" "}
            {formatTime(reservation.endAt)}
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#0B3B2A]">New start date and time</span>
            {/* min = now, so past dates and times can't be picked in the calendar */}
            <input
              className={inputClass}
              type="datetime-local"
              min={minStart}
              value={form.startAt}
              onChange={(event) => update("startAt", event.target.value)}
              required
            />
            <span className="mt-1 block text-xs text-[#6F8E7F]">
              Past dates and times can't be selected.
            </span>
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
            disabled={saving}
            className="rounded-lg bg-[#2F9E7A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2a8f6f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save new schedule"}
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
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [customers, setCustomers] = useState([]);
  const [allCapsules, setAllCapsules] = useState([]);
  const [bookableCapsules, setBookableCapsules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [rescheduling, setRescheduling] = useState(null);
  const [viewingReservation, setViewingReservation] = useState(null);
  const [reservationView, setReservationView] = useState("all");
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [capsuleFilter, setCapsuleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  function applyData(data) {
    setReservations(data.reservations);
    setCustomers(data.customers);
    setAllCapsules(data.allCapsules);
    setBookableCapsules(data.bookableCapsules);
  }

  // Retrieves the latest reservation, customer, and capsule data.
  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      applyData(await fetchReservationData());
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
        if (current) applyData(data);
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

  useEffect(() => {
    const nextEndAt = reservations.reduce((next, reservation) => {
      if (["Completed", "Cancelled"].includes(reservation.status)) return next;
      const endAt = new Date(reservation.endAt).getTime();
      return endAt > currentTime ? Math.min(next, endAt) : next;
    }, Infinity);

    if (!Number.isFinite(nextEndAt)) return undefined;

    const timeout = window.setTimeout(
      () => setCurrentTime(Date.now()),
      Math.min(nextEndAt - currentTime, 2_147_000_000)
    );
    return () => window.clearTimeout(timeout);
  }, [reservations, currentTime]);

  async function refreshCapsules() {
    try {
      const capsules = await fetchCapsules();
      setAllCapsules(capsules);
      setBookableCapsules(
        capsules.filter((capsule) => BOOKABLE_CAPSULE_STATUSES.includes(capsule.status))
      );
    } catch (err) {
      setActionError(err.message || "Could not refresh capsules.");
    }
  }

  function handleNavigate(section) {
    if (section === "Customers") return navigate("/customers");
    if (section === "Settings") return navigate("/settings");
    if (section === "Capsule") return navigate("/capsule");
    if (section === "Reservation") return navigate("/reservation");
    if (section === "Staff Management" || section === "Management") return navigate("/management");
    if (section === "Reports" || section === "transactions") return navigate("/reports");
    return navigate("/dashboard");
  }

  const capsuleNames = useMemo(
    () => Object.fromEntries(allCapsules.map((capsule) => [capsule.capsuleId, capsule.capsuleName])),
    [allCapsules]
  );

  const filteredReservations = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reservations.filter((reservation) => {
      if (
        query &&
        !`${reservation.guestName || ""} ${reservation.guestEmail || ""}`.toLowerCase().includes(query)
      ) {
        return false;
      }
      if (dateFilter && localDateValue(reservation.startAt) !== dateFilter) return false;
      if (capsuleFilter !== "all" && reservation.capsuleId !== capsuleFilter) return false;
      if (statusFilter !== "all" && reservation.status !== statusFilter) return false;
      if (paymentFilter !== "all" && (reservation.paymentStatus || "Unpaid") !== paymentFilter) return false;
      return true;
    });
  }, [reservations, search, dateFilter, capsuleFilter, statusFilter, paymentFilter]);

  const activeReservations = useMemo(
    () => reservations.filter((reservation) => !isHistoricalReservation(reservation, currentTime)),
    [reservations, currentTime]
  );
  const historyReservations = useMemo(
    () => reservations.filter((reservation) => isHistoricalReservation(reservation, currentTime)),
    [reservations, currentTime]
  );
  const visibleReservations = useMemo(() => {
    const list =
      reservationView === "history"
        ? filteredReservations.filter((reservation) =>
            isHistoricalReservation(reservation, currentTime)
          )
        : filteredReservations.filter(
            (reservation) => !isHistoricalReservation(reservation, currentTime)
          );
    return reservationView === "history"
      ? [...list].sort(
          (a, b) =>
            new Date(b.updatedAt || b.endAt).getTime() -
            new Date(a.updatedAt || a.endAt).getTime()
        )
      : list;
  }, [filteredReservations, reservationView, currentTime]);

  const pendingCount = reservations.filter((item) => item.status === "Pending").length;
  const billable = reservations.filter((item) => item.status !== "Cancelled");
  const paidCount = billable.filter((item) => item.paymentStatus === "Paid").length;
  const collected = sumPrice(reservations.filter((item) => item.paymentStatus === "Paid"));
  const outstanding = sumPrice(
    billable.filter((item) => (item.paymentStatus || "Unpaid") === "Unpaid")
  );

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
 
  // Sends a PATCH to a reservation and merges the response into the table row.
  // Merging keeps fields the server omits (e.g. guestName).
  async function patchReservation(reservation, body) {
    const updated = await readResponse(await fetch(`${API}/reservations/${reservation._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }));
    setReservations((current) =>
      current.map((item) => (item._id === updated._id ? { ...item, ...updated } : item))
    );
    refreshCapsules();
    return updated;
  }
 
  // Updates a reservation booking status.
  async function updateStatus(reservation, status) {
    if (
      status === "Cancelled" &&
      (reservation.paymentStatus || "Unpaid") === "Paid" &&
      !window.confirm(
        "This reservation is already paid. Cancel it anyway? Remember to mark the payment as Refunded."
      )
    ) {
      return;
    }
 
    setActionError("");
    setActionSuccess("");
    setUpdatingId(reservation._id);
    try {
      await patchReservation(reservation, { status });
    } catch (err) {
      setActionError(err.message || "Could not update reservation.");
    } finally {
      setUpdatingId("");
    }
  }
 
  // Approves a pending reservation request by confirming it.
  async function approveReservation(reservation) {
    setActionError("");
    setActionSuccess("");
    setUpdatingId(reservation._id);
    try {
      await patchReservation(reservation, { status: "Confirmed" });
      setActionSuccess(`Approved ${reservation.guestName}'s reservation.`);
    } catch (err) {
      setActionError(err.message || "Could not approve reservation.");
    } finally {
      setUpdatingId("");
    }
  }
 
  // Declines a pending reservation request. Declined requests are stored as "Cancelled".
  async function declineReservation(reservation) {
    const isPaid = (reservation.paymentStatus || "Unpaid") === "Paid";
    const message = isPaid
      ? `Decline ${reservation.guestName}'s request? It is already paid, so remember to mark the payment as Refunded.`
      : `Decline ${reservation.guestName}'s reservation request?`;
    if (!window.confirm(message)) return;
 
    setActionError("");
    setActionSuccess("");
    setUpdatingId(reservation._id);
    try {
      await patchReservation(reservation, { status: "Cancelled" });
      setActionSuccess(`Declined ${reservation.guestName}'s reservation.`);
    } catch (err) {
      setActionError(err.message || "Could not decline reservation.");
    } finally {
      setUpdatingId("");
    }
  }
 
  async function rescheduleReservation(patch) {
    setSaving(true);
    setActionError("");
    setActionSuccess("");
    try {
      await patchReservation(rescheduling, patch);
      setActionSuccess(`Rescheduled ${rescheduling.guestName}'s reservation.`);
      setRescheduling(null);
    } finally {
      setSaving(false);
    }
  }
 
  // Updates the payment status for a reservation.
  async function updatePayment(reservation, patch) {
    setActionError("");
    setActionSuccess("");
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
        current.map((item) => (item._id === updated._id ? { ...item, ...updated } : item))
      );
    } catch (err) {
      setActionError(err.message || "Could not update payment.");
    } finally {
      setUpdatingId("");
    }
  }
 
  const hasFilters =
    search || dateFilter || capsuleFilter !== "all" || statusFilter !== "all" || paymentFilter !== "all";
  const isHistoryView = reservationView === "history";
  const isAnalyticsView = reservationView === "analytics";
  const tableHeadings = [
    "Customer",
    "Capsule",
    "Date & time",
    "Duration",
    "Amount",
    "Booking status",
    "Payment",
    ...(!isHistoryView ? ["Actions"] : []),
  ];
 
  return (
    <div className="flex h-screen w-full bg-[#F4F8F5] text-[#0B3B2A]">
      <Sidebar active="Reservation" onNavigate={handleNavigate} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header active="Reservation" />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-[#0B3B2A]">Reservation schedule</h2>
                <p className="mt-1 text-sm text-[#6F8E7F]">
                  Approve or decline requests, reschedule bookings, track payments, and update reservations.
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
 
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Reservation views">
              {[
                { id: "all", label: "All reservations", count: activeReservations.length },
                { id: "history", label: "History", count: historyReservations.length },
                { id: "analytics", label: "Analytics" },
              ].map((view) => (
                <button
                  key={view.id}
                  type="button"
                  role="tab"
                  aria-selected={reservationView === view.id}
                  onClick={() => setReservationView(view.id)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                    reservationView === view.id
                      ? "bg-[#0B4A2E] text-white"
                      : "border border-[#CFE3D9] bg-white text-[#315D49] hover:bg-[#F3F9F5]"
                  }`}
                >
                  {view.label}
                  {view.count !== undefined && (
                    <span className="ml-2 text-xs opacity-80">{view.count}</span>
                  )}
                </button>
              ))}
            </div>

            {isAnalyticsView ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
                    label="Payments confirmed"
                    value={paidCount}
                    detail={`of ${billable.length} non-cancelled`}
                    tint="bg-blue-50 text-blue-700"
                  />
                  <StatCard
                    label="Collected"
                    value={formatCurrency(collected)}
                    detail="Paid bookings"
                    tint="bg-emerald-50 text-emerald-700"
                  />
                  <StatCard
                    label="Outstanding"
                    value={formatCurrency(outstanding)}
                    detail="Unpaid, not cancelled"
                    tint="bg-red-50 text-red-700"
                  />
                </div>
                <ReservationAnalytics
                  reservations={reservations}
                  capsuleNames={capsuleNames}
                />
              </>
            ) : (
              <section className="overflow-hidden rounded-2xl border border-[#DCEBE3] bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCEBE3] px-5 py-4 sm:px-6">
                <div>
                  <h3 className="font-semibold text-[#0B3B2A]">
                    {reservationView === "history" ? "Reservation history" : "All bookings"}
                  </h3>
                  <p className="mt-0.5 text-xs text-[#6F8E7F]">
                    {visibleReservations.length}{" "}
                    {visibleReservations.length === 1 ? "reservation" : "reservations"}
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
 
                      <div className="flex flex-wrap items-end gap-3 border-b border-[#DCEBE3] bg-[#FAFCFA] px-5 py-4 sm:px-6">
                <label className="block min-w-48 flex-1 sm:max-w-64">
                  <span className="mb-1.5 block text-xs font-semibold text-[#5F7F70]">Search customer</span>
                  <span className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9BB6A8]" />
                    <input
                      className={`${inputClass} pl-9`}
                      type="search"
                      placeholder="Name or email"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </span>
                </label>
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
                    {allCapsules.map((capsule) => (
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
                      setSearch("");
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
 
              {actionSuccess && !error && !actionError && (
                <div
                  className="flex items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50 px-5 py-3 text-sm text-emerald-700 sm:px-6"
                  role="status"
                >
                  <span>{actionSuccess}</span>
                  <button
                    type="button"
                    onClick={() => setActionSuccess("")}
                    aria-label="Dismiss"
                    className="rounded p-0.5 hover:bg-emerald-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
 
              <div className="overflow-x-auto">
                <table
                  className={`w-full ${isHistoryView ? "min-w-[900px]" : "min-w-[1200px]"} border-collapse text-left`}
                >
                  <thead>
                    <tr className="bg-[#F7FAF8]">
                      {tableHeadings.map((heading) => (
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
                        <td colSpan={tableHeadings.length} className="px-5 py-14 text-center text-sm text-[#6F8E7F]">
                          Loading reservations...
                        </td>
                      </tr>
                    ) : error ? (
                      <tr>
                        <td colSpan={tableHeadings.length} className="px-5 py-14 text-center text-sm text-[#6F8E7F]">
                          Reservation data could not be loaded.
                        </td>
                      </tr>
                    ) : visibleReservations.length === 0 ? (
                      <tr>
                        <td colSpan={tableHeadings.length} className="px-5 py-14 text-center">
                          <CalendarDays className="mx-auto h-8 w-8 text-[#9BB6A8]" />
                          <p className="mt-3 font-semibold text-[#0B3B2A]">
                            {reservationView === "history"
                              ? "No reservation history yet"
                              : "No reservations found"}
                          </p>
                          <p className="mt-1 text-sm text-[#6F8E7F]">
                            {reservationView === "history"
                              ? "Completed, cancelled, and past bookings will appear here."
                              : reservations.length === 0
                              ? "Create a reservation to get started."
                              : "Try changing or clearing the selected filters."}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      visibleReservations.map((reservation) => {
                        const isBusy =
                          updatingId === reservation._id ||
                          updatingId === reservation._id + "-pay";
                        const payStatus = reservation.paymentStatus || "Unpaid";
                        const needsAttention =
                          payStatus === "Unpaid" && OVERDUE_STATUSES.includes(reservation.status);
                        const isPending = reservation.status === "Pending";
                        const canReschedule = RESCHEDULABLE_STATUSES.includes(reservation.status);
                        return (
                          <tr
                            key={reservation._id}
                            className={`border-b border-[#EEF3F0] last:border-0 hover:bg-[#FAFCFA] ${
                              needsAttention ? "bg-red-50/60" : ""
                            }`}
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
                              {capsuleNames[reservation.capsuleId] || reservation.capsuleId}
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
                            <td className="whitespace-nowrap px-4 py-4">
                              <p className="text-sm font-medium text-[#315D49]">
                                {formatCurrency(reservation.totalPrice)}
                              </p>
                              {!isHistoryView && needsAttention && (
                                <p className="mt-0.5 text-xs font-semibold text-red-600">
                                  Payment overdue
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {isHistoryView ? (
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1.5 text-xs font-semibold ${
                                    STATUS_STYLES[reservation.status] || "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {reservation.status}
                                </span>
                              ) : (
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
                              )}
                            </td>
                            <td className="px-4 py-4">
                              {isHistoryView ? (
                                <span
                                  className={`inline-flex rounded-full px-2.5 py-1.5 text-xs font-semibold ${
                                    PAYMENT_STATUS_STYLES[payStatus] || "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {payStatus}
                                </span>
                              ) : (
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
                              )}
                            </td>
                            {/* Approve / decline / reschedule */}
                            {!isHistoryView && <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setViewingReservation(reservation)}
                                  aria-label={`View details for ${reservation.guestName}'s reservation`}
                                  className="inline-flex items-center gap-1 rounded-lg border border-[#CFE3D9] px-2.5 py-1.5 text-xs font-semibold text-[#315D49] transition hover:bg-[#F3F9F5]"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Details
                                </button>
                                {isPending && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => approveReservation(reservation)}
                                      disabled={isBusy}
                                      className="inline-flex items-center gap-1 rounded-lg bg-[#2F9E7A] px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#2a8f6f] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => declineReservation(reservation)}
                                      disabled={isBusy}
                                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                      Decline
                                    </button>
                                  </>
                                )}
                                {canReschedule && (
                                  <button
                                    type="button"
                                    onClick={() => setRescheduling(reservation)}
                                    disabled={isBusy}
                                    className="inline-flex items-center gap-1 rounded-lg border border-[#CFE3D9] px-2.5 py-1.5 text-xs font-semibold text-[#315D49] transition hover:bg-[#F3F9F5] disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    <CalendarClock className="h-3.5 w-3.5" />
                                    Reschedule
                                  </button>
                                )}
                                {!isPending && !canReschedule && (
                                  <span className="text-xs text-[#9BB6A8]">—</span>
                                )}
                              </div>
                            </td>}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
            )}
          </div>
        </main>
      </div>
 
      {showForm && (
        <ReservationModal
          customers={customers}
          capsules={bookableCapsules}
          saving={saving}
          onClose={() => setShowForm(false)}
          onSave={createReservation}
        />
      )}
 
      {rescheduling && (
        <RescheduleModal
          reservation={rescheduling}
          capsuleName={capsuleNames[rescheduling.capsuleId] || rescheduling.capsuleId}
          saving={saving}
          onClose={() => setRescheduling(null)}
          onSave={rescheduleReservation}
        />
      )}
      {viewingReservation && (
        <ReservationDetailsModal
          reservation={reservations.find((item) => item._id === viewingReservation._id) || viewingReservation}
          capsuleName={
            capsuleNames[viewingReservation.capsuleId] || viewingReservation.capsuleId
          }
          onClose={() => setViewingReservation(null)}
        />
      )}
    </div>
  );
}