import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  Clock,
  FileText,
  History,
  ClipboardList,
} from "lucide-react";
import logo from "../assets/logo.jpg";

const NAV_SECTIONS = [
  {
    title: "OVERVIEW",
    items: [{ id: "Dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "CAPSULES",
    items: [
      { id: "CapsuleManagement", label: "Capsule Management", icon: Package },
      { id: "CapsuleAvailability", label: "Capsule Availability", icon: Clock },
    ],
  },
  {
    title: "RESERVATION",
    items: [
      { id: "Reservation", label: "Reservation", icon: FileText },
      { id: "ReservationHistory", label: "Reservation History", icon: History },
    ],
  },
  {
    title: "SYSTEM",
    items: [{ id: "SystemLogs", label: "System Logs", icon: ClipboardList }],
  },
];

// Ngalan nga ipakita para sa matag role
const ROLE_LABELS = {
  admin: "Administrator",
  staff: "Staff",
  customer: "Customer",
};

// Basahon ang user nga gi-save sa Login.jsx (sessionStorage "user")
function readUser() {
  try {
    const raw = sessionStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function getFullName(user) {
  if (!user) return "";
  const direct = user.name || user.fullName || user.displayName;
  if (direct) return String(direct).trim();

  const names = [user.firstName, user.lastName].filter(Boolean);
  return names.join(" ").trim();
}

function getInitials(user) {
  const name = getFullName(user);
  if (name) {
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.[0] || "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase() || "?";
  }

  const email = (user?.email || "").trim();
  return email ? email[0].toUpperCase() : "?";
}

function getRoleLabel(user) {
  const role = String(user?.role || "").toLowerCase();
  if (!role) return "Staff";
  return ROLE_LABELS[role] || role.charAt(0).toUpperCase() + role.slice(1);
}

// Gi-capitalize ang ngalan sa component (kinahanglan para molihok sa JSX)
export default function StaffSidebar({ active, onNavigate }) {
  const [user, setUser] = useState(readUser);

  // I-refresh ang user kung mobalik ang focus sa window
  useEffect(() => {
    const syncUser = () => setUser(readUser());
    window.addEventListener("focus", syncUser);
    return () => window.removeEventListener("focus", syncUser);
  }, []);

  const displayName = getFullName(user) || "Account";

  return (
    <aside className="flex w-60 shrink-0 flex-col bg-[#003F22] text-white">
      <div className="flex h-16 items-center gap-2 px-5">
        <img
          src={logo}
          alt="Logo"
          className="h-8 w-8 rounded-full border border-white object-contain"
        />
        <div className="leading-tight">
          <div className="text-xs font-semibold text-white">
            Forrest co-working space
          </div>
          <div className="text-[9px] font-medium uppercase text-white/60">
            Staff Panel
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-4 px-3 py-2">
        {NAV_SECTIONS.map(({ title, items }) => (
          <div key={title}>
            <div className="px-3 pb-1 text-[15px] font-semibold text-white/80">
              {title}
            </div>

            {items.map(({ id, label, icon: Icon }) => {
              const isActive = active === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onNavigate(id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-[14px] font-semibold text-white ${
                    isActive ? "bg-white/15" : "hover:bg-white/10"
                  }`}
                >
                  <Icon size={17} strokeWidth={2} />
                  {label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Logged-in account info */}
      <div className="mx-3 border-t border-white/30 py-3">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold">
            {getInitials(user)}
          </div>

          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-xs font-semibold" title={displayName}>
              {displayName}
            </div>
            <div className="truncate text-[10px] text-white/70">{getRoleLabel(user)}</div>
            {user?.email && (
              <div className="truncate text-[10px] text-white/50" title={user.email}>
                {user.email}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}