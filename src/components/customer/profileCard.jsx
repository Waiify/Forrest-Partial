import { User, UserRound, CalendarClock, Users, Leaf } from "lucide-react";
import Card from "./card.jsx";

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-xs">
      <span className="flex items-center gap-2 text-[#6F8E7F]">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="font-medium text-[#16352A]">{value}</span>
    </div>
  );
}

export default function ProfileCard({ user = {}, onEdit }) {
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || "Customer";
  const since = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";

  return (
    <Card title="My profile" icon={User} action="Edit profile" onAction={onEdit}>
      <div className="flex items-center gap-4 border-b border-[#E4EFE9] pb-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#CFE9DC]">
          <UserRound className="h-8 w-8 text-[#0B4A2E]" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-semibold text-[#0B3B2A]">{name}</p>
          <p className="truncate text-xs text-[#6F8E7F]">{user.email || "No email on file"}</p>
        </div>
      </div>

      <div className="mt-2">
        <Row icon={Users} label="Username" value={user.username || "—"} />
        <Row icon={CalendarClock} label="Member since" value={since} />
        <Row icon={User} label="User role" value="Customer" />
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-lg bg-[#E8F4EE] px-3 py-3">
        <Leaf className="h-5 w-5 shrink-0 text-[#2F9E7A]" />
        <div>
          <p className="text-xs font-semibold text-[#0B4A2E]">Make the most of your workspace!</p>
          <p className="text-[11px] text-[#6F8E7F]">Book, work, and be productive.</p>
        </div>
      </div>
    </Card>
  );
}
