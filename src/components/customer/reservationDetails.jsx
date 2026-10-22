import {
  ArrowLeft,
  CalendarDays,
  Clock,
  BedSingle,
  X,
  Activity,
} from "lucide-react";

import StatusBadge from "./statusBadge.jsx";
import { CAPSULES } from "../../dashboardData.js";

export default function ReservationDetails({
  reservation,
  activities = [],
  onBack,
  onCancel,
  onReschedule,
}) {
  if (!reservation) {
    return null;
  }

  // Find the capsule image
  const capsule = CAPSULES.find(
    (c) => c.id === reservation.capsule
  );

  return (
    <div className="space-y-4">

      {/* =====================================================
          BACK BUTTON PARA MAKA BALIK KA
      ====================================================== */}
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#0B4A2E] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Reservations
      </button>

      {/* =====================================================
          RESERVATION DETAILS CARD PARA AWARE KA
      ====================================================== */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">

        {/* =================================================
            HEADER UG STATUS
        ================================================== */}
        <div className="flex flex-col gap-4 border-b border-[#E4EFE9] pb-5 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-4">

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
                  <BedSingle className="h-7 w-7 text-[#0B4A2E]" />
                </div>
              )}

            </div>

            {/* Capsule Name */}
            <div>

              <p className="text-xs text-[#6F8E7F]">
                Reservation
              </p>

              <h2 className="text-xl font-bold text-[#0B3B2A]">
                Capsule {reservation.capsule}
              </h2>

            </div>

          </div>

          {/* Status */}
          <StatusBadge
            status={reservation.status}
          />

        </div>

        {/* =================================================
            DATE UG TIME 
        ================================================== */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">

          {/* DATE */}
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

          {/* TIME */}
          <div className="rounded-xl bg-[#F5FAF7] p-4">

            <div className="flex items-center gap-2 text-[#0B4A2E]">

              <Clock className="h-5 w-5" />

              <span className="text-xs font-medium">
                Time
              </span>

            </div>

            <p className="mt-2 font-semibold text-[#0B3B2A]">
              {reservation.checkIn} -{" "}
              {reservation.checkOut}
            </p>

          </div>

        </div>

        {/* =================================================
            ACTIONS NGA PWEDE NIMO MA PERFORM
        ================================================== */}

        {reservation.status === "Confirmed" && (
          <div className="mt-6 flex flex-wrap gap-3 border-t border-[#E4EFE9] pt-5">

            {/* RESCHEDULE */}
            <button
              type="button"
              onClick={() =>
                onReschedule(reservation)
              }
              className="rounded-lg bg-[#0B4A2E] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#09391F]"
            >
              Reschedule
            </button>

            {/* CANCEL */}
            <button
              type="button"
              onClick={() =>
                onCancel(reservation)
              }
              className="inline-flex items-center gap-2 rounded-lg border border-[#E9A8A8] px-4 py-2.5 text-sm font-medium text-[#C0392B] transition hover:bg-[#FDF1F1]"
            >
              <X className="h-4 w-4" />
              Cancel Reservation
            </button>

          </div>
        )}

      </div>

      {/* =====================================================
          RESERVATION ACTIVITY / AUDIT HISTORY
      ====================================================== */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">

        <div className="flex items-center gap-2 border-b border-[#E4EFE9] pb-4">

          <Activity className="h-5 w-5 text-[#0B4A2E]" />

          <div>
            <h3 className="font-semibold text-[#0B3B2A]">
              Reservation Activity
            </h3>

            <p className="text-xs text-[#6F8E7F]">
              Track changes and actions made to this reservation.
            </p>
          </div>

        </div>

        <div className="mt-5">

          {activities.length === 0 ? (
            <div className="rounded-xl bg-[#F5FAF7] p-4 text-sm text-[#6F8E7F]">
              No activity recorded yet.
            </div>
          ) : (
            <div className="space-y-4">

              {activities.map((activity, index) => (
                <div
                  key={`${activity.action}-${index}`}
                  className="flex gap-3"
                >

                  {/* Timeline dot */}
                  <div className="flex flex-col items-center">

                    <div className="mt-1 h-3 w-3 rounded-full bg-[#0B4A2E]" />

                    {index !==
                      activities.length - 1 && (
                      <div className="mt-1 h-full w-px bg-[#D7E8DF]" />
                    )}

                  </div>

                  {/* Activity details */}
                  <div className="pb-2">

                    <p className="text-sm font-semibold text-[#0B3B2A]">
                      {activity.action}
                    </p>

                    {activity.details && (
                      <p className="mt-1 text-sm text-[#5F776B]">
                        {activity.details}
                      </p>
                    )}

                    {activity.timestamp && (
                      <p className="mt-1 text-xs text-[#8AA095]">
                        {activity.timestamp}
                      </p>
                    )}

                  </div>

                </div>
              ))}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}