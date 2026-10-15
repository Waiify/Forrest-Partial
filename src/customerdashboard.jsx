import { useState } from "react";
import { Plus } from "lucide-react";

import Header from "./components/CustomerHeader.jsx";
import Sidebar from "./components/CustomerSidebar.jsx";

import StatCard from "./components/customer/statusCard.jsx";
import UpcomingReservation from "./components/customer/upcomingReservation.jsx";
import QuickBook from "./components/customer/quickBook.jsx";
import RecentReservations from "./components/customer/recentReservations.jsx";

import MyReservations from "./components/customer/myReservations.jsx";
import ReservationDetails from "./components/customer/reservationDetails.jsx";
import Profile from "./components/customer/profile.jsx";

import BookCapsule from "./components/customer/bookCapsule.jsx";

import {
  STATS,
  UPCOMING,
  CAPSULES,
  RESERVATIONS,
  getUser,
} from "./dashboardData.js";

export default function CustomerDashboard() {
  const [active, setActive] = useState("Dashboard");
  const [query, setQuery] = useState("");
  const [selectedReservation, setSelectedReservation] = useState(null);

  const user = getUser();

  const q = query.trim().toLowerCase();

  const reservations = RESERVATIONS.filter((r) =>
    `${r.date} ${r.capsule} ${r.status}`
      .toLowerCase()
      .includes(q)
  );

  const capsules = CAPSULES.filter((c) =>
    `${c.id} ${c.status}`
      .toLowerCase()
      .includes(q)
  );

  // Sidebar navigation
  const handleNavigate = (section) => {
    setActive(section);

    // Clear selected reservation when leaving My Reservation
    if (section !== "My Reservation") {
      setSelectedReservation(null);
    }
  };

  // View reservation details
  const handleViewReservation = (reservation) => {
    setSelectedReservation(reservation);
    setActive("My Reservation");
  };

  // To cancel reservation
  const handleCancelReservation = (reservation) => {
    console.log("Cancel reservation:", reservation);

    setSelectedReservation(reservation);
    setActive("My Reservation");
  };

  // To reschedule reservation
  const handleRescheduleReservation = (reservation) => {
    console.log("Reschedule reservation:", reservation);

    setSelectedReservation(reservation);
    setActive("My Reservation");
  };

  return (
    <div className="flex h-screen w-full bg-[#F5FAF7] text-[#16352A]">

      {/* =========================
          SIDEBAR HERE HAHA
      ========================== */}
      <Sidebar
        active={active}
        onNavigate={setActive}
      />

      <div className="flex min-w-0 flex-1 flex-col">

        {/* =========================
            HEADER DAYON
        ========================== */}
        <Header
          active={active}
          query={query}
          setQuery={setQuery}
          onNavigate={setActive}
        />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">

          {/* =====================================================
              DASHBOARD NIYA
          ===================================================== */}
          {active === "Dashboard" && (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-[#0B4A2E]">
                    Welcome back, {user?.firstName || "Customer"}!
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setActive("Book a Capsule")}
                  className="inline-flex items-center gap-2 rounded-full bg-[#0B4A2E] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#09391F]"
                >
                  <Plus className="h-4 w-4" />
                  Book a Capsule
                </button>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {STATS.map((s) => (
                  <StatCard
                    key={s.label}
                    {...s}
                    onClick={() => setActive(s.go)}
                  />
                ))}
              </div>

              {/* Upcoming Reservation ug Quick Book */}
              <div className="mt-4 grid gap-4 lg:grid-cols-5">

                {/* Upcoming Reservation */}
                <div className="lg:col-span-2">
                  <UpcomingReservation
                    reservation={UPCOMING}

                    onView={handleViewReservation}

                    onCancel={handleCancelReservation}

                    onViewAll={() => {
                      setSelectedReservation(null);
                      setActive("My Reservation");
                    }}
                  />
                </div>

                {/* Quick Book */}
                <div className="lg:col-span-3">
                  <QuickBook
                    capsules={capsules}

                    onReserve={(capsuleId) => {
                      console.log("Reserve capsule:", capsuleId);

                      setActive("Book a Capsule");
                    }}

                    onViewAll={() => {
                      setActive("Book a Capsule");
                    }}
                  />
                </div>
              </div>

              {/* Recent Reservations */}
              <div className="mt-4">
                <RecentReservations
                  reservations={reservations}

                  onViewAll={() => {
                    setActive("Reservation History");
                  }}

                  onSelect={handleViewReservation}
                />
              </div>
            </>
          )}

          {/* =====================================================
              MY RESERVATION NI
          ===================================================== */}
          {active === "My Reservation" && (
            <>
              {selectedReservation ? (
                <ReservationDetails
                  reservation={selectedReservation}

                  onBack={() => {
                    setSelectedReservation(null);
                  }}

                  onCancel={handleCancelReservation}

                  onReschedule={handleRescheduleReservation}
                />
              ) : (
                <MyReservations
                  reservations={reservations}

                  onView={handleViewReservation}

                  onCancel={handleCancelReservation}

                  onReschedule={handleRescheduleReservation}
                />
              )}
            </>
          )}

          {/* =====================================================
              BOOK A CAPSULE NASAD
          ===================================================== */}
          {active === "Book a Capsule" && (
  <BookCapsule
    capsules={CAPSULES}
    onBack={() => setActive("Dashboard")}
    onSubmit={(reservation) => {
      console.log("Reservation submitted:", reservation);

      // For now, return sa to My Reservation.
      setSelectedReservation(reservation);
      setActive("My Reservation");
    }}
  />
)}

          {/* =====================================================
              RESERVATION HISTORY HERE
          ===================================================== */}
          {active === "Reservation History" && (
            <div className="rounded-2xl bg-white p-8 shadow-sm">

              <h2 className="text-2xl font-bold text-[#0B4A2E]">
                Reservation History
              </h2>

              <p className="mt-2 text-sm text-[#6F8E7F]">
                Your previous reservations will appear here.
              </p>

              <div className="mt-6 rounded-xl bg-[#F5FAF7] p-5">
               
              </div>

            </div>
          )}

          {/* =====================================================
              PROFILE NIMO 
          ===================================================== */}
          {active === "Profile" && (
            <Profile user={user} />
          )}

          {/* =====================================================
              HELP & SUPPORT DRI
          ===================================================== */}
          {active === "Help & Support" && (
            <div className="rounded-2xl bg-white p-8 shadow-sm">

              <h2 className="text-2xl font-bold text-[#0B4A2E]">
                Help & Support
              </h2>

              <p className="mt-2 text-sm text-[#6F8E7F]">
                Need help? Contact the Forrest co-working space team.
              </p>

              <div className="mt-6 rounded-xl bg-[#F5FAF7] p-5">
                <p className="text-sm text-[#6F8E7F]">
                  Help and support information will be added here.
                </p>
              </div>

            </div>
          )}

        </main>
      </div>
    </div>
  );
}