import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import pageBackground from "./assets/page_background.jpeg";

import StaffHeader from "./components/StaffHeader.jsx";
import StaffSidebar from "./components/StaffSidebar.jsx";

const API = "http://localhost:5000/api";

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

// Card order on the page. Categories not listed here appear after these.
const CATEGORY_ORDER = [
  "Study Room",
  "Capsule Pods",
  "VIP Room",
  "Conference Room",
  "Life Room",
  "Board Room",
];

// Legend (the 4 statuses shown in the design)
const LEGEND = [
  { status: "Available", label: "Available", dot: "bg-[#3aae8c]" },
  { status: "Occupied", label: "Occupied", dot: "bg-[#a66be3]" },
  { status: "Reserved", label: "Reserved", dot: "bg-[#f2b64f]" },
  { status: "Under Maintenance", label: "Maintenance", dot: "bg-[#df6267]" },
];

// Keys are the exact status strings stored in the database
const STATUS_CONFIG = {
  "Available": { label: "Available", tile: "bg-[#82cdb9] text-[#39745f]" },
  "Reserved": { label: "Reserved", tile: "bg-[#f4b957] text-[#8b682d]" },
  "Occupied": { label: "Occupied", tile: "bg-[#a96be3] text-[#5f3c85]" },
  "Coming Soon": { label: "Coming Soon", tile: "bg-[#ead86d] text-[#7a6d1f]" },
  "Under Maintenance": {
    label: "Maintenance",
    tile: "bg-[#df6267] text-[#8d363b]",
  },
};

const MAX_TILES = 3;

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

// One small box. Later: give a room an `image` and it renders a picture instead.
function SpaceTile({ room }) {
  const config = STATUS_CONFIG[room.status] ?? STATUS_CONFIG["Available"];

  if (room.image) {
    return (
      <div className="relative h-[88px] w-[88px] overflow-hidden rounded-[14px] shadow-sm">
        <img
          src={room.image}
          alt={room.name}
          className="h-full w-full object-cover"
        />
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
        <div className="py-6 text-center text-[12px] text-white/80">
          No spaces to show
        </div>
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

// Display only: no editing happens here
function SpaceStatus({ rooms, categories, loading, onView }) {
  const [filter, setFilter] = useState("all");

  const visibleRooms =
    filter === "all" ? rooms : rooms.filter((r) => r.status === filter);

  return (
    <div className="w-full rounded-[20px] bg-white px-6 pb-8 pt-5 shadow-md">
      <h2 className="text-[19px] font-bold text-[#0b4d2c]">
        Real-Time Forrest Spaces and Services Availability
      </h2>
      <p className="text-[12px] text-slate-400">
        Updates automatically as reservations change
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-5">
        {LEGEND.map(({ status, label, dot }) => {
          const isActive = filter === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(isActive ? "all" : status)}
              className={`flex items-center gap-1.5 text-[11px] ${
                isActive
                  ? "font-bold text-slate-900"
                  : "font-medium text-slate-500"
              }`}
            >
              <span className={`h-[11px] w-[11px] rounded-full ${dot}`} />
              {label}
            </button>
          );
        })}
      </div>

      <div className="mt-5">
        {loading && categories.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            Loading...
          </div>
        ) : categories.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            No spaces found in the database.
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
    </div>
  );
}

export default function StaffSpacesandServicesAvailability() {
  const navigate = useNavigate();
  const location = useLocation();

  const [spaces, setSpaces] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const active =
    Object.entries(ROUTES).find(
      ([, path]) => path === location.pathname
    )?.[0] ?? "StaffSpacesandServicesAvailability";

  function handleNavigate(section) {
    navigate(ROUTES[section] ?? ROUTES.StaffSpacesandServicesAvailability);
  }

  // "View" / "View All" -> go to the management page for that category
  function handleView(category) {
    navigate(ROUTES.StaffSpacesandServicesManagement, {
      state: { category },
    });
  }

  // Fetch every source in parallel. A source that fails is skipped,
  // so only what really exists in the database is shown.
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

    const all = [];
    const found = new Set();

    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        const { category, rows } = result.value;
        all.push(...rows);
        // The endpoint exists, so its card should show even if it has no rows
        if (category) found.add(category);
      } else {
        console.warn(`Skipped ${SOURCES[i].url}:`, result.reason);
      }
    });

    // Categories that came from the records themselves
    all.forEach((r) => found.add(r.category));

    const ordered = [
      ...CATEGORY_ORDER.filter((c) => found.has(c)),
      ...[...found].filter((c) => !CATEGORY_ORDER.includes(c)),
    ];

    setSpaces(all);
    setCategories(ordered);
    setLoading(false);
  }

  // Initial load + refresh every 5 seconds so changes appear automatically
  useEffect(() => {
    loadSpaces(true);
    const timer = setInterval(() => loadSpaces(false), 5000);
    return () => clearInterval(timer);
  }, []);

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
          <div className="mx-auto w-full">
            <SpaceStatus
              rooms={spaces}
              categories={categories}
              loading={loading}
              onView={handleView}
            />
          </div>
        </main>
      </div>
    </div>
  );
}