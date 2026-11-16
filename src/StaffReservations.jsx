import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, Pencil, Plus, RefreshCw, X } from "lucide-react";

import pageBackground from "./assets/page_background.jpeg";

import StaffHeader from "./components/StaffHeader.jsx";
import StaffSidebar from "./components/StaffSidebar.jsx";


const API = "http://localhost:5000/api";
const POLL_INTERVAL_MS = 5000;

const ROUTES = {
  Dashboard: "/StaffDashboard",
  StaffSpacesandServicesManagement: "/StaffSpacesandServicesManagement",
  StaffSpacesandServicesAvailability: "/StaffSpacesandServicesAvailability",
  StaffReservation: "/StaffReservation",
  StaffReservationHistory: "/StaffReservationHistory",
  StaffSystemLogs: "/StaffSystemLogs",
};

const PAGE_TITLES = {
  Dashboard: "Dashboard",
  StaffSpacesandServicesManagement: "Spaces and Services Management",
  StaffSpacesandServicesAvailability: "Spaces and Services Availability",
  StaffReservation: "Reservation",
  StaffReservationHistory: "Reservation History",
  StaffSystemLogs: "System Logs",
};

const ACTIVE_STATUSES = new Set(["Pending", "Confirmed", "Checked in"]);
// Mga status nga naa na sa Reservation History, busa dili na ipakita dinhi
// (Completed, Cancelled, Rejected/Declined wala sa ACTIVE_STATUSES).
// Kini ra ang makita sa status filter dropdown.
const FILTER_STATUSES = ["Pending", "Confirmed", "Checked in"];
const PAYMENT_STATUSES = ["Unpaid", "Paid"];
// Services (any room) nga pwede pa i-book
const BOOKABLE_STATUSES = new Set(["Available", "Reserved"]);
// Reservations nga pwede pa i-edit (service, petsa, oras, duration)
const EDITABLE_STATUSES = new Set(["Pending", "Confirmed"]);

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
};

// Which status changes staff may apply from each current status.
// Every action opens a confirmation overlay before it is applied.
const ACTIONS = {
  Pending: [
    {
      label: "Approve",
      status: "Confirmed",
      title: "Approve this reservation?",
      description: "The booking will be marked as Confirmed.",
      className: "bg-emerald-600 text-white hover:bg-emerald-700",
      confirmClassName: "bg-emerald-600 hover:bg-emerald-700",
    },
    {
      label: "Decline",
      status: "Cancelled",
      title: "Decline this reservation?",
      description: "The booking will be cancelled and this cannot be undone.",
      danger: true,
      className: "text-rose-600 hover:bg-rose-50",
      confirmClassName: "bg-rose-600 hover:bg-rose-700",
    },
  ],
  Confirmed: [
    {
      label: "Check in",
      status: "Checked in",
      title: "Check in this customer?",
      description: "The booking will be marked as Checked in.",
      className: "bg-blue-600 text-white hover:bg-blue-700",
      confirmClassName: "bg-blue-600 hover:bg-blue-700",
    },
    {
      label: "Cancel",
      status: "Cancelled",
      title: "Cancel this reservation?",
      description: "The booking will be cancelled and this cannot be undone.",
      danger: true,
      className: "text-rose-600 hover:bg-rose-50",
      confirmClassName: "bg-rose-600 hover:bg-rose-700",
    },
  ],
  "Checked in": [
    {
      label: "Complete",
      status: "Completed",
      title: "Complete this reservation?",
      description: "The booking will be marked as Completed.",
      className: "bg-slate-700 text-white hover:bg-slate-800",
      confirmClassName: "bg-slate-700 hover:bg-slate-800",
    },
  ],
};

const inputClass =
  "h-10 w-full rounded-lg border border-[#CFE3D9] bg-white px-3 text-sm text-[#0B3B2A] outline-none focus:border-[#2F9E7A] focus:ring-2 focus:ring-[#2F9E7A]/25 disabled:bg-slate-100 disabled:text-slate-500";


