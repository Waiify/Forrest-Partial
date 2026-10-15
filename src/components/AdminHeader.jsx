import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { Bell, LogOut, Search, Settings, User } from "lucide-react";

import { auth } from "../firebase";

// USBA ang mga route ngadto sa tinuod nimong routes sa main.jsx
const LOGIN_ROUTE = "/";
const PROFILE_ROUTE = "/profile";
const SETTINGS_ROUTE = "/settings";

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

export default function AdminHeader({
  active = "Dashboard",
  query = "",
  setQuery = () => {},
  notifications = [],
}) {
  const navigate = useNavigate();
  const [user, setUser] = useState(readUser);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const menuRef = useRef(null);
  const notificationRef = useRef(null);

  // Siguruha nga array gyud ang notifications bisan unsa ang i-pass sa parent
  const notificationList = Array.isArray(notifications) ? notifications : [];
  const unreadCount = notificationList.filter((item) => !item?.read).length;

  // I-refresh ang user kung mobalik ang focus sa window
  useEffect(() => {
    const syncUser = () => setUser(readUser());
    window.addEventListener("focus", syncUser);
    return () => window.removeEventListener("focus", syncUser);
  }, []);

  // Kung wala nay user sa session, balik sa login
  useEffect(() => {
    if (!user) {
      navigate(LOGIN_ROUTE, { replace: true });
    }
  }, [user, navigate]);

  // Close dropdowns kung click sa gawas o Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  // Isira ang menu dayon moadto sa lain nga page
  function goTo(path) {
    setMenuOpen(false);
    navigate(path);
  }

  function toggleMenu() {
    setNotificationsOpen(false);
    setMenuOpen((open) => !open);
  }

  function toggleNotifications() {
    setMenuOpen(false);
    setNotificationsOpen((open) => !open);
  }

  async function handleLogout() {
    setMenuOpen(false);
    setNotificationsOpen(false);

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Firebase sign out error:", error);
    }

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("pendingToken");

    navigate(LOGIN_ROUTE, { replace: true });
  }

  const subtitle =
    active === "Capsule"
      ? "Status of every capsule available"
      : active === "Customers"
        ? "Manage customer records and activity"
        : "Overview of your workspace";

  const displayName = getFullName(user) || "Admin User";

  if (!user) return null;

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#CFE3D9] bg-[#E8F3ED]/90 px-8 py-4 backdrop-blur">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#0B4A2E]">{active}</h1>
        <p className="text-sm text-[#6F8E7F]">{subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-72 max-w-full">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F8E7F]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search guest, capsule, bookings..."
            aria-label="Search"
            className="h-10 w-full rounded-full border border-[#2F9E7A]/60 bg-transparent pl-10 pr-4 text-sm outline-none placeholder:text-[#6F8E7F] focus:ring-2 focus:ring-[#2F9E7A]/30"
          />
        </div>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            type="button"
            aria-label="Notifications"
            aria-haspopup="true"
            aria-expanded={notificationsOpen}
            onClick={toggleNotifications}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[#CFE3D9] bg-white/70 transition hover:bg-white"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-xl border border-[#CFE3D9] bg-white shadow-lg">
              <div className="flex items-center justify-between border-b border-[#CFE3D9] px-4 py-3">
                <p className="text-sm font-semibold text-[#0B4A2E]">Notifications</p>
                <span className="text-xs text-[#6F8E7F]">{unreadCount} new</span>
              </div>

              <div className="max-h-72 overflow-y-auto">
                {notificationList.length > 0 ? (
                  notificationList.map((item, index) => (
                    <div
                      key={item?.id ?? `${item?.message || "notification"}-${index}`}
                      className={`border-b border-[#F1F6F3] px-4 py-3 text-sm ${item?.read ? "text-[#6F8E7F]" : "text-[#0B4A2E]"}`}
                    >
                      <p className="font-medium">{item?.title || "Update"}</p>
                      <p className="mt-1 text-xs">{item?.message || "You have a new update."}</p>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-5 text-center text-sm text-[#6F8E7F]">
                    No new notifications.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Account menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={toggleMenu}
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2F9E7A] text-sm font-bold text-white outline-none transition hover:bg-[#278A6B] focus-visible:ring-2 focus-visible:ring-[#2F9E7A]/40 focus-visible:ring-offset-2"
          >
            {getInitials(user)}
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-[#CFE3D9] bg-white shadow-lg"
            >
              <div className="border-b border-[#CFE3D9] px-4 py-3">
                <p className="truncate text-sm font-semibold text-[#0B4A2E]">{displayName}</p>
                {user?.email && (
                  <p className="truncate text-xs text-[#6F8E7F]">{user.email}</p>
                )}
                {user?.role && (
                  <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#2F9E7A]">
                    {user.role}
                  </p>
                )}
              </div>

              <div className="py-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => goTo(PROFILE_ROUTE)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[#0B4A2E] transition hover:bg-[#E8F3ED]"
                >
                  <User className="h-4 w-4" />
                  Profile
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => goTo(SETTINGS_ROUTE)}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[#0B4A2E] transition hover:bg-[#E8F3ED]"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>
              </div>

              <div className="border-t border-[#CFE3D9]">
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-[#0B4A2E] transition hover:bg-[#E8F3ED]"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 