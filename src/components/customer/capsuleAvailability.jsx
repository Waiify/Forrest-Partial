import { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  BedSingle,
} from "lucide-react";

import { CAPSULES } from "../../dashboardData.js";

export default function CapsuleAvailability({ onBook }) {
  /* =====================================================
     DATE AND CALENDAR STATES
  ====================================================== */

  const today = new Date();

  const [currentMonth, setCurrentMonth] =
    useState(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      )
    );

  const [selectedDate, setSelectedDate] =
    useState(null);


  /* =====================================================
     TIME SLOTS PINAKA-IMPORTANTE to see availability
  ====================================================== */

  const timeSlots = [
    {
      value: "05:00 AM - 09:00 AM",
      label: "5:00 AM - 9:00 AM",
      period: "Morning",
    },
    {
      value: "09:00 AM - 01:00 PM",
      label: "9:00 AM - 1:00 PM",
      period: "Late Morning",
    },
    {
      value: "01:00 PM - 05:00 PM",
      label: "1:00 PM - 5:00 PM",
      period: "Afternoon",
    },
    {
      value: "05:00 PM - 09:00 PM",
      label: "5:00 PM - 9:00 PM",
      period: "Evening",
    },
  ];


  /* =====================================================
     MOCK BOOKED SLOTS PANI FOR NOW
  ====================================================== */

  const bookedSlots = {
    "2026-10-25": {
      A1: ["05:00 AM - 09:00 AM"],
      A2: ["01:00 PM - 05:00 PM"],
    },

    "2026-10-26": {
      A3: [
        "09:00 AM - 01:00 PM",
        "01:00 PM - 05:00 PM",
      ],
    },

    "2026-10-27": {
      A1: ["09:00 AM - 01:00 PM"],
      A4: ["05:00 PM - 09:00 PM"],
    },

    "2026-10-28": {
      A2: ["05:00 AM - 09:00 AM"],
      A5: ["01:00 PM - 05:00 PM"],
    },

    "2026-10-30": {
      A1: ["01:00 PM - 05:00 PM"],
      A3: ["05:00 PM - 09:00 PM"],
    },
  };


  /* =====================================================
     AVAILABLE CAPSULES DAYON
  ====================================================== */

  const availableCapsules = useMemo(() => {
    return CAPSULES.filter(
      (capsule) =>
        capsule.status?.toLowerCase() ===
        "available"
    );
  }, []);



  const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");
    const day = String(
      date.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };


  const isSameDay = (date1, date2) => {
    if (!date1 || !date2) return false;

    return (
      date1.getFullYear() ===
        date2.getFullYear() &&
      date1.getMonth() ===
        date2.getMonth() &&
      date1.getDate() ===
        date2.getDate()
    );
  };


  const isPastDate = (date) => {
    const checkDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );

    const currentDate = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    return checkDate < currentDate;
  };


  /* =====================================================
     CALENDAR DAYS MWEHEHE
  ====================================================== */

  const calendarDays = useMemo(() => {
    const year =
      currentMonth.getFullYear();

    const month =
      currentMonth.getMonth();

    const firstDay = new Date(
      year,
      month,
      1
    );

    const lastDay = new Date(
      year,
      month + 1,
      0
    );

    const daysInMonth =
      lastDay.getDate();

    const startingDay =
      firstDay.getDay();

    const days = [];

    /* Empty spaces before first day para dili maka select ug date nga humana*/

    for (
      let i = 0;
      i < startingDay;
      i++
    ) {
      days.push(null);
    }

    /* Actual days */

    for (
      let day = 1;
      day <= daysInMonth;
      day++
    ) {
      days.push(
        new Date(year, month, day)
      );
    }

    return days;
  }, [currentMonth]);


  /* =====================================================
     MONTH NAVIGATION PARA MAKA USAD KA
  ====================================================== */

  const previousMonth = () => {
    const previous = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() - 1,
      1
    );

    const currentMonthStart =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

    if (previous >= currentMonthStart) {
      setCurrentMonth(previous);
      setSelectedDate(null);
    }
  };


  const nextMonth = () => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        1
      )
    );

    setSelectedDate(null);
  };


  /* =====================================================
     DATE AVAILABILITY STATUS DAYON DRI
  ====================================================== */

  const getDateStatus = (date) => {
    if (!date) return "empty";

    if (isPastDate(date)) {
      return "past";
    }

    const dateKey =
      formatDateKey(date);

    const bookedForDate =
      bookedSlots[dateKey] || {};

    const totalAvailable =
      availableCapsules.length;

    let bookedCount = 0;

    Object.values(
      bookedForDate
    ).forEach((slots) => {
      bookedCount += slots.length;
    });

    if (totalAvailable === 0) {
      return "booked";
    }

    if (
      bookedCount >=
      totalAvailable * timeSlots.length
    ) {
      return "booked";
    }

    if (bookedCount > 0) {
      return "partial";
    }

    return "available";
  };


  /* =====================================================
     SELECTED DATE INFORMATION PARA AWARE KA!
  ====================================================== */

  const selectedDateKey =
    selectedDate
      ? formatDateKey(selectedDate)
      : null;

  const selectedDateBookings =
    selectedDateKey
      ? bookedSlots[selectedDateKey] || {}
      : {};


  /* =====================================================
     CHECK IF TIME SLOT IS BOOKED PARA DI NAKA MO SUGAL
  ====================================================== */

  const isSlotBooked = (
    capsuleId,
    time
  ) => {
    return (
      selectedDateBookings[
        capsuleId
      ]?.includes(time) || false
    );
  };


  /* =====================================================
     BOOK HANDLER 
  ====================================================== */

  const handleBook = (
    capsule,
    time
  ) => {
    if (!selectedDate) return;

    if (
      isSlotBooked(
        capsule.id,
        time.value
      )
    ) {
      return;
    }

    const reservation = {
      capsule,
      capsuleName:
        capsule.name ||
        `Capsule ${capsule.id}`,
      date: selectedDate,
      checkIn:
        time.value.split(" - ")[0],
      checkOut:
        time.value.split(" - ")[1],
      status: "Pending",
    };

    if (onBook) {
      onBook(reservation);
    } else {
      console.log(
        "Reservation:",
        reservation
      );
    }
  };


  /* =====================================================
     MONTH TITLE
  ====================================================== */

  const monthTitle =
    currentMonth.toLocaleDateString(
      "en-US",
      {
        month: "long",
        year: "numeric",
      }
    );


  /* =====================================================
     SELECTED DATE DISPLAY
  ====================================================== */

  const selectedDateLabel =
    selectedDate
      ? selectedDate.toLocaleDateString(
          "en-US",
          {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          }
        )
      : "Select a date";


  /* =====================================================
     RETURN
  ====================================================== */

  return (
    <div className="space-y-5">

      {/* =================================================
          HEADER
      ================================================== */}

      <div>
        

        <p className="mt-1 text-sm text-[#6F8E7F]">
          Check available dates and time slots
          before making a reservation.
        </p>
      </div>


      {/* =================================================
          CALENDAR
      ================================================== */}

      <section className="rounded-2xl bg-white p-6 shadow-sm">

        {/* Calendar Header */}

        <div className="mb-5 flex items-center justify-between">

          <button
            type="button"
            onClick={previousMonth}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D7E7DE] text-[#0B4A2E] transition hover:bg-[#F1F8F4]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>


          <div className="text-center">

            <h3 className="font-semibold text-[#0B3B2A]">
              {monthTitle}
            </h3>

            <p className="mt-0.5 text-xs text-[#7A9185]">
              Select your preferred date
            </p>

          </div>


          <button
            type="button"
            onClick={nextMonth}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#D7E7DE] text-[#0B4A2E] transition hover:bg-[#F1F8F4]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

        </div>


        {/* Weekdays */}

        <div className="grid grid-cols-7 gap-2">

          {[
            "Sun",
            "Mon",
            "Tue",
            "Wed",
            "Thu",
            "Fri",
            "Sat",
          ].map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-semibold text-[#7A9185]"
            >
              {day}
            </div>
          ))}


          {/* Calendar Days */}

          {calendarDays.map(
            (date, index) => {

              if (!date) {
                return (
                  <div
                    key={`empty-${index}`}
                    className="min-h-[72px]"
                  />
                );
              }

              const status =
                getDateStatus(date);

              const selected =
                isSameDay(
                  selectedDate,
                  date
                );

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  disabled={
                    status === "past" ||
                    status === "booked"
                  }
                  onClick={() =>
                    setSelectedDate(date)
                  }
                  className={`relative min-h-[72px] rounded-xl border p-2 text-left transition ${
                    selected
                      ? "border-[#0B4A2E] bg-[#EAF4EE] ring-2 ring-[#0B4A2E]/10"
                      : status === "past"
                      ? "cursor-not-allowed border-[#EEF2EF] bg-[#F8FAF9] opacity-50"
                      : status === "booked"
                      ? "cursor-not-allowed border-red-100 bg-red-50/40"
                      : status === "partial"
                      ? "border-[#E6D8B5] bg-[#FFF9E8] hover:border-[#CDAE63]"
                      : "border-[#DDEAE3] bg-[#F8FBF9] hover:border-[#B8D7C8] hover:bg-[#F1F8F4]"
                  }`}
                >

                  <span
                    className={`text-sm font-semibold ${
                      selected
                        ? "text-[#0B4A2E]"
                        : "text-[#29493B]"
                    }`}
                  >
                    {date.getDate()}
                  </span>


                  {/* Status */}

                  {status ===
                    "available" && (
                    <span className="mt-2 flex items-center gap-1 text-[10px] font-medium text-[#287A4B]">
                      <CheckCircle2 className="h-3 w-3" />
                      Available
                    </span>
                  )}


                  {status ===
                    "partial" && (
                    <span className="mt-2 block text-[10px] font-medium text-[#A47716]">
                      Limited
                    </span>
                  )}


                  {status ===
                    "booked" && (
                    <span className="mt-2 flex items-center gap-1 text-[10px] font-medium text-red-500">
                      <XCircle className="h-3 w-3" />
                      Booked
                    </span>
                  )}


                  {status === "past" && (
                    <span className="mt-2 block text-[10px] text-[#9AAAA2]">
                      Past
                    </span>
                  )}

                </button>
              );
            }
          )}

        </div>


  

        <div className="mt-5 flex flex-wrap gap-4 border-t border-[#EEF3F0] pt-4">

          <div className="flex items-center gap-2 text-xs text-[#6F8E7F]">

            <span className="h-2.5 w-2.5 rounded-full bg-[#287A4B]" />

            Available

          </div>


          <div className="flex items-center gap-2 text-xs text-[#6F8E7F]">

            <span className="h-2.5 w-2.5 rounded-full bg-[#CDAE63]" />

            Limited

          </div>


          <div className="flex items-center gap-2 text-xs text-[#6F8E7F]">

            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />

            Fully Booked

          </div>


          <div className="flex items-center gap-2 text-xs text-[#6F8E7F]">

            <span className="h-2.5 w-2.5 rounded-full bg-[#AEBAB3]" />

            Past

          </div>

        </div>

      </section>


      {/* =================================================
          SELECTED DATE AND TIME SLOTS
      ================================================== */}

      {selectedDate && (

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          {/* Header */}

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

            <div>

              <div className="flex items-center gap-2">

                <CalendarDays className="h-5 w-5 text-[#0B4A2E]" />

                <h3 className="font-semibold text-[#0B3B2A]">
                  Available Time Slots
                </h3>

              </div>

              <p className="mt-1 text-sm text-[#6F8E7F]">
                {selectedDateLabel}
              </p>

            </div>

          </div>


          {/* Capsules */}

          <div className="space-y-4">

            {availableCapsules.length >
            0 ? (

              availableCapsules.map(
                (capsule) => {

                  return (
                    <div
                      key={capsule.id}
                      className="rounded-xl border border-[#DDEAE3] bg-[#F8FBF9] p-4"
                    >

                      {/* Capsule Header */}

                      <div className="flex flex-wrap items-center justify-between gap-3">

                        <div className="flex items-center gap-3">

                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E5F2EB]">

                            <BedSingle className="h-5 w-5 text-[#0B4A2E]" />

                          </div>

                          <div>

                            <h4 className="font-semibold text-[#0B3B2A]">
                              {capsule.name ||
                                `Capsule ${capsule.id}`}
                            </h4>

                            <p className="text-xs text-[#7A9185]">
                              {capsule.id}
                            </p>

                          </div>

                        </div>

                        <span className="rounded-full bg-[#EAF4EE] px-3 py-1 text-xs font-semibold text-[#287A4B]">
                          Available
                        </span>

                      </div>


                      {/* Time Slots */}

                      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

                        {timeSlots.map(
                          (time) => {

                            const booked =
                              isSlotBooked(
                                capsule.id,
                                time.value
                              );

                            return (
                              <div
                                key={
                                  time.value
                                }
                                className={`rounded-xl border p-3 ${
                                  booked
                                    ? "border-red-100 bg-red-50"
                                    : "border-[#D7E7DE] bg-white"
                                }`}
                              >

                                <div className="flex items-start gap-2">

                                  <Clock
                                    className={`mt-0.5 h-4 w-4 ${
                                      booked
                                        ? "text-red-400"
                                        : "text-[#0B4A2E]"
                                    }`}
                                  />

                                  <div className="min-w-0 flex-1">

                                    <p className="text-xs font-semibold text-[#0B3B2A]">
                                      {time.period}
                                    </p>

                                    <p className="mt-0.5 text-[11px] text-[#6F8E7F]">
                                      {time.label}
                                    </p>

                                  </div>

                                </div>


                                {booked ? (

                                  <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-red-500">

                                    <XCircle className="h-3 w-3" />

                                    Booked

                                  </div>

                                ) : (

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleBook(
                                        capsule,
                                        time
                                      )
                                    }
                                    className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#0B4A2E] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#09391F]"
                                  >

                                    Book

                                  </button>

                                )}

                              </div>
                            );
                          }
                        )}

                      </div>

                    </div>
                  );
                }
              )

            ) : (

              <div className="rounded-xl border border-dashed border-[#D7E7DE] bg-[#F8FBF9] px-6 py-12 text-center">

                <BedSingle className="mx-auto h-10 w-10 text-[#9AAAA2]" />

                <p className="mt-3 font-semibold text-[#0B3B2A]">
                  No capsules available
                </p>

                <p className="mt-1 text-sm text-[#7A9185]">
                  Please check again later.
                </p>

              </div>

            )}

          </div>

        </section>
      )}


      {/* =================================================
          NO DATE SELECTED
      ================================================== */}

      {!selectedDate && (

        <div className="rounded-2xl border border-dashed border-[#D7E7DE] bg-white px-6 py-12 text-center shadow-sm">

          <CalendarDays className="mx-auto h-10 w-10 text-[#9AAAA2]" />

          <p className="mt-3 font-semibold text-[#0B3B2A]">
            Select a date to view availability
          </p>

          <p className="mt-1 text-sm text-[#7A9185]">
            Choose a date from the calendar above
            to see available capsules and time slots.
          </p>

        </div>

      )}

    </div>
  );
}