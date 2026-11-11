import { useNavigate } from "react-router-dom";

import Header from "./components/AdminHeader.jsx";
import Sidebar from "./components/Adminsidebar.jsx";
import ActivityLog from "./ActivityLog.jsx";

// The login page saves the user in sessionStorage under "user"
function readUserId() {
  try {
    const user = JSON.parse(sessionStorage.getItem("user") || "null");
    return user?.id || user?._id || "";
  } catch {
    return "";
  }
}

export default function AdminAuditLogs() {
  const navigate = useNavigate();
  const userId = readUserId();

  // Same destinations as the other admin pages
  function handleNavigate(section) {
    if (section === "Customers") return navigate("/customers");
    if (section === "Settings") return navigate("/settings");
    if (section === "Capsule") return navigate("/capsule");
    if (section === "Reservation") return navigate("/reservation");
    if (section === "User Management" || section === "Staff Management" || section === "Management") return navigate("/management");
    if (section === "Reports" || section === "transactions") return navigate("/reports");
    if (section === "Audit Logs") return navigate("/audit-logs");
    navigate("/dashboard");
  }

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900">
      <Sidebar active="Audit Logs" onNavigate={handleNavigate} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header active="Audit Logs" />

        <main className="flex-1 overflow-y-auto p-6 pb-24 md:p-8 md:pb-24">
          {userId ? (
            <ActivityLog userId={userId} scope="all" />
          ) : (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
              <p className="font-semibold text-[#0B3B2A]">You are not signed in</p>
              <p className="mt-1 text-sm text-[#6F8E7F]">Log in again to view the audit logs.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}       