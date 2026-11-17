import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import pageBackground from "./assets/page_background.jpeg";
import { ChevronDown, Plus, X, Archive, RotateCcw } from "lucide-react";

import Header from "./components/AdminHeader.jsx";
import Sidebar from "./components/Adminsidebar.jsx";

const API = "http://localhost:5000/api";
// The server saves each space in its room's own collection, based on the room name
const CAPSULES = `${API}/capsules`;

// Rooms that always show a card, in this order
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
  Available: { dot: "bg-[#2F9E7A]", tile: "bg-[#86D0BB]", text: "text-[#0B3B2A]" },
  Reserved: { dot: "bg-[#EDB04F]", tile: "bg-[#F0B65A]", text: "text-[#4A3208]" },
  Occupied: { dot: "bg-[#A66BE6]", tile: "bg-[#B27DEB]", text: "text-[#2C1250]" },
  "Coming Soon": { dot: "bg-[#E5D04F]", tile: "bg-[#EAD86D]", text: "text-[#4A430F]" },
  "Under Maintenance": { dot: "bg-[#DC5F5F]", tile: "bg-[#E06666]", text: "text-[#4A1010]" },
};

const ROOM_TYPES = ["Standard", "Premium"];

const EMPTY_FORM = {
  id: "",
  capsule: "",
  type: "Standard",
  price: "",
  status: "Available",
  room: "Capsule Pods",
};

