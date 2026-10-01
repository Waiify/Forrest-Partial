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

export default function staffSidebar({ active, onNavigate }) {
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
            <div className="px-3 pb-1 text-sm font-semibold text-white/80">
              {title}
            </div>

            {items.map(({ id, label, icon: Icon }) => {
              const isActive = active === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onNavigate(id)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-s font-semibold text-white ${
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

      {/* User */}
      <div className="mx-3 border-t border-white/30 py-3">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold">
            RD
          </div>
                  {/*need pa ni siyag real na data*/}

          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-xs font-semibold">Meme Dealdo</div>
            <div className="truncate text-[10px] text-white/70">Staff</div>
          </div>
        </div>
      </div>
    </aside>
  );
}