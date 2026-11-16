import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { Bell, CornerDownLeft, LogOut, Search, Settings, User, X } from "lucide-react";

import { getFirebaseAuth } from "../firebase";

// USBA kung lahi ang route sa imong Login page sa main.jsx
const LOGIN_ROUTE = "/";
const PROFILE_ROUTE = "/staff-profile"; // USBA ngadto sa tinuod nimong staff profile route
const SETTINGS_ROUTE = "/staff-settings"; // USBA ngadto sa tinuod nimong staff settings route

// Page-jump suggestions. Gamiton ra kini kung ang page WALAY gipasa nga query/setQuery
// (ang mga page nga naay query/setQuery mo-filter sa ilang sulod imbes nga mo-jump).
// Item shape: { id, title, description?, path?, keywords?: string[], onSelect?: (item) => void }
const DEFAULT_SEARCH_ITEMS = [
  { id: "dashboard", title: "Dashboard", description: "Overview of your workspace", path: "/StaffDashboard", keywords: ["home", "overview"] },
  { id: "management", title: "Spaces and Services Management", description: "Add, edit and archive services", path: "/StaffSpacesandServicesManagement", keywords: ["service", "room", "space", "add", "edit"] },
  { id: "availability", title: "Spaces and Services Availability", description: "Live status of every service", path: "/StaffSpacesandServicesAvailability", keywords: ["service", "room", "status", "available"] },
  { id: "reservation", title: "Reservation", description: "View and manage bookings", path: "/StaffReservation", keywords: ["booking", "schedule"] },
  { id: "history", title: "Reservation History", description: "Completed, cancelled and past bookings", path: "/StaffReservationHistory", keywords: ["past", "completed", "cancelled"] },
  { id: "logs", title: "System Logs", description: "Recent system activity", path: "/StaffSystemLogs", keywords: ["activity", "audit"] },
  { id: "profile", title: "Profile", description: "Your account details", path: PROFILE_ROUTE, keywords: ["account", "me"] },
  { id: "settings", title: "Settings", description: "Preferences and security", path: SETTINGS_ROUTE, keywords: ["preferences", "password"] },
];
const NO_ITEMS = [];

const MAX_RESULTS = 8;

const STAFF_PAGE_DESCRIPTIONS = {
  Dashboard: "Monitor today's reservations, availability, and key activity",
  "Spaces and Services Management": "Add, update, and archive spaces and services",
  "Spaces and Services Availability": "Review service statuses and current availability",
  Reservation: "Create, review, approve, and manage customer reservations",
  "Reservation History": "Review completed, cancelled, and past reservations",
  "System Logs": "Review staff actions and system activity",
  "QR Scanner": "Scan confirmed reservation codes to check customers in",
  Customers: "Review customer accounts and reservation activity",
  "Capsule Management": "Manage capsule details and availability",
  "Capsule Availability": "Monitor capsule occupancy and availability",
};

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

// Case-insensitive, accent-insensitive normalisation
function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

// Every word in the query must appear somewhere in the item. Title matches rank first.
function searchItemsByQuery(items, rawQuery) {
  const tokens = normalize(rawQuery).trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const scored = [];
  for (const item of items) {
    if (!item || !item.title) continue;

    const title = normalize(item.title);
    const haystack = normalize(
      [item.title, item.description, ...(Array.isArray(item.keywords) ? item.keywords : [])].join(" ")
    );

    if (!tokens.every((token) => haystack.includes(token))) continue;

    let score = 0;
    if (title === tokens.join(" ")) score += 100;
    if (title.startsWith(tokens[0])) score += 50;
    if (tokens.every((token) => title.includes(token))) score += 25;
    scored.push({ item, score });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS)
    .map((entry) => entry.item);
}