// Converts a database document into the row shape the page uses.
function toRow(c) {
  return {
    id: c.capsuleId,
    capsule: c.capsuleName,
    type: c.type,
    price: `₱${c.pricePerHour} per hour`,
    pricePerHour: c.pricePerHour,
    status: c.status,
    room: c.room,
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
          No services yet
        </div>
      ) : (
        <div className="flex flex-wrap justify-center gap-3">
          {items.map((capsule) => {
            const s = STATUS[capsule.status] ?? STATUS.Available;
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

/* ---------- Statistics (admin only) ---------- */

// Statuses that can't be used right now (left out of occupancy/utilization)
const OUT_OF_SERVICE = ["Under Maintenance", "Coming Soon"];
const pct = (n, d) => (d ? Math.round((n / d) * 1000) / 10 : 0);

function Bar({ value, color = "bg-[#2F9E7A]" }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#EAF4EE]">
      <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function StatsPanel({ capsules }) {
  const s = useMemo(() => {
    const count = (st) => capsules.filter((c) => c.status === st).length;
    const total = capsules.length;
    const occupied = count("Occupied");
    const reserved = count("Reserved");
    const available = count("Available");
    const outOfService = capsules.filter((c) =>
      OUT_OF_SERVICE.includes(c.status)
    ).length;
    const operational = total - outOfService;

    const perType = ROOM_TYPES.map((t) => {
      const list = capsules.filter(
        (c) => c.type === t && !OUT_OF_SERVICE.includes(c.status)
      );
      const occ = list.filter((c) => c.status === "Occupied").length;
      const used = list.filter(
        (c) => c.status === "Occupied" || c.status === "Reserved"
      ).length;
      return {
        type: t,
        total: list.length,
        occupied: occ,
        occupancy: pct(occ, list.length),
        utilization: pct(used, list.length),
      };
    });

    const hourlyRevenue = capsules
      .filter((c) => c.status === "Occupied")
      .reduce((sum, c) => sum + Number(c.pricePerHour || 0), 0);

    return {
      occupied,
      reserved,
      available,
      outOfService,
      operational,
      perType,
      hourlyRevenue,
      occupancy: pct(occupied, operational),
      utilization: pct(occupied + reserved, operational),
    };
  }, [capsules]);

  const cards = [
    ["Occupancy rate", `${s.occupancy}%`, `${s.occupied} of ${s.operational} usable services`],
    ["Utilization rate", `${s.utilization}%`, `${s.occupied + s.reserved} occupied or reserved`],
    ["Available now", s.available, "Ready for booking"],
    ["Out of service", s.outOfService, "Maintenance / coming soon"],
    ["Live revenue rate", `₱${s.hourlyRevenue.toLocaleString()}/hr`, "From occupied services"],
  ];

  return (
    <div className="border-t border-[#CFE3D9] px-6 py-5">
      <h3 className="mb-3 text-sm font-semibold text-[#0B3B2A]">
        Occupancy & utilization
      </h3>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map(([label, value, hint]) => (
          <div key={label} className="rounded-xl border border-[#CFE3D9] bg-[#F5FAF7] p-4">
            <p className="text-xs text-[#5F7F70]">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-[#0B3B2A]">{value}</p>
            <p className="mt-0.5 text-xs text-[#6F8E7F]">{hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {s.perType.map((t) => (
          <div key={t.type} className="rounded-xl border border-[#CFE3D9] p-4">
            <div className="mb-2 flex justify-between text-sm">
              <span className="font-medium text-[#0B3B2A]">{t.type}</span>
              <span className="text-[#5F7F70]">
                {t.occupied}/{t.total} occupied
              </span>
            </div>
            <p className="mb-1 text-xs text-[#5F7F70]">Occupancy {t.occupancy}%</p>
            <Bar value={t.occupancy} color="bg-[#A66BE6]" />
            <p className="mb-1 mt-3 text-xs text-[#5F7F70]">Utilization {t.utilization}%</p>
            <Bar value={t.utilization} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function AdminCapsule() {
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("capsules");
  const [roomFilter, setRoomFilter] = useState(
    location.state?.category ? location.state.category : "All services"
  );
  const [statusFilter, setStatusFilter] = useState("All status");
  const [query, setQuery] = useState("");
  const [capsules, setCapsules] = useState([]);
  const [serverRooms, setServerRooms] = useState([]); // every room registered on the server
  const [loading, setLoading] = useState(true);

  // Space modal: null (closed), "add", or "edit"
  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  // New-room modal
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");

  const active =
    location.pathname === "/customers"
      ? "Customers"
      : location.pathname === "/capsule" || location.pathname === "/admincapsule"
        ? "Capsule"
        : "Dashboard";

  function handleNavigate(section) {
    if (section === "Customers") return navigate("/customers");
    if (section === "Capsule") return navigate("/admincapsule");
    if (
      section === "User Management" ||
      section === "Staff Management" ||
      section === "Management"
    )
      return navigate("/management");
    if (section === "Reservation") return navigate("/reservation");
    if (section === "Settings") return navigate("/settings");
    if (section === "Reports" || section === "transactions")
      return navigate("/reports");
    navigate("/dashboard");
  }

  // ---------- Load data from the database ----------
  // scope=all asks the server for the spaces of every room (each in its own collection)
  async function loadCapsules() {
    try {
      setLoading(true);
      const res = await fetch(
        `${CAPSULES}?archived=${activeTab === "archived"}&scope=all`
      );
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setCapsules(data.map(toRow));
    } catch (err) {
      console.error(err);
      alert("Could not load services. Is the server running?");
    } finally {
      setLoading(false);
    }
  }

  async function loadRooms() {
    try {
      const res = await fetch(`${CAPSULES}/rooms`);
      if (!res.ok) throw new Error("Request failed");
      setServerRooms(await res.json());
    } catch (err) {
      // Not fatal: the page still shows the default rooms
      console.error(err);
    }
  }

  // Runs on first load and every time you switch tabs
  useEffect(() => {
    loadCapsules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    loadRooms();
  }, []);

  // ---------- Cards and filters ----------
  // The six default rooms first, then rooms created later (A-Z)
  const roomNames = useMemo(() => {
    const extras = [...new Set([...serverRooms, ...capsules.map((c) => c.room)])]
      .filter((r) => r && !CATEGORIES.includes(r))
      .sort((a, b) => a.localeCompare(b));
    return [...CATEGORIES, ...extras];
  }, [serverRooms, capsules]);

  // Ignore a filter that points at a room that doesn't exist
  const effectiveRoomFilter =
    roomFilter === "All services" || roomNames.includes(roomFilter)
      ? roomFilter
      : "All services";

  const visibleRooms =
    effectiveRoomFilter === "All services"
      ? roomNames
      : roomNames.filter((r) => r === effectiveRoomFilter);

  // Tiles for one room, after the status filter and the header search
  function itemsFor(room) {
    const q = query.trim().toLowerCase();
    return capsules.filter(
      (c) =>
        c.room === room &&
        (statusFilter === "All status" || c.status === statusFilter) &&
        (!q || `${c.capsule} ${c.type} ${c.status}`.toLowerCase().includes(q))
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
  // Archive (or restore) instead of delete
  async function handleArchive(id) {
    const action = activeTab === "archived" ? "restore" : "archive";
    try {
      const res = await fetch(
        `${CAPSULES}/${encodeURIComponent(id)}/${action}`,
        { method: "PATCH" }
      );
      if (!res.ok) throw new Error("Request failed");
      loadCapsules();
    } catch (err) {
      console.error(err);
      alert(`Could not ${action} service.`);
    }
  }

  function openAddModal(room) {
    setForm({
      ...EMPTY_FORM,
      room:
        room ??
        (roomNames.includes(effectiveRoomFilter)
          ? effectiveRoomFilter
          : EMPTY_FORM.room),
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
      room: c.room,
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
    if (isNaN(Number(form.price)) || Number(form.price) <= 0) {
      alert("Price must be a number greater than 0, e.g. 36");
      return;
    }

    const isEdit = modalMode === "edit";

    if (!isEdit && capsules.some((c) => c.id === form.id.trim())) {
      alert("This ID is already in use.");
      return;
    }

    const url = isEdit ? `${CAPSULES}/${encodeURIComponent(form.id)}` : CAPSULES;

    const body = {
      capsuleName: form.capsule.trim().toUpperCase(),
      type: form.type,
      pricePerHour: Number(form.price),
      status: form.status,
    };
    // For a new space the room decides which collection it is saved in
    if (!isEdit) {
      body.capsuleId = form.id.trim();
      body.room = form.room;
    }

    try {
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Could not save service.");
        return;
      }

      closeModal();
      loadCapsules();
    } catch (err) {
      console.error(err);
      alert("Could not reach the server.");
    }
  }

  // Creates a new room type (and its own collection) on the server
  async function handleCreateRoom() {
    const name = newRoomName.trim().replace(/\s+/g, " ");
    if (!name) {
      alert("Please enter a name for the new room.");
      return;
    }

    try {
      const res = await fetch(`${CAPSULES}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data.message || "Could not create room.");
        return;
      }

      setRoomModalOpen(false);
      setNewRoomName("");
      await loadRooms();
    } catch (err) {
      console.error(err);
      alert("Could not reach the server.");
    }
  }

  return (
    <div className="flex h-screen w-full text-slate-900">
      <Sidebar active={active} onNavigate={handleNavigate} />

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
        <Header active={active} query={query} setQuery={setQuery} />

        <main className="flex-1 overflow-y-auto p-6">
          <section className="mx-auto w-full overflow-hidden rounded-2xl bg-white shadow-md">
            {/* Tabs */}
            <div className="flex gap-6 border-b border-[#CFE3D9] px-6 pt-4">
              {[
                ["capsules", "Services"],
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

            {/* Admin statistics (Services tab only) */}
            {activeTab === "capsules" && !loading && (
              <StatsPanel capsules={capsules} />
            )}

            {/* Filters + Add buttons */}
            <div className="flex flex-wrap items-center gap-3 border-t border-[#CFE3D9] px-6 py-5">
              <Select
                value={effectiveRoomFilter}
                onChange={setRoomFilter}
                options={["All services", ...roomNames]}
                className="w-48"
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={["All status", ...STATUS_OPTIONS]}
                className="w-48"
              />
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => setRoomModalOpen(true)}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-[#2F9E7A] px-4 text-sm font-semibold text-[#2F9E7A] transition hover:bg-[#EAF4EE]"
                >
                  <Plus className="h-4 w-4" /> New room
                </button>
                <button
                  type="button"
                  onClick={() => openAddModal()}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#2F9E7A] px-4 text-sm font-semibold text-white transition hover:bg-[#2a8f6f]"
                >
                  <Plus className="h-4 w-4" /> Add service
                </button>
              </div>
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

        {/* New room modal */}
        {roomModalOpen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#04281A]/50 p-4 backdrop-blur-[2px]"
            onMouseDown={(e) =>
              e.target === e.currentTarget && setRoomModalOpen(false)
            }
          >
            <div
              role="dialog"
              aria-modal="true"
              className="w-full max-w-sm rounded-2xl bg-white shadow-2xl"
            >
              <div className="flex items-start justify-between border-b border-[#DCEBE3] px-6 py-5">
                <div>
                  <h2 className="text-lg font-semibold text-[#0B3B2A]">
                    New room
                  </h2>
                  <p className="text-sm text-[#5F7F70]">
                    Services in this room are saved in their own collection.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRoomModalOpen(false)}
                  aria-label="Close"
                  className="rounded-lg p-1.5 text-[#5F7F70] hover:bg-[#EAF4EE]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="px-6 py-5">
                <Field label="Room name">
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateRoom()}
                    placeholder="e.g. Game Room"
                    className={inputCls}
                    autoFocus
                  />
                </Field>
              </div>

              <div className="flex justify-end gap-2 border-t border-[#DCEBE3] px-6 py-4">
                <button
                  type="button"
                  onClick={() => setRoomModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-[#0B3B2A] hover:bg-[#EAF4EE]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateRoom}
                  className="rounded-lg bg-[#2F9E7A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a8f6f]"
                >
                  Create room
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add / Edit space modal */}
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
                    {modalMode === "edit" ? `Edit ${form.capsule}` : "Add service"}
                  </h2>
                  <p className="text-sm text-[#5F7F70]">
                    {modalMode === "edit"
                      ? "Update the details and status."
                      : "Enter the details for the new service."}
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

                {/* The room decides which collection the space is saved in */}
                <div className="col-span-2">
                  <Field label="Room">
                    <select
                      value={form.room}
                      disabled={modalMode === "edit"}
                      onChange={(e) =>
                        setForm({ ...form, room: e.target.value })
                      }
                      className={`${inputCls} disabled:bg-slate-100 disabled:text-slate-500`}
                    >
                      {(roomNames.includes(form.room)
                        ? roomNames
                        : [form.room, ...roomNames]
                      ).map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {modalMode === "edit" && (
                    <p className="mt-1.5 text-xs text-[#6F8E7F]">
                      A service can't be moved to another room.
                    </p>
                  )}
                </div>

                <Field label="Type">
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className={inputCls}
                  >
                    {ROOM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
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
                    {modalMode === "edit" ? "Save changes" : "Add service"}
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