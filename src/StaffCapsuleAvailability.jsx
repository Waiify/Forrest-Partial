import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import pageBackground from "./assets/page_background.jpeg";

import StaffHeader from "./components/StaffHeader.jsx";
import StaffSidebar from "./components/StaffSidebar.jsx";

const ROUTES = {
  Dashboard: "/StaffDashboard",
  CapsuleManagement: "/StaffCapsuleManagement",
  CapsuleAvailability: "/StaffCapsuleAvailability",
  Reservation: "/Reservation",
  ReservationHistory: "/ReservationHistory",
  SystemLogs: "/SystemLogs",
};


const PAGE_TITLES = {
  Dashboard: "Dashboard",
  CapsuleManagement: "Capsule Management",
  CapsuleAvailability: "Capsule Availability",
  Reservation: "Reservation",
  ReservationHistory: "Reservation History",
  SystemLogs: "System Logs",
};

const STATUS_ORDER = [
  "available",
  "occupied",
  "reserved",
  "maintenance",
];

const STATUS_CONFIG = {
  available: {
    label: "Available",
    dot: "bg-[#3aae8c]",
    tile: "bg-[#82cdb9] text-[#39745f]",
  },

  occupied: {
    label: "Occupied",
    dot: "bg-[#a66be3]",
    tile: "bg-[#a96be3] text-[#5f3c85]",
  },

  reserved: {
    label: "Reserved",
    dot: "bg-[#f2b64f]",
    tile: "bg-[#f4b957] text-[#8b682d]",
  },

  maintenance: {
    label: "Under Maintenance",
    dot: "bg-[#df6267]",
    tile: "bg-[#df6267] text-[#8d363b]",
  },
};

{/*change into real data from database, mga rooms/capsule na ni siya */}

const INITIAL_CAPSULES = [
  { id: "R-01", status: "available" },
  { id: "R-02", status: "reserved" },
  { id: "R-03", status: "occupied" },
  { id: "R-04", status: "occupied" },
  { id: "R-01", status: "available" },
  { id: "R-02", status: "reserved" },
  { id: "R-02", status: "reserved" },

  { id: "R-01", status: "available" },
  { id: "R-02", status: "reserved" },
  { id: "R-03", status: "occupied" },
  { id: "R-08", status: "maintenance" },
  { id: "R-01", status: "available" },
  { id: "R-02", status: "reserved" },
  { id: "R-02", status: "reserved" },


];

function CapsuleStatus({ rooms, onChangeStatus }) {
  const [filter, setFilter] = useState("all");
  const [openIndex, setOpenIndex] = useState(null);

  const counts = useMemo(() => {
    const result = {
      available: 0,
      occupied: 0,
      reserved: 0,
      maintenance: 0,
    };

    rooms.forEach((room) => {
      if (result[room.status] !== undefined) {
        result[room.status]++;
      }
    });

    return result;
  }, [rooms]);

  const visibleRooms =
    filter === "all"
      ? rooms
      : rooms.filter((room) => room.status === filter);

  return (
    <div className="mt-1 w-full rounded-[20px] bg-white shadow-md">

     
      <div className="border-b border-[#b5ded1] px-5 pb-3 pt-4 mt-2">
        <h2 className="text-[17px] font-bold text-[#0b4d2c]">
          Real-Time Capsule Availability
        </h2>

        <p className="text-[11px] text-slate-400">
          Updates automatically as reservations change
        </p>
      </div>

      
      <div className="flex flex-wrap items-center gap-5 px-5 py-3">
        {STATUS_ORDER.map((status) => {
          const config = STATUS_CONFIG[status];
          const isActive = filter === status;

          return (
            <button
              key={status}
              type="button"
              onClick={() =>
                setFilter(isActive ? "all" : status)
              }
              className={`flex items-center gap-1.5 text-[10px] ${
                isActive
                  ? "font-bold text-slate-900"
                  : "font-medium text-slate-500"
              }`}
            >
              <span
                className={`h-[9px] w-[9px] rounded-full ${config.dot}`}
              />

              {config.label}
            </button>
          );
        })}
      </div>

      
      <div className="px-5 pb-6 pt-2">

        {visibleRooms.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            No capsules found.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">

            {visibleRooms.map((room, index) => {
              const config =
                STATUS_CONFIG[room.status] ??
                STATUS_CONFIG.available;

              const isOpen = openIndex === index;

              return (
                <div
                  key={`${room.id}-${index}`}
                  className="relative"
                >

                 
                  <button
                    type="button"
                    onClick={() =>
                      setOpenIndex(isOpen ? null : index)
                    }
                    className={`flex aspect-square w-full flex-col items-center justify-center rounded-[13px] shadow-sm transition hover:brightness-95 ${config.tile}`}
                  >
                    <span className="text-[17px] font-semibold leading-none">
                      {room.id}
                    </span>

                    <span className="mt-1 text-[9px] font-medium">
                      {config.label}
                    </span>
                  </button>

                  
                  {isOpen && (
                    <div className="absolute left-0 top-full z-30 mt-1 w-full min-w-[135px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg">

                      {STATUS_ORDER.map((status) => {
                        const option = STATUS_CONFIG[status];
                        const selected = room.status === status;

                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => {
                              onChangeStatus(index, status);
                              setOpenIndex(null);
                            }}
                            className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[10px] hover:bg-slate-50 ${
                              selected
                                ? "bg-slate-50 font-semibold"
                                : ""
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${option.dot}`}
                            />

                            <span className="flex-1">
                              {option.label}
                            </span>

                            {selected && (
                              <span className="text-slate-400">
                                ✓
                              </span>
                            )}
                          </button>
                        );
                      })}

                    </div>
                  )}

                </div>
              );
            })}

          </div>
        )}

      </div>
    </div>
  );
}


export default function StaffCapsuleAvailability() {
  const navigate = useNavigate();
  const location = useLocation();

  const [capsules, setCapsules] = useState(INITIAL_CAPSULES);

  const active =
    Object.entries(ROUTES).find(
      ([, path]) => path === location.pathname
    )?.[0] ?? "CapsuleAvailability";

  function handleNavigate(section) {
    navigate(
      ROUTES[section] ?? "/StaffCapsuleAvailability"
    );
  }

  function handleChangeStatus(index, status) {
    setCapsules((prev) =>
      prev.map((capsule, i) =>
        i === index
          ? {
              ...capsule,
              status,
            }
          : capsule
      )
    );
  }

  return (
    <div className="flex h-screen w-full text-slate-900">

     
      <StaffSidebar
        active={active}
        onNavigate={handleNavigate}
      />

      {/* Main Area */}
      <div
        className="flex min-w-0 flex-1 flex-col overflow-hidden"
        style={{
          backgroundImage: `
            linear-gradient(
              rgba(190, 210, 207, 0.68),
              rgba(190, 210, 207, 0.68)
            ),
            url(${pageBackground})
          `,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >

        <StaffHeader active={PAGE_TITLES[active]} />

        <main className="flex-1 overflow-y-auto p-6">

          <div className="mx-auto w-full">

            <CapsuleStatus
              rooms={capsules}
              onChangeStatus={handleChangeStatus}
            />

          </div>

        </main>

      </div>
    </div>
  );
}