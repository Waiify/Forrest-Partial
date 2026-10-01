import { Bell, Search } from "lucide-react";

export default function Header({ active, query = "", setQuery = () => {} }) {
  const subtitle =
    active === "Capsule"
      ? "Status of every capsule available"
      : active === "Customers"
        ? "Manage customer records and activity"
        : "Overview of your workspace";

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

        <button
          type="button"
          aria-label="Notifications"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#CFE3D9] bg-white/70 hover:bg-white"
        >
          <Bell className="h-4 w-4" />
        </button>

        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#2F9E7A] text-sm font-bold text-white">
          RD
        </div>
      </div>
    </header>
  );
}
