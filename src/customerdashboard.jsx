import { useState } from "react";
import {
  Plus,
  CalendarDays,
  Clock,
  BedSingle,
} from "lucide-react";

import Header from "./components/CustomerHeader.jsx";
import Sidebar from "./components/CustomerSidebar.jsx";

import StatCard from "./components/customer/statusCard.jsx";
import UpcomingReservation from "./components/customer/upcomingReservation.jsx";
import QuickBook from "./components/customer/quickBook.jsx";
import AvailableSpaces from "./components/customer/availableSpaces.jsx";

import ReservationHistory from "./components/customer/reservationHistory.jsx";
import MyReservations from "./components/customer/myReservations.jsx";
import ReservationDetails from "./components/customer/reservationDetails.jsx";
import Profile from "./components/customer/profile.jsx";
import Notification from "./components/customer/notification.jsx";

import BookCapsule from "./components/customer/bookCapsule.jsx";
import CapsuleAvailability from "./components/customer/capsuleAvailability.jsx";
import StatusBadge from "./components/customer/statusBadge.jsx";

import {
  CAPSULES,
  RESERVATIONS,
  getUser,
} from "./dashboardData.js";

export default function CustomerDashboard() {
  /* =====================================================
      BASIC STATES
  ====================================================== */

  const [active, setActive] = useState("Dashboard");

  const [query, setQuery] = useState("");

  const [selectedReservation, setSelectedReservation] =
    useState(null);

  const [notifications, setNotifications] =
  useState([]);
  
 const [bookingSelection, setBookingSelection] = useState(null);
  const [detailSource, setDetailSource] =
    useState("My Reservation");

  /*
    Keep reservations in state so newly submitted
    reservations immediately appear in the dashboard.
  */
  const [reservationList, setReservationList] =
    useState(RESERVATIONS);

  const [reservationActivities, setReservationActivities] =
  useState({});

  const [isRescheduling, setIsRescheduling] =
  useState(false);

const [rescheduleDate, setRescheduleDate] =
  useState("");

const [rescheduleStartTime, setRescheduleStartTime] =
  useState("");

const [rescheduleEndTime, setRescheduleEndTime] =
  useState("");

  const user = getUser();

  const q = query.trim().toLowerCase();


  /* =====================================================
      SEARCH
  ====================================================== */

  const filteredReservations = reservationList.filter((r) =>
    `${r.date} ${r.capsule} ${r.status}`
      .toLowerCase()
      .includes(q)
  );


  /* =====================================================
      CURRENT RESERVATIONS

      These belong in "My Reservation"
  ====================================================== */

  const reservations = filteredReservations.filter((r) =>
    ["Pending", "Confirmed", "Active"].includes(r.status)
  );


  /* =====================================================
      RESERVATION HISTORY

      These belong in "History"
  ====================================================== */

  const historyReservations = filteredReservations.filter((r) =>
    ["Completed", "Cancelled", "Rejected"].includes(r.status)
  );


  /* =====================================================
      CAPSULE SEARCH
  ====================================================== */

  const capsules = CAPSULES.filter((c) =>
    `${c.id} ${c.status}`
      .toLowerCase()
      .includes(q)
  );


  /* =====================================================
      DASHBOARD COUNTS
  ====================================================== */

  const upcomingCount = reservationList.filter((r) =>
    ["Pending", "Confirmed"].includes(r.status)
  ).length;

  const activeCount = reservationList.filter(
    (r) => r.status === "Active"
  ).length;

  const completedCount = reservationList.filter(
    (r) => r.status === "Completed"
  ).length;

  const availableCapsuleCount = CAPSULES.filter(
    (c) => c.status === "Available"
  ).length;


  /* =====================================================
      UPCOMING RESERVATION

      Get the first Pending or Confirmed reservation
      instead of always using the static A3.
  ====================================================== */
const upcomingReservation = (() => {
  const reservation = reservationList.find(
    (r) =>
      r.status === "Pending" ||
      r.status === "Confirmed"
  );

  if (!reservation) {
    return null;
  }

  const capsule = CAPSULES.find(
    (c) => c.id === reservation.capsule
  );

  const date = new Date(`${reservation.date}T00:00:00`);

  const day = date.toLocaleDateString("en-US", {
    weekday: "long",
  });

  return {
    ...reservation,
    day,
    image: capsule?.image || null,
  };
})();


  /* =====================================================
      DASHBOARD STAT CARDS
  ====================================================== */

  const dashboardStats = [
    {
      label: "Upcoming Reservations",
      value: upcomingCount,
      note:
        upcomingCount > 0
          ? "Reservations waiting or confirmed"
          : "No upcoming reservations",
      icon: CalendarDays,
      tint: "bg-[#CFE9DC]",
      go: "My Reservation",
    },

    {
      label: "Active Reservation",
      value: activeCount,
      note:
        activeCount > 0
          ? "Currently active booking"
          : "No active bookings",
      icon: BedSingle,
      tint: "bg-[#E4D3F7]",
      go: "My Reservation",
    },

    {
      label: "Completed Visits",
      value: completedCount,
      note: "Total completed visits",
      icon: CalendarDays,
      tint: "bg-[#CFE9DC]",
      go: "Reservation History",
    },

    {
      label: "Available Capsules",
      value: availableCapsuleCount,
      note: "Ready for booking",
      icon: BedSingle,
      tint: "bg-[#CFE9DC]",
      go: "Capsule Availability",
    },
  ];


  /* =====================================================
      NAVIGATION
  ====================================================== */

  const handleNavigate = (section) => {
  const normalizedSection =
    section === "History"
      ? "Reservation History"
      : section;

  setActive(normalizedSection);

  if (
    normalizedSection !== "My Reservation" &&
    normalizedSection !== "Reservation History"
  ) {
    setSelectedReservation(null);
  }
};


  /* =====================================================
      VIEW CURRENT RESERVATION
  ====================================================== */

  const handleViewReservation = (reservation) => {
    setSelectedReservation(reservation);

    setDetailSource("My Reservation");

    setActive("My Reservation");
  };

  const handleViewUpcomingReservation = () => {
  setSelectedReservation(null);
  setActive("My Reservation");
};


  /* =====================================================
      VIEW HISTORY RESERVATION
  ====================================================== */

  const handleViewHistoryReservation = (reservation) => {
    setSelectedReservation(reservation);

    setDetailSource("Reservation History");

    setActive("Reservation History");
  };


  /* =====================================================
    CANCEL RESERVATION
====================================================== */

const handleCancelReservation = (reservation) => {
  console.log("Cancel reservation:", reservation);

  const updatedReservation = {
    ...reservation,
    status: "Cancelled",
  };

  /* Update reservation list */
  setReservationList((prev) =>
    prev.map((item) =>
      item.id === reservation.id
        ? updatedReservation
        : item
    )
  );

  /* Record activity */
  const activity = {
    action: "Reservation Cancelled",
    timestamp: new Date().toLocaleString(),
  };

  setReservationActivities((prev) => ({
    ...prev,
    [reservation.id]: [
      ...(prev[reservation.id] || []),
      activity,
    ],
  }));

  /* Update selected reservation */
  setSelectedReservation(updatedReservation);

  setDetailSource(
    active === "Reservation History"
      ? "Reservation History"
      : "My Reservation"
  );
};

/* =====================================================
    RESCHEDULE RESERVATION
====================================================== */

const handleRescheduleReservation = (reservation) => {
  console.log(
    "Reschedule reservation:",
    reservation
  );

  setSelectedReservation(reservation);

  setRescheduleDate(
    reservation.date || ""
  );

  setRescheduleStartTime(
    reservation.checkIn || ""
  );

  setRescheduleEndTime(
    reservation.checkOut || ""
  );

  setIsRescheduling(true);

  setDetailSource("My Reservation");

  setActive("My Reservation");
};


/* =====================================================
    SAVE RESCHEDULE
====================================================== */

const handleSaveReschedule = () => {
  if (!selectedReservation) return;

  const oldDate =
    selectedReservation.date;

  const oldStartTime =
    selectedReservation.checkIn;

  const oldEndTime =
    selectedReservation.checkOut;

  const updatedReservation = {
    ...selectedReservation,

    date: rescheduleDate,
    checkIn: rescheduleStartTime,
    checkOut: rescheduleEndTime,
  };

  /* Update reservation list */
  setReservationList((prev) =>
    prev.map((item) =>
      item.id === selectedReservation.id
        ? updatedReservation
        : item
    )
  );

  /* Record activity */
  const activity = {
    action: "Reservation Rescheduled",

    details:
      `Schedule changed from ${oldDate}, ` +
      `${oldStartTime} - ${oldEndTime} ` +
      `to ${rescheduleDate}, ` +
      `${rescheduleStartTime} - ${rescheduleEndTime}.`,

    timestamp:
      new Date().toLocaleString(),
  };

  setReservationActivities((prev) => ({
    ...prev,

    [selectedReservation.id]: [
      ...(prev[selectedReservation.id] || []),
      activity,
    ],
  }));

  /* Update selected reservation */
  setSelectedReservation(
    updatedReservation
  );

  /* Exit reschedule mode */
  setIsRescheduling(false);

  setRescheduleDate("");
  setRescheduleStartTime("");
  setRescheduleEndTime("");
};

  /* =====================================================
      RETURN
  ====================================================== */

  return (
    <div className="flex h-screen w-full bg-[#F5FAF7] text-[#16352A]">

      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <Sidebar
        active={active}
        onNavigate={handleNavigate}
      />


      <div className="flex min-w-0 flex-1 flex-col">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <Header
          active={active}
          query={query}
          setQuery={setQuery}
          onNavigate={handleNavigate}
          notifications={notifications}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">


          {/* =====================================================
              DASHBOARD
          ====================================================== */}

          {active === "Dashboard" && (
            <>
              {/* Welcome Header */}
              <div className="flex flex-wrap items-start justify-between gap-3">

                <div>
                  <h2 className="text-2xl font-bold text-[#0B4A2E]">
                    Welcome back,{" "}
                    {user?.firstName || "Customer"}!
                  </h2>

                  <p className="mt-1 text-sm text-[#6F8E7F]">
                    Manage your reservations and workspace visits.
                  </p>
                </div>


                {/* Book Capsule */}
                <button
                  type="button"
                  onClick={() =>
                    setActive("Book a Capsule")
                  }
                  className="inline-flex items-center gap-2 rounded-full bg-[#0B4A2E] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#09391F]"
                >
                  <Plus className="h-4 w-4" />

                  Book a Capsule
                </button>

              </div>


              {/* =================================================
                  STAT CARDS
              ================================================== */}

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                {dashboardStats.map((s) => (
                  <StatCard
                    key={s.label}
                    {...s}
                    onClick={() =>
                      setActive(s.go)
                    }
                  />
                ))}

              </div>


              {/* =================================================
                  UPCOMING + QUICK BOOK
              ================================================== */}

              <div className="mt-4 grid gap-4 lg:grid-cols-5">


                {/* =================================================
                    UPCOMING RESERVATION
                ================================================== */}

                <div className="lg:col-span-2">

                  {upcomingReservation ? (
                    <UpcomingReservation
                      reservation={upcomingReservation}

                      onView={handleViewUpcomingReservation}

                      onCancel={
                        handleCancelReservation
                      }

                      onViewAll={() => {
                        setSelectedReservation(null);

                        setActive(
                          "My Reservation"
                        );
                      }}
                    />
                  ) : (
                    <div className="rounded-2xl bg-white p-6 shadow-sm">

                      <div className="flex items-center gap-2">

                        <CalendarDays className="h-5 w-5 text-[#0B4A2E]" />

                        <h3 className="font-semibold text-[#0B3B2A]">
                          Upcoming Reservation
                        </h3>

                      </div>

                      <div className="py-10 text-center">

                        <CalendarDays className="mx-auto h-10 w-10 text-[#9AAAA2]" />

                        <p className="mt-3 font-semibold text-[#0B3B2A]">
                          No upcoming reservations
                        </p>

                        <p className="mt-1 text-sm text-[#6F8E7F]">
                          Book a capsule to get started.
                        </p>

                      </div>

                    </div>
                  )}

                </div>


                {/* =================================================
                    QUICK BOOK
                ================================================== */}

                <div className="lg:col-span-3">

                  <QuickBook
                    capsules={capsules}

                    onReserve={(capsuleId) => {
                      console.log(
                        "Reserve capsule:",
                        capsuleId
                      );

                      setActive("Book a Capsule");
                    }}

                    onViewAll={() => {
                      /*
                        For now this opens booking.
                        Later we can change this to
                        Capsule Availability.
                      */
                      setActive("Book a Capsule");
                    }}
                  />

                </div>
              </div> 
               {/* =================================================
                  AVAILABLE SPACES
              ================================================== */}

              <div className="mt-6">
                <AvailableSpaces
                  onViewAvailability={() => {
                    setActive("Capsule Availability");
                  }}
                />
              </div>

            </>
          )}


  {/* =====================================================
    MY RESERVATION
====================================================== */}

{active === "My Reservation" && (
  <>
    {selectedReservation &&
    detailSource === "My Reservation" ? (

      <>
        {isRescheduling ? (

          <div className="rounded-2xl bg-white p-6 shadow-sm">

            {/* HEADER */}
            <div className="border-b border-[#E4EFE9] pb-4">

              <h2 className="text-xl font-bold text-[#0B3B2A]">
                Reschedule Reservation
              </h2>

              <p className="mt-1 text-sm text-[#6F8E7F]">
                Update your reservation date and time.
              </p>

            </div>

            {/* FORM */}
            <div className="mt-6 grid gap-5 sm:grid-cols-3">

              {/* DATE */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#0B3B2A]">
                  Date
                </label>

                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) =>
                    setRescheduleDate(
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-[#CFE3D9] px-3 py-2.5 text-sm outline-none focus:border-[#0B4A2E]"
                />
              </div>

              {/* CHECK-IN */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#0B3B2A]">
                  Check-in
                </label>

                <input
                  type="time"
                  value={rescheduleStartTime}
                  onChange={(e) =>
                    setRescheduleStartTime(
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-[#CFE3D9] px-3 py-2.5 text-sm outline-none focus:border-[#0B4A2E]"
                />
              </div>

              {/* CHECK-OUT */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#0B3B2A]">
                  Check-out
                </label>

                <input
                  type="time"
                  value={rescheduleEndTime}
                  onChange={(e) =>
                    setRescheduleEndTime(
                      e.target.value
                    )
                  }
                  className="w-full rounded-lg border border-[#CFE3D9] px-3 py-2.5 text-sm outline-none focus:border-[#0B4A2E]"
                />
              </div>

            </div>

            {/* ACTIONS */}
            <div className="mt-6 flex gap-3 border-t border-[#E4EFE9] pt-5">

              <button
                type="button"
                onClick={() =>
                  setIsRescheduling(false)
                }
                className="rounded-lg border border-[#CFE3D9] px-4 py-2.5 text-sm font-medium text-[#0B4A2E] hover:bg-[#EEF7F2]"
              >
                Back
              </button>

              <button
                type="button"
                onClick={
                  handleSaveReschedule
                }
                className="rounded-lg bg-[#0B4A2E] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#09391F]"
              >
                Save Changes
              </button>

            </div>

          </div>

        ) : (

          <ReservationDetails
            reservation={selectedReservation}

            activities={
              reservationActivities[
                selectedReservation?.id
              ] || []
            }

            onBack={() => {
              setSelectedReservation(null);
              setActive("My Reservation");
            }}

            onCancel={
              handleCancelReservation
            }

            onReschedule={
              handleRescheduleReservation
            }
          />
        )}
      </>

    ) : (

  
                <MyReservations
                    reservations={reservations}
                    onView={handleViewReservation}
                    onCancel={handleCancelReservation}
                    onReschedule={handleRescheduleReservation}
                    onViewHistory={() => {
                      setSelectedReservation(null);
                      setDetailSource("Reservation History");
                      setActive("Reservation History");
                    }}
                  />

              )}
            </>
          )}

          {/* =====================================================
            CAPSULE AVAILABILITY
          ===================================================== */}
          {active === "Capsule Availability" && (
  <CapsuleAvailability
    onBook={(selection) => {
      setBookingSelection(selection);
      setActive("Book a Capsule");
    }}
  />
)}


         {/* =====================================================
    BOOK A CAPSULE
====================================================== */}

{active === "Book a Capsule" && (
  <BookCapsule

    capsules={CAPSULES}
    bookingSelection={bookingSelection}

    onBack={() =>
      setActive("Dashboard")
    }

    onSubmit={(reservation) => {

      console.log(
        "Reservation submitted:",
        reservation
      );

      /*
        Create a new reservation ID.
        The reservation returned from
        BookCapsule should already contain
        status: "Pending".
      */

      const newReservation = {
        ...reservation,
        id: Date.now(),
        status:
          reservation.status ||
          "Pending",
      };

const notification = {
  id: Date.now(),
  title: "Reservation Request Submitted",
  message: `Your reservation request for Capsule ${newReservation.capsule} has been submitted. Please wait for the admin to review and confirm your reservation.`,
  status: "Pending",
  type: "pending",
  timestamp: new Date().toLocaleString(),
  read: false,
};

setNotifications((prev) => [
  notification,
  ...prev,
]);


      /*
        Add newest reservation
        to the beginning of the list.
      */

      setReservationList((prev) => [
        newReservation,
        ...prev,
      ]);


      /*
        Record reservation activity.
      */

      const activity = {
        action: "Reservation Submitted",
        details: `Reservation for Capsule ${newReservation.capsule} was submitted.`,
        timestamp: new Date().toLocaleString(),
      };

      setReservationActivities((prev) => ({
        ...prev,
        [newReservation.id]: [
          ...(prev[newReservation.id] || []),
          activity,
        ],
      }));


      /*
        Open the new reservation
        immediately.
      */

      setSelectedReservation(
        newReservation
      );

      setDetailSource(
        "My Reservation"
      );

      setActive(
        "My Reservation"
      );
    }}
  />
)}


         {/* =====================================================
    RESERVATION HISTORY
===================================================== */}

{active === "Reservation History" && (
  <>
    {selectedReservation &&
    detailSource === "Reservation History" ? (
      /* =================================================
          HISTORY DETAILS
      ================================================== */

      <ReservationDetails
        reservation={selectedReservation}
        onBack={() => {
          setSelectedReservation(null);
          setActive("Reservation History");
        }}
        onCancel={handleCancelReservation}
        onReschedule={handleRescheduleReservation}
        
      />
    ) : (
      /* =================================================
          HISTORY LIST
      ================================================== */

      <ReservationHistory
        reservations={historyReservations}
        onView={(reservation) => {
          setSelectedReservation(reservation);
          setDetailSource("Reservation History");
        }}
      />
      
    )}
  </>
)}

          {/* =====================================================
    NOTIFICATION
====================================================== */}

{active === "Notification" && (
  <Notification
    notifications={notifications}
  />
)}


{/* =====================================================
    PROFILE
====================================================== */}

{active === "Profile" && (
  <Profile user={user} />
)}


          {/* =====================================================
              HELP & SUPPORT
          ====================================================== */}

          {active === "Help & Support" && (
            <div className="rounded-2xl bg-white p-8 shadow-sm">

              <h2 className="text-2xl font-bold text-[#0B4A2E]">
                Help & Support
              </h2>

              <p className="mt-2 text-sm text-[#6F8E7F]">
                Need help? Contact the Forrest
                co-working space team.
              </p>

              <div className="mt-6 rounded-xl bg-[#F5FAF7] p-5">

                <p className="text-sm text-[#6F8E7F]">
                  Help and support information
                  will be added here.
                </p>

              </div>

            </div>
          )}

        </main>
      </div>
    </div>
  );
}