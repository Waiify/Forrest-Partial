import { Clock, ChevronRight } from "lucide-react";
import Card from "./card.jsx";
import StatusBadge from "./statusBadge.jsx";

const COLUMNS = ["Date", "Capsule", "Check-in", "Check-out", "Status"];

export default function RecentReservations({ reservations, onViewAll, onSelect }) {
  return (
    <Card title="Recent reservations" icon={Clock} action="View all" onAction={onViewAll}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-[#F5FAF7] text-[#4E6B5D]">
              {COLUMNS.map((col) => (
                <th key={col} className="px-3 py-2.5 font-medium">{col}</th>
              ))}
              <th className="w-6" />
            </tr>
          </thead>

          <tbody>
            {reservations.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length + 1} className="px-3 py-10 text-center">
                  <p className="font-semibold text-[#0B3B2A]">No reservations found</p>
                  <p className="mt-1 text-[#6F8E7F]">Your bookings will appear here.</p>
                </td>
              </tr>
            ) : (
              reservations.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => onSelect?.(r)}
                  className="cursor-pointer border-b border-[#EEF4F0] last:border-0 hover:bg-[#F8FCFA]"
                >
                  <td className="px-3 py-3 text-[#16352A]">{r.date}</td>
                  <td className="px-3 py-3 font-bold text-[#0B3B2A]">{r.capsule}</td>
                  <td className="px-3 py-3 text-[#16352A]">{r.checkIn}</td>
                  <td className="px-3 py-3 text-[#16352A]">{r.checkOut}</td>
                  <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-1 text-[#6F8E7F]"><ChevronRight className="h-4 w-4" /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
