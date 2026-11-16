import {
  LayoutDashboard,
  Briefcase,
  Clock,
  FileText,
  History,
  ClipboardList,
  Users,
  BarChart3,
  ShieldCheck,
  QrCode,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.jpg";
import { readSessionUser, userHasPermission } from "../permissionUtils.js";
import useSettings from "../useSettings2.js";

const NAV_SECTIONS = [
  {
    title: "OVERVIEW",
    items: [{ id: "Dashboard", label: "Dashboard", icon: LayoutDashboard, permission: ["dashboard", "view"] }],
  },
  {
    title: "Forrest Spaces and Services",
    items: [
      {
        id: "StaffSpacesandServicesManagement",
        label: "Spaces and Services Management",
        icon: Briefcase,
        permission: ["spaces", "view"],
      },
      {
        id: "StaffSpacesandServicesAvailability",
        label: "Spaces and Services Availability",
        icon: Clock,
        permission: ["spaces", "view"],
      },
    ],
  },
  {
    title: "RESERVATION",
    items: [
      { id: "StaffReservation", label: "Reservation", icon: FileText, permission: ["reservations", "view"] },
      { id: "StaffReservationHistory", label: "Reservation History", icon: History, permission: ["reservations", "view"] },
      { id: "StaffQRScanner", label: "QR Scanner", icon: QrCode, permission: ["reservations", "update"] },
    ],
  },
  {
    title: "MANAGEMENT",
    items: [
      { id: "Customers", label: "Customers", icon: Users, permission: ["customers", "view"], path: "/customers" },
      { id: "Reports", label: "Reports", icon: BarChart3, permission: ["reports", "view"], path: "/reports" },
      { id: "Audit Logs", label: "Audit Logs", icon: ShieldCheck, permission: ["auditLogs", "view"], path: "/audit-logs" },
    ],
  },
  {
    title: "SYSTEM",
    items: [{ id: "StaffSystemLogs", label: "System Logs", icon: ClipboardList }],
  },
];

export default function StaffSidebar({ active, onNavigate }) {
  const navigate = useNavigate();
  const user = readSessionUser();
  const settings = useSettings();
  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(({ id, permission }) => (
      (id !== "StaffQRScanner" || !settings.settingsLoaded || settings.qrCodeEnabled !== false)
      && (!permission || userHasPermission(user, ...permission))
    )),
  })).filter((section) => section.items.length > 0);

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
        {sections.map(({ title, items }) => (
          <div key={title}>
            <div className="px-3 pb-1 text-[13px] font-semibold leading-snug text-white/80">
              {title}
            </div>

            {items.map(({ id, label, icon: Icon, path }) => {
              const isActive = active === id;

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => (path ? navigate(path) : onNavigate(id))}
                  className={`flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-[13px] font-semibold leading-snug text-white ${
                    isActive ? "bg-white/15" : "hover:bg-white/10"
                  }`}
                >
                  <Icon size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mx-3 border-t border-white/30 py-3">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-sm font-semibold">
            RD
          </div>
          {/* need pa ni siyag real na data */}

          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-xs font-semibold">Meme Dealdo</div>
            <div className="truncate text-[10px] text-white/70">Staff</div>
          </div>
        </div>
      </div>
    </aside>
  );
}