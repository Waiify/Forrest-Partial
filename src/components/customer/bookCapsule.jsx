
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  BedSingle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

/* =====================================================
   DATE HELPERS
===================================================== */

const getLocalDateString = (value) => {
  if (!value) return "";

  // Keep YYYY-MM-DD values as they are.
  // This prevents timezone-related date shifting.
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return value;
  }

  const date =
    value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

const addDaysToDate = (dateString, days) => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  date.setDate(date.getDate() + days);

  return getLocalDateString(date);
};

/* =====================================================
   TIME HELPERS
===================================================== */

const normalizeTime = (value) => {
  if (!value) return "";

  const time = value.trim();

  // Already in 24-hour format.
  if (/^\d{1,2}:\d{2}$/.test(time)) {
    const [hour, minute] = time.split(":");

    return `${hour.padStart(2, "0")}:${minute}`;
  }

  // Convert 12-hour format to 24-hour format.
  const match = time.match(
    /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
  );

  if (!match) return "";

  let hour = Number(match[1]);
  const minute = match[2];
  const period = match[3].toUpperCase();

  if (period === "AM" && hour === 12) hour = 0;
  if (period === "PM" && hour !== 12) hour += 12;

  return `${String(hour).padStart(2, "0")}:${minute}`;
};

const getMinutesFromTime = (time) => {
  if (!time) return null;

  const [hours, minutes] = time.split(":").map(Number);

  return hours * 60 + minutes;
};

const calculateCheckOut = (startTime, duration) => {
  if (!startTime || !duration) {
    return {
      time: "",
      dayOffset: 0,
    };
  }

  const startMinutes = getMinutesFromTime(startTime);
  const totalMinutes =
    startMinutes + Number(duration) * 60;

  const dayOffset = Math.floor(totalMinutes / 1440);
  const endMinutes = totalMinutes % 1440;

  const hours = Math.floor(endMinutes / 60);
  const minutes = endMinutes % 60;

  return {
    time: `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}`,
    dayOffset,
  };
};

const formatTime = (time) => {
  if (!time) return "";

  const [hours, minutes] = time.split(":").map(Number);

  const period = hours >= 12 ? "PM" : "AM";
  const formattedHour = hours % 12 || 12;

  return `${String(formattedHour).padStart(
    2,
    "0"
  )}:${String(minutes).padStart(2, "0")} ${period}`;
};

const getDurationFromTimeRange = (start, end) => {
  if (!start || !end) return "";

  const startMinutes = getMinutesFromTime(start);
  let endMinutes = getMinutesFromTime(end);

  if (startMinutes === null || endMinutes === null) {
    return "";
  }

  if (endMinutes <= startMinutes) {
    endMinutes += 1440;
  }

  const duration = (endMinutes - startMinutes) / 60;

  return duration > 0 && duration <= 24
    ? String(duration)
    : "";
};

/* =====================================================
   MAIN COMPONENT
===================================================== */

