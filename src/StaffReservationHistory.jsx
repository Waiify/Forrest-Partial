import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { History, RefreshCw } from "lucide-react";

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

// Statuses nga automatic nga history na (decline = Cancelled sa Reservation page)
const HISTORY_STATUSES = new Set([
  "Completed",
  "Cancelled",
  "Declined",
  "Rejected",
]);
const CANCELLED_LIKE = new Set(["Cancelled", "Declined", "Rejected"]);
const STATUS_FILTER_OPTIONS = [
  "Completed",
  "Cancelled",
  "Declined",
  "Rejected",
  "Past reservation",
];
const PAYMENT_STATUSES = ["Unpaid", "Paid"];

const STATUS_STYLES = {
  Pending: "bg-amber-50 text-amber-700",
  Confirmed: "bg-emerald-50 text-emerald-700",
  "Checked in": "bg-blue-50 text-blue-700",
  Completed: "bg-slate-100 text-slate-600",
  Cancelled: "bg-red-50 text-red-700",
  Declined: "bg-red-50 text-red-700",
  Rejected: "bg-red-50 text-red-700",
};

const PAYMENT_STATUS_STYLES = {
  Unpaid: "bg-red-50 text-red-700",
  Paid: "bg-emerald-50 text-emerald-700",
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

// Label sa day header: "Today", "Yesterday", o ang full nga petsa
function formatDayLabel(value) {
  const day = toLocalDateValue(value);
  const full = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));

  if (day === toLocalDateValue(new Date())) return `Today · ${full}`;
  if (day === toLocalDateValue(Date.now() - 86_400_000))
    return `Yesterday · ${full}`;
  return full;
}

// Past reservation = natapos na ang oras pero wala na-close (Pending, Confirmed, Checked in)
function isPastOpen(reservation, now) {
  return (
    !HISTORY_STATUSES.has(reservation.status) &&
    reservation.endAt &&
    new Date(reservation.endAt).getTime() < now
  );
}

function isHistory(reservation, now) {
  return HISTORY_STATUSES.has(reservation.status) || isPastOpen(reservation, now);
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


export default function StaffReservationHistory() {
  const navigate = useNavigate();
  const location = useLocation();

  const [reservations, setReservations] = useState([]);
  // Services gikan sa tanang rooms (Study Room, Capsule Pods, VIP Room, ...)
  const [services, setServices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [optionsError, setOptionsError] = useState("");

  const [dateFilter, setDateFilter] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const requestSeq = useRef(0);
  const mounted = useRef(true);

  const active =
    Object.entries(ROUTES).find(
      ([, path]) => path === location.pathname
    )?.[0] ?? "StaffReservationHistory";

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
    try {
      // scope=all = services sa tanang rooms. Apil ang archived, aron ang daan
      // nga bookings makita gihapon ilalom sa saktong room.
      const [active, archived] = await Promise.all([
        request("/capsules?archived=false&scope=all"),
        request("/capsules?archived=true&scope=all"),
      ]);
      if (!mounted.current) return;
      setServices([...asArray(active), ...asArray(archived)]);
      setOptionsError("");
    } catch {
      if (!mounted.current) return;
      setOptionsError("Could not load services.");
    }
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

  // Ang history ra: completed / declined / cancelled / rejected / past
  const history = useMemo(() => {
    const now = Date.now();
    return reservations.filter((r) => isHistory(r, now));
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
    const hasOther = history.some((r) => !serviceRooms.has(r.capsuleId));
    return hasOther ? [...rooms, "Other"] : rooms;
  }, [services, history, serviceRooms]);

  const filteredHistory = useMemo(() => {
    const now = Date.now();
    return history
      .filter((r) => {
        if (dateFilter && toLocalDateValue(r.startAt) !== dateFilter)
          return false;
        if (
          serviceFilter !== "all" &&
          (serviceRooms.get(r.capsuleId) || "Other") !== serviceFilter
        )
          return false;
        if (statusFilter === "Past reservation") {
          if (!isPastOpen(r, now)) return false;
        } else if (statusFilter !== "all" && r.status !== statusFilter) {
          return false;
        }
        if (
          paymentFilter !== "all" &&
          (r.paymentStatus || "Unpaid") !== paymentFilter
        )
          return false;
        return true;
      })
      // Pinakabag-o nga adlaw una; sulod sa usa ka adlaw, pinakaagi nga oras una
      .sort((a, b) => {
        const dayA = toLocalDateValue(a.startAt);
        const dayB = toLocalDateValue(b.startAt);
        if (dayA !== dayB) return dayA < dayB ? 1 : -1;
        return new Date(a.startAt) - new Date(b.startAt);
      });
  }, [history, dateFilter, serviceFilter, serviceRooms, statusFilter, paymentFilter]);

  const stats = useMemo(() => {
    const now = Date.now();
    const completed = history.filter((r) => r.status === "Completed");
    const cancelled = history.filter((r) => CANCELLED_LIKE.has(r.status));
    const paid = history.filter(
      (r) => !CANCELLED_LIKE.has(r.status) && r.paymentStatus === "Paid"
    );
    return {
      total: history.length,
      completed: completed.length,
      cancelled: cancelled.length,
      past: history.filter((r) => isPastOpen(r, now)).length,
      paidCount: paid.length,
      collected: paid.reduce((sum, r) => sum + (Number(r.totalPrice) || 0), 0),
    };
  }, [history]);

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

  const bannerMessage = error || optionsError;
  const now = Date.now();

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
                label="All history"
                value={stats.total}
                detail="Closed and past bookings"
                tint="bg-[#EAF4EE] text-[#0B4A2E]"
              />
              <StatCard
                label="Completed"
                value={stats.completed}
                detail="Finished bookings"
                tint="bg-slate-100 text-slate-600"
              />
              <StatCard
                label="Cancelled / declined"
                value={stats.cancelled}
                detail={`${stats.past} past, never closed`}
                tint="bg-red-50 text-red-700"
              />
              <StatCard
                label="Cash payments received"
                value={stats.paidCount}
                detail={formatCurrency(stats.collected)}
                tint="bg-emerald-50 text-emerald-700"
              />
            </div>

            <section className="overflow-hidden rounded-2xl bg-white shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCEBE3] px-5 py-4 sm:px-6">
                <div>
                  <h2 className="text-base font-bold text-[#0b4d2c]">
                    Reservation history
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {filteredHistory.length}{" "}
                    {filteredHistory.length === 1
                      ? "reservation"
                      : "reservations"}
                  </p>
                </div>
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
                    {STATUS_FILTER_OPTIONS.map((status) => (
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
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-left">
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
                          colSpan={7}
                          className="px-5 py-14 text-center text-sm text-slate-400"
                        >
                          Loading reservation history...
                        </td>
                      </tr>
                    ) : error && reservations.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-5 py-14 text-center text-sm text-slate-400"
                        >
                          Reservation history could not be loaded.
                        </td>
                      </tr>
                    ) : filteredHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-14 text-center">
                          <History className="mx-auto h-8 w-8 text-[#9BB6A8]" />
                          <p className="mt-3 font-semibold text-[#0B3B2A]">
                            No history found
                          </p>
                          <p className="mt-1 text-sm text-slate-400">
                            {history.length === 0
                              ? "Completed, cancelled, and past reservations will show up here."
                              : "Try changing or clearing the selected filters."}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredHistory.map((reservation, index) => {
                        const payStatus = reservation.paymentStatus || "Unpaid";
                        const duration = Number(reservation.durationHours);
                        const pastOpen = isPastOpen(reservation, now);
                        const day = toLocalDateValue(reservation.startAt);
                        const showDay =
                          index === 0 ||
                          day !==
                            toLocalDateValue(filteredHistory[index - 1].startAt);

                        return (
                          <Fragment key={reservation._id}>
                            {showDay && (
                              <tr className="bg-[#EAF4EE]">
                                <td
                                  colSpan={7}
                                  className="px-4 py-2 text-xs font-semibold text-[#0B4A2E]"
                                >
                                  {formatDayLabel(reservation.startAt)}
                                </td>
                              </tr>
                            )}
                            <tr className="border-b border-slate-100 last:border-0 hover:bg-[#FAFCFA]">
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
                                {pastOpen && (
                                  <p className="mt-1 text-[11px] text-slate-400">
                                    Past reservation
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-4">
                                <span
                                  className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    PAYMENT_STATUS_STYLES[payStatus] ||
                                    "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {payStatus}
                                </span>
                              </td>
                            </tr>
                          </Fragment>
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
    </div>
  );
}
