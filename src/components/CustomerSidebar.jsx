import {
  LayoutGrid,
  Plus,
  BriefcaseBusiness,
  BedSingle,
  History,
  Bell,
  User,
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
    ],
  },
];

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
    <aside className="hidden w-[250px] shrink-0 flex-col bg-[#033D22] text-white md:flex">

      {/* =====================================================
          LOGO
      ====================================================== */}
      <div className="flex items-center gap-3 px-5 py-5">
        <img
          src={logo}
          alt="Logo"
          className="h-10 w-10 rounded-full border border-white/30 object-cover"
        />

        <div className="leading-tight">
          <p className="text-sm font-semibold">
            Forrest co-working space
          </p>

          <p className="text-[10px] text-white/60">
            Customer Panel
          </p>
        </div>
      </div>

      {/* =====================================================
          NAVIGATION
      ====================================================== */}
      <nav className="flex-1 space-y-5 px-3 pt-3">

        {NAV_ITEMS.map(({ group, items }) => (
          <div key={group}>

            {/* Group Title */}
            <p className="px-3 pb-2 text-xs font-medium tracking-wide text-white/55">
              {group}
            </p>

            {items.map(({ id, label, icon: Icon }) => {

              /*
                History uses "History" in the sidebar,
                while CustomerDashboard uses
                "Reservation History" internally.

                Treat both as the same active page.
              */
              const isActive =
                active === id ||
                (id === "History" &&
                  active === "Reservation History");

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onNavigate(id)}
                  aria-current={
                    isActive ? "page" : undefined
                  }
                  className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-[#0A5A35] text-white"
                      : "text-white/85 hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-[17px] w-[17px]" />

                  {label}
                </button>
              );
            })}
          </div>
        ))}

      </nav>

      {/* =====================================================
          LOGGED-IN CUSTOMER
      ====================================================== */}
      <div className="m-4 flex items-center gap-3 border-t border-white/20 pt-4">

        {/* Initials */}
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2F9E7A] text-xs font-bold">
          {initials}
        </div>

        {/* User Information */}
        <div className="min-w-0 leading-tight">

          <p className="truncate text-sm font-semibold">
            {fullName}
          </p>

          <p className="truncate text-xs text-white/60">
            @{username}
          </p>

        </div>
      </div>

    </aside>
  );
}