import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import pageBackground from "./assets/page_background.jpeg";

import StaffHeader from "./components/StaffHeader.jsx";
import StaffSidebar from "./components/StaffSidebar.jsx";


const ROUTES = {
  Dashboard: "/StaffDashboard",
  CapsuleManagement: "/StaffCapsuleManagement",
  CapsuleAvailability: "/StaffCapsuleAvailability",
  Reservation: "/Reservation",
  ReservationHistory: "/ReservationHistory",
  SystemLogs: "/SystemLogs",
};


{/*for header title ni siya*/}

const PAGE_TITLES = {
  Dashboard: "Dashboard",
  CapsuleManagement: "Capsule Management",
  CapsuleAvailability: "Capsule Availability",
  Reservation: "Reservation",
  ReservationHistory: "Reservation History",
  SystemLogs: "System Logs",
};

 {/*need pa ni siyag real na data, change into real one*/}
const INITIAL_ROOMS = [
  { id: "R-01", status: "available" },
  { id: "R-02", status: "reserve" },
  { id: "R-03", status: "occupied" },
  { id: "R-04", status: "occupied" },
  { id: "R-05", status: "reserve" },
  { id: "R-06", status: "available" },
  { id: "R-07", status: "available" },
  { id: "R-08", status: "Under Maintenance" },
];

  {/*dummy datas pa niiiii rawrrr, change this into real data from database*/}
const INITIAL_RESERVATIONS = [
  { id: 1, guest: "Meme Dealdo", email: "meme@gmail.com", capsule: "R-01", dateTime: "02/08/26, 1:00am" },
  { id: 2, guest: "Dodong Ruiz", email: "dodong@gmail.com", capsule: "R-01", dateTime: "02/08/26, 1:00am" },
  { id: 3, guest: "Blizza Batombakal", email: "blizza@gmail.com", capsule: "R-03", dateTime: "02/08/26, 1:00am" },
  { id: 4, guest: "Cherlie Cuteko", email: "cherlie@gmail.com", capsule: "R-04", dateTime: "02/08/26, 1:00am" },
  { id: 5, guest: "Vanessa Pangit", email: "vanessa@gmail.com", capsule: "R-05", dateTime: "02/08/26, 1:00am" },
  { id: 6, guest: "Tao Lang Pasensyana", email: "tao@gmail.com", capsule: "R-06", dateTime: "02/08/26, 1:00am" },
];

{/*dummy datas pa niiiii rawrrr, change this into real data from database*/}
const STATUS_CONFIG = {
  available: { label: "Available", dot: "bg-emerald-500", tile: "bg-[#86d1b9] text-[#1d5f4a]" },
  occupied: { label: "Occupied", dot: "bg-purple-500", tile: "bg-[#ac72e6] text-[#3f1a75]" },
  reserve: { label: "Reserve", dot: "bg-amber-500", tile: "bg-[#f2b45c] text-[#7a4a0b]" },
  maintenance: { label: "Under Maintenance", dot: "bg-red-500", tile: "bg-[#e0666a] text-[#6b1518]" },
};

const STATUS_ORDER = ["available", "occupied", "reserve", "maintenance"];

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-4 text-center shadow-md">
      <div className="text-xs font-semibold text-slate-800">{label}</div>
      <div className="mt-2 text-3xl font-bold text-[#0b4d2c]">{value}</div>
    </div>
  );
}

