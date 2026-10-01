import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarCheck, BedSingle, DoorOpen, Banknote, Check } from "lucide-react";

import Header from "./components/Header.jsx";
import Sidebar from "./components/sidebar.jsx";

/* Replace with real data (props, a hook, or an API call).
   status must be one of: "available" | "occupied" | "cleaning" | "maintenance" */
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

/* Same palette as the Capsule page */
const STATUS_CONFIG = {
  available: { label: "Available", dot: "bg-[#2F9E7A]", tile: "bg-[#86D0BB]", text: "text-[#0B3B2A]" },
  occupied: { label: "Occupied", dot: "bg-[#A66BE6]", tile: "bg-[#B27DEB]", text: "text-[#2C1250]" },
  cleaning: { label: "Cleaning", dot: "bg-[#EDB04F]", tile: "bg-[#F0B65A]", text: "text-[#4A3208]" },
  maintenance: { label: "Maintenance", dot: "bg-[#DC5F5F]", tile: "bg-[#E06666]", text: "text-[#4A1010]" },
};

const STATUS_ORDER = ["available", "occupied", "cleaning", "maintenance"];

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

/* Capsule tiles with status filter and status menu */
function CapsuleStatus({ rooms, onChangeStatus }) {
  const [filter, setFilter] = useState("all");
  const [openId, setOpenId] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpenId(null);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const counts = useMemo(() => {
    const base = { available: 0, occupied: 0, cleaning: 0, maintenance: 0 };
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
        <span className="text-xs text-[#6F8E7F]">Click a capsule to update its status</span>
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

      <div className="px-6 pb-6 pt-3" ref={containerRef}>
        {rooms.length === 0 ? (
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
            {visibleRooms.map((room) => {
              const cfg = STATUS_CONFIG[room.status] ?? STATUS_CONFIG.available;
              const isOpen = openId === room.id;
              return (
                <div key={room.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : room.id)}
                    aria-haspopup="menu"
                    aria-expanded={isOpen}
                    className={`flex aspect-[1/0.8] w-full flex-col items-center justify-center rounded-2xl ${cfg.tile} ${cfg.text} shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#0B3B2A] focus-visible:ring-offset-2`}
                  >
                    <span className="text-2xl font-medium tracking-wide">{room.id}</span>
                    <span className="text-xs">{cfg.label}</span>
                  </button>

                  {isOpen && (
                    <div
                      role="menu"
                      className="absolute left-1/2 top-full z-20 mt-2 w-44 -translate-x-1/2 rounded-xl border border-[#DCEBE3] bg-white p-1.5 shadow-lg"
                    >
                      {STATUS_ORDER.map((status) => {
                        const opt = STATUS_CONFIG[status];
                        const selected = room.status === status;
                        return (
                          <button
                            key={status}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              onChangeStatus(room.id, status);
                              setOpenId(null);
                            }}
                            className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-[#0B3B2A] ${
                              selected ? "bg-[#EAF4EE]" : "hover:bg-[#F3F9F5]"
                            }`}
                          >
                            <span className={`h-2.5 w-2.5 rounded-full ${opt.dot}`} />
                            <span className="flex-1">{opt.label}</span>
                            {selected && <Check className="h-4 w-4 text-[#2F9E7A]" />}
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
    </section>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [rooms, setRooms] = useState(INITIAL_ROOMS);

  const active =
    location.pathname === "/customers"
      ? "Customers"
      : location.pathname === "/capsule" || location.pathname === "/capsules"
        ? "Capsule"
        : "Dashboard";

  function handleNavigate(section) {
    if (section === "Customers") return navigate("/customers");
    if (section === "Capsule") return navigate("/capsule");
    navigate("/dashboard");
  }

  function handleChangeStatus(roomId, status) {
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, status } : r)));
    // TODO: persist the change, e.g. fetch(`/api/rooms/${roomId}`, { method: "PATCH", body: JSON.stringify({ status }) })
  }

  const availableCount = rooms.filter((r) => r.status === "available").length;
  const occupiedCount = rooms.filter((r) => r.status === "occupied").length;

  /* null = no data yet (shows a dash) */
  const stats = [
    { label: "Today's reservations", value: null, icon: CalendarCheck, tint: "bg-[#F0B65A]/40" },
    { label: "Occupied capsules", value: occupiedCount, icon: BedSingle, tint: "bg-[#B27DEB]/35" },
    { label: "Available capsules", value: availableCount, icon: DoorOpen, tint: "bg-[#86D0BB]/60" },
    { label: "Revenue today", value: null, icon: Banknote, tint: "bg-[#CFE3D9]" },
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

          <section className="mt-6 rounded-2xl bg-white shadow-sm">
            <div className="flex items-center justify-between px-6 py-5">
              <h2 className="text-lg font-semibold text-[#0B3B2A]">Recent reservation</h2>
              <button
                type="button"
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
                  <tr>
                    <td colSpan={4} className="px-6 py-14 text-center">
                      <p className="font-semibold text-[#0B3B2A]">No reservations yet</p>
                      <p className="mt-1 text-sm text-[#6F8E7F]">New bookings will appear here.</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <CapsuleStatus rooms={rooms} onChangeStatus={handleChangeStatus} />
        </main>
      </div>
    </div>
  );
}