/*
  HOW THE SEARCH WORKS
  - Page nga mo-pass og `query` + `setQuery`  -> LIVE FILTER sa sulod sa page (walay dropdown).
    Example: <StaffHeader active="Reservation" query={search} setQuery={setSearch} />
  - Page nga walay query/setQuery             -> page-jump suggestions (DEFAULT_SEARCH_ITEMS).
  - Pwede gihapon mo-pass og `searchItems` aron makita ang dropdown suggestions.
*/
export default function StaffHeader({
  active,
  subtitle: providedSubtitle,
  query: controlledQuery,
  setQuery: controlledSetQuery,
  onSearch = () => {}, // optional: called with the query when Enter is pressed and no result is highlighted
  searchItems, // optional: things the dropdown can jump to
  searchPlaceholder = "Search reservations, services...",
  notifications = [],
  initials = null, // optional: i-override ang auto-generated initials
}) {
  const navigate = useNavigate();
  const [user, setUser] = useState(readUser);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const menuRef = useRef(null);
  const notificationRef = useRef(null);
  const searchRef = useRef(null);
  const searchWrapRef = useRef(null);

  // Search: use the page's state if provided, otherwise keep our own
  const isControlled = typeof controlledSetQuery === "function";
  const [localQuery, setLocalQuery] = useState("");
  const query = isControlled ? controlledQuery ?? "" : localQuery;
  const updateQuery = isControlled ? controlledSetQuery : setLocalQuery;

  // Controlled (page filters itself) = walay dropdown, gawas kung naay gi-pass nga searchItems
  const items = Array.isArray(searchItems)
    ? searchItems
    : isControlled
      ? NO_ITEMS
      : DEFAULT_SEARCH_ITEMS;
  const hasDropdown = items.length > 0;

  const results = useMemo(() => searchItemsByQuery(items, query), [items, query]);
  const showResults = hasDropdown && searchOpen && query.trim().length > 0;

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

  // Start from the first result every time the query changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Close dropdowns kung click sa gawas o Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target)) {
        setSearchOpen(false);
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

  // Press "/" anywhere to focus the search bar (ignored while typing in another field)
  useEffect(() => {
    const handleSlash = (event) => {
      const tag = event.target?.tagName;
      const isTyping =
        tag === "INPUT" || tag === "TEXTAREA" || event.target?.isContentEditable;
      if (event.key === "/" && !isTyping) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleSlash);
    return () => document.removeEventListener("keydown", handleSlash);
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

  function clearSearch() {
    updateQuery("");
    setSearchOpen(false);
    searchRef.current?.focus();
  }

  function selectResult(item) {
    if (!item) return;
    setSearchOpen(false);
    updateQuery("");
    searchRef.current?.blur();

    if (typeof item.onSelect === "function") {
      item.onSelect(item);
    } else if (item.path) {
      navigate(item.path);
    }
  }

  function handleSearchKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!searchOpen) setSearchOpen(true);
      if (results.length > 0) setActiveIndex((i) => (i + 1) % results.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!searchOpen) setSearchOpen(true);
      if (results.length > 0) setActiveIndex((i) => (i - 1 + results.length) % results.length);
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (showResults && results[activeIndex]) {
        selectResult(results[activeIndex]);
      } else {
        // No dropdown match: hand the raw query to the page (the page already filters live)
        onSearch(query.trim());
        setSearchOpen(false);
      }
      return;
    }

    if (event.key === "Escape") {
      if (query) {
        updateQuery("");
        setSearchOpen(false);
      } else {
        event.currentTarget.blur();
      }
    }
  }

  async function handleLogout() {
    setMenuOpen(false);
    setNotificationsOpen(false);

    try {
      await signOut(await getFirebaseAuth());
    } catch (error) {
      console.error("Firebase sign out error:", error);
    }

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("pendingToken");

    navigate(LOGIN_ROUTE, { replace: true });
  }

  const displayName = getFullName(user) || "Staff";
  const subtitle =
    providedSubtitle || STAFF_PAGE_DESCRIPTIONS[active] || "Overview of your workspace";

  if (!user) return null;

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#CFE3D9] bg-[#E8F3ED]/90 px-8 py-4 backdrop-blur">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#0B4A2E]">{active}</h1>
        <p className="text-sm text-[#6F8E7F]">{subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative w-72 max-w-full" role="search" ref={searchWrapRef}>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F8E7F]" />
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => {
              updateQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder={searchPlaceholder}
            aria-label="Search"
            role={hasDropdown ? "combobox" : undefined}
            aria-expanded={hasDropdown ? showResults : undefined}
            aria-controls={hasDropdown ? "staff-search-results" : undefined}
            aria-autocomplete={hasDropdown ? "list" : undefined}
            aria-activedescendant={
              showResults && results[activeIndex] ? `staff-search-option-${activeIndex}` : undefined
            }
            autoComplete="off"
            className="h-10 w-full rounded-full border border-[#2F9E7A]/60 bg-transparent pl-10 pr-9 text-sm outline-none placeholder:text-[#6F8E7F] focus:ring-2 focus:ring-[#2F9E7A]/30"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6F8E7F] transition hover:text-[#0B4A2E]"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {showResults && (
            <div
              id="staff-search-results"
              role="listbox"
              className="absolute left-0 right-0 z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-[#CFE3D9] bg-white shadow-lg"
            >
              {results.length > 0 ? (
                results.map((item, index) => {
                  const isActive = index === activeIndex;
                  return (
                    <button
                      key={item.id ?? `${item.title}-${index}`}
                      id={`staff-search-option-${index}`}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      // mousedown fires before the input loses focus, so the click always registers
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectResult(item);
                      }}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${
                        isActive ? "bg-[#E8F3ED]" : "bg-white"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-[#0B4A2E]">
                          {item.title}
                        </span>
                        {item.description && (
                          <span className="block truncate text-xs text-[#6F8E7F]">
                            {item.description}
                          </span>
                        )}
                      </span>
                      {isActive && <CornerDownLeft className="h-4 w-4 shrink-0 text-[#2F9E7A]" />}
                    </button>
                  );
                })
              ) : (
                <div className="px-4 py-5 text-center text-sm text-[#6F8E7F]" role="status">
                  No results for “{query.trim()}”.
                </div>
              )}
            </div>
          )}
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

        {/* Account badge + menu */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={toggleMenu}
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2F9E7A] text-sm font-bold text-white outline-none transition hover:bg-[#278A6B] focus-visible:ring-2 focus-visible:ring-[#2F9E7A]/40 focus-visible:ring-offset-2"
          >
            {initials || getInitials(user)}
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
