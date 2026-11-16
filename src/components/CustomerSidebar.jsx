import {
  LayoutGrid,
  Plus,
  BriefcaseBusiness,
  BedSingle,
  History,
  Bell,
  User,
  ShieldCheck,
} from "lucide-react";

import { useEffect, useState } from "react";

import logo from "../assets/logo.jpg";

const NAV_ITEMS = [
  {
    group: "Overview",
    items: [
      {
        id: "Dashboard",
        label: "Dashboard",
        icon: LayoutGrid,
      },
    ],
  },

  {
    group: "Reservation",
    items: [
      {
        id: "Book a Capsule",
        label: "Book a Capsule",
        icon: Plus,
      },
      {
        id: "My Reservation",
        label: "My Reservation",
        icon: BriefcaseBusiness,
      },
      {
        id: "Capsule Availability",
        label: "Capsule Availability",
        icon: BedSingle,
      },
      {
        id: "History",
        label: "History",
        icon: History,
      },
    ],
  },

  {
    group: "Account",
    items: [
      {
        id: "Notification",
        label: "Notification",
        icon: Bell,
      },
      {
        id: "Profile",
        label: "Profile",
        icon: User,
      },
      {
        id: "Activity Log",
        label: "Activity Log",
        icon: ShieldCheck,
      },
    ],
  },
];

const ACCENT = "#7BE0B0";
const rowBase =
  "group relative flex w-full items-center gap-3 rounded-lg text-sm font-medium outline-none transition-colors duration-150 motion-reduce:transition-none focus-visible:ring-2 focus-visible:ring-[#7BE0B0]/70";
const rowActive = "bg-white/[0.12] text-white";
const rowIdle = "text-white/75 hover:bg-white/[0.06] hover:text-white";

export default function Sidebar({ active, onNavigate }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = () => {
      const storedUser = sessionStorage.getItem("user");

      if (!storedUser) {
        setUser(null);
        return;
      }

      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error(
          "Failed to read user data:",
          error
        );
      }
    };

    loadUser();

    // Update sidebar user information when profile changes
    const handleUserUpdated = (event) => {
      setUser(event.detail);
    };

    window.addEventListener(
      "userUpdated",
      handleUserUpdated
    );

    return () => {
      window.removeEventListener(
        "userUpdated",
        handleUserUpdated
      );
    };
  }, []);

  const firstName = user?.firstName || "Customer";
  const lastName = user?.lastName || "";
  const username = user?.username || "Customer";

  const fullName = `${firstName} ${lastName}`.trim();

  const initials = `${firstName?.charAt(0) || "C"}${
    lastName?.charAt(0) || ""
  }`.toUpperCase();

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
            Customer panel
          </p>
        </div>
      </div>

      <nav
        aria-label="Main navigation"
        className="flex-1 space-y-6 overflow-y-auto px-6 pb-4 pt-5 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]"
      >
        {NAV_ITEMS.map(({ group, items }) => (
          <div key={group}>
            <p className="px-3 pb-2 text-xs font-medium text-white/50">
              {group}
            </p>

            {items.map(({ id, label, icon: Icon }) => {
              const isActive =
                active === id ||
                (id === "History" &&
                  active === "Reservation History");

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onNavigate(id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`${rowBase} mb-1 px-3 py-2.5 ${isActive ? rowActive : rowIdle}`}
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
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2F9E7A] text-sm font-bold">
          {initials}
        </div>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-semibold" title={fullName}>
            {fullName}
          </p>
          <p className="mt-0.5 truncate text-xs text-white/70">
            @{username}
          </p>
        </div>
      </div>
    </aside>
  );
}
