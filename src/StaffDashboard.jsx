import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarCheck, BedSingle, DoorOpen, Banknote } from "lucide-react";

import StaffHeader from "./components/StaffHeader.jsx";
import StaffSidebar from "./components/StaffSidebar.jsx";

// Address sa backend server
const API = "http://localhost:5000/api";

// Same routes and titles as the other staff pages
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


const SOURCES = [
  { url: `${API}/capsules?archived=false`, category: "Capsule Pods" },
  { url: `${API}/study-rooms?archived=false`, category: "Study Room" },
  { url: `${API}/vip-rooms?archived=false`, category: "VIP Room" },
  { url: `${API}/conference-rooms?archived=false`, category: "Conference Room" },
  { url: `${API}/life-rooms?archived=false`, category: "Life Room" },
  { url: `${API}/board-rooms?archived=false`, category: "Board Room" },
];

const CATEGORY_ORDER = [
  "Study Room",
  "Capsule Pods",
  "VIP Room",
  "Conference Room",
  "Life Room",
  "Board Room",
];

// Keys are the exact status strings stored in the database
const STATUS_CONFIG = {
  Available: { label: "Available", dot: "bg-[#2F9E7A]", tile: "bg-[#82cdb9] text-[#39745f]" },
  Reserved: { label: "Reserved", dot: "bg-[#EDB04F]", tile: "bg-[#f4b957] text-[#8b682d]" },
  Occupied: { label: "Occupied", dot: "bg-[#A66BE6]", tile: "bg-[#a96be3] text-[#5f3c85]" },
  "Coming Soon": { label: "Coming Soon", dot: "bg-[#E5D04F]", tile: "bg-[#ead86d] text-[#7a6d1f]" },
  "Under Maintenance": { label: "Maintenance", dot: "bg-[#DC5F5F]", tile: "bg-[#df6267] text-[#8d363b]" },
};

const STATUS_ORDER = ["Available", "Reserved", "Occupied", "Coming Soon", "Under Maintenance"];

const MAX_TILES = 3;
const RECENT_LIMIT = 8;

const STATUS_STYLES = {
  Pending: "bg-amber-50 text-amber-700",
  Confirmed: "bg-emerald-50 text-emerald-700",
  "Checked in": "bg-blue-50 text-blue-700",
  Completed: "bg-slate-100 text-slate-600",
  Cancelled: "bg-red-50 text-red-700",
};

function toLocalDateValue(value) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  const date = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d);
  return `${date}, ${time}`;
}

function formatCurrency(value) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

const ROOM_ALIASES = {
  "Room 1": "Capsule Pods",
};