function ReservationsNeedingAction({ reservations, onAction }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-md mt-5">
      <div className="px-5 pb-3 pt-5">
        <h2 className="text-base font-bold text-[#0b4d2c]">Reservations Needing Action</h2>
        <p className="text-xs text-slate-400">Approve, decline, or reschedule</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead>
            <tr className="bg-[#34a37c] text-[10px] font-semibold uppercase tracking-wide text-white">
              <th className="px-5 py-2">Guests</th>
              <th className="px-3 py-2">Capsule</th>
              <th className="px-3 py-2">Date &amp; Time</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reservations.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-400">
                  No reservations need action
                </td>
              </tr>
            ) : (
              reservations.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-5 py-2">
                    <div className="font-semibold text-slate-800">{r.guest}</div>
                    <div className="text-[10px] text-slate-400">{r.email}</div>
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-700">{r.capsule}</td>
                  <td className="px-3 py-2 text-slate-600">{r.dateTime}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onAction(r.id, "approve")}
                        className="rounded bg-emerald-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-emerald-700"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => onAction(r.id, "reschedule")}
                        className="rounded border border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Reschedule
                      </button>
                      <button
                        type="button"
                        onClick={() => onAction(r.id, "decline")}
                        className="rounded px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50"
                      >
                        Decline
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
    const base = { available: 0, occupied: 0, reserve: 0, maintenance: 0 };
    for (const room of rooms) {
      if (base[room.status] !== undefined) base[room.status] += 1;
    }
    return base;
  }, [rooms]);

  const visibleRooms = filter === "all" ? rooms : rooms.filter((r) => r.status === filter);

  return (
    <div className="min-w-0 rounded-2xl bg-white p-5 shadow-md mt-5">
      <h2 className="text-base font-bold text-[#0b4d2c]">Capsule Status</h2>
      <p className="text-xs text-slate-400">Capsules availability by rooms</p>

      {/* Legend (click one to filter, click again to show all) */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
        {STATUS_ORDER.map((status) => {
          const cfg = STATUS_CONFIG[status];
          const isActive = filter === status;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(isActive ? "all" : status)}
              title={`${counts[status]} ${cfg.label.toLowerCase()}`}
              className={`flex items-center gap-1.5 text-[11px] ${
                isActive ? "font-bold text-slate-900" : "font-medium text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4" ref={containerRef}>
        {rooms.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-400">No capsules yet</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {visibleRooms.map((room) => {
              const cfg = STATUS_CONFIG[room.status] ?? STATUS_CONFIG.available;
              const isOpen = openId === room.id;
              return (
                <div key={room.id} className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenId(isOpen ? null : room.id)}
                    className={`flex aspect-square w-full flex-col items-center justify-center rounded-2xl shadow-sm transition hover:brightness-95 ${cfg.tile}`}
                  >
                    <span className="text-lg font-bold leading-tight">{room.id}</span>
                    <span className="text-[10px] font-medium">{cfg.label}</span>
                  </button>

                  {isOpen && (
                    <div className="absolute left-0 top-full z-20 mt-1 w-40 rounded-md border border-slate-200 bg-white p-1 shadow-lg">
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

export default function StaffDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [rooms, setRooms] = useState(INITIAL_ROOMS);
  const [reservations, setReservations] = useState(INITIAL_RESERVATIONS);

  const active =
    Object.entries(ROUTES).find(([, path]) => path === location.pathname)?.[0] ??
    "Dashboard";

  function handleNavigate(section) {
    navigate(ROUTES[section] ?? "/dashboard");
  }

  function handleChangeStatus(roomId, status) {
    setRooms((prev) => prev.map((r) => (r.id === roomId ? { ...r, status } : r)));
  }

  function handleReservationAction(id, action) {
    if (action === "approve" || action === "decline") {
      setReservations((prev) => prev.filter((r) => r.id !== id));
    } else {
    }
  }

  const occupiedCount = rooms.filter((r) => r.status === "occupied").length;

 
  const stats = [
    { label: "Today's Reservation", value: "10" },
    { label: "Pending Approvals", value: String(reservations.length) },
    { label: "Occupied Capsules", value: `${occupiedCount}/${rooms.length}` },
    { label: "Booking Conflicts", value: "3" },
  ];

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
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <StatCard key={s.label} label={s.label} value={s.value} />
            ))}
          </div>

          <div className="mt-6 grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.4fr_1fr]">
            <ReservationsNeedingAction reservations={reservations} onAction={handleReservationAction} />
            <CapsuleStatus rooms={rooms} onChangeStatus={handleChangeStatus} />
          </div>
        </main>
      </div>
    </div>
  );
}