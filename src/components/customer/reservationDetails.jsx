import {
  ArrowLeft,
  CalendarDays,
  Clock,
  BedSingle,
  X,
} from "lucide-react";

import StatusBadge from "./statusBadge.jsx";

export default function ReservationDetails({
  reservation,
  onBack,
  onCancel,
  onReschedule,
}) {
  if (!reservation) {
    return null;
  }

  return (
    <div className="space-y-4">

      {/* para sa back button */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#0B4A2E] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Reservations
      </button>

      {/* mga details ni nga card*/}
      <div className="rounded-2xl bg-white p-6 shadow-sm">

        {/* Header */}
        <div className="flex flex-col gap-4 border-b border-[#E4EFE9] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#CFE3D9]">
              <BedSingle className="h-7 w-7 text-[#0B4A2E]" />
            </div>

            <div>
              <p className="text-xs text-[#6F8E7F]">
                Reservation
              </p>

              <h2 className="text-xl font-bold text-[#0B3B2A]">
                {reservation.capsule}
              </h2>
            </div>
          </div>

          <StatusBadge status={reservation.status} />
        </div>

        {/* details sa reservation */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">

          <div className="rounded-xl bg-[#F5FAF7] p-4">
            <div className="flex items-center gap-2 text-[#0B4A2E]">
              <CalendarDays className="h-5 w-5" />

              <span className="text-xs font-medium">
                Date
              </span>
            </div>

            <p className="mt-2 font-semibold text-[#0B3B2A]">
              {reservation.date}
            </p>
          </div>

          <div className="rounded-xl bg-[#F5FAF7] p-4">
            <div className="flex items-center gap-2 text-[#0B4A2E]">
              <Clock className="h-5 w-5" />

              <span className="text-xs font-medium">
                Time
              </span>
            </div>

            <p className="mt-2 font-semibold text-[#0B3B2A]">
              {reservation.checkIn} - {reservation.checkOut}
            </p>
          </div>
        </div>

        {/* Actions */}
        {reservation.status === "Confirmed" && (
          <div className="mt-6 flex flex-wrap gap-3 border-t border-[#E4EFE9] pt-5">

            <button
              type="button"
              onClick={() => onReschedule(reservation)}
              className="rounded-lg bg-[#0B4A2E] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#09391F]"
            >
              Reschedule
            </button>

            <button
              type="button"
              onClick={() => onCancel(reservation)}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E9A8A8] px-4 py-2.5 text-sm font-medium text-[#C0392B] hover:bg-[#FDF1F1]"
            >
              <X className="h-4 w-4" />
              Cancel Reservation
            </button>

          </div>
        )}
      </div>
    </div>
  );
}