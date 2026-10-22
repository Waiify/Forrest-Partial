import { Bell, Search, User, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function Header({
  active,
  query = "",
  setQuery = () => {},
  onNavigate = () => {},
  notifications = [],
}) {
  const [customerName, setCustomerName] = useState("Customer");
  const [customerInitials, setCustomerInitials] = useState("C");
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const unreadNotifications = notifications.filter(
  (notification) => !notification.read
).length;

  const profileMenuRef = useRef(null);

  // Load logged-in customer
  useEffect(() => {
  const loadUser = () => {
    const storedUser = sessionStorage.getItem("user");

    if (!storedUser) {
      setCustomerName("Customer");
      setCustomerInitials("C");
      return;
    }

    try {
      const user = JSON.parse(storedUser);

      const firstName = user.firstName || "";
      const lastName = user.lastName || "";

      const fullName =
        firstName || lastName
          ? `${firstName} ${lastName}`.trim()
          : user.name || user.username || "Customer";

      setCustomerName(fullName);

      const initials =
        firstName && lastName
          ? `${firstName[0]}${lastName[0]}`
          : fullName
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((name) => name[0])
              .join("")
              .toUpperCase();

      setCustomerInitials(initials || "C");

    } catch (error) {
      console.error(
        "Error loading customer information:",
        error
      );
    }
  };

  loadUser();

  // para ma hindle ang pag update sa user data kung mag update sa profile
  const handleUserUpdated = (event) => {
    const user = event.detail;

    const firstName = user.firstName || "";
    const lastName = user.lastName || "";

    const fullName =
      firstName || lastName
        ? `${firstName} ${lastName}`.trim()
        : user.name || user.username || "Customer";

    setCustomerName(fullName);

    const initials =
      firstName && lastName
        ? `${firstName[0]}${lastName[0]}`
        : fullName
            .split(" ")
            .filter(Boolean)
            .slice(0, 2)
            .map((name) => name[0])
            .join("")
            .toUpperCase();

    setCustomerInitials(initials || "C");
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

  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target)
      ) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Logout
  const handleLogout = () => {
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("pendingToken");

    setShowProfileMenu(false);

    window.location.href = "/login";
  };

  // Navigate to profile
  const handleProfile = () => {
    setShowProfileMenu(false);
    onNavigate("Profile");
  };

  // Navigate to notifications
  const handleNotifications = () => {
    onNavigate("Notification");
  };

  const subtitle =
    active === "My Reservation"
      ? "View and manage your current reservation"
      : active === "Book a Capsule"
        ? "Find and reserve an available capsule"
        : active === "Reservation History"
          ? "View your previous reservations"
          : active === "History"
            ? "View your previous reservations"
            : active === "Profile"
              ? "Manage your account information"
              : active === "Help & Support"
                ? "Get help with your account and reservations"
                : active === "Notification"
                  ? "View your notifications"
                  : "Manage your reservations and workspace visits";

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#CFE3D9] bg-[#E8F3ED]/90 px-8 py-4 backdrop-blur">

      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#0B4A2E]">
          {active}
        </h1>

        <p className="text-sm text-[#6F8E7F]">
          {subtitle}
        </p>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">

        {/* Search */}
        <div className="relative w-72 max-w-full">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F8E7F]" />

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search capsules, dates..."
            aria-label="Search"
            className="h-10 w-full rounded-full border border-[#2F9E7A]/60 bg-transparent pl-10 pr-4 text-sm outline-none placeholder:text-[#6F8E7F] focus:ring-2 focus:ring-[#2F9E7A]/30"
          />
        </div>

        {/* Notifications */}
       <button
  type="button"
  aria-label="Notifications"
  title="Notifications"
  onClick={handleNotifications}
  className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#CFE3D9] bg-white/70 transition hover:bg-white"
>
  <Bell className="h-4 w-4" />

  {unreadNotifications > 0 && (
    <span className="absolute right-[-6px] top-[-6px] z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
      {unreadNotifications > 9
        ? "9+"
        : unreadNotifications}
    </span>
  )}
</button>
        {/* Profile ug Logout Dropdown */}
        <div
          ref={profileMenuRef}
          className="relative"
        >

          {/* Profile Avatar */}
          <button
            type="button"
            onClick={() => setShowProfileMenu((prev) => !prev)}
            aria-label="Open profile menu"
            aria-expanded={showProfileMenu}
            title={customerName}
            className={`flex h-11 w-11 items-center justify-center rounded-full bg-[#2F9E7A] text-sm font-bold text-white transition hover:scale-105 hover:bg-[#258866] focus:outline-none focus:ring-2 focus:ring-[#2F9E7A]/40 ${
              active === "Profile"
                ? "ring-2 ring-[#0B4A2E] ring-offset-2"
                : ""
            }`}
          >
            {customerInitials}
          </button>

          {/* Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 top-14 z-50 w-56 overflow-hidden rounded-xl border border-[#CFE3D9] bg-white shadow-lg">

              {/* Customer Information */}
              <div className="border-b border-[#E2EEE8] px-4 py-3">
                <p className="truncate text-sm font-semibold text-[#0B4A2E]">
                  {customerName}
                </p>

                <p className="text-xs text-[#6F8E7F]">
                  Customer
                </p>
              </div>

              {/* Profile */}
              <button
                type="button"
                onClick={handleProfile}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-[#365447] transition hover:bg-[#E8F3ED]"
              >
                <User className="h-4 w-4" />

                <span>Profile</span>
              </button>

              {/* Logout */}
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 border-t border-[#E2EEE8] px-4 py-3 text-left text-sm text-red-600 transition hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />

                <span>Logout</span>
              </button>

            </div>
          )}

        </div>

      </div>
    </header>
  );
}