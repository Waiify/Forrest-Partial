import { ChevronRight } from "lucide-react";

export default function StatCard({ label, value, note, icon: Icon, tint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl bg-white p-5 text-left shadow-sm transition hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#0B4A2E]"
    >
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${tint}`}>
        <Icon className="h-6 w-6 text-[#0B4A2E]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-[#0B4A2E]">{label}</span>
        <span className="block text-2xl font-bold text-[#0B3B2A]">{value}</span>
        <span className="block truncate text-xs text-[#6F8E7F]">{note}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#6F8E7F]" />
    </button>
  );
}