export default function BookCapsule({
  capsules = [],
  bookingSelection = null,
  onBack,
  onSubmit,
}) {
  const [selectedDate, setSelectedDate] = useState(
    () => getLocalDateString(bookingSelection?.date)
  );

  const [startTime, setStartTime] = useState(() => {
    const selectedTime =
      bookingSelection?.checkIn ||
      bookingSelection?.time?.split(" - ")[0] ||
      "";

    return normalizeTime(selectedTime);
  });

  const [durationHours, setDurationHours] = useState(() => {
    if (bookingSelection?.durationHours) {
      return String(bookingSelection.durationHours);
    }

    const start = normalizeTime(
      bookingSelection?.checkIn ||
      bookingSelection?.time?.split(" - ")[0]
    );

    const end = normalizeTime(
      bookingSelection?.checkOut ||
      bookingSelection?.time?.split(" - ")[1]
    );

    return getDurationFromTimeRange(start, end);
  });

  const [selectedCapsule, setSelectedCapsule] = useState(
    bookingSelection?.capsule?.id || ""
  );

  const [step, setStep] = useState(1);
  const [error, setError] = useState("");

  /* =====================================================
     PREFILL FROM CAPSULE AVAILABILITY
  ====================================================== */

  useEffect(() => {
    if (!bookingSelection) return;

    if (bookingSelection.date) {
      setSelectedDate(
        getLocalDateString(bookingSelection.date)
      );
    }

    const selectedStart =
      bookingSelection.checkIn ||
      bookingSelection.time?.split(" - ")[0] ||
      "";

    const selectedEnd =
      bookingSelection.checkOut ||
      bookingSelection.time?.split(" - ")[1] ||
      "";

    const normalizedStart = normalizeTime(selectedStart);
    const normalizedEnd = normalizeTime(selectedEnd);

    if (normalizedStart) {
      setStartTime(normalizedStart);
    }

    if (bookingSelection.durationHours) {
      setDurationHours(
        String(bookingSelection.durationHours)
      );
    } else if (normalizedStart && normalizedEnd) {
      setDurationHours(
        getDurationFromTimeRange(
          normalizedStart,
          normalizedEnd
        )
      );
    }

    if (bookingSelection.capsule?.id) {
      setSelectedCapsule(bookingSelection.capsule.id);
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
        capsule.status?.toLowerCase() === "available"
    );
  }, [capsules]);

  /* =====================================================
     ALL CAPSULES
  ====================================================== */

  const displayedCapsules = useMemo(() => {
    return capsules;
  }, [capsules]);

  /* =====================================================
     CALCULATED CHECK-OUT
  ====================================================== */

  const checkOutInfo = useMemo(() => {
    return calculateCheckOut(startTime, durationHours);
  }, [startTime, durationHours]);

  const endTime = checkOutInfo.time;

  const endDate = selectedDate
    ? addDaysToDate(
        selectedDate,
        checkOutInfo.dayOffset
      )
    : "";

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
          container: "bg-white text-[#287A4B]",
          iconClass: "text-[#287A4B]",
          badge: "bg-[#EAF4EE] text-[#287A4B]",
        };

      case "reserved":
        return {
          label: "Reserved",
          icon: Clock3,
          container: "bg-white text-[#2563EB]",
          iconClass: "text-[#2563EB]",
          badge: "bg-blue-50 text-blue-600",
        };

      case "occupied":
        return {
          label: "Occupied",
          icon: Clock3,
          container: "bg-white text-[#DC2626]",
          iconClass: "text-[#DC2626]",
          badge: "bg-red-50 text-red-600",
        };

      case "maintenance":
      case "under maintenance":
      case "cleaning":
        return {
          label: "Under Maintenance",
          icon: Clock3,
          container: "bg-white text-[#C58A16]",
          iconClass: "text-[#C58A16]",
          badge: "bg-yellow-50 text-yellow-700",
        };

      default:
        return {
          label: capsule.status || "Unavailable",
          icon: Clock3,
          container: "bg-white text-[#6F8E7F]",
          iconClass: "text-[#6F8E7F]",
          badge: "bg-gray-100 text-gray-600",
        };
    }
  };

  /* =====================================================
     TODAY
  ====================================================== */

  const today = getLocalDateString(new Date());

  /* =====================================================
     VALIDATION
  ====================================================== */

  const validateBooking = () => {
    if (!selectedDate) {
      setError("Please select a date.");
      return false;
    }

    if (selectedDate < today) {
      setError("Please select a valid future date.");
      return false;
    }

    if (!startTime) {
      setError("Please select a check-in time.");
      return false;
    }

    if (!durationHours) {
      setError("Please enter your reservation duration.");
      return false;
    }

    const duration = Number(durationHours);

    if (
      !Number.isFinite(duration) ||
      duration < 0.5 ||
      duration > 24 ||
      duration % 0.5 !== 0
    ) {
      setError(
        "Duration must be between 0.5 and 24 hours, in 0.5-hour increments."
      );
      return false;
    }

    if (!selectedCapsule) {
      setError("Please select an available capsule.");
      return false;
    }

    const selected = displayedCapsules.find(
      (capsule) => capsule.id === selectedCapsule
    );

    if (selected?.status?.toLowerCase() !== "available") {
      setError(
        "Please select a capsule that is currently available."
      );
      return false;
    }

    if (!endTime) {
      setError("Unable to calculate check-out time.");
      return false;
    }

    // Prevent selecting a check-in time that has already passed today.
    if (selectedDate === today) {
      const currentTime = new Date();
      const currentMinutes =
        currentTime.getHours() * 60 +
        currentTime.getMinutes();

      const selectedMinutes =
        getMinutesFromTime(startTime);

      if (selectedMinutes <= currentMinutes) {
        setError(
          "Please select a check-in time later than the current time."
        );
        return false;
      }
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

    const selected = availableCapsules.find(
      (capsule) => capsule.id === selectedCapsule
    );

    const reservation = {
      date: selectedDate,
      checkIn: startTime,
      checkOut: endTime,
      endDate,
      durationHours: Number(durationHours),
      capsule: selectedCapsule,
      capsuleName:
        selected?.name || `Capsule ${selectedCapsule}`,
      status: "Pending",
    };

    onSubmit?.(reservation);
  };

  /* =====================================================
     RETURN
  ====================================================== */

  return (
    <div className="space-y-5">
      {/* HEADER */}

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

      {/* PROGRESS */}

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
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

      {/* STEP 1 */}

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
                  setSelectedDate(e.target.value);
                  setError("");
                }}
                className="w-full rounded-xl border border-[#D7E7DE] bg-[#F8FBF9] px-4 py-3 text-sm text-[#16352A] outline-none transition focus:border-[#0B4A2E] focus:ring-2 focus:ring-[#0B4A2E]/10"
              />
            </section>

            {/* TIME AND DURATION */}

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
                    Choose your check-in time and preferred duration.
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
                      setStartTime(e.target.value);
                      setError("");
                    }}
                    className="w-full rounded-xl border border-[#D7E7DE] bg-[#F8FBF9] px-3 py-3 text-sm text-[#16352A] outline-none focus:border-[#0B4A2E]"
                  />
                </div>

                {/* DURATION */}

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[#4E6B5D]">
                    Duration (hours)
                  </label>

                  <input
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={durationHours}
                    onChange={(e) => {
                      setDurationHours(e.target.value);
                      setError("");
                    }}
                  
                    className="w-full rounded-xl border border-[#D7E7DE] bg-[#F8FBF9] px-3 py-3 text-sm text-[#16352A] outline-none focus:border-[#0B4A2E]"
                  />
                </div>
              </div>

              {/* AUTOMATIC CHECK-OUT */}

              <div className="mt-4 rounded-xl border border-[#D7E7DE] bg-[#F1F8F4] p-3">
                <p className="text-xs font-medium text-[#6F8E7F]">
                  Calculated Check-out
                </p>

                <p className="mt-1 text-sm font-semibold text-[#0B4A2E]">
                  {startTime && durationHours && endTime
                    ? `${formatTime(endTime)}${
                        checkOutInfo.dayOffset > 0
                          ? ` (${checkOutInfo.dayOffset} day${
                              checkOutInfo.dayOffset > 1
                                ? "s"
                                : ""
                            } later)`
                          : ""
                      }`
                    : "Select check-in and duration"}
                </p>
              </div>
            </section>
          </div>

          {/* CAPSULE STATUS */}

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
                {displayedCapsules.map((capsule) => {
                  const status = getCapsuleStatus(capsule);
                  const StatusIcon = status.icon;

                  const isAvailable =
                    capsule.status?.toLowerCase() === "available";

                  const isSelected =
                    selectedCapsule === capsule.id;

                  return (
                    <button
                      key={capsule.id}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => {
                        if (!isAvailable) return;

                        setSelectedCapsule(capsule.id);
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
                            src={capsule.image}
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
                            : status.label === "Reserved"
                              ? "Already reserved for this schedule"
                              : status.label === "Occupied"
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
                })}
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

      {/* STEP 2 */}

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

            {/* CHECK-IN */}

            <div className="rounded-xl bg-[#F5FAF7] p-4">
              <p className="text-xs text-[#7A9185]">
                Check-in
              </p>

              <p className="mt-1 font-semibold text-[#0B3B2A]">
                {formatTime(startTime)}
              </p>
            </div>

            {/* DURATION */}

            <div className="rounded-xl bg-[#F5FAF7] p-4">
              <p className="text-xs text-[#7A9185]">
                Duration
              </p>

              <p className="mt-1 font-semibold text-[#0B3B2A]">
                {durationHours}{" "}
                {Number(durationHours) === 1 ? "hour" : "hours"}
              </p>
            </div>

            {/* CHECK-OUT */}

            <div className="rounded-xl bg-[#F5FAF7] p-4">
              <p className="text-xs text-[#7A9185]">
                Calculated Check-out
              </p>

              <p className="mt-1 font-semibold text-[#0B3B2A]">
                {formatTime(endTime)}
                {checkOutInfo.dayOffset > 0 &&
                  ` (${endDate})`}
              </p>
            </div>

            {/* CAPSULE */}

            <div className="rounded-xl bg-[#F5FAF7] p-4">
              <p className="text-xs text-[#7A9185]">
                Capsule
              </p>

              <p className="mt-1 font-semibold text-[#0B3B2A]">
                {displayedCapsules.find(
                  (capsule) => capsule.id === selectedCapsule
                )?.name || `Capsule ${selectedCapsule}`}
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
              Your reservation will be submitted for confirmation.
              You will receive an update once the reservation status
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
