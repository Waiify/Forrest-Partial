
const STYLES = {
  // Reservation Status Colors
  Pending: "bg-[#FCEBCB] text-[#9A6410]",
  Confirmed: "bg-[#D9F0E4] text-[#1F7A55]",
  Active: "bg-[#D9F0E4] text-[#1F7A55]",
  "Checked in": "bg-blue-100 text-blue-700",
  Completed: "bg-[#D9F0E4] text-[#1F7A55]",
  Cancelled: "bg-red-100 text-red-700",
  Rejected: "bg-orange-100 text-orange-700",

  // Capsule Availability Status Colors
  Available: "bg-[#E3F4EC] text-[#1F7A55] border border-[#BFE3D1]",
  Occupied: "bg-[#EEE2FA] text-[#6B3FA8] border border-[#D9C2F2]",
  Cleaning: "bg-[#FCEBCB] text-[#9A6410] border border-[#F3D79F]",
  Maintenance: "bg-[#FADADA] text-[#A33A3A] border border-[#F1BCBC]",
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
        STYLES[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}
