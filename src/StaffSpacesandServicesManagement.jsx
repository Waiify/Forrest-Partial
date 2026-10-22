import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import pageBackground from "./assets/page_background.jpeg";
import { ChevronDown, Plus, X, Archive, RotateCcw } from "lucide-react";

import StaffHeader from "./components/StaffHeader.jsx";
import StaffSidebar from "./components/StaffSidebar.jsx";

const API = "http://localhost:5000/api";

const ROUTES = {
  Dashboard: "/StaffDashboard",
  StaffSpacesandServicesManagement: "/StaffSpacesandServicesManagement",
  StaffSpacesandServicesAvailability: "/StaffSpacesandServicesAvailability",
  StaffReservation: "/StaffReservation",
  StaffReservationHistory: "/StaffReservationHistory",
  StaffSystemLogs: "/StaffSystemLogs",
};
const PAGE_TITLES = {
  Dashboard: "Dashboard",
  StaffSpacesandServicesManagement: "Spaces and Services Management",
  StaffSpacesandServicesAvailability: "Spaces and Services Availability",
  StaffReservation: "Reservation",
  StaffReservationHistory: "Reservation History",
  StaffSystemLogs: "System Logs",
};

const CATEGORIES = [
  "Study Room",
  "Capsule Pods",
  "VIP Room",
  "Conference Room",
  "Life Room",
  "Board Room",
];


const STATUS_OPTIONS = [
  "Available",
  "Reserved",
  "Occupied",
  "Coming Soon",
  "Under Maintenance",
];

const STATUS = {
  "Available": { dot: "bg-[#2F9E7A]", tile: "bg-[#86D0BB]", text: "text-[#0B3B2A]" },
  "Reserved": { dot: "bg-[#EDB04F]", tile: "bg-[#F0B65A]", text: "text-[#4A3208]" },
  "Occupied": { dot: "bg-[#A66BE6]", tile: "bg-[#B27DEB]", text: "text-[#2C1250]" },
  "Coming Soon": { dot: "bg-[#E5D04F]", tile: "bg-[#EAD86D]", text: "text-[#4A430F]" },
  "Under Maintenance": { dot: "bg-[#DC5F5F]", tile: "bg-[#E06666]", text: "text-[#4A1010]" },
};

const EMPTY_FORM = {
  id: "",
  capsule: "",
  type: "Standard",
  price: "",
  status: "Available",
  room: "Capsule Pods",
};

//ngano man kasi room 1 ito at hindi capsule pods?
const ROOM_ALIASES = {
  "Room 1": "Capsule Pods",
};
// Converts a database document into the row shape the page uses
function toRow(c) {
  return {
    id: c.capsuleId,
    capsule: c.capsuleName,
    type: c.type,
    price: `₱${c.pricePerHour} per hour`,
    pricePerHour: c.pricePerHour,
    status: c.status,
    room: ROOM_ALIASES[c.room] ?? c.room ?? "Capsule Pods",
  };
}

