import {
  CalendarDays,
  Clock,
  Eye,
  BedSingle,
} from "lucide-react";

import StatusBadge from "./statusBadge.jsx";
import { CAPSULES } from "../../dashboardData.js";

export default function ReservationHistory({
  reservations,
  onView,
}) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">

      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#0B4A2E]">
            Reservation History
          </h2>

          <p className="mt-1 text-sm text-[#6F8E7F]">
            View your previous reservations and their details.
          </p>
        </div>
      </div>

      {/* Empty State */}
      {reservations.length === 0 ? (
        <div className="py-12 text-center">
          <BedSingle className="mx-auto h-10 w-10 text-[#9AAAA2]" />

          <p className="mt-3 font-semibold text-[#0B3B2A]">
            No previous reservations
          </p>

          <p className="mt-1 text-sm text-[#6F8E7F]">
            Completed or cancelled reservations will appear here.
          </p>
        </div>
      ) : (

        /* Reservation List */
        <div className="mt-6 space-y-3">

          {reservations.map((reservation) => {

            // Find the capsule image based on capsule ID
            const capsule = CAPSULES.find(
              (c) => c.id === reservation.capsule
            );

            return (
              <div
                key={reservation.id}
                className="rounded-xl border border-[#E4EFE9] bg-[#FAFCFB] p-4"
              >

                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                  {/* Reservation Information */}
                  <div className="flex items-start gap-4">

                    {/* Capsule Image */}
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#CFE3D9]">

                      {capsule?.image ? (
                        <img
                          src={capsule.image}
                          alt={`Capsule ${reservation.capsule}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <BedSingle className="h-6 w-6 text-[#0B4A2E]" />
                        </div>
                      )}

                    </div>

                    {/* Details */}
                    <div>

                      <div className="flex flex-wrap items-center gap-2">

                        <h3 className="font-bold text-[#0B3B2A]">
                          Capsule {reservation.capsule}
                        </h3>

                        <StatusBadge
                          status={reservation.status}
                        />

                      </div>

                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#6F8E7F]">

                        {/* Date */}
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5" />

                          {reservation.date}
                        </span>

                        {/* Time */}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />

                          {reservation.checkIn} -{" "}
                          {reservation.checkOut}
                        </span>

                      </div>

                    </div>
                  </div>

                  {/* View Button */}
                  <div className="flex shrink-0">

                    <button
                      type="button"
                      onClick={() => onView(reservation)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#CFE3D9] px-4 py-2 text-xs font-medium text-[#0B4A2E] transition hover:bg-[#EEF7F2]"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>

                  </div>

                </div>

              </div>
            );
          })}

        </div>
      )}

    </div>
  );
}