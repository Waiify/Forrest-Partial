import { Bell, Search } from "lucide-react";

export default function staffHeader({ active }) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-lg font-semibold capitalize">{active}</h1>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search"
            aria-label="Search"
            className="w-56 rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
          />
        </div>

        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100"
        >
          <Bell size={18} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
        </button>
      </div>
    </header>
  );
}
