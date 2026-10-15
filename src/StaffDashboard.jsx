import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import pageBackground from "./assets/page_background.jpeg";

import StaffHeader from "./components/StaffHeader.jsx";
import StaffSidebar from "./components/StaffSidebar.jsx";

// Address sa backend server
const API = "http://localhost:5000/api";

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

{/*dummy datas pa niiiii rawrrr, change this into real data from database*/}
const INITIAL_RESERVATIONS = [
  { id: 1, guest: "Meme Dealdo", email: "meme@gmail.com", capsule: "R-01", dateTime: "02/08/26, 1:00am" },
  { id: 2, guest: "Dodong Ruiz", email: "dodong@gmail.com", capsule: "R-01", dateTime: "02/08/26, 1:00am" },
  { id: 3, guest: "Blizza Batombakal", email: "blizza@gmail.com", capsule: "R-03", dateTime: "02/08/26, 1:00am" },
  { id: 4, guest: "Cherlie Cuteko", email: "cherlie@gmail.com", capsule: "R-04", dateTime: "02/08/26, 1:00am" },
  { id: 5, guest: "Vanessa Pangit", email: "vanessa@gmail.com", capsule: "R-05", dateTime: "02/08/26, 1:00am" },
  { id: 6, guest: "Tao Lang Pasensyana", email: "tao@gmail.com", capsule: "R-06", dateTime: "02/08/26, 1:00am" },
];

// Ang order sa status sa legend. Parehas gyud sa gi-save sa database
// (parehas sa StaffCapsuleManagement ug StaffCapsuleAvailability)
const STATUS_ORDER = [
  "Available",
  "Reserved",
  "Occupied",
  "Coming Soon",
  "Under Maintenance",
];

// Kolor ug label sa matag status (dot para sa legend, tile para sa kahon)
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

// Display ra ni: dili na ma-usab ang status diri, sa Capsule Management ra
function CapsuleStatus({ rooms, loading }) {
  // Filter: "all" o usa ka status (pananglitan "Available")
  const [filter, setFilter] = useState("all");

  // Ang mga capsule nga makita base sa napili nga filter
  const visibleRooms =
    filter === "all" ? rooms : rooms.filter((r) => r.status === filter);

  return (
    <div className="min-w-0 rounded-2xl bg-white p-5 shadow-md mt-5">
      <h2 className="text-base font-bold text-[#0b4d2c]">Capsule Status</h2>
      <p className="text-xs text-slate-400">Capsules availability by rooms</p>

      {/* Legend (click one to filter, click again to show all) */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
        {STATUS_ORDER.map((status) => {
          const cfg = STATUS_CONFIG[status];
          const isActive = filter === status;
          // Ihap kung pila ka capsule ang naa niini nga status
          const count = rooms.filter((r) => r.status === status).length;
          return (
            <button
              key={status}
              type="button"
              onClick={() => setFilter(isActive ? "all" : status)}
              className={`flex items-center gap-1.5 text-[11px] ${
                isActive
                  ? "font-bold text-slate-900"
                  : "font-medium text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {/* Loading, walay capsule pa, o walay sakto sa filter */}
        {loading && rooms.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-400">Loading...</div>
        ) : rooms.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-400">No capsules yet</div>
        ) : visibleRooms.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-400">No capsules found.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {/* Usa ka kahon matag capsule, ang kolor depende sa status (dili na button) */}
            {visibleRooms.map((room) => {
              const cfg = STATUS_CONFIG[room.status] ?? STATUS_CONFIG["Available"];
              return (
                <div
                  key={room.id}
                  className={`flex aspect-square w-full flex-col items-center justify-center rounded-2xl shadow-sm ${cfg.tile}`}
                >
                  <span className="text-lg font-bold leading-tight">{room.name}</span>
                  <span className="text-[10px] font-medium">{cfg.label}</span>
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
  const [rooms, setRooms] = useState([]); // capsules gikan sa database
  const [loading, setLoading] = useState(true); // true samtang nag-load pa
  const [reservations, setReservations] = useState(INITIAL_RESERVATIONS);

  const active =
    Object.entries(ROUTES).find(([, path]) => path === location.pathname)?.[0] ??
    "Dashboard";

  function handleNavigate(section) {
    navigate(ROUTES[section] ?? "/dashboard");
  }

  // Mokuha sa mga capsule gikan sa database (wala ang archived)
  async function loadCapsules(showLoading = false) {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch(`${API}/capsules?archived=false`);
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      // I-convert ang database fields ngadto sa gamiton sa page
      setRooms(
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

  // Mo-load pag-abli sa page, unya mo-refresh matag 5 segundos
  useEffect(() => {
    loadCapsules(true);
    const timer = setInterval(() => loadCapsules(false), 5000);
    return () => clearInterval(timer); // i-undang ang timer kung mawala ang page
  }, []);

  function handleReservationAction(id, action) {
    if (action === "approve" || action === "decline") {
      setReservations((prev) => prev.filter((r) => r.id !== id));
    }
  }

  // Ihap sa mga capsule nga "Occupied" gikan sa real data
  const occupiedCount = rooms.filter((r) => r.status === "Occupied").length;

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
            <ReservationsNeedingAction
              reservations={reservations}
              onAction={handleReservationAction}
            />
            <CapsuleStatus rooms={rooms} loading={loading} />
          </div>
        </main>
      </div>
    </div>
  );
}