import {
  CalendarDays,
  Clock,
  Eye,
  Pencil,
  Trash2,
  BedSingle,
} from "lucide-react";

import Card from "./card.jsx";
import StatusBadge from "./statusBadge.jsx";

export default function MyReservations({
  reservations,
  onView,
  onCancel,
  onReschedule,
}) {
  return (
    <Card title="My Reservations" icon={CalendarDays}>
      {reservations.length === 0 ? (
        <div className="py-12 text-center">
          <BedSingle className="mx-auto h-10 w-10 text-[#9AAAA2]" />

          <p className="mt-3 font-semibold text-[#0B3B2A]">
            No reservations found
          </p>

          <p className="mt-1 text-sm text-[#6F8E7F]">
            Your reservations will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reservations.map((reservation) => (
            <div
              key={reservation.id}
              className="rounded-xl border border-[#E4EFE9] bg-[#FAFCFB] p-4"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

              
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#CFE3D9]">
                    <BedSingle className="h-6 w-6 text-[#0B4A2E]" />
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-[#0B3B2A]">
                        {reservation.capsule}
                      </h3>

                      <StatusBadge status={reservation.status} />
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#6F8E7F]">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {reservation.date}
                      </span>

                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {reservation.checkIn} - {reservation.checkOut}
                      </span>
                    </div>
                  </div>
                </div>

               
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onView(reservation)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#CFE3D9] px-3 py-2 text-xs font-medium text-[#0B4A2E] hover:bg-[#EEF7F2]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    View
                  </button>

                  {reservation.status === "Confirmed" && (
                    <>
                      <button
                        type="button"
                        onClick={() => onReschedule(reservation)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#CFE3D9] px-3 py-2 text-xs font-medium text-[#0B4A2E] hover:bg-[#EEF7F2]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Reschedule
                      </button>

                      <button
                        type="button"
                        onClick={() => onCancel(reservation)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E9A8A8] px-3 py-2 text-xs font-medium text-[#C0392B] hover:bg-[#FDF1F1]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}