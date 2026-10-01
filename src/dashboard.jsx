import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Header from "./components/Header.jsx";
import Sidebar from "./components/sidebar.jsx";

const STAT_SLOTS = ["Today's reservations", "Occupied capsules", "Available capsules", "Revenue today"];

// Replace with real data (props, a hook, or an API call).
// status must be one of: "available" | "occupied" | "cleaning" | "maintenance"
const INITIAL_ROOMS = [
  { id: "A1", status: "available" },
  { id: "A2", status: "occupied" },
  { id: "A3", status: "occupied" },
  { id: "A4", status: "cleaning" },
  { id: "A5", status: "available" },
  { id: "A6", status: "maintenance" },
  { id: "B1", status: "occupied" },
  { id: "B2", status: "available" },
  { id: "B3", status: "occupied" },
  { id: "B4", status: "available" },
  { id: "B5", status: "cleaning" },
  { id: "B6", status: "available" },
];

const STATUS_CONFIG = {
  available: {
    label: "Available",
    dot: "bg-emerald-500",
    card: "border-emerald-200 bg-emerald-50",
    text: "text-emerald-700",
  },
  occupied: {
    label: "Occupied",
    dot: "bg-blue-500",
    card: "border-blue-200 bg-blue-50",
    text: "text-blue-700",
  },
  cleaning: {
    label: "Cleaning",
    dot: "bg-amber-500",
    card: "border-amber-200 bg-amber-50",
    text: "text-amber-700",
  },
  maintenance: {
    label: "Maintenance",
    dot: "bg-rose-500",
    card: "border-rose-200 bg-rose-50",
    text: "text-rose-700",
  },
};

const STATUS_ORDER = ["available", "occupied", "cleaning", "maintenance"];

function CapsuleStatus({ rooms, onChangeStatus }) {
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const counts = useMemo(() => {
    const base = { available: 0, occupied: 0, cleaning: 0, maintenance: 0 };
    for (const room of rooms) {
      if (base[room.status] !== undefined) base[room.status] += 1;
    }
    return base;
  }, [rooms]);

  const visibleRooms = filter === "all" ? rooms : rooms.filter((r) => r.status === filter);

  return (
    <div className="mt-6 rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold">Capsule status</h2>
        <span className="text-xs text-slate-400">Click a capsule to update its status</span>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-4 py-3">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`text-xs font-medium ${
            filter === "all" ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          All ({rooms.length})
        </button>
        {STATUS_ORDER.map((status) => {
          const cfg = STATUS_CONFIG[status];
          const isActive = filter === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(isActive ? "all" : status)}
              className={`flex items-center gap-1.5 text-xs font-medium ${
                isActive ? "text-slate-900" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
              {cfg.label} ({counts[status] ?? 0})
            </button>
          );
        })}
      </div>

      <div className="p-4" ref={containerRef}>
        {rooms.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-400">No data yet</div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {visibleRooms.map((room) => {
              const cfg = STATUS_CONFIG[room.status] ?? STATUS_CONFIG.available;
              const isOpen = openId === room.id;
              return (
                <div key={room.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : room.id)}
                    className={`w-full rounded-md border-l-4 border ${cfg.card} px-3 py-2 text-left transition hover:brightness-95`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-800">{room.id}</span>
                      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                    </div>
                    <span className={`text-[11px] font-medium ${cfg.text}`}>{cfg.label}</span>
                  </button>

                  {isOpen && (
                    <div className="absolute left-0 top-full z-10 mt-1 w-40 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
                      {STATUS_ORDER.map((status) => {
                        const opt = STATUS_CONFIG[status];
                        const selected = room.status === status;
                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => {
                              onChangeStatus(room.id, status);
                              setOpenId(null);
                            }}
                            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs font-medium hover:bg-slate-50 ${
                              selected ? "bg-slate-50" : ""
                            }`}
                          >
                            <span className={`h-2 w-2 rounded-full ${opt.dot}`} />
                            <span className="flex-1 text-slate-700">{opt.label}</span>
                            {selected && <span className="text-slate-400">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [rooms, setRooms] = useState(INITIAL_ROOMS);

  // This checks the current URL so the selected sidebar button can stay highlighted.
  // Kini ang code nga nag-check sa current URL para mag-highlight ang active sidebar button.
  const isManagementPage =
    location.pathname === "/management" || location.pathname === "/staff-management" || location.pathname === "/file-management";

  const active =
    location.pathname === "/customers"
      ? "Customers"
      : isManagementPage
        ? "Staff Management"
        : "Dashboard";

  // This function decides which page to open when a sidebar button is clicked.
  // Kini ang function nga nagdesisyon unsa nga page ang mabuksan kapag gipindot ang sidebar button.
  function handleNavigate(section) {
    if (section === "Customers") {
      navigate("/customers");
      return;
    }
    if (section === "Staff Management" || section === "Management") {
      navigate("/staff-management");
      return;
    }
    navigate("/dashboard");
  }

  // I-update ang capsule status sa local state kung giusab sa user.
  function handleChangeStatus(roomId, status) {
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, status } : r)));
    // TODO: persist the change, e.g. fetch(`/api/rooms/${roomId}`, { method: "PATCH", body: JSON.stringify({ status }) })
  }

  const availableCount = rooms.filter((r) => r.status === "available").length;
  const occupiedCount = rooms.filter((r) => r.status === "occupied").length;

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900">
      <Sidebar active={active} onNavigate={handleNavigate} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header active={active} />

        <main className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STAT_SLOTS.map((label) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="text-sm font-semibold">{label}</div>
                {label === "Occupied capsules" ? (
                  <div className="mt-2 text-2xl font-semibold text-slate-800">{occupiedCount}</div>
                ) : label === "Available capsules" ? (
                  <div className="mt-2 text-2xl font-semibold text-slate-800">{availableCount}</div>
                ) : (
                  <div className="mt-2 h-7 w-20 rounded bg-slate-100" />
                )}
                <div className="mt-2 h-3 w-16 rounded bg-slate-100" />
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold">Recent reservation</h2>
              <button type="button" className="text-xs font-medium text-slate-500 hover:text-slate-900">
                View all
              </button>
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs text-slate-500">
                  <th className="px-4 py-2 font-medium">Guest</th>
                  <th className="px-4 py-2 font-medium">Capsule</th>
                  <th className="px-4 py-2 font-medium">Check-in</th>
                  <th className="px-4 py-2 text-right font-medium">Check-out</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">
                    No data yet
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <CapsuleStatus rooms={rooms} onChangeStatus={handleChangeStatus} />
        </main>
      </div>
    </div>
  );
}