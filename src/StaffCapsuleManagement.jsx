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

{/*change the data into real data from database*/}
const INITIAL_CAPSULES = [
  {
    id: "C101",
    capsule: "R-01",
    type: "Standard",
    price: "₱36 per hour",
    status: "Available",
  },
  {
    id: "C102",
    capsule: "R-02",
    type: "Standard",
    price: "₱36 per hour",
    status: "Available",
  },
  {
    id: "C103",
    capsule: "R-03",
    type: "Standard",
    price: "₱36 per hour",
    status: "Available",
  },
  {
    id: "C104",
    capsule: "R-04",
    type: "Standard",
    price: "₱36 per hour",
    status: "Available",
  },
  {
    id: "C105",
    capsule: "R-05",
    type: "Standard",
    price: "₱36 per hour",
    status: "Available",
  },
  {
    id: "C106",
    capsule: "R-06",
    type: "Standard",
    price: "₱36 per hour",
    status: "Under Renovation",
  },
];


{/*status na gapilan for the current state ni capsules*/}

const STATUS_STYLES = {
  "Available": "bg-[#3aae8c] text-white",
  "Coming Soon": "bg-[#ead86d] text-white",
  "Under Renovation": "bg-[#d96f72] text-white",
};

export default function StaffCapsuleManagement() {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("capsules");
  const [roomFilter, setRoomFilter] = useState("All rooms");
  const [statusFilter, setStatusFilter] = useState("All status");
  const [capsules, setCapsules] = useState(INITIAL_CAPSULES);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCapsule, setNewCapsule] = useState({
  id: "",
  capsule: "",
  type: "Standard",
  price: "",
  status: "Available",
});

  const active =
    Object.entries(ROUTES).find(
      ([, path]) => path === location.pathname
    )?.[0] ?? "CapsuleManagement";

  function handleNavigate(section) {
    navigate(ROUTES[section] ?? "/dashboard");
  }

  const filteredCapsules = useMemo(() => {
    return capsules.filter((capsule) => {
      const roomMatch =
        roomFilter === "All rooms" || capsule.capsule === roomFilter;

      const statusMatch =
        statusFilter === "All status" ||
        capsule.status === statusFilter;

      return roomMatch && statusMatch;
    });
  }, [capsules, roomFilter, statusFilter]);

  function handleArchive(id) {
    setCapsules((prev) =>
      prev.filter((capsule) => capsule.id !== id)
    );
  }

  function handleEdit(id) {
    const capsule = capsules.find((item) => item.id === id);

    if (capsule) {
      alert(`Edit ${capsule.id} - ${capsule.capsule}`);
    }
  }

 function handleAddCapsule() {
  if (
    !newCapsule.id ||
    !newCapsule.capsule ||
    !newCapsule.price
  ) {
    alert("Please fill in all required fields.");
    return;
  }

  setCapsules((prev) => [
    ...prev,
    {
      id: newCapsule.id,
      capsule: newCapsule.capsule,
      type: newCapsule.type,
      price: newCapsule.price,
      status: newCapsule.status,
    },
  ]);

  // Clear the form
  setNewCapsule({
    id: "",
    capsule: "",
    type: "Standard",
    price: "",
    status: "Available",
  });

  setShowAddModal(false);
}

  return (
    <div className="flex h-screen w-full text-slate-900">
      <StaffSidebar
        active={active}
        onNavigate={handleNavigate}
      />

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
          <div className="mx-auto w-full overflow-hidden rounded-[22px] bg-white shadow-md">

            {/* Tabs */}
            <div className="border-b border-[#9ed3c2]">
              <div className="flex h-[68px] items-end px-6">
                <button
                  type="button"
                  onClick={() => setActiveTab("capsules")}
                  className={`relative h-full px-7 text-[22px] font-bold ${
                    activeTab === "capsules"
                      ? "text-[#075333]"
                      : "text-slate-500"
                  }`}
                >
                  Capsules

                  {activeTab === "capsules" && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[#34a37c]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("archived")}
                  className={`relative h-full px-7 text-[22px] font-bold ${
                    activeTab === "archived"
                      ? "text-[#075333]"
                      : "text-slate-500"
                  }`}
                >
                  Archived

                  {activeTab === "archived" && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[#34a37c]" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-8 py-5">
              <div className="flex items-center gap-10">
                <select
                  value={roomFilter}
                  onChange={(e) => setRoomFilter(e.target.value)}
                  className="h-[36px] min-w-[126px] cursor-pointer rounded-[11px] border-0 bg-[#a6d9c9] px-3 text-[15px] font-semibold text-[#075333] outline-none"
                >
                  <option>All rooms</option>
                  <option>R-01</option>
                  <option>R-02</option>
                  <option>R-03</option>
                  <option>R-04</option>
                  <option>R-05</option>
                  <option>R-06</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-[36px] min-w-[126px] cursor-pointer rounded-[11px] border-0 bg-[#a6d9c9] px-3 text-[15px] font-semibold text-[#075333] outline-none"
                >
                  <option>All status</option>
                  <option>Available</option>
                  <option>Coming Soon</option>
                  <option>Under Renovation</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                className="rounded-[11px] bg-[#a6d9c9] px-4 py-2 text-[15px] font-bold text-[#075333] transition hover:bg-[#91cdbb]"
                >
                + Add capsule
              </button>
            </div>

            {/* for the table */}
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <thead>
                  <tr className="bg-[#34a37c] text-white">
                    <th className="w-[18%] px-6 py-3 text-left text-[15px] font-bold">
                      CAPSULE ID
                    </th>

                    <th className="w-[18%] px-6 py-3 text-left text-[15px] font-bold">
                      CAPSULE
                    </th>

                    <th className="w-[18%] px-6 py-3 text-left text-[15px] font-bold">
                      TYPE
                    </th>

                    <th className="w-[20%] px-6 py-3 text-left text-[15px] font-bold">
                      PRICE
                    </th>

                    <th className="w-[16%] px-6 py-3 text-left text-[15px] font-bold">
                      STATUS
                    </th>

                    <th className="w-[10%] px-4 py-3"></th>
                  </tr>
                </thead>

                <tbody>
                  {filteredCapsules.map((capsule) => (
                    <tr
                      key={capsule.id}
                      className="h-[63px] border-b border-[#9ed3c2] last:border-b-0"
                    >
                      <td className="px-6 text-[16px] font-medium text-[#39745f]">
                        {capsule.id}
                      </td>

                      <td className="px-6 text-[16px] font-medium text-[#39745f]">
                        {capsule.capsule}
                      </td>

                      <td className="px-6 text-[16px] font-medium text-[#39745f]">
                        {capsule.type}
                      </td>

                      <td className="px-6 text-[16px] font-medium text-[#39745f]">
                        {capsule.price}
                      </td>

                      <td className="px-6">
                        <span
                          className={`inline-flex min-w-[98px] justify-center rounded-full px-4 py-2 text-[14px] font-medium ${
                            STATUS_STYLES[capsule.status]
                          }`}
                        >
                          {capsule.status}
                        </span>
                      </td>

                      <td className="px-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(capsule.id)}
                            title="Edit capsule"
                            className="flex h-7 w-9 items-center justify-center rounded-md bg-slate-200 text-slate-600 hover:bg-slate-300"
                          >
                            ✎
                          </button>

                          {/* Archive */}
                          <button
                            type="button"
                            onClick={() =>
                              handleArchive(capsule.id)
                            }
                            title="Archive capsule"
                            className="flex h-7 w-9 items-center justify-center rounded-md bg-slate-200 text-slate-600 hover:bg-slate-300"
                          >
                            ▰
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredCapsules.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 text-center text-sm text-slate-400"
                      >
                        No capsules found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

{/* For adding new capsule kadtong overlay ito, once na i click nimo ang add capsule button*/}
        {showAddModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">

      {/* Modal Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[#075333]">
          Add Capsule
        </h2>

        <button
          type="button"
          onClick={() => setShowAddModal(false)}
          className="text-2xl text-slate-400 hover:text-slate-600"
        >
          ×
        </button>
      </div>

      {/* Form */}
      <div className="space-y-4">

        {/* Capsule ID */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Capsule ID
          </label>

          <input
            type="text"
            value={newCapsule.id}
            onChange={(e) =>
              setNewCapsule({
                ...newCapsule,
                id: e.target.value,
              })
            }
            placeholder="e.g. C107"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#34a37c]"
          />
        </div>

        {/* Capsule */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Capsule
          </label>

          <input
            type="text"
            value={newCapsule.capsule}
            onChange={(e) =>
              setNewCapsule({
                ...newCapsule,
                capsule: e.target.value,
              })
            }
            placeholder="e.g. R-07"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#34a37c]"
          />
        </div>

        {/* Type */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Type
          </label>

          <select
            value={newCapsule.type}
            onChange={(e) =>
              setNewCapsule({
                ...newCapsule,
                type: e.target.value,
              })
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#34a37c]"
          >
            <option value="Standard">Standard</option>
            <option value="Premium">Premium</option>
          </select>
        </div>

        {/* Price */}
        <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700">
            Price
        </label>

        <div className="flex items-center rounded-lg border border-slate-300 focus-within:border-[#34a37c]">
            <span className="pl-3 text-slate-600">₱</span>

            <input
            type="text"
            value={newCapsule.price}
            onChange={(e) =>
                setNewCapsule({
                ...newCapsule,
                price: e.target.value,
                })
            }
            placeholder="36 per hour"
            className="w-full border-0 px-2 py-2 outline-none"
            />
        </div>
        </div>

        {/* Status */}
        <div>
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Status
          </label>

          <select
            value={newCapsule.status}
            onChange={(e) =>
              setNewCapsule({
                ...newCapsule,
                status: e.target.value,
              })
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#34a37c]"
          >
            <option value="Available">Available</option>
            <option value="Coming Soon">Coming Soon</option>
            <option value="Under Renovation">Under Renovation</option>
          </select>
        </div>

      </div>

      {/* Buttons */}
      <div className="mt-7 flex justify-end gap-3">

        <button
          type="button"
          onClick={() => setShowAddModal(false)}
          className="rounded-lg bg-slate-200 px-5 py-2 font-semibold text-slate-700 hover:bg-slate-300"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={handleAddCapsule}
          className="rounded-lg bg-[#34a37c] px-5 py-2 font-semibold text-white hover:bg-[#2d906e]"
        >
          Add Capsule
        </button>

      </div>

    </div>
  </div>
)}
      </div>
    </div>
  );
}