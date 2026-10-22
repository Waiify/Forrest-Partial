import {
  CalendarDays,
  Clock,
  Eye,
  Pencil,
  Trash2,
  BedSingle,
  ArrowRight,
} from "lucide-react";

import Card from "./card.jsx";
import StatusBadge from "./statusBadge.jsx";
import { CAPSULES } from "../../dashboardData.js";

export default function MyReservations({
  reservations,
  onView,
  onCancel,
  onReschedule,
  onViewHistory,
}) {
  return (
    <Card title="My Reservations" icon={CalendarDays}>

      {/* =====================================================
          NO RESERVATIONS
      ====================================================== */}
      {reservations.length === 0 ? (
        <div className="py-12 text-center">

          <BedSingle className="mx-auto h-10 w-10 text-[#9AAAA2]" />

          <p className="mt-3 font-semibold text-[#0B3B2A]">
            No reservations found
          </p>

          <p className="mt-1 text-sm text-[#6F8E7F]">
            Your current reservations will appear here.
          </p>

        </div>
      ) : (

        /* =====================================================
           RESERVATION LIST
        ====================================================== */
        <div className="space-y-3">

          {reservations.map((reservation) => {

            // Find capsule information from CAPSULES
            const capsule = CAPSULES.find(
              (c) => c.id === reservation.capsule
            );

            return (
              <div
                key={reservation.id}
                className="rounded-xl border border-[#E4EFE9] bg-[#FAFCFB] p-4"
              >

                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                  {/* =================================================
                      LEFT SIDE
                  ================================================== */}
                  <div className="flex min-w-0 items-start gap-4">

                    {/* Capsule Image */}
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#CFE3D9]">

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

                    {/* Reservation Information */}
                    <div className="min-w-0">

                      {/* Capsule + Status */}
                      <div className="flex flex-wrap items-center gap-2">

                        <h3 className="font-bold text-[#0B3B2A]">
                          Capsule {reservation.capsule}
                        </h3>

                        <StatusBadge
                          status={reservation.status}
                        />

                      </div>

                      {/* Date + Time */}
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

                  {/* =================================================
                      RIGHT SIDE ACTIONS
                  ================================================== */}
                  <div className="flex shrink-0 flex-wrap gap-2">

                    {/* VIEW */}
                    <button
                      type="button"
                      onClick={() => onView(reservation)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#CFE3D9] px-3 py-2 text-xs font-medium text-[#0B4A2E] transition hover:bg-[#EEF7F2]"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>

                    {/* =================================================
                        CONFIRMED RESERVATION ACTIONS
                    ================================================== */}
                    {reservation.status === "Confirmed" && (
                      <>
                        {/* RESCHEDULE */}
                        <button
                          type="button"
                          onClick={() =>
                            onReschedule(reservation)
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#CFE3D9] px-3 py-2 text-xs font-medium text-[#0B4A2E] transition hover:bg-[#EEF7F2]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Reschedule
                        </button>

                        {/* CANCEL */}
                        <button
                          type="button"
                          onClick={() =>
                            onCancel(reservation)
                          }
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E9A8A8] px-3 py-2 text-xs font-medium text-[#C0392B] transition hover:bg-[#FDF1F1]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      </>
                    )}

                  </div>
                </div>
              </div>
            );
          })}

          {/* =====================================================
              SEE PREVIOUS BOOKINGS
          ====================================================== */}
          <button
            type="button"
            onClick={onViewHistory}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-[#CFE3D9] bg-white px-4 py-3 text-sm font-medium text-[#0B4A2E] transition hover:bg-[#EEF7F2]"
          >
            See Previous Bookings

            <ArrowRight className="h-4 w-4" />
          </button>

        </div>
      )}
    </Card>
  );
}