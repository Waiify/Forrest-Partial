import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import pageBackground from "./assets/page_background.jpeg";

import StaffHeader from "./components/StaffHeader.jsx";
import StaffSidebar from "./components/StaffSidebar.jsx";

const API = "http://localhost:5000/api";

const ROUTES = {
  Dashboard: "/StaffDashboard",
  CapsuleManagement: "/StaffCapsuleManagement",
  CapsuleAvailability: "/StaffCapsuleAvailability",
  Reservation: "/Reservation",
  ReservationHistory: "/ReservationHistory",
  SystemLogs: "/SystemLogs",
};

const PAGE_TITLES = {
  Dashboard: "Dashboard",
  CapsuleManagement: "Capsule Management",
  CapsuleAvailability: "Capsule Availability",
  Reservation: "Reservation",
  ReservationHistory: "Reservation History",
  SystemLogs: "System Logs",
};

// Keys are the exact status strings stored in the database
const STATUS_ORDER = [
  "Available",
  "Reserved",
  "Occupied",
  "Coming Soon",
  "Under Maintenance",
];

const STATUS_CONFIG = {
  "Available": {
    label: "Available",
    dot: "bg-[#3aae8c]",
    tile: "bg-[#82cdb9] text-[#39745f]",
  },
  "Reserved": {
    label: "Reserved",
    dot: "bg-[#f2b64f]",
    tile: "bg-[#f4b957] text-[#8b682d]",
  },
  "Occupied": {
    label: "Occupied",
    dot: "bg-[#a66be3]",
    tile: "bg-[#a96be3] text-[#5f3c85]",
  },
  "Coming Soon": {
    label: "Coming Soon",
    dot: "bg-[#ead86d]",
    tile: "bg-[#ead86d] text-[#7a6d1f]",
  },
  "Under Maintenance": {
    label: "Under Maintenance",
    dot: "bg-[#df6267]",
    tile: "bg-[#df6267] text-[#8d363b]",
  },
};

// Display only: no editing happens here
function CapsuleStatus({ rooms, loading }) {
  const [filter, setFilter] = useState("all");

  const visibleRooms =
    filter === "all"
      ? rooms
      : rooms.filter((room) => room.status === filter);

  return (
    <div className="mt-1 w-full rounded-[20px] bg-white shadow-md">
      <div className="mt-2 border-b border-[#b5ded1] px-5 pb-3 pt-4">
        <h2 className="text-[17px] font-bold text-[#0b4d2c]">
          Real-Time Capsule Availability
        </h2>
        <p className="text-[11px] text-slate-400">
          Updates automatically as reservations change
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-5 px-5 py-3">
        {STATUS_ORDER.map((status) => {
          const config = STATUS_CONFIG[status];
          const isActive = filter === status;
          const count = rooms.filter((r) => r.status === status).length;

          return (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(isActive ? "all" : status)}
              className={`flex items-center gap-1.5 text-[10px] ${
                isActive
                  ? "font-bold text-slate-900"
                  : "font-medium text-slate-500"
              }`}
            >
              <span className={`h-[9px] w-[9px] rounded-full ${config.dot}`} />
              {config.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="px-5 pb-6 pt-2">
        {loading && rooms.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            Loading...
          </div>
        ) : visibleRooms.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            No capsules found.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {visibleRooms.map((room) => {
              const config =
                STATUS_CONFIG[room.status] ?? STATUS_CONFIG["Available"];

              return (
                <div
                  key={room.id}
                  className={`flex aspect-square w-full flex-col items-center justify-center rounded-[13px] shadow-sm ${config.tile}`}
                >
                  <span className="text-[17px] font-semibold leading-none">
                    {room.name}
                  </span>
                  <span className="mt-1 text-[9px] font-medium">
                    {config.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StaffCapsuleAvailability() {
  const navigate = useNavigate();
  const location = useLocation();

  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);

  const active =
    Object.entries(ROUTES).find(
      ([, path]) => path === location.pathname
    )?.[0] ?? "CapsuleAvailability";

  function handleNavigate(section) {
    navigate(ROUTES[section] ?? "/StaffCapsuleAvailability");
  }

  // Load only non-archived capsules, same endpoint Management uses
  async function loadCapsules(showLoading = false) {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch(`${API}/capsules?archived=false`);
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setCapsules(
        data.map((c) => ({
          id: c.capsuleId,
          name: c.capsuleName,
          status: c.status,
        }))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Initial load + refresh every 5 seconds so changes made in
  // Capsule Management (or by reservations) appear automatically
  useEffect(() => {
    loadCapsules(true);
    const timer = setInterval(() => loadCapsules(false), 5000);
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
            <CapsuleStatus rooms={capsules} loading={loading} />
          </div>
        </main>
      </div>
    </div>
  );
}