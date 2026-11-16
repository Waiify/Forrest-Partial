import { useLocation, useNavigate } from "react-router-dom";

import StaffHeader from "./components/StaffHeader.jsx";
import StaffSidebar from "./components/StaffSidebar.jsx";
import ActivityLog from "./ActivityLog.jsx";

// Same routes and titles as the other staff pages
const ROUTES = {
  Dashboard: "/StaffDashboard",
  StaffSpacesandServicesManagement: "/StaffSpacesandServicesManagement",
  StaffSpacesandServicesAvailability: "/StaffSpacesandServicesAvailability",
  StaffReservation: "/StaffReservation",
  StaffReservationHistory: "/StaffReservationHistory",
  StaffSystemLogs: "/StaffSystemLogs",
};

const PAGE_TITLES = {
  Dashboard: "Dashboard",
  StaffSpacesandServicesManagement: "Spaces and Services Management",
  StaffSpacesandServicesAvailability: "Spaces and Services Availability",
  StaffReservation: "Reservation",
  StaffReservationHistory: "Reservation History",
  StaffSystemLogs: "System Logs",
};

// The login page saves the user in sessionStorage under "user"
function readUserId() {
  try {
    const user = JSON.parse(sessionStorage.getItem("user") || "null");
    return user?.id || user?._id || "";
  } catch {
    return "";
  }
}

export default function StaffSystemLogs() {
  const navigate = useNavigate();
  const location = useLocation();
  const userId = readUserId();

  const active =
    Object.entries(ROUTES).find(([, path]) => path === location.pathname)?.[0] ?? "StaffSystemLogs";

  function handleNavigate(section) {
    navigate(ROUTES[section] ?? ROUTES.Dashboard);
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900">
      <StaffSidebar active={active} onNavigate={handleNavigate} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <StaffHeader active={PAGE_TITLES[active]} />

        <main className="flex-1 overflow-y-auto p-6 pb-24 md:p-8 md:pb-24">
          {userId ? (
            <ActivityLog userId={userId} />
          ) : (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
              <p className="font-semibold text-[#0B3B2A]">You are not signed in</p>
              <p className="mt-1 text-sm text-[#6F8E7F]">Log in again to view your activity.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}