// Dropdown box
function Select({ value, onChange, options, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full cursor-pointer appearance-none rounded-lg bg-[#2F9E7A] pl-4 pr-10 text-sm font-semibold text-white outline-none transition hover:bg-[#2a8f6f]"
      >
        {options.map((o) => (
          <option key={o} value={o} className="text-black">
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white" />
    </div>
  );
}

// Form field (label + input)
function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#0B3B2A]">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "h-10 w-full rounded-lg border border-[#CFE3D9] bg-white px-3 text-sm text-[#0B3B2A] outline-none placeholder:text-[#8AA699] focus:border-[#2F9E7A] focus:ring-2 focus:ring-[#2F9E7A]/25";

// One gray card for a room, holding all of its tiles
function RoomCard({ title, items, onEdit, onAdd }) {
  return (
    <div className="min-h-[170px] rounded-[20px] bg-[#b3b3b3] px-4 pb-5 pt-4">
      <div className="mb-3 flex items-start justify-between">
        <h3 className="text-[17px] font-bold text-[#0b4d2c]">
          {title}{" "}
          <span className="text-[12px] font-semibold text-white/90">
            ({items.length})
          </span>
        </h3>
        <button
          type="button"
          onClick={() => onAdd(title)}
          aria-label={`Add to ${title}`}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/30 text-white hover:bg-white/50"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="py-6 text-center text-[12px] text-white/80">
          No spaces yet
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-3">
          {items.map((capsule) => {
            const s = STATUS[capsule.status] ?? STATUS["Available"];
            return (
              <button
                key={capsule.id}
                type="button"
                onClick={() => onEdit(capsule.id)}
                title={`${capsule.id} · ${capsule.type} · ${capsule.price}`}
                className={`flex h-[88px] w-[88px] flex-col items-center justify-center rounded-[14px] ${s.tile} ${s.text} shadow-sm transition hover:-translate-y-0.5 hover:shadow-md`}
              >
                <span className="text-[19px] font-medium leading-none">
                  {capsule.capsule}
                </span>
                <span className="mt-1 px-1 text-center text-[9px] font-medium leading-tight">
                  {capsule.status === "Under Maintenance"
                    ? "Maintenance"
                    : capsule.status}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function StaffSpacesandServicesManagement() {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("capsules");
  // "View" on the availability page sends the room name here
  const [roomFilter, setRoomFilter] = useState(
    CATEGORIES.includes(location.state?.category)
      ? location.state.category
      : "All rooms"
  );
  const [statusFilter, setStatusFilter] = useState("All status");
  const [capsules, setCapsules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal: null (closed), "add", or "edit"
  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const active =
    Object.entries(ROUTES).find(
      ([, path]) => path === location.pathname
    )?.[0] ?? "StaffSpacesandServicesManagement";

  function handleNavigate(section) {
    navigate(ROUTES[section] ?? ROUTES.Dashboard);
  }

  // ---------- Load data from the database ----------
  async function loadCapsules() {
    try {
      setLoading(true);
      const res = await fetch(
        `${API}/capsules?archived=${activeTab === "archived"}`
      );
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setCapsules(data.map(toRow));
    } catch (err) {
      console.error(err);
      alert("Could not load spaces. Is the server running?");
    } finally {
      setLoading(false);
    }
  }

  // Runs on first load and every time you switch tabs
  useEffect(() => {
    loadCapsules();
  }, [activeTab]);

  // ---------- Cards and filters ----------
  // The six rooms always show, plus any other room name found in the database
  const roomNames = useMemo(() => {
    const extras = [
      ...new Set(
        capsules.map((c) => c.room).filter((r) => r && !CATEGORIES.includes(r))
      ),
    ].sort();
    return [...CATEGORIES, ...extras];
  }, [capsules]);

  const visibleRooms =
    roomFilter === "All rooms"
      ? roomNames
      : roomNames.filter((r) => r === roomFilter);

  function itemsFor(room) {
    return capsules.filter(
      (c) =>
        c.room === room &&
        (statusFilter === "All status" || c.status === statusFilter)
    );
  }

  // Count of each status for the legend
  const counts = useMemo(
    () =>
      STATUS_OPTIONS.map((s) => [
        s,
        capsules.filter((c) => c.status === s).length,
      ]),
    [capsules]
  );

  // ---------- Actions ----------
  async function handleArchive(id) {
    const action = activeTab === "archived" ? "restore" : "archive";
    try {
      const res = await fetch(`${API}/capsules/${id}/${action}`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Request failed");
      loadCapsules();
    } catch (err) {
      console.error(err);
      alert(`Could not ${action} space.`);
    }
  }

  function openAddModal(room) {
    setForm({
      ...EMPTY_FORM,
      room:
        room ??
        (CATEGORIES.includes(roomFilter) ? roomFilter : EMPTY_FORM.room),
    });
    setModalMode("add");
  }

  function handleEdit(id) {
    const c = capsules.find((item) => item.id === id);
    if (!c) return;
    setForm({
      id: c.id,
      capsule: c.capsule,
      type: c.type,
      price: String(c.pricePerHour),
      status: c.status,
      room: c.room || EMPTY_FORM.room,
    });
    setModalMode("edit");
  }

  function closeModal() {
    setModalMode(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.id || !form.capsule || !form.price) {
      alert("Please fill in all required fields.");
      return;
    }
    if (isNaN(Number(form.price))) {
      alert("Price must be a number, e.g. 36");
      return;
    }

    const isEdit = modalMode === "edit";
    const url = isEdit ? `${API}/capsules/${form.id}` : `${API}/capsules`;

    const body = {
      capsuleName: form.capsule,
      room: form.room,
      type: form.type,
      pricePerHour: Number(form.price),
      status: form.status,
    };
    if (!isEdit) body.capsuleId = form.id;

    try {
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.message || "Could not save space.");
        return;
      }

      closeModal();
      loadCapsules();
    } catch (err) {
      console.error(err);
      alert("Could not reach the server.");
    }
  }

  // Keeps an old room value (like "Room 1") selectable while editing it
  const roomChoices = CATEGORIES.includes(form.room)
    ? CATEGORIES
    : [form.room, ...CATEGORIES];

  return (
    <div className="flex h-screen w-full text-slate-900">
      <StaffSidebar active={active} onNavigate={handleNavigate} />

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
          <section className="mx-auto w-full overflow-hidden rounded-2xl bg-white shadow-md">
            {/* Tabs */}
            <div className="flex gap-6 border-b border-[#CFE3D9] px-6 pt-4">
              {[
                ["capsules", "Spaces"],
                ["archived", "Archived"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`border-b-2 pb-3 text-sm font-semibold ${
                    activeTab === key
                      ? "border-[#2F9E7A] text-[#0B3B2A]"
                      : "border-transparent text-[#6F8E7F]"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Filters + Add button */}
            <div className="flex flex-wrap items-center gap-3 px-6 py-5">
              <Select
                value={roomFilter}
                onChange={setRoomFilter}
                options={["All rooms", ...roomNames]}
                className="w-48"
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={["All status", ...STATUS_OPTIONS]}
                className="w-48"
              />
              <button
                type="button"
                onClick={() => openAddModal()}
                className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#2F9E7A] px-4 text-sm font-semibold text-white transition hover:bg-[#2a8f6f]"
              >
                <Plus className="h-4 w-4" /> Add space
              </button>
            </div>

            {/* Legend: count of each status */}
            <ul className="flex flex-wrap gap-x-6 gap-y-2 border-t border-[#CFE3D9] px-6 py-3 text-xs text-[#4E6B5D]">
              {counts.map(([s, n]) => (
                <li key={s} className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${STATUS[s].dot}`} />
                  {s}{" "}
                  <span className="font-semibold text-[#0B3B2A]">({n})</span>
                </li>
              ))}
            </ul>

            {/* One card per room. Click a tile to edit it. */}
            <div className="px-6 pb-6 pt-3">
              {loading ? (
                <div className="py-16 text-center text-sm text-[#6F8E7F]">
                  Loading...
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
                  {visibleRooms.map((room) => (
                    <RoomCard
                      key={room}
                      title={room}
                      items={itemsFor(room)}
                      onEdit={handleEdit}
                      onAdd={openAddModal}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        </main>

        {/* Add / Edit modal */}
        {modalMode && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#04281A]/50 p-4 backdrop-blur-[2px]"
            onMouseDown={(e) => e.target === e.currentTarget && closeModal()}
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between border-b border-[#DCEBE3] px-6 py-5">
                <div>
                  <h2 className="text-lg font-semibold text-[#0B3B2A]">
                    {modalMode === "edit" ? `Edit ${form.capsule}` : "Add space"}
                  </h2>
                  <p className="text-sm text-[#5F7F70]">
                    {modalMode === "edit"
                      ? "Update the details and status."
                      : "Enter the details for the new space."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-[#5F7F70] hover:bg-[#EAF4EE]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 px-6 py-5">
                <Field label="ID">
                  <input
                    type="text"
                    value={form.id}
                    disabled={modalMode === "edit"}
                    onChange={(e) => setForm({ ...form, id: e.target.value })}
                    placeholder="e.g. C107"
                    className={`${inputCls} disabled:bg-slate-100 disabled:text-slate-500`}
                  />
                </Field>

                <Field label="Name">
                  <input
                    type="text"
                    value={form.capsule}
                    onChange={(e) =>
                      setForm({ ...form, capsule: e.target.value })
                    }
                    placeholder="e.g. R-07"
                    className={inputCls}
                  />
                </Field>

                {/* Which card the space belongs to */}
                <div className="col-span-2">
                  <Field label="Room">
                    <select
                      value={form.room}
                      onChange={(e) =>
                        setForm({ ...form, room: e.target.value })
                      }
                      className={inputCls}
                    >
                      {roomChoices.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="Type">
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className={inputCls}
                  >
                    <option value="Standard">Standard</option>
                    <option value="Premium">Premium</option>
                  </select>
                </Field>

                <Field label="Price per hour (₱)">
                  <input
                    type="number"
                    min="0"
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    placeholder="36"
                    className={inputCls}
                  />
                </Field>

                {/* Status buttons */}
                <div className="col-span-2">
                  <Field label="Status">
                    <div className="grid grid-cols-3 gap-2">
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          type="button"
                          key={s}
                          onClick={() => setForm({ ...form, status: s })}
                          className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition ${
                            form.status === s
                              ? "border-[#0B3B2A] bg-[#EAF4EE] text-[#0B3B2A]"
                              : "border-[#CFE3D9] text-[#5F7F70] hover:bg-[#F5FAF7]"
                          }`}
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${STATUS[s].dot}`}
                          />
                          {s}
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#DCEBE3] px-6 py-4">
                {modalMode === "edit" ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleArchive(form.id);
                      closeModal();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[#C0392B] hover:bg-[#FDECEA]"
                  >
                    {activeTab === "archived" ? (
                      <>
                        <RotateCcw className="h-4 w-4" /> Restore
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4" /> Archive
                      </>
                    )}
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-[#0B3B2A] hover:bg-[#EAF4EE]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="rounded-lg bg-[#2F9E7A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a8f6f]"
                  >
                    {modalMode === "edit" ? "Save Changes" : "Add Space"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}