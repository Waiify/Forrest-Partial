import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarCheck, BedSingle, DoorOpen, Banknote } from "lucide-react";

import Header from "./components/AdminHeader.jsx";
import Sidebar from "./components/Adminsidebar.jsx";

// Address sa backend server
// Set VITE_API_URL in your .env file for deployment (e.g. https://your-api.com/api).
const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// How many bookings the "Recent reservations" table shows
const RECENT_LIMIT = 5;

/* Same palette as the Capsule page */
// Gi-usab: ang mga key parehas na sa gi-save sa database (AdminCapsule)
const STATUS_CONFIG = {
  Available: { label: "Available", dot: "bg-[#2F9E7A]", tile: "bg-[#86D0BB]", text: "text-[#0B3B2A]" },
  Reserved: { label: "Reserved", dot: "bg-[#EDB04F]", tile: "bg-[#F0B65A]", text: "text-[#4A3208]" },
  Occupied: { label: "Occupied", dot: "bg-[#A66BE6]", tile: "bg-[#B27DEB]", text: "text-[#2C1250]" },
  "Coming Soon": { label: "Coming Soon", dot: "bg-[#E5D04F]", tile: "bg-[#EAD86D]", text: "text-[#4A430F]" },
  "Under Maintenance": { label: "Under Maintenance", dot: "bg-[#DC5F5F]", tile: "bg-[#E06666]", text: "text-[#4A1010]" },
};

const STATUS_ORDER = ["Available", "Reserved", "Occupied", "Coming Soon", "Under Maintenance"];

/* Badge colors for reservations (same as the Reservation page) */
const BOOKING_STATUS_STYLES = {
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

/* Date, time, and currency formatting */
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

// Local calendar date as YYYY-MM-DD, used to match bookings to "today"
function localDateValue(value) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function formatCurrency(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

// Fetches JSON and throws on error responses
async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Request failed");
  return res.json();
}

/* Summary card */
function StatCard({ label, value, icon: Icon, tint }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm">
      <div>
        <p className="text-sm text-[#6F8E7F]">{label}</p>
        <p className={`mt-1 text-3xl font-bold ${value === null ? "text-[#B8CFC4]" : "text-[#0B3B2A]"}`}>
          {value ?? "—"}
        </p>
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tint}`}>
        <Icon className="h-6 w-6 text-[#0B3B2A]" />
      </div>
    </div>
  );
}

/* Most recent bookings, newest first */
function RecentReservations({ reservations, capsuleNames, loading, error, onViewAll }) {
  const recent = useMemo(
    () =>
      [...reservations]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, RECENT_LIMIT),
    [reservations]
  );

  const columns = ["Guest", "Capsule", "Check-in", "Check-out", "Amount", "Status", "Payment"];

  return (
    <section className="mt-6 rounded-2xl bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 py-5">
        <h2 className="text-lg font-semibold text-[#0B3B2A]">Recent reservations</h2>
        <button
          type="button"
          onClick={onViewAll}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#2F9E7A] hover:bg-[#EAF4EE]"
        >
          View all
        </button>
      </div>
      <div className="overflow-x-auto border-t border-[#CFE3D9]">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="bg-[#F5FAF7] text-xs text-[#4E6B5D]">
              {columns.map((heading) => (
                <th key={heading} className="whitespace-nowrap px-6 py-3 font-medium">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-14 text-center text-sm text-[#6F8E7F]">
                  Loading...
                </td>
              </tr>
            ) : error && reservations.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-14 text-center">
                  <p className="font-semibold text-[#0B3B2A]">Reservations could not be loaded</p>
                  <p className="mt-1 text-sm text-[#6F8E7F]">Check that the server is running. This page retries automatically.</p>
                </td>
              </tr>
            ) : recent.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-14 text-center">
                  <p className="font-semibold text-[#0B3B2A]">No reservations yet</p>
                  <p className="mt-1 text-sm text-[#6F8E7F]">New bookings will appear here.</p>
                </td>
              </tr>
            ) : (
              recent.map((reservation) => {
                const payStatus = reservation.paymentStatus || "Unpaid";
                return (
                  <tr key={reservation._id} className="border-t border-[#EEF3F0] hover:bg-[#FAFCFA]">
                    <td className="px-6 py-3.5">
                      <p className="whitespace-nowrap font-semibold text-[#0B3B2A]">{reservation.guestName}</p>
                      <p className="mt-0.5 whitespace-nowrap text-xs text-[#6F8E7F]">{reservation.guestEmail}</p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 font-medium text-[#315D49]">
                      {capsuleNames[reservation.capsuleId] || reservation.capsuleId}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5">
                      <p className="font-medium text-[#315D49]">{formatDate(reservation.startAt)}</p>
                      <p className="mt-0.5 text-xs text-[#6F8E7F]">{formatTime(reservation.startAt)}</p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5">
                      <p className="font-medium text-[#315D49]">{formatDate(reservation.endAt)}</p>
                      <p className="mt-0.5 text-xs text-[#6F8E7F]">{formatTime(reservation.endAt)}</p>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3.5 font-medium text-[#315D49]">
                      {formatCurrency(reservation.totalPrice)}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                          BOOKING_STATUS_STYLES[reservation.status] || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {reservation.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${
                          PAYMENT_STATUS_STYLES[payStatus] || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {payStatus}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* Capsule tiles with status filter */
// Display ra ni: dili na ma-usab ang status diri, sa Capsule page ra
function CapsuleStatus({ rooms, loading }) {
  const [filter, setFilter] = useState("all");

  // Ihap sa matag status
  const counts = useMemo(() => {
    const base = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0]));
    for (const room of rooms) if (base[room.status] !== undefined) base[room.status] += 1;
    return base;
  }, [rooms]);

  const visibleRooms = filter === "all" ? rooms : rooms.filter((r) => r.status === filter);

  const pill = (active) =>
    `inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition ${
      active ? "bg-[#EAF4EE] text-[#0B3B2A]" : "text-[#4E6B5D] hover:bg-[#F3F9F5]"
    }`;

  return (
    <section className="mt-6 rounded-2xl bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-5">
        <h2 className="text-lg font-semibold text-[#0B3B2A]">Capsule status</h2>
        {/* Gi-usab: dili na ma-click ang tiles */}
        <span className="text-xs text-[#6F8E7F]">Update statuses from the Capsule page</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[#CFE3D9] px-6 py-3">
        <button type="button" onClick={() => setFilter("all")} className={pill(filter === "all")}>
          All <span className="font-semibold">({rooms.length})</span>
        </button>
        {STATUS_ORDER.map((status) => {
          const cfg = STATUS_CONFIG[status];
          return (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(filter === status ? "all" : status)}
              className={pill(filter === status)}
            >
              <span className={`h-3 w-3 rounded-full ${cfg.dot}`} />
              {cfg.label} <span className="font-semibold">({counts[status]})</span>
            </button>
          );
        })}
      </div>

      <div className="px-6 pb-6 pt-3">
        {/* Loading message samtang nag-load pa */}
        {loading && rooms.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#6F8E7F]">Loading...</div>
        ) : rooms.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-semibold text-[#0B3B2A]">No capsules yet</p>
            <p className="mt-1 text-sm text-[#6F8E7F]">Add capsules from the Capsule page.</p>
          </div>
        ) : visibleRooms.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-semibold text-[#0B3B2A]">No capsules with this status</p>
            <p className="mt-1 text-sm text-[#6F8E7F]">Choose another status to see more.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {/* Gi-usab: div na lang imbes nga button, ang ngalan sa capsule ang gipakita */}
            {visibleRooms.map((room) => {
              const cfg = STATUS_CONFIG[room.status] ?? STATUS_CONFIG.Available;
              return (
                <div
                  key={room.id}
                  className={`flex aspect-[1/0.8] w-full flex-col items-center justify-center rounded-2xl ${cfg.tile} ${cfg.text} shadow-sm`}
                >
                  <span className="text-2xl font-medium tracking-wide">{room.name}</span>
                  <span className="text-xs">{cfg.label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  // Gi-usab: gikan na sa database, wala na ang INITIAL_ROOMS nga sample data
  const [rooms, setRooms] = useState([]);
  // true samtang nag-load pa
  const [loading, setLoading] = useState(true);
  // Reservations for the "Recent reservations" table
  const [reservations, setReservations] = useState([]);
  const [reservationsLoading, setReservationsLoading] = useState(true);
  const [reservationsError, setReservationsError] = useState(false);

  const active =
    location.pathname === "/customers"
      ? "Customers"
      : location.pathname === "/capsule" || location.pathname === "/capsules"
        ? "Capsule"
        : "Dashboard";

  function handleNavigate(section) {
    if (section === "Customers") return navigate("/customers");
    if (section === "Settings") return navigate("/settings");
    if (section === "Capsule") return navigate("/capsule");
    if (section === "Reservation") return navigate("/reservation");
    if (section === "Staff Management" || section === "Management") return navigate("/management");
    if (section === "Reports" || section === "transactions") return navigate("/reports");
    navigate("/dashboard");
  }

  // Mo-load pag-abli sa page, unya mo-refresh matag 5 segundos
  // Capsules and reservations load separately, so one failing does not block the other.
  useEffect(() => {
    let current = true;
    const loadData = () => {
      Promise.allSettled([
        getJson(`${API}/capsules?archived=false`),
        getJson(`${API}/reservations`),
      ]).then(([capsulesResult, reservationsResult]) => {
        if (!current) return;

        if (capsulesResult.status === "fulfilled") {
          setRooms(capsulesResult.value.map((c) => ({
            id: c.capsuleId,
            name: c.capsuleName,
            status: c.status,
          })));
        } else {
          console.error(capsulesResult.reason);
        }

        if (reservationsResult.status === "fulfilled") {
          setReservations(reservationsResult.value);
          setReservationsError(false);
        } else {
          console.error(reservationsResult.reason);
          setReservationsError(true);
        }

        setLoading(false);
        setReservationsLoading(false);
      });
    };

    loadData();
    const timer = setInterval(loadData, 5000);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, []);

  // Lets the reservations table show a capsule's name instead of its ID
  const capsuleNames = useMemo(
    () => Object.fromEntries(rooms.map((room) => [room.id, room.name])),
    [rooms]
  );

  // Ihap gikan sa real data
  const availableCount = rooms.filter((r) => r.status === "Available").length;
  const occupiedCount = rooms.filter((r) => r.status === "Occupied").length;

  // Bookings that start today. Cancelled bookings are not counted.
  const today = localDateValue(new Date());
  const todaysBookings = reservations.filter(
    (r) => r.status !== "Cancelled" && localDateValue(r.startAt) === today
  );
  const todaysCount = todaysBookings.length;
  // Revenue today = paid bookings that start today (refunded and unpaid are excluded)
  const todaysRevenue = todaysBookings
    .filter((r) => r.paymentStatus === "Paid")
    .reduce((total, r) => total + (Number(r.totalPrice) || 0), 0);

  /* null = no data yet (shows a dash) */
  const reservationsReady = !reservationsLoading && !reservationsError;
  const stats = [
    { label: "Today's reservations", value: reservationsReady ? todaysCount : null, icon: CalendarCheck, tint: "bg-[#F0B65A]/40" },
    { label: "Occupied capsules", value: occupiedCount, icon: BedSingle, tint: "bg-[#B27DEB]/35" },
    { label: "Available capsules", value: availableCount, icon: DoorOpen, tint: "bg-[#86D0BB]/60" },
    { label: "Revenue today", value: reservationsReady ? formatCurrency(todaysRevenue) : null, icon: Banknote, tint: "bg-[#CFE3D9]" },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900">
      <Sidebar active={active} onNavigate={handleNavigate} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header active={active} />

        <main className="flex-1 overflow-y-auto p-6 pb-24 md:p-8 md:pb-24">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>

          <RecentReservations
            reservations={reservations}
            capsuleNames={capsuleNames}
            loading={reservationsLoading}
            error={reservationsError}
            onViewAll={() => navigate("/reservation")}
          />

          <CapsuleStatus rooms={rooms} loading={loading} />
        </main>
      </div>
    </div>
  );
}