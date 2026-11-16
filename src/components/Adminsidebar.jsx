import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  ClipboardList,
  Briefcase,
  Users,
  UserCog,
  BarChart3,
  Settings,
  ShieldCheck,
  ChevronDown,
  Plug,
} from "lucide-react";
import logo from "../assets/logo.jpg";
import { userHasPermission } from "../permissionUtils.js";

// An item with `children` becomes a dropdown. Its children are normal nav items.
// The "Integration" child uses id "Settings" so AdminSettings (active="Settings")
// highlights it and your existing handleNavigate("Settings") -> "/settings" keeps working.
const NAV_ITEMS = [
  { group: "Overview", items: [{ id: "Dashboard", label: "Dashboard", icon: LayoutGrid }] },
  {
    group: "Operations",
    items: [
      { id: "Reservation", label: "Reservation", icon: ClipboardList },
      { id: "Capsule", label: "Services", icon: Briefcase },
      { id: "Customers", label: "Customers", icon: Users },
    ],
  },
  {
    group: "Management",
    items: [
      { id: "User Management", label: "User Management", icon: UserCog },
      { id: "Reports", label: "Reports", icon: BarChart3 },
      { id: "Audit Logs", label: "Audit Logs", icon: ShieldCheck },
      {
        id: "SettingsMenu",
        label: "Settings",
        icon: Settings,
        children: [{ id: "Settings", label: "Integration", icon: Plug }],
      },
    ],
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
  if (!role) return "";
  return ROLE_LABELS[role] || role.charAt(0).toUpperCase() + role.slice(1);
}

// Shared styling so every row looks and behaves the same.
const ACCENT = "#7BE0B0";
const rowBase =
  "group relative flex w-full items-center gap-3 rounded-lg text-sm font-medium outline-none transition-colors duration-150 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-[#7BE0B0]/70";
const rowActive = "bg-white/[0.12] text-white";
const rowIdle = "text-white/75 hover:bg-white/[0.06] hover:text-white";

export default function Sidebar({ active, onNavigate }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(readUser);

  // Dropdown open/closed state. If the admin never clicked a dropdown,
  // it is open automatically while one of its pages is active.
  const [openMenus, setOpenMenus] = useState({});

  // I-refresh ang user kung mobalik ang focus sa window
  useEffect(() => {
    const syncUser = () => setUser(readUser());
    window.addEventListener("focus", syncUser);
    return () => window.removeEventListener("focus", syncUser);
  }, []);

  const displayName = getFullName(user) || "Account";
  const roleLabel = getRoleLabel(user);
  const sectionPermission = {
    Customers: ["customers", "view"],
    Reports: ["reports", "view"],
    "Audit Logs": ["auditLogs", "view"],
  };
  const visibleNavItems = NAV_ITEMS.map((group) => ({
    ...group,
    items: group.items.filter(({ id }) => {
      if (user?.role !== "staff") return true;
      const required = sectionPermission[id];
      return required
        ? userHasPermission(user, required[0], required[1])
        : false;
    }),
  })).filter((group) => group.items.length > 0);

  // The sidebar opens the Audit Logs page itself, so the other admin pages
  // don't need any change to their own handleNavigate.
  function handleClick(id) {
    if (id === "Audit Logs") return navigate("/audit-logs");
    onNavigate(id);
  }

  function renderItem({ id, label, icon: Icon, children }) {
    // ---- Dropdown item (e.g. Settings) ----
    if (children?.length) {
      const childActive = children.some((child) => child.id === active);
      const isOpen = openMenus[id] ?? childActive;
      const menuId = `submenu-${id}`;
      const highlightParent = childActive && !isOpen;

      return (
        <div key={id}>
          <button
            type="button"
            onClick={() => setOpenMenus((menus) => ({ ...menus, [id]: !isOpen }))}
            aria-expanded={isOpen}
            aria-controls={menuId}
            className={`${rowBase} px-3 py-2.5 ${highlightParent ? rowActive : rowIdle}`}
          >
            {highlightParent && (
              <span
                aria-hidden="true"
                className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full"
                style={{ backgroundColor: ACCENT }}
              />
            )}
            <Icon
              className={`h-[18px] w-[18px] shrink-0 transition-colors ${
                childActive ? "text-[#7BE0B0]" : "text-white/60 group-hover:text-white"
              }`}
              aria-hidden="true"
            />
            <span className="flex-1 text-left">{label}</span>
            <ChevronDown
              className={`h-4 w-4 text-white/50 transition-transform duration-200 motion-reduce:transition-none ${
                isOpen ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </button>

          {/* Grid-rows trick: animates height from 0 to auto without measuring */}
          <div
            id={menuId}
            className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
              isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
            }`}
          >
            <div className="overflow-hidden">
              <div className="ml-[21px] mt-1 space-y-0.5 border-l border-white/15 pl-3">
                {children.map((child) => {
                  const ChildIcon = child.icon;
                  const isActive = active === child.id;
                  return (
                    <button
                      key={child.id}
                      type="button"
                      tabIndex={isOpen ? 0 : -1}
                      onClick={() => handleClick(child.id)}
                      aria-current={isActive ? "page" : undefined}
                      className={`${rowBase} px-3 py-2 ${isActive ? rowActive : rowIdle}`}
                    >
                      <ChildIcon
                        className={`h-4 w-4 shrink-0 ${
                          isActive ? "text-[#7BE0B0]" : "text-white/60 group-hover:text-white"
                        }`}
                        aria-hidden="true"
                      />
                      {child.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ---- Regular item ----
    const isActive = active === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => handleClick(id)}
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
  }

  return (
    <aside className="hidden w-[260px] shrink-0 flex-col bg-[#033D22] text-white md:sticky md:top-0 md:flex md:h-screen">
      {/* Brand */}
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
            {user?.role === "staff" ? "Staff panel" : "Admin panel"}
          </p>
        </div>
      </div>

      {/* Navigation (scrolls on short screens, brand and account stay put) */}
      <nav
        aria-label="Main navigation"
        className="flex-1 space-y-6 overflow-y-auto px-6 pb-4 pt-5 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]"
      >
        {visibleNavItems.map(({ group, items }) => (
          <div key={group}>
            <p className="px-3 pb-2 text-xs font-medium text-white/50">{group}</p>
            <div className="space-y-0.5">{items.map(renderItem)}</div>
          </div>
        ))}
      </nav>

      {/* Logged-in account info */}
      <div className="m-4 flex items-center gap-3 rounded-xl bg-black/20 p-3 ring-1 ring-white/10">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2F9E7A] text-sm font-bold">
          {getInitials(user)}
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold" title={displayName}>
            {displayName}
          </p>
          {roleLabel && <p className="mt-0.5 text-xs text-white/70">{roleLabel}</p>}
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