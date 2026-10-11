import { Bell, Search } from "lucide-react";
import { useEffect, useState } from "react";

export default function Header({ active, query = "", setQuery = () => {} }) {
  const [customerName, setCustomerName] = useState("Customer");
  const [customerInitials, setCustomerInitials] = useState("C");

  useEffect(() => {
    const storedUser = sessionStorage.getItem("user");

    if (storedUser) {
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
        console.error("Error loading customer information:", error);
      }
    }
  }, []);

  const subtitle =
    active === "My Reservation"
      ? "View and manage your current reservation"
      : active === "Book a Capsule"
        ? "Find and reserve an available capsule"
        : active === "Reservation History"
          ? "View your previous reservations"
          : active === "Profile"
            ? "Manage your account information"
            : active === "Help & Support"
              ? "Get help with your account and reservations"
              : "Manage your reservations and workspace visits";

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-[#CFE3D9] bg-[#E8F3ED]/90 px-8 py-4 backdrop-blur">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-[#0B4A2E]">
          {active}
        </h1>
        <p className="text-sm text-[#6F8E7F]">{subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
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

        <button
          type="button"
          aria-label="Notifications"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#CFE3D9] bg-white/70 hover:bg-white"
        >
          <Bell className="h-4 w-4" />
        </button>

        <div
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2F9E7A] text-sm font-bold text-white"
          title={customerName}
        >
          {customerInitials}
        </div>
      </div>
    </header>
  );
}