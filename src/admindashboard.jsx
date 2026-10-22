import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarCheck, BedSingle, DoorOpen, Banknote } from "lucide-react";

import Header from "./components/AdminHeader.jsx";
import Sidebar from "./components/Adminsidebar.jsx";

// Address sa backend server
const API = "http://localhost:5000/api";

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

  const active =
    location.pathname === "/customers"
      ? "Customers"
      : location.pathname === "/capsule" || location.pathname === "/capsules"
        ? "Capsule"
        : "Dashboard";

  function handleNavigate(section) {
    if (section === "Customers") return navigate("/customers");
    if (section === "Capsule") return navigate("/capsule");
    if (section === "Reservation") return navigate("/reservation");
    if (section === "Staff Management" || section === "Management") return navigate("/management");
    navigate("/dashboard");
  }

  // Mo-load pag-abli sa page, unya mo-refresh matag 5 segundos
  useEffect(() => {
    let current = true;
    const loadCapsules = () => {
      fetch(`${API}/capsules?archived=false`)
        .then((res) => {
          if (!res.ok) throw new Error("Request failed");
          return res.json();
        })
        .then((data) => {
          if (!current) return;
          setRooms(data.map((c) => ({
            id: c.capsuleId,
            name: c.capsuleName,
            status: c.status,
          })));
        })
        .catch((err) => console.error(err))
        .finally(() => {
          if (current) setLoading(false);
        });
    };

    loadCapsules();
    const timer = setInterval(loadCapsules, 5000);
    return () => {
      current = false;
      clearInterval(timer);
    };
  }, []);

  // Ihap gikan sa real data
  const availableCount = rooms.filter((r) => r.status === "Available").length;
  const occupiedCount = rooms.filter((r) => r.status === "Occupied").length;

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

          <CapsuleStatus rooms={rooms} loading={loading} />
        </main>
      </div>
    </div>
  );
}