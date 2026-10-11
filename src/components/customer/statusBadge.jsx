const STYLES = {
  Confirmed: "bg-[#D9F0E4] text-[#1F7A55]",
  Completed: "bg-[#D9F0E4] text-[#1F7A55]",
  Available: "bg-[#E3F4EC] text-[#1F7A55] border border-[#BFE3D1]",
  Occupied: "bg-[#EEE2FA] text-[#6B3FA8] border border-[#D9C2F2]",
  Cleaning: "bg-[#FCEBCB] text-[#9A6410] border border-[#F3D79F]",
  Maintenance: "bg-[#FADADA] text-[#A33A3A] border border-[#F1BCBC]",
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STYLES[status] ?? STYLES.Completed}`}>
      {status}
    </span>
  );
}