async function request(path, { method = "GET", body, signal } = {}) {
  let response;
  try {
    response = await fetch(`${API}${path}`, {
      method,
      signal,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new Error("Cannot reach the server. Is it running?");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || `Request failed (${response.status}).`);
  }
  return data;
}

const asArray = (value) => (Array.isArray(value) ? value : []);


function toLocalDateValue(value) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function toLocalDateTimeValue(date) {
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

function customerName(user) {
  return (
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    user.email ||
    "Unnamed customer"
  );
}

// Kung kanus-a gi-create ang reservation (fallback: timestamp sa Mongo _id)
function createdTime(reservation) {
  const created = Date.parse(reservation.createdAt);
  if (Number.isFinite(created)) return created;
  const fromId = parseInt(String(reservation._id || "").slice(0, 8), 16);
  return Number.isFinite(fromId) ? fromId * 1000 : 0;
}

// Reservation nga dapat makita sa page: active ra, ug dili pa milabay.
// Ang "Checked in" kanunay makita aron ma-complete pa sa staff.
function isCurrentReservation(reservation, now = Date.now()) {
  if (!ACTIVE_STATUSES.has(reservation.status)) return false;
  if (reservation.status === "Checked in") return true;
  return new Date(reservation.endAt).getTime() >= now;
}


function StatCard({ label, value, detail, tint }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-4 text-center shadow-md">
      <div className="text-xs font-semibold text-slate-800">{label}</div>
      <div className="mt-2 text-3xl font-bold text-[#0b4d2c]">{value}</div>
      <div
        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${tint}`}
      >
        {detail}
      </div>
    </div>
  );
}

/* Overlay that asks staff to double check before a status change is applied */
function ConfirmModal({ reservation, action, serviceName, busy, error, onCancel, onConfirm }) {
  // Close with Escape (unless a request is in progress).
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && !busy && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, busy]);

  const isUnpaid = (reservation.paymentStatus || "Unpaid") !== "Paid";
  const warnUnpaid = action.status === "Completed" && isUnpaid;

  const details = [
    ["Customer", reservation.guestName || "—"],
    ["Service", serviceName],
    [
      "Date & time",
      `${formatDate(reservation.startAt)} · ${formatTime(reservation.startAt)} – ${formatTime(
        reservation.endAt
      )}`,
    ],
    ["Amount", formatCurrency(reservation.totalPrice)],
    ["Current status", reservation.status],
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#04281A]/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) =>
        event.target === event.currentTarget && !busy && onCancel()
      }
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[#DCEBE3] px-6 py-5">
          <div>
            <h2 id="confirm-title" className="text-lg font-semibold text-[#0B3B2A]">
              {action.title}
            </h2>
            <p className="mt-1 text-sm text-[#5F7F70]">{action.description}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[#5F7F70] hover:bg-[#EAF4EE] disabled:opacity-60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <dl className="divide-y divide-[#E3EFE8] rounded-lg bg-[#F5FAF7] text-sm">
            {details.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 px-3 py-2">
                <dt className="text-[#5F7F70]">{label}</dt>
                <dd className="text-right font-medium text-[#0B3B2A]">{value}</dd>
              </div>
            ))}
          </dl>

          {warnUnpaid && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {reservation.guestName || "This customer"} has not paid yet. You can still
              complete the reservation.
            </p>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
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
            {action.danger ? "Keep reservation" : "Go back"}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${action.confirmClassName}`}
          >
            {busy ? "Saving..." : `Yes, ${action.label.toLowerCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/*
  Gamiton para sa pag-create UG pag-edit sa reservation.
  - Kung naay `reservation` prop = edit mode (dili ma-usab ang customer)
  - Ang mga milabay nga petsa/oras dili pwede pilion
  - Sa bag-ong reservation, pwede pili og existing customer o i-type ang
    ngalan sa walk-in customer
  - Ang services gi-group sumala sa room (Study Room, Capsule Pods, ...)
*/
function ReservationModal({ reservation, customers, services, onClose, onSave, saving }) {
  const isEdit = Boolean(reservation);

  // Ang orihinal nga start time (para mahibaw-an kung gi-usab ba)
  const initialStart = isEdit ? toLocalDateTimeValue(new Date(reservation.startAt)) : "";

  const [form, setForm] = useState(
    isEdit
      ? {
          customerId: "",
          capsuleId: reservation.capsuleId || "",
          startAt: initialStart,
          durationHours: String(reservation.durationHours ?? 1),
          status: reservation.status,
        }
      : {
          customerQuery: "", // ngalan nga gi-type (o ngalan sa napili nga customer)
          customerId: "", // naay value kung existing customer ang napili
          guestEmail: "",
          capsuleId: "",
          startAt: "",
          durationHours: "1",
          status: "Pending",
        }
  );
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Close with Escape.
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const update = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  // Mga customer nga motakdo sa gi-type (walay type = unang 8)
  const matches = useMemo(() => {
    if (form.customerId) return [];
    const q = form.customerQuery.trim().toLowerCase();
    return customers
      .filter((c) =>
        `${customerName(c)} ${c.email || ""}`.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [customers, form.customerQuery, form.customerId]);

  function selectCustomer(customer) {
    setForm((current) => ({
      ...current,
      customerId: customer._id,
      customerQuery: customerName(customer),
    }));
    setShowSuggestions(false);
  }

  const selectedCustomer = customers.find((c) => c._id === form.customerId);

  // Services gi-group sumala sa room
  const serviceGroups = useMemo(() => {
    const groups = new Map();
    services.forEach((service) => {
      const room = service.room || "Other";
      if (!groups.has(room)) groups.set(room, []);
      groups.get(room).push(service);
    });
    return [...groups.entries()];
  }, [services]);

  const selectedService = services.find((s) => s.capsuleId === form.capsuleId);
  const hours = Number(form.durationHours);
  const estimate =
    selectedService && Number.isFinite(hours)
      ? Number(selectedService.pricePerHour) * hours
      : null;

  // Pinakaagi nga pwede pilion: karon nga minuto
  const minStart = toLocalDateTimeValue(new Date());

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setError("");

    if (!isEdit && !form.customerId && !form.customerQuery.trim()) {
      setError("Enter the customer's name or pick an existing customer.");
      return;
    }
    if (!form.capsuleId || !form.startAt) {
      setError("Choose a service and start time.");
      return;
    }
    if (!Number.isFinite(hours) || hours < 0.5 || hours > 24) {
      setError("Duration must be between 0.5 and 24 hours.");
      return;
    }
    const start = new Date(form.startAt);
    if (Number.isNaN(start.getTime())) {
      setError("Enter a valid start date and time.");
      return;
    }

    // Dili tugotan ang milabay nga petsa/oras (gawas kung wala gi-usab ang orihinal)
    const startChanged = !isEdit || form.startAt !== initialStart;
    if (startChanged && form.startAt < minStart) {
      setError("Past dates and times can't be selected. Choose a time from now onward.");
      return;
    }

    try {
      await onSave(
        isEdit
          ? {
              capsuleId: form.capsuleId,
              startAt: start.toISOString(),
              durationHours: hours,
            }
          : {
              ...(form.customerId
                ? { customerId: form.customerId }
                : {
                    guestName: form.customerQuery.trim(),
                    guestEmail: form.guestEmail.trim() || undefined,
                  }),
              capsuleId: form.capsuleId,
              startAt: start.toISOString(),
              durationHours: hours,
              status: form.status,
            }
      );
    } catch (err) {
      // e.g. the server rejecting an overlapping booking
      setError(err.message);
    }
  }

  const noOptions = services.length === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#04281A]/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-form-title"
        className="w-full max-w-xl rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[#DCEBE3] px-6 py-5">
          <div>
            <h2
              id="reservation-form-title"
              className="text-lg font-semibold text-[#0B3B2A]"
            >
              {isEdit ? "Edit reservation" : "New reservation"}
            </h2>
            <p className="mt-1 text-sm text-[#5F7F70]">
              {isEdit
                ? "Change the service, date, time, or duration."
                : "Type the customer's name, or pick an existing customer from the list."}
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
          {/* Customer: read-only kung edit; kung bag-o, pili o i-type ang ngalan */}
          {isEdit ? (
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[#0B3B2A]">
                Customer
              </span>
              <input
                className={inputClass}
                value={reservation.guestName || reservation.guestEmail || "—"}
                disabled
                readOnly
              />
            </label>
          ) : (
            <div className="sm:col-span-2">
              <div className="relative">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-[#0B3B2A]">
                    Customer name
                  </span>
                  <input
                    className={inputClass}
                    type="text"
                    autoComplete="off"
                    placeholder="Type a name or search existing customers"
                    value={form.customerQuery}
                    onChange={(e) => {
                      // Kung gi-usab ang gi-type, dili na existing customer ang napili
                      setForm((current) => ({
                        ...current,
                        customerQuery: e.target.value,
                        customerId: "",
                      }));
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setShowSuggestions(false)}
                  />
                </label>

                {showSuggestions && matches.length > 0 && (
                  <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[#CFE3D9] bg-white py-1 text-sm shadow-lg">
                    {matches.map((customer) => (
                      <li key={customer._id}>
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectCustomer(customer)}
                          className="flex w-full flex-col px-3 py-2 text-left hover:bg-[#EAF4EE]"
                        >
                          <span className="font-medium text-[#0B3B2A]">
                            {customerName(customer)}
                          </span>
                          {customer.email &&
                            customerName(customer) !== customer.email && (
                              <span className="text-xs text-[#6F8E7F]">
                                {customer.email}
                              </span>
                            )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {selectedCustomer ? (
                <p className="mt-1.5 text-xs text-[#2F8060]">
                  Existing customer
                  {selectedCustomer.email ? ` · ${selectedCustomer.email}` : ""}
                </p>
              ) : (
                form.customerQuery.trim() && (
                  <div className="mt-2 grid gap-1.5">
                    <p className="text-xs text-[#6F8E7F]">
                      New walk-in customer. Pick a name from the list to use an
                      existing account instead.
                    </p>
                    <input
                      className={inputClass}
                      type="email"
                      placeholder="Email (optional)"
                      aria-label="Customer email (optional)"
                      value={form.guestEmail}
                      onChange={(e) => update("guestEmail", e.target.value)}
                    />
                  </div>
                )
              )}
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#0B3B2A]">
              Service
            </span>
            <select
              className={inputClass}
              value={form.capsuleId}
              onChange={(e) => update("capsuleId", e.target.value)}
            >
              <option value="">Select a service</option>
              {serviceGroups.map(([room, items]) => (
                <optgroup key={room} label={room}>
                  {items.map((service) => (
                    <option key={service.capsuleId} value={service.capsuleId}>
                      {service.capsuleName} · {formatCurrency(service.pricePerHour)}
                      /hr
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#0B3B2A]">
              Start date and time
            </span>
            {/* min = karon, busa ang milabay nga petsa dili mapili sa calendar */}
            <input
              className={inputClass}
              type="datetime-local"
              min={minStart}
              value={form.startAt}
              onChange={(e) => update("startAt", e.target.value)}
            />
            <span className="mt-1 block text-xs text-[#6F8E7F]">
              Past dates and times can't be selected.
            </span>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[#0B3B2A]">
              Duration (hours)
            </span>
            <input
              className={inputClass}
              type="number"
              min="0.5"
              max="24"
              step="0.5"
              value={form.durationHours}
              onChange={(e) => update("durationHours", e.target.value)}
            />
          </label>

          {/* Initial status: sa bag-ong reservation ra */}
          {!isEdit && (
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium text-[#0B3B2A]">
                Initial status
              </span>
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
              >
                <option>Pending</option>
                <option>Confirmed</option>
              </select>
            </label>
          )}

          {estimate !== null && (
            <p className="rounded-lg bg-[#EAF4EE] px-3 py-2 text-sm text-[#0B4A2E] sm:col-span-2">
              {isEdit ? "New estimated total" : "Estimated total"}:{" "}
              <strong>{formatCurrency(estimate)}</strong>
            </p>
          )}

          {noOptions && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 sm:col-span-2">
              No services are available to book right now.
            </p>
          )}

          {error && (
            <p
              className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2"
              role="alert"
            >
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
            disabled={saving || noOptions}
            className="rounded-lg bg-[#2F9E7A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2a8f6f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : isEdit ? "Save changes" : "Create reservation"}
          </button>
        </div>
      </form>
    </div>
  );
}


export default function StaffReservation() {
  const navigate = useNavigate();
  const location = useLocation();

  const [reservations, setReservations] = useState([]);
  const [customers, setCustomers] = useState([]);
  // Services gikan sa tanang rooms (Study Room, Capsule Pods, VIP Room, ...)
  const [services, setServices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [optionsError, setOptionsError] = useState("");
  const [actionError, setActionError] = useState("");
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [showForm, setShowForm] = useState(false);
  // Ang reservation nga gi-edit karon (null kung wala)
  const [editing, setEditing] = useState(null);

  // { reservation, action } while the confirmation overlay is open
  const [pending, setPending] = useState(null);
  const [pendingError, setPendingError] = useState("");

  const [dateFilter, setDateFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const requestSeq = useRef(0);
  const mounted = useRef(true);

  const active =
    Object.entries(ROUTES).find(
      ([, path]) => path === location.pathname
    )?.[0] ?? "StaffReservation";

  const handleNavigate = (section) =>
    navigate(ROUTES[section] ?? ROUTES.Dashboard);


  const loadReservations = useCallback(async ({ showSpinner = false } = {}) => {
    const seq = ++requestSeq.current;
    if (showSpinner) setLoading(true);
    try {
      const data = await request("/reservations");
      if (!mounted.current || seq !== requestSeq.current) return;
      setReservations(asArray(data));
      setError("");
    } catch (err) {
      if (!mounted.current || seq !== requestSeq.current) return;
      setError(err.message || "Could not load reservations.");
    } finally {
      if (mounted.current && seq === requestSeq.current) setLoading(false);
    }
  }, []);

  const loadOptions = useCallback(async () => {
    const [usersResult, servicesResult] = await Promise.allSettled([
      request("/users"),
      // scope=all = services sa tanang rooms, matag usa naay "room"
      request("/capsules?archived=false&scope=all"),
    ]);
    if (!mounted.current) return;

    const problems = [];

    if (usersResult.status === "fulfilled") {
      setCustomers(
        asArray(usersResult.value).filter(
          (user) =>
            !["staff", "admin"].includes(String(user.role || "").toLowerCase())
        )
      );
    } else {
      problems.push("customers");
    }

    if (servicesResult.status === "fulfilled") {
      setServices(asArray(servicesResult.value));
    } else {
      problems.push("services");
    }

    setOptionsError(
      problems.length ? `Could not load ${problems.join(" and ")}.` : ""
    );
  }, []);

  useEffect(() => {
    mounted.current = true;
    loadReservations({ showSpinner: true });
    loadOptions();

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") loadReservations();
    }, POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") loadReservations();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mounted.current = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadReservations, loadOptions]);


  const serviceNames = useMemo(
    () => new Map(services.map((s) => [s.capsuleId, s.capsuleName])),
    [services]
  );

  const bookableServices = useMemo(
    () => services.filter((s) => BOOKABLE_STATUSES.has(s.status)),
    [services]
  );

  // Sa edit: bookable services + ang kasamtangang service sa reservation
  const editableServices = useMemo(() => {
    if (!editing) return bookableServices;
    return services.filter(
      (s) => BOOKABLE_STATUSES.has(s.status) || s.capsuleId === editing.capsuleId
    );
  }, [services, bookableServices, editing]);

  // Gihimo nga base sa tanan: wala ang completed/cancelled/rejected ug milabay na
  const visibleReservations = useMemo(() => {
    const now = Date.now();
    return reservations.filter((r) => isCurrentReservation(r, now));
  }, [reservations]);


  // capsuleId -> room type (Study Room, Capsule Pods, ...)
  const serviceRooms = useMemo(
    () => new Map(services.map((s) => [s.capsuleId, s.room || "Other"])),
    [services]
  );

  // Service dropdown: room types lang ang ipakita (dili ang matag service)
  const roomOptions = useMemo(() => {
    const rooms = [...new Set(services.map((s) => s.room).filter(Boolean))];
    // Bookings nga ang service wala na sa listahan
    const hasOther = visibleReservations.some((r) => !serviceRooms.has(r.capsuleId));
    return hasOther ? [...rooms, "Other"] : rooms;
  }, [services, visibleReservations, serviceRooms]);

  const filteredReservations = useMemo(
    () =>
      visibleReservations
        .filter((r) => {
          if (dateFilter && toLocalDateValue(r.startAt) !== dateFilter)
            return false;
          if (
            serviceFilter !== "all" &&
            (serviceRooms.get(r.capsuleId) || "Other") !== serviceFilter
          )
            return false;
          if (statusFilter !== "all" && r.status !== statusFilter) return false;
          if (
            paymentFilter !== "all" &&
            (r.paymentStatus || "Unpaid") !== paymentFilter
          )
            return false;
          return true;
        })
        // Pinakabag-o nga gi-create una; kung parehas, mas dali ang start time
        .sort(
          (a, b) =>
            createdTime(b) - createdTime(a) ||
            new Date(a.startAt) - new Date(b.startAt)
        ),
    [visibleReservations, dateFilter, serviceFilter, serviceRooms, statusFilter, paymentFilter]
  );

  const stats = useMemo(() => {
    const paid = visibleReservations.filter((r) => r.paymentStatus === "Paid");
    return {
      total: visibleReservations.length,
      pending: visibleReservations.filter((r) => r.status === "Pending").length,
      active: visibleReservations.length,
      paidCount: paid.length,
      nonCancelledCount: visibleReservations.length,
      collected: paid.reduce((sum, r) => sum + (Number(r.totalPrice) || 0), 0),
    };
  }, [visibleReservations]);

  const hasFilters =
    dateFilter ||
    serviceFilter !== "all" ||
    statusFilter !== "all" ||
    paymentFilter !== "all";

  function clearFilters() {
    setDateFilter("");
    setServiceFilter("all");
    setStatusFilter("all");
    setPaymentFilter("all");
  }


  const replaceReservation = (updated) =>
    setReservations((current) =>
      current.map((item) => (item._id === updated._id ? updated : item))
    );

  async function createReservation(data) {
    setSaving(true);
    try {
      await request("/reservations", { method: "POST", body: data });
      setShowForm(false);
      setActionError("");
      await loadReservations();
    } finally {
      setSaving(false);
    }
  }

  // I-save ang mga giusab sa reservation (service, petsa/oras, duration)
  async function updateReservation(data) {
    if (!editing) return;
    setSaving(true);
    try {
      const updated = await request(`/reservations/${editing._id}`, {
        method: "PATCH",
        body: data,
      });
      if (updated && updated._id) replaceReservation(updated);
      setEditing(null);
      setActionError("");
      // I-refresh para sigurado nga updated ang endAt ug totalPrice
      await loadReservations();
    } finally {
      setSaving(false);
    }
  }

  // Clicking Approve / Decline / Check in / Cancel / Complete opens the overlay.
  function askToUpdateStatus(reservation, action) {
    setActionError("");
    setPendingError("");
    setPending({ reservation, action });
  }

  function closeConfirm() {
    if (updatingId) return;
    setPending(null);
    setPendingError("");
  }

  // Runs only after staff press the confirm button in the overlay.
  async function confirmStatusChange() {
    if (!pending) return;
    const { reservation, action } = pending;

    setPendingError("");
    setUpdatingId(reservation._id);
    try {
      const updated = await request(`/reservations/${reservation._id}`, {
        method: "PATCH",
        body: { status: action.status },
      });
      replaceReservation(updated);
      setPending(null);
    } catch (err) {
      // Keep the overlay open so the message is seen next to the action.
      setPendingError(err.message || "Could not update reservation.");
    } finally {
      setUpdatingId("");
    }
  }

  async function updatePayment(reservation, paymentStatus) {
    setActionError("");
    setUpdatingId(reservation._id);
    try {
      const updated = await request(
        `/reservations/${reservation._id}/payment`,
        { method: "PATCH", body: { paymentStatus } }
      );
      replaceReservation(updated);
    } catch (err) {
      setActionError(err.message || "Could not update payment.");
    } finally {
      setUpdatingId("");
    }
  }


  const bannerMessage = error || actionError || optionsError;

  return (
    <div className="flex h-screen w-full text-slate-900">
      <StaffSidebar active={active} onNavigate={handleNavigate} />

      <div
        className="flex min-w-0 flex-1 flex-col overflow-hidden"
        style={{
          backgroundImage: `
            linear-gradient(
              rgba(190, 210, 207, 0.68),
              rgba(190, 210, 207, 0.68)
            ),
            url(${pageBackground})
          `,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        <StaffHeader active={PAGE_TITLES[active]} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto w-full space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <StatCard
                label="All reservations"
                value={stats.total}
                detail="Saved bookings"
                tint="bg-[#EAF4EE] text-[#0B4A2E]"
              />
              <StatCard
                label="Needs confirmation"
                value={stats.pending}
                detail="Pending"
                tint="bg-amber-50 text-amber-700"
              />
              <StatCard
                label="Active bookings"
                value={stats.active}
                detail="Pending, confirmed, or checked in"
                tint="bg-blue-50 text-blue-700"
              />
              <StatCard
                label="Cash payments received"
                value={stats.paidCount}
                detail={`${formatCurrency(stats.collected)} · of ${
                  stats.nonCancelledCount
                } non-cancelled`}
                tint="bg-emerald-50 text-emerald-700"
              />
            </div>

            <section className="overflow-hidden rounded-2xl bg-white shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCEBE3] px-5 py-4 sm:px-6">
                <div>
                  <h2 className="text-base font-bold text-[#0b4d2c]">
                    Reservation schedule
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {filteredReservations.length}{" "}
                    {filteredReservations.length === 1
                      ? "reservation"
                      : "reservations"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      loadReservations({ showSpinner: true });
                      loadOptions();
                    }}
                    disabled={loading}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#CFE3D9] px-3 text-sm font-medium text-[#315D49] hover:bg-[#F3F9F5] disabled:opacity-60"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    />
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(true)}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#2F9E7A] px-4 text-sm font-semibold text-white transition hover:bg-[#2a8f6f]"
                  >
                    <Plus className="h-4 w-4" /> New reservation
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-end gap-3 border-b border-[#DCEBE3] bg-[#FAFCFA] px-5 py-4 sm:px-6">
                <label className="block min-w-36 flex-1 sm:max-w-48">
                  <span className="mb-1.5 block text-xs font-semibold text-[#5F7F70]">
                    Date
                  </span>
                  <input
                    className={inputClass}
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setDateFilter(toLocalDateValue(new Date()))}
                  className="h-10 px-2 text-sm font-medium text-[#2F8060] hover:underline"
                >
                  Today
                </button>
                <label className="block min-w-36 flex-1 sm:max-w-48">
                  <span className="mb-1.5 block text-xs font-semibold text-[#5F7F70]">
                    Service
                  </span>
                  <select
                    className={inputClass}
                    value={serviceFilter}
                    onChange={(e) => setServiceFilter(e.target.value)}
                  >
                    <option value="all">All services</option>
                    {roomOptions.map((room) => (
                      <option key={room} value={room}>
                        {room}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block min-w-36 flex-1 sm:max-w-48">
                  <span className="mb-1.5 block text-xs font-semibold text-[#5F7F70]">
                    Booking status
                  </span>
                  <select
                    className={inputClass}
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All statuses</option>
                    {FILTER_STATUSES.map((status) => (
                      <option key={status}>{status}</option>
                    ))}
                  </select>
                </label>
                <label className="block min-w-36 flex-1 sm:max-w-48">
                  <span className="mb-1.5 block text-xs font-semibold text-[#5F7F70]">
                    Payment
                  </span>
                  <select
                    className={inputClass}
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value)}
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
                    onClick={clearFilters}
                    className="h-10 px-2 text-sm font-medium text-[#2F8060] hover:underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {bannerMessage && (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700 sm:px-6"
                  role="alert"
                >
                  <span>{bannerMessage}</span>
                  {(error || optionsError) && (
                    <button
                      type="button"
                      onClick={() => {
                        loadReservations({ showSpinner: true });
                        loadOptions();
                      }}
                      className="font-semibold underline"
                    >
                      Try again
                    </button>
                  )}
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] border-collapse text-left">
                  <thead>
                    <tr className="bg-[#34a37c] text-[10px] font-semibold uppercase tracking-wide text-white">
                      {[
                        "Customer",
                        "Service",
                        "Date & time",
                        "Duration",
                        "Amount",
                        "Status",
                        "Cash payment",
                        "Actions",
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="whitespace-nowrap px-4 py-3"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading && reservations.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-5 py-14 text-center text-sm text-slate-400"
                        >
                          Loading reservations...
                        </td>
                      </tr>
                    ) : error && reservations.length === 0 ? (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-5 py-14 text-center text-sm text-slate-400"
                        >
                          Reservation data could not be loaded.
                        </td>
                      </tr>
                    ) : filteredReservations.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-14 text-center">
                          <CalendarDays className="mx-auto h-8 w-8 text-[#9BB6A8]" />
                          <p className="mt-3 font-semibold text-[#0B3B2A]">
                            No reservations found
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            {visibleReservations.length === 0
                              ? "No current reservations. Create one to get started."
                              : "Try changing or clearing the selected filters."}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredReservations.map((reservation) => {
                        const isBusy = updatingId === reservation._id;
                        const payStatus = reservation.paymentStatus || "Unpaid";
                        const actions = ACTIONS[reservation.status] || [];
                        const canEdit = EDITABLE_STATUSES.has(reservation.status);
                        const duration = Number(reservation.durationHours);

                        return (
                          <tr
                            key={reservation._id}
                            className="border-b border-slate-100 last:border-0 hover:bg-[#FAFCFA]"
                          >
                            <td className="px-4 py-4">
                              <p className="whitespace-nowrap text-sm font-semibold text-slate-800">
                                {reservation.guestName || "—"}
                              </p>
                              <p className="mt-0.5 whitespace-nowrap text-xs text-slate-400">
                                {reservation.guestEmail}
                              </p>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-slate-700">
                              {serviceNames.get(reservation.capsuleId) ||
                                reservation.capsuleName ||
                                reservation.capsuleId}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4">
                              <p className="text-sm font-medium text-slate-700">
                                {formatDate(reservation.startAt)}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-400">
                                {formatTime(reservation.startAt)} –{" "}
                                {formatTime(reservation.endAt)}
                              </p>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-sm text-slate-600">
                              {duration} {duration === 1 ? "hr" : "hrs"}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-slate-700">
                              {formatCurrency(reservation.totalPrice)}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  STATUS_STYLES[reservation.status] ||
                                  "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {reservation.status}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <select
                                aria-label={`Cash payment for ${reservation.guestName}`}
                                className={`rounded-full border-0 px-2.5 py-1.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-[#2F9E7A]/30 disabled:opacity-60 ${
                                  PAYMENT_STATUS_STYLES[payStatus] ||
                                  "bg-slate-100 text-slate-600"
                                }`}
                                value={payStatus}
                                disabled={
                                  isBusy || reservation.status === "Cancelled"
                                }
                                onChange={(e) =>
                                  updatePayment(reservation, e.target.value)
                                }
                              >
                                {PAYMENT_STATUSES.map((s) => (
                                  <option key={s}>{s}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-1">
                                {/* Edit: Pending ug Confirmed ra */}
                                {canEdit && (
                                  <button
                                    type="button"
                                    disabled={isBusy}
                                    onClick={() => setEditing(reservation)}
                                    className="inline-flex items-center gap-1 rounded px-2.5 py-1 text-[11px] font-medium text-[#2F8060] hover:bg-[#EAF4EE] disabled:opacity-60"
                                  >
                                    <Pencil className="h-3 w-3" />
                                    Edit
                                  </button>
                                )}
                                {actions.length === 0 && !canEdit ? (
                                  <span className="text-xs text-slate-400">
                                    —
                                  </span>
                                ) : (
                                  actions.map((action) => (
                                    <button
                                      key={action.label}
                                      type="button"
                                      disabled={isBusy}
                                      onClick={() =>
                                        askToUpdateStatus(reservation, action)
                                      }
                                      className={`rounded px-2.5 py-1 text-[11px] font-medium disabled:opacity-60 ${action.className}`}
                                    >
                                      {action.label}
                                    </button>
                                  ))
                                )}
                              </div>
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

        {(showForm || editing) && (
          <ReservationModal
            key={editing ? editing._id : "new"}
            reservation={editing}
            customers={customers}
            services={editing ? editableServices : bookableServices}
            saving={saving}
            onClose={() => {
              setShowForm(false);
              setEditing(null);
            }}
            onSave={editing ? updateReservation : createReservation}
          />
        )}

        {pending && (
          <ConfirmModal
            reservation={pending.reservation}
            action={pending.action}
            serviceName={
              serviceNames.get(pending.reservation.capsuleId) ||
              pending.reservation.capsuleName ||
              pending.reservation.capsuleId
            }
            busy={updatingId === pending.reservation._id}
            error={pendingError}
            onCancel={closeConfirm}
            onConfirm={confirmStatusChange}
          />
        )}
      </div>
    </div>
  );
}
