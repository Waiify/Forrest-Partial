import { CalendarCheck, CalendarDays, Clock, Trash2, ArrowRight, BedSingle } from "lucide-react";
import Card from "./card.jsx";
import StatusBadge from "./statusBadge.jsx";

/* mga icon, label and value para sa date, check-in an dout */
function Detail({ icon: Icon, label, value, sub }) {
  return (
    <div className="flex items-start gap-1.5">
      <Icon className="mt-0.5 h-4 w-4 text-[#0B4A2E]" />
      <div>
        <p className="text-[11px] text-[#6F8E7F]">{label}</p>
        <p className="text-xs font-semibold text-[#0B3B2A]">{value}</p>
        {sub && <p className="text-[10px] text-[#6F8E7F]">{sub}</p>}
      </div>
    </div>
  );
}

export default function UpcomingReservation({ reservation, onView, onCancel, onViewAll }) {
  return (
    <Card title="Upcoming reservation" icon={CalendarCheck} action="View all" onAction={onViewAll}>
      {!reservation ? (
        <div className="py-10 text-center">
          <p className="font-semibold text-[#0B3B2A]">No upcoming reservation</p>
          <p className="mt-1 text-sm text-[#6F8E7F]">Book a capsule to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* wala pay images so icons lang sa*/}
          <div className="flex h-36 w-full shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#CFE3D9] sm:w-32">
            {reservation.image ? (
              <img src={reservation.image} alt={`Capsule ${reservation.capsule}`} className="h-full w-full object-cover" />
            ) : (
              <BedSingle className="h-10 w-10 text-[#0B4A2E]/60" />
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-[#0B3B2A]">{reservation.capsule}</span>
              <StatusBadge status={reservation.status} />
            </div>

            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-b border-[#E4EFE9] pb-3">
              <Detail icon={CalendarDays} label="Date" value={reservation.date} sub={`(${reservation.day})`} />
              <Detail icon={Clock} label="Check-in" value={reservation.checkIn} />
              <Detail icon={Clock} label="Check-out" value={reservation.checkOut} />
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onView}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B4A2E] px-4 py-2 text-xs font-medium text-white hover:bg-[#09391F]"
              >
                View details <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#E9A8A8] px-4 py-2 text-xs font-medium text-[#C0392B] hover:bg-[#FDF1F1]"
              >
                <Trash2 className="h-3.5 w-3.5" /> Cancel reservation
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