function mapRecord(c, fixedCategory) {
  const category =
    fixedCategory ??
    ROOM_ALIASES[c.room] ??
    c.room ??
    c.category ??
    c.categoryName ??
    "Capsule Pods";

  return {
    id: `${category}-${
      c.capsuleId ?? c.roomId ?? c.spaceId ?? c.id ?? c.capsuleName ?? c.name
    }`,
    name: c.capsuleName ?? c.roomName ?? c.spaceName ?? c.name,
    status: c.status,
    category,
    image: c.image,
  };
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

/* One small box (display only) */
function SpaceTile({ room }) {
  const config = STATUS_CONFIG[room.status] ?? STATUS_CONFIG.Available;

  if (room.image) {
    return (
      <div className="relative h-[88px] w-[88px] overflow-hidden rounded-[14px] shadow-sm">
        <img src={room.image} alt={room.name} className="h-full w-full object-cover" />
        <span
          className={`absolute bottom-0 w-full py-0.5 text-center text-[9px] font-medium ${config.tile}`}
        >
          {room.name} · {config.label}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex h-[88px] w-[88px] flex-col items-center justify-center rounded-[14px] shadow-sm ${config.tile}`}
    >
      <span className="text-[19px] font-medium leading-none">{room.name}</span>
      <span className="mt-1 text-[9px] font-medium">{config.label}</span>
    </div>
  );
}

function CategoryCard({ title, rooms, onView }) {
  const shown = rooms.slice(0, MAX_TILES);
  const showAll = rooms.length > 1;

  return (
    <div className="min-h-[170px] rounded-[20px] bg-[#b3b3b3] px-4 pb-5 pt-4">
      <div className="mb-3 flex items-start justify-between">
        <h3 className="text-[17px] font-bold text-[#0b4d2c]">{title}</h3>
        <button
          type="button"
          onClick={() => onView(title)}
          className="text-[12px] font-bold text-white hover:underline"
        >
          {showAll ? "View All" : "View"}
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="py-6 text-center text-[12px] text-white/80">No spaces to show</div>
      ) : (
        <div className="flex flex-wrap justify-center gap-3">
          {shown.map((room) => (
            <SpaceTile key={room.id} room={room} />
          ))}
        </div>
      )}
    </div>
  );
}

/* Space status: all rooms grouped by category, with status filter */
function SpaceStatus({ rooms, categories, loading, onView }) {
  const [filter, setFilter] = useState("all");

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
        <div>
          <h2 className="text-lg font-semibold text-[#0B3B2A]">Capsule status</h2>
          <p className="text-xs text-[#6F8E7F]">Updates automatically as reservations change</p>
        </div>
        <span className="text-xs text-[#6F8E7F]">Update statuses from the Spaces and Services Management page</span>
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
        {loading && categories.length === 0 ? (
          <div className="py-16 text-center text-sm text-[#6F8E7F]">Loading...</div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-semibold text-[#0B3B2A]">No spaces yet</p>
            <p className="mt-1 text-sm text-[#6F8E7F]">
              Add spaces from the Spaces and Services Management page.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
            {categories.map((category) => (
              <CategoryCard
                key={category}
                title={category}
                rooms={visibleRooms.filter((r) => r.category === category)}
                onView={onView}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default function StaffDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const [spaces, setSpaces] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reservations, setReservations] = useState([]);
  const [reservationsLoading, setReservationsLoading] = useState(true);
  const [reservationsError, setReservationsError] = useState("");

  const active =
    Object.entries(ROUTES).find(([, path]) => path === location.pathname)?.[0] ?? "Dashboard";

  function handleNavigate(section) {
    navigate(ROUTES[section] ?? ROUTES.Dashboard);
  }

  // "View" / "View All" -> go to the management page for that category
  function handleView(category) {
    navigate(ROUTES.StaffSpacesandServicesManagement, { state: { category } });
  }

  // Load on open, then refresh every 5 seconds
  useEffect(() => {
    let current = true;

    async function loadSpaces(showLoading = false) {
      if (showLoading) setLoading(true);

      const results = await Promise.allSettled(
        SOURCES.map(async ({ url, category }) => {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`${url} -> ${res.status}`);
          const data = await res.json();
          if (!Array.isArray(data)) throw new Error(`${url} did not return a list`);
          return { category, rows: data.map((c) => mapRecord(c, category)) };
        })
      );

      if (!current) return;

      const all = [];
      const found = new Set();

      results.forEach((result, i) => {
        if (result.status === "fulfilled") {
          const { category, rows } = result.value;
          all.push(...rows);
          if (category) found.add(category);
        } else {
          console.warn(`Skipped ${SOURCES[i].url}:`, result.reason);
        }
      });

      all.forEach((r) => found.add(r.category));

      const ordered = [
        ...CATEGORY_ORDER.filter((c) => found.has(c)),
        ...[...found].filter((c) => !CATEGORY_ORDER.includes(c)),
      ];

      setSpaces(all);
      setCategories(ordered);
      setLoading(false);
    }

    loadSpaces(true);
    const timer = setInterval(() => loadSpaces(false), 5000);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, []);

  // Reservations: load on open, then refresh every 5 seconds
  useEffect(() => {
    let current = true;

    async function loadReservations() {
      try {
        const res = await fetch(`${API}/reservations`);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const data = await res.json();
        if (!current) return;
        setReservations(Array.isArray(data) ? data : []);
        setReservationsError("");
      } catch (err) {
        if (!current) return;
        setReservationsError("Could not load reservations.");
        console.warn(err);
      } finally {
        if (current) setReservationsLoading(false);
      }
    }

    loadReservations();
    const timer = setInterval(loadReservations, 5000);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, []);

  // capsuleId -> capsule name
  const capsuleNames = useMemo(
    () =>
      new Map(
        spaces
          .filter((r) => r.category === "Capsule Pods")
          .map((r) => [r.id.replace("Capsule Pods-", ""), r.name])
      ),
    [spaces]
  );

  // Newest bookings first
  const recentReservations = useMemo(
    () =>
      [...reservations]
        .sort((a, b) => new Date(b.createdAt || b.startAt) - new Date(a.createdAt || a.startAt))
        .slice(0, RECENT_LIMIT),
    [reservations]
  );

  // Today's numbers
  const todayValue = toLocalDateValue(new Date());
  const todayReservations = reservations.filter(
    (r) => r.status !== "Cancelled" && toLocalDateValue(r.startAt) === todayValue
  );
  const revenueToday = todayReservations
    .filter((r) => r.paymentStatus === "Paid")
    .reduce((sum, r) => sum + (Number(r.totalPrice) || 0), 0);

  // Counts from real data (capsules only)
  const capsules = spaces.filter((r) => r.category === "Capsule Pods");
  const availableCount = capsules.filter((r) => r.status === "Available").length;
  const occupiedCount = capsules.filter((r) => r.status === "Occupied").length;

  /* null = no data yet (shows a dash) */
  const reservationsReady = !reservationsLoading && !reservationsError;
  const stats = [
    { label: "Today's reservations", value: reservationsReady ? todayReservations.length : null, icon: CalendarCheck, tint: "bg-[#F0B65A]/40" },
    { label: "Occupied capsules", value: occupiedCount, icon: BedSingle, tint: "bg-[#B27DEB]/35" },
    { label: "Available capsules", value: availableCount, icon: DoorOpen, tint: "bg-[#86D0BB]/60" },
    { label: "Revenue today", value: reservationsReady ? formatCurrency(revenueToday) : null, icon: Banknote, tint: "bg-[#CFE3D9]" },
  ];

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900">
      <StaffSidebar active={active} onNavigate={handleNavigate} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <StaffHeader active={PAGE_TITLES[active]} />

        <main className="flex-1 overflow-y-auto p-6 pb-24 md:p-8 md:pb-24">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>

          <section className="mt-6 rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between px-6 py-5">
              <h2 className="text-lg font-semibold text-[#0B3B2A]">Recent reservation</h2>
              <button
                type="button"
                onClick={() => navigate(ROUTES.StaffReservation)}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-[#2F9E7A] hover:bg-[#EAF4EE]"
              >
                View all
              </button>
            </div>
            <div className="overflow-x-auto border-t border-[#CFE3D9]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-[#F5FAF7] text-xs text-[#4E6B5D]">
                    <th className="px-6 py-3 font-medium">Guest</th>
                    <th className="px-6 py-3 font-medium">Capsule</th>
                    <th className="px-6 py-3 font-medium">Check-in</th>
                    <th className="px-6 py-3 text-right font-medium">Check-out</th>
                  </tr>
                </thead>
                <tbody>
                  {reservationsLoading && reservations.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-14 text-center text-sm text-[#6F8E7F]">
                        Loading...
                      </td>
                    </tr>
                  ) : reservationsError && reservations.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-14 text-center text-sm text-[#6F8E7F]">
                        {reservationsError}
                      </td>
                    </tr>
                  ) : recentReservations.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-14 text-center">
                        <p className="font-semibold text-[#0B3B2A]">No reservations yet</p>
                        <p className="mt-1 text-sm text-[#6F8E7F]">New bookings will appear here.</p>
                      </td>
                    </tr>
                  ) : (
                    recentReservations.map((r) => (
                      <tr key={r._id} className="border-t border-[#E3EFE8] hover:bg-[#FAFCFA]">
                        <td className="px-6 py-4">
                          <p className="font-medium text-[#0B3B2A]">{r.guestName || "—"}</p>
                          <p className="mt-0.5 text-xs text-[#6F8E7F]">{r.guestEmail}</p>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 font-medium text-[#315D49]">
                          {capsuleNames.get(r.capsuleId) || r.capsuleId}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-[#315D49]">
                          {formatDateTime(r.startAt)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-[#315D49]">
                          <span>{formatDateTime(r.endAt)}</span>
                          <span
                            className={`ml-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                              STATUS_STYLES[r.status] || "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <SpaceStatus
            rooms={spaces}
            categories={categories}
            loading={loading}
            onView={handleView}
          />
        </main>
      </div>
    </div>
  );
}
