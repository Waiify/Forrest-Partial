import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Briefcase,
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
    title: "Forrest Spaces and Services",
    items: [
      {
        id: "StaffSpacesandServicesManagement",
        label: "Spaces and Services Management",
        icon: Briefcase,
      },
      {
        id: "StaffSpacesandServicesAvailability",
        label: "Spaces and Services Availability",
        icon: Clock,
      },
    ],
  },
  {
    title: "RESERVATION",
    items: [
      { id: "StaffReservation", label: "Reservation", icon: FileText },
      { id: "StaffReservationHistory", label: "Reservation History", icon: History },
    ],
  },
  {
    title: "SYSTEM",
    items: [{ id: "StaffSystemLogs", label: "System Logs", icon: ClipboardList }],
  },
];

const ACCENT = "#7BE0B0";
const rowBase =
  "group relative flex w-full items-center gap-3 rounded-lg text-sm font-medium outline-none transition-colors duration-150 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-[#7BE0B0]/70";
const rowActive = "bg-white/[0.12] text-white";
const rowIdle = "text-white/75 hover:bg-white/[0.06] hover:text-white";

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

export default function StaffSidebar({ active, onNavigate }) {
  const [user, setUser] = useState(readUser);

  // Refresh the user when the window regains focus (same as StaffHeader)
  useEffect(() => {
    const syncUser = () => setUser(readUser());
    window.addEventListener("focus", syncUser);
    return () => window.removeEventListener("focus", syncUser);
  }, []);

  const displayName = getFullName(user) || "Staff";
  const role = user?.role || "Staff";

  return (
    <aside className="hidden w-[260px] shrink-0 flex-col bg-[#033D22] text-white md:sticky md:top-0 md:flex md:h-screen">
      <div className="mx-4 flex items-center gap-3 border-b border-white/10 px-1 pb-5 pt-6">
        <img
          src={logo}
          alt="Forrest Co-Working Space logo"
          className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white/25 ring-offset-2 ring-offset-[#033D22]"
        />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold tracking-tight">Forrest</p>
          <p className="truncate text-xs text-white/70">Co-Working Space</p>
          <p className="mt-1 inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/80">
            Staff panel
          </p>
        </div>
      </div>

      <nav
        aria-label="Main navigation"
        className="flex-1 space-y-6 overflow-y-auto px-6 pb-4 pt-5 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]"
      >
        {NAV_SECTIONS.map(({ title, items }) => (
          <div key={title}>
            <p className="px-3 pb-2 text-xs font-medium text-white/50">
              {title}
            </p>

            {items.map(({ id, label, icon: Icon }) => {
              const isActive = active === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onNavigate(id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`${rowBase} px-3 py-2.5 ${isActive ? rowActive : rowIdle}`}
                >
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                      style={{ backgroundColor: ACCENT }}
                    />
                  )}
                  <Icon
                    className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                      isActive ? "text-[#7BE0B0]" : "text-white/60 group-hover:text-white"
                    }`}
                    aria-hidden="true"
                  />
                  {label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="m-4 flex items-center gap-3 rounded-xl bg-black/20 p-3 ring-1 ring-white/10">
        {user?.avatarUrl || user?.photoURL ? (
          <img
            src={user.avatarUrl || user.photoURL}
            alt={displayName}
            className="h-9 w-9 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2F9E7A] text-xs font-bold">
            {getInitials(user)}
          </div>
        )}

        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold" title={displayName}>
            {displayName}
          </p>
          <p className="mt-0.5 text-xs text-white/70">
            {role}
          </p>
          {user?.email && (
            <p className="mt-0.5 truncate text-[11px] text-white/50" title={user.email}>
              {user.email}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}