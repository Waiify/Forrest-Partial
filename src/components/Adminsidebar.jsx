import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  ClipboardList,
  BedSingle,
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
      { id: "Capsule", label: "Capsule", icon: BedSingle },
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

      return (
        <div key={id}>
          <button
            type="button"
            onClick={() => setOpenMenus((menus) => ({ ...menus, [id]: !isOpen }))}
            aria-expanded={isOpen}
            aria-controls={menuId}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              childActive && !isOpen ? "bg-[#0A5A35] text-white" : "text-white/85 hover:bg-white/10"
            }`}
          >
            <Icon className="h-[18px] w-[18px]" />
            <span className="flex-1 text-left">{label}</span>
            <ChevronDown
              className={`h-4 w-4 text-white/60 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </button>

          {isOpen && (
            <div id={menuId} className="ml-[21px] mt-1 space-y-1 border-l border-white/15 pl-3">
              {children.map((child) => {
                const ChildIcon = child.icon;
                const isActive = active === child.id;
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => handleClick(child.id)}
                    aria-current={isActive ? "page" : undefined}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActive ? "bg-[#0A5A35] text-white" : "text-white/80 hover:bg-white/10"
                    }`}
                  >
                    <ChildIcon className="h-4 w-4" />
                    {child.label}
                  </button>
                );
              })}
            </div>
          )}
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
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
          isActive ? "bg-[#0A5A35] text-white" : "text-white/85 hover:bg-white/10"
        }`}
      >
        <Icon className="h-[18px] w-[18px]" />
        {label}
      </button>
    );
  }

  return (
    <aside className="hidden w-[250px] shrink-0 flex-col bg-[#033D22] text-white md:flex">
      <div className="flex items-center gap-3 px-5 py-5">
        <img
          src={logo}
          alt="Logo"
          className="h-10 w-10 rounded-full border border-white/30 object-cover"
        />
        <div className="leading-tight">
          <p className="text-sm font-semibold">Forrest co-working space</p>
          <p className="text-[10px] text-white/60">{user?.role === "staff" ? "Staff panel" : "Admin panel"}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 px-3 pt-3">
        {visibleNavItems.map(({ group, items }) => (
          <div key={group}>
            <p className="px-3 pb-1.5 text-xs font-medium text-white/55">{group}</p>
            <div className="space-y-0.5">{items.map(renderItem)}</div>
          </div>
        ))}
      </nav>

      {/* Logged-in account info */}
      <div className="m-4 flex items-center gap-3 border-t border-white/20 pt-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2F9E7A] text-xs font-bold">
          {getInitials(user)}
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold" title={displayName}>
            {displayName}
          </p>
          {roleLabel && <p className="text-xs text-white/60">{roleLabel}</p>}
          {user?.email && (
            <p className="truncate text-[11px] text-white/50" title={user.email}>
              {user.email}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}