import {
  LayoutGrid,
  BarChart3,
  Users,
  Settings,
  FileText,
  ChevronDown,
} from "lucide-react";
import logo from "../assets/logo.jpg";

// List of sidebar buttons / Lista sa sidebar buttons.
// Each item has an ID and a label used for navigation.
// Ang matag item adunay ID ug label para sa pag-navigate sa page.
const NAV_ITEMS = [
  { id: "Dashboard", label: "Dashboard", icon: LayoutGrid },
  { id: "Reservation", label: "Reservation", icon: BarChart3 },
  { id: "Capsule", label: "Capsule", icon: Users },
  { id: "Customers", label: "Customers", icon: FileText },
  { id: "Staff Management", label: "Staff Management", icon: Settings },
  { id: "Reports", label: "Reports", icon: Settings },
  { id: "Settings", label: "Settings", icon: Settings },
];

// This renders the sidebar and sends the clicked section back to the parent page.
// Kini ang code nga nag-render sa sidebar ug ipadala ang gi-click nga section balik sa parent page.
export default function Sidebar({ active, onNavigate }) {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-[#003F22]">
      <div className="flex h-16 items-center gap-2 px-5">
         <img
                    src={logo}
                    alt="Logo"
                    className="w-8 h-8 object-contain mb-1 rounded-full border-1 border-white"
          />  
        <span className="text-sm font-semibold tracking-tight text-white">Forrest Co-working space</span>
      </div>


      <nav className="flex-1 space-y-4 px-3 py-2">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;

          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-white  ${
                isActive
                  ? "bg-slate-900 font-semibold text-white  "
                  : "text-slate-500 hover:bg-slate-500 hover:text-white"
              }`}
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-100"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-medium">
            JD
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-slate-900">Jordan Diaz</div>
            <div className="truncate text-xs text-slate-500">jordan@northline.co</div>
          </div>
          <ChevronDown size={14} className="text-slate-400" />
        </button>
      </div>
    </aside>
  );
}
