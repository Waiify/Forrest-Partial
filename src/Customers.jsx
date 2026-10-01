import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Header from "./components/Header.jsx";
import Sidebar from "./components/sidebar.jsx";

const STATUS_CONFIG = {
  active: { label: "Active", dot: "bg-blue-500", text: "text-blue-700" },
  "checked-out": { label: "Checked out", dot: "bg-slate-400", text: "text-slate-600" },
  upcoming: { label: "Upcoming", dot: "bg-amber-500", text: "text-amber-700" },
};

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function ReservationsTable({ reservations, loading, error }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold">Recent reservations</h2>
        <button type="button" className="text-xs font-medium text-slate-500 hover:text-slate-900">
          View all
        </button>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs text-slate-500">
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Email</th>
            <th className="px-4 py-2 font-medium">Total stays</th>
            <th className="px-4 py-2 font-medium">Last visit</th>
            <th className="px-4 py-2 text-right font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                Loading...
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-sm text-red-500">
                {error}
              </td>
            </tr>
          ) : reservations.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">
                No data yet
              </td>
            </tr>
          ) : (
            reservations.map((r) => {
              const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG["checked-out"];
              return (
                <tr key={r.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                  <td className="px-4 py-3 text-slate-500">{r.email}</td>
                  <td className="px-4 py-3 text-slate-600">{r.totalStays}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(r.lastVisit)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                      <span className={`text-xs font-medium ${cfg.text}`}>{cfg.label}</span>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function Customers() {
  const navigate = useNavigate();
  const location = useLocation();

  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const active =
    location.pathname === "/customers"
      ? "Customers"
      : location.pathname === "/capsule" || location.pathname === "/capsules"
        ? "Capsule"
        : "Dashboard";

  function handleNavigate(section) {
    if (section === "Capsule") {
      navigate("/capsule");
      return;
    }
    navigate(section === "Customers" ? "/customers" : "/dashboard");
  }

  useEffect(() => {
    fetch("http://localhost:5000/api/users")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load customers");
        return res.json();
      })
      .then((users) => {
        const mapped = users.map((u) => ({
          id: u._id,
          name: `${u.firstName} ${u.lastName}`,
          email: u.email,
          totalStays: 0,        // no reservation data yet — placeholder
          lastVisit: u.createdAt, // placeholder until you have real visit data
          status: "upcoming",   // placeholder until you track reservation status
        }));
        setReservations(mapped);
        setError("");
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900">
      <Sidebar active={active} onNavigate={handleNavigate} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header active={active} />

        <main className="flex-1 overflow-y-auto p-6">
          <ReservationsTable reservations={reservations} loading={loading} error={error} />
        </main>
      </div>
    </div>
  );
}