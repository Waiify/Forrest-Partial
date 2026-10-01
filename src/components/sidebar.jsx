import {
  LayoutGrid,
  ClipboardList,
  BedSingle,
  Users,
  UserCog,
  BarChart3,
  Settings,
} from "lucide-react";
import logo from "../assets/logo.jpg";

const NAV_ITEMS = [
  { group: "Overview", items: [{ id: "Dashboard", label: "Dashboard", icon: LayoutGrid }] },
  {
    group: "Operations",
    items: [
      { id: "Reservation", label: "Reservation", icon: ClipboardList },
      { id: "Capsule", label: "Capsule", icon: BedSingle },
      { id: "Customers", label: "Customers", icon: Users },
    ],
  },
  {
    group: "Management",
    items: [
      { id: "Staff", label: "Staff", icon: UserCog },
      { id: "Reports", label: "Reports", icon: BarChart3 },
      { id: "Settings", label: "Settings", icon: Settings },
    ],
  },
];

export default function Sidebar({ active, onNavigate }) {
  return (
    <aside className="hidden w-[250px] shrink-0 flex-col bg-[#033D22] text-white md:flex">
      <div className="flex items-center gap-3 px-5 py-5">
        <img
          src={logo}
          alt="Logo"
          className="h-10 w-10 rounded-full border border-white/30 object-cover"
        />
        <div className="leading-tight">
          <p className="text-sm font-semibold">Forrest co-working space</p>
          <p className="text-[10px] text-white/60">Admin panel</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 px-3 pt-3">
        {NAV_ITEMS.map(({ group, items }) => (
          <div key={group}>
            <p className="px-3 pb-1.5 text-xs font-medium text-white/55">{group}</p>
            {items.map(({ id, label, icon: Icon }) => {
              const isActive = active === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => onNavigate(id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    isActive ? "bg-[#0A5A35] text-white" : "text-white/85 hover:bg-white/10"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="m-4 flex items-center gap-3 border-t border-white/20 pt-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2F9E7A] text-xs font-bold">
          RD
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Meme Dealdo</p>
          <p className="text-xs text-white/60">Administrator</p>
        </div>
      </div>
    </aside>
  );
}
