import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  BedSingle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

export default function BookCapsule({
  capsules = [],
  bookingSelection = null,
  onBack,
  onSubmit,
}) {
  const [selectedDate, setSelectedDate] = useState(
    bookingSelection?.date
      ? (() => {
          const date = new Date(
            bookingSelection.date
          );

          return `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-${String(
            date.getDate()
          ).padStart(2, "0")}`;
        })()
      : ""
  );

  const [startTime, setStartTime] = useState(() => {
    if (!bookingSelection?.time) return "";

    return (
      bookingSelection.time.split(" - ")[0] || ""
    );
  });

  const [endTime, setEndTime] = useState(() => {
    if (!bookingSelection?.time) return "";

    return (
      bookingSelection.time.split(" - ")[1] || ""
    );
  });

  const [selectedCapsule, setSelectedCapsule] =
    useState(
      bookingSelection?.capsule?.id || ""
    );

  const [step, setStep] = useState(1);
  const [error, setError] = useState("");

  /* =====================================================
     PREFILL FROM CAPSULE AVAILABILITY
  ====================================================== */

  useEffect(() => {
    if (!bookingSelection) return;

    /* DATE */
    if (bookingSelection.date) {
      const date =
        bookingSelection.date instanceof Date
          ? bookingSelection.date
          : new Date(bookingSelection.date);

      const localDate =
        `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}-${String(
          date.getDate()
        ).padStart(2, "0")}`;

      setSelectedDate(localDate);
    }

    /* TIME */
    if (bookingSelection.time) {
      const [start, end] =
        bookingSelection.time.split(" - ");

      setStartTime(start || "");
      setEndTime(end || "");
    }

    /* CAPSULE */
    if (bookingSelection.capsule?.id) {
      setSelectedCapsule(
        bookingSelection.capsule.id
      );
    }

    setStep(1);
    setError("");
  }, [bookingSelection]);

  /* =====================================================
     AVAILABLE CAPSULES
  ====================================================== */

  const availableCapsules = useMemo(() => {
    return capsules.filter(
      (capsule) =>
        capsule.status?.toLowerCase() ===
        "available"
    );
  }, [capsules]);

  /* =====================================================
     ALL CAPSULES
     Used for displaying status cards.
  ====================================================== */

  const displayedCapsules = useMemo(() => {
    return capsules;
  }, [capsules]);

  /* =====================================================
     STATUS HELPERS
  ====================================================== */

  const getCapsuleStatus = (capsule) => {
    const status =
      capsule.status?.toLowerCase() || "available";

    switch (status) {
      case "available":
        return {
          label: "Available",
          icon: CheckCircle2,
          container:
            "bg-white text-[#287A4B]",
          iconClass:
            "text-[#287A4B]",
          badge:
            "bg-[#EAF4EE] text-[#287A4B]",
        };

      case "reserved":
        return {
          label: "Reserved",
          icon: Clock3,
          container:
            "bg-white text-[#2563EB]",
          iconClass:
            "text-[#2563EB]",
          badge:
            "bg-blue-50 text-blue-600",
        };

      case "occupied":
        return {
          label: "Occupied",
          icon: Clock3,
          container:
            "bg-white text-[#DC2626]",
          iconClass:
            "text-[#DC2626]",
          badge:
            "bg-red-50 text-red-600",
        };

      case "maintenance":
      case "under maintenance":
      case "cleaning":
        return {
          label: "Under Maintenance",
          icon: Clock3,
          container:
            "bg-white text-[#C58A16]",
          iconClass:
            "text-[#C58A16]",
          badge:
            "bg-yellow-50 text-yellow-700",
        };

      default:
        return {
          label: capsule.status || "Unavailable",
          icon: Clock3,
          container:
            "bg-white text-[#6F8E7F]",
          iconClass:
            "text-[#6F8E7F]",
          badge:
            "bg-gray-100 text-gray-600",
        };
    }
  };

  /* =====================================================
     TODAY
  ====================================================== */

  const today = (() => {
    const date = new Date();

    return `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;
  })();

  /* =====================================================
     VALIDATION
  ====================================================== */

  const validateBooking = () => {
    if (!selectedDate) {
      setError("Please select a date.");
      return false;
    }

    if (!startTime) {
      setError(
        "Please select a check-in time."
      );
      return false;
    }

    if (!endTime) {
      setError(
        "Please select a check-out time."
      );
      return false;
    }

    if (!selectedCapsule) {
      setError(
        "Please select an available capsule."
      );
      return false;
    }

    const selected =
      displayedCapsules.find(
        (capsule) =>
          capsule.id === selectedCapsule
      );

    if (
      selected?.status?.toLowerCase() !==
      "available"
    ) {
      setError(
        "Please select a capsule that is currently available."
      );
      return false;
    }

    if (endTime <= startTime) {
      setError(
        "Check-out time must be later than check-in time."
      );
      return false;
    }

    setError("");
    return true;
  };

  /* =====================================================
     CONTINUE TO CONFIRMATION
  ====================================================== */

  const handleContinue = () => {
    if (!validateBooking()) return;

    setStep(2);
  };

  /* =====================================================
     SUBMIT RESERVATION
  ====================================================== */

  const handleSubmit = () => {
    if (!validateBooking()) return;

    const selected =
      availableCapsules.find(
        (capsule) =>
          capsule.id === selectedCapsule
      );

    const reservation = {
      date: selectedDate,
      checkIn: startTime,
      checkOut: endTime,
      capsule: selectedCapsule,
      capsuleName:
        selected?.name ||
        `Capsule ${selectedCapsule}`,
      status: "Pending",
    };

    onSubmit?.(reservation);
  };

  /* =====================================================
     RETURN
  ====================================================== */

  return (
    <div className="space-y-5">

      {/* =================================================
          HEADER
      ================================================== */}

      <div className="flex flex-wrap items-start justify-between gap-3">

        <div>
          <h2 className="text-2xl font-bold text-[#0B4A2E]">
            Book Now
          </h2>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-[#D7E7DE] px-4 py-2 text-sm font-medium text-[#0B4A2E] transition hover:bg-[#F1F8F4]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

      </div>

      {/* =================================================
          PROGRESS
      ================================================== */}

      <div className="rounded-2xl bg-white p-5 shadow-sm">

        <div className="flex items-center gap-3">

          {/* STEP 1 */}

          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
              step === 1
                ? "bg-[#0B4A2E] text-white"
                : "bg-[#DCEDE4] text-[#0B4A2E]"
            }`}
          >
            1
          </div>

          <div className="flex-1">

            <p className="text-sm font-semibold text-[#0B3B2A]">
              Select Reservation
            </p>

            <p className="text-xs text-[#7A9185]">
              Choose your date, time, and capsule.
            </p>

          </div>

          <div className="h-px w-10 bg-[#D7E7DE]" />

          {/* STEP 2 */}

          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
              step === 2
                ? "bg-[#0B4A2E] text-white"
                : "bg-[#EAF4EE] text-[#6F8E7F]"
            }`}
          >
            2
          </div>

          <div>

            <p className="text-sm font-semibold text-[#0B3B2A]">
              Confirm
            </p>

            <p className="text-xs text-[#7A9185]">
              Review your reservation.
            </p>

          </div>

        </div>

      </div>

      {/* =================================================
          STEP 1
      ================================================== */}

      {step === 1 && (
        <>

          {/* DATE + TIME */}

          <div className="grid gap-5 lg:grid-cols-2">

            {/* DATE */}

            <section className="rounded-2xl bg-white p-6 shadow-sm">

              <div className="mb-5 flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E5F2EB]">
                  <CalendarDays className="h-5 w-5 text-[#0B4A2E]" />
                </div>

                <div>

                  <h3 className="font-semibold text-[#0B3B2A]">
                    Select Date
                  </h3>

                  <p className="text-xs text-[#7A9185]">
                    When would you like to use the capsule?
                  </p>

                </div>

              </div>

              <input
                type="date"
                min={today}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(
                    e.target.value
                  );
                  setError("");
                }}
                className="w-full rounded-xl border border-[#D7E7DE] bg-[#F8FBF9] px-4 py-3 text-sm text-[#16352A] outline-none transition focus:border-[#0B4A2E] focus:ring-2 focus:ring-[#0B4A2E]/10"
              />

            </section>

            {/* TIME */}

            <section className="rounded-2xl bg-white p-6 shadow-sm">

              <div className="mb-5 flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E5F2EB]">
                  <Clock3 className="h-5 w-5 text-[#0B4A2E]" />
                </div>

                <div>

                  <h3 className="font-semibold text-[#0B3B2A]">
                    Select Time
                  </h3>

                  <p className="text-xs text-[#7A9185]">
                    Choose your check-in and check-out time.
                  </p>

                </div>

              </div>

              <div className="grid grid-cols-2 gap-3">

                {/* CHECK-IN */}

                <div>

                  <label className="mb-1.5 block text-xs font-medium text-[#4E6B5D]">
                    Check-in
                  </label>

                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(
                        e.target.value
                      );
                      setError("");
                    }}
                    className="w-full rounded-xl border border-[#D7E7DE] bg-[#F8FBF9] px-3 py-3 text-sm text-[#16352A] outline-none focus:border-[#0B4A2E]"
                  />

                </div>

                {/* CHECK-OUT */}

                <div>

                  <label className="mb-1.5 block text-xs font-medium text-[#4E6B5D]">
                    Check-out
                  </label>

                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(
                        e.target.value
                      );
                      setError("");
                    }}
                    className="w-full rounded-xl border border-[#D7E7DE] bg-[#F8FBF9] px-3 py-3 text-sm text-[#16352A] outline-none focus:border-[#0B4A2E]"
                  />

                </div>

              </div>

            </section>

          </div>

          {/* =================================================
              CAPSULE STATUS
          ================================================== */}

          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <div className="mb-5 flex items-center justify-between gap-3">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E5F2EB]">
                  <BedSingle className="h-5 w-5 text-[#0B4A2E]" />
                </div>

                <div>

                  <h3 className="font-semibold text-[#0B3B2A]">
                    Available Capsules
                  </h3>

                  <p className="text-xs text-[#7A9185]">
                    Select an available capsule for your reservation.
                  </p>

                </div>

              </div>

              <span className="rounded-full bg-[#EAF4EE] px-3 py-1 text-xs font-semibold text-[#287A4B]">
                {availableCapsules.length} available
              </span>

            </div>

            {displayedCapsules.length > 0 ? (

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                {displayedCapsules.map(
                  (capsule) => {

                    const status =
                      getCapsuleStatus(
                        capsule
                      );

                    const StatusIcon =
                      status.icon;

                    const isAvailable =
                      capsule.status
                        ?.toLowerCase() ===
                      "available";

                    const isSelected =
                      selectedCapsule ===
                      capsule.id;

                    return (

                      <button
                        key={capsule.id}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => {

                          if (!isAvailable)
                            return;

                          setSelectedCapsule(
                            capsule.id
                          );

                          setError("");
                        }}

                        className={`group overflow-hidden rounded-xl border text-left transition ${
                          isSelected
                            ? "border-[#0B4A2E] bg-[#F0F8F3] ring-2 ring-[#0B4A2E]/10"
                            : isAvailable
                              ? "border-[#DDEAE3] bg-[#F8FBF9] hover:border-[#B8D7C8] hover:shadow-sm"
                              : "cursor-not-allowed border-[#E2E8E5] bg-[#F5F7F6] opacity-80"
                        }`}
                      >

                        {/* IMAGE */}

                        <div className="relative h-48 overflow-hidden bg-[#DDEDE5]">

                          {capsule.image ? (

                            <img
                              src={
                                capsule.image
                              }
                              alt={
                                capsule.name ||
                                `Capsule ${capsule.id}`
                              }
                              className={`h-full w-full object-cover transition duration-300 ${
                                isAvailable
                                  ? "group-hover:scale-105"
                                  : "grayscale-[20%]"
                              }`}
                            />

                          ) : (

                            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#DCEDE4] to-[#BFDCCB]">

                              <BedSingle className="h-12 w-12 text-[#4D8067]" />

                            </div>

                          )}

                          {/* STATUS BADGE */}

                          <div
                            className={`absolute left-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold shadow-sm ${status.badge}`}
                          >

                            <StatusIcon
                              className={`h-3 w-3 ${status.iconClass}`}
                            />

                            {status.label}

                          </div>

                        </div>

                        {/* CAPSULE INFO */}

                        <div className="p-4">

                          <div className="flex items-center justify-between gap-2">

                            <h4 className="font-semibold text-[#0B3B2A]">
                              {capsule.name ||
                                `Capsule ${capsule.id}`}
                            </h4>

                            {isSelected && (
                              <CheckCircle2 className="h-5 w-5 text-[#0B4A2E]" />
                            )}

                          </div>

                          <p className="mt-1 text-xs text-[#6F8E7F]">

                            {isAvailable
                              ? "Ready for booking"
                              : status.label ===
                                "Reserved"
                                ? "Already reserved for this schedule"
                                : status.label ===
                                  "Occupied"
                                  ? "Currently occupied"
                                  : "Currently unavailable"}

                          </p>

                          {capsule.price && (

                            <p className="mt-2 text-xs font-semibold text-[#0B4A2E]">

                              ₱{capsule.price}

                              <span className="font-normal text-[#7A9185]">
                                {" "}
                                / hour
                              </span>

                            </p>

                          )}

                        </div>

                      </button>

                    );
                  }
                )}

              </div>

            ) : (

              <div className="rounded-xl border border-dashed border-[#D7E7DE] bg-[#F8FBF9] px-6 py-12 text-center">

                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#E5F2EB]">
                  <BedSingle className="h-6 w-6 text-[#4D8067]" />
                </div>

                <p className="mt-3 font-semibold text-[#0B3B2A]">
                  No capsules available
                </p>

                <p className="mt-1 text-sm text-[#7A9185]">
                  Please choose another date or check again later.
                </p>

              </div>

            )}

          </section>

          {/* STATUS LEGEND */}

          <section className="rounded-2xl border border-[#D7E7DE] bg-[#F8FBF9] p-4">

            <p className="mb-3 text-xs font-semibold text-[#0B3B2A]">
              Capsule Status
            </p>

            <div className="flex flex-wrap gap-3">

              <span className="rounded-full bg-[#EAF4EE] px-3 py-1 text-xs font-semibold text-[#287A4B]">
                🟢 Available
              </span>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                🔵 Reserved
              </span>

              <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                🔴 Occupied
              </span>

              <span className="rounded-full bg-yellow-50 px-3 py-1 text-xs font-semibold text-yellow-700">
                🟠 Under Maintenance
              </span>

            </div>

          </section>

          {/* ERROR */}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* CONTINUE */}

          <div className="flex justify-end">

            <button
              type="button"
              onClick={handleContinue}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B4A2E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#09391F]"
            >
              Continue

              <ArrowRight className="h-4 w-4" />

            </button>

          </div>

        </>
      )}

      {/* =================================================
          STEP 2
      ================================================== */}

      {step === 2 && (

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <div className="mb-6">

            <h3 className="text-lg font-bold text-[#0B3B2A]">
              Confirm Reservation
            </h3>

            <p className="mt-1 text-sm text-[#6F8E7F]">
              Review your reservation details before submitting.
            </p>

          </div>

          {/* RESERVATION DETAILS */}

          <div className="grid gap-4 md:grid-cols-2">

            {/* DATE */}

            <div className="rounded-xl bg-[#F5FAF7] p-4">

              <p className="text-xs text-[#7A9185]">
                Date
              </p>

              <p className="mt-1 font-semibold text-[#0B3B2A]">
                {selectedDate}
              </p>

            </div>

            {/* TIME */}

            <div className="rounded-xl bg-[#F5FAF7] p-4">

              <p className="text-xs text-[#7A9185]">
                Reservation Time
              </p>

              <p className="mt-1 font-semibold text-[#0B3B2A]">
                {startTime} - {endTime}
              </p>

            </div>

            {/* CAPSULE */}

            <div className="rounded-xl bg-[#F5FAF7] p-4">

              <p className="text-xs text-[#7A9185]">
                Capsule
              </p>

              <p className="mt-1 font-semibold text-[#0B3B2A]">

                {displayedCapsules.find(
                  (capsule) =>
                    capsule.id ===
                    selectedCapsule
                )?.name ||
                  `Capsule ${selectedCapsule}`}

              </p>

            </div>

            {/* STATUS */}

            <div className="rounded-xl bg-[#F5FAF7] p-4">

              <p className="text-xs text-[#7A9185]">
                Reservation Status
              </p>

              <p className="mt-1 font-semibold text-[#C58A16]">
                Pending
              </p>

            </div>

          </div>

          {/* REQUEST INFO */}

          <div className="mt-5 rounded-xl border border-[#D7E7DE] bg-[#F8FBF9] p-4">

            <p className="text-sm font-medium text-[#0B3B2A]">
              Reservation Request
            </p>

            <p className="mt-1 text-xs leading-5 text-[#6F8E7F]">
              Your reservation will be submitted
              for confirmation. You will receive
              an update once the reservation status
              has been processed.
            </p>

          </div>

          {/* ERROR */}

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* BUTTONS */}

          <div className="mt-6 flex flex-wrap justify-end gap-3">

            {/* BACK */}

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setError("");
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-[#D7E7DE] px-5 py-3 text-sm font-semibold text-[#4E6B5D] transition hover:bg-[#F5FAF7]"
            >
              <ArrowLeft className="h-4 w-4" />

              Back
            </button>

            {/* SUBMIT */}

            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-xl bg-[#0B4A2E] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#09391F]"
            >
              <CheckCircle2 className="h-4 w-4" />

              Submit Reservation
            </button>

          </div>

        </section>

      )}

    </div>
  );
}