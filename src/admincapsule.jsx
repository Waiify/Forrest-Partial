import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "./components/AdminHeader.jsx";
import Sidebar from "./components/Adminsidebar.jsx";

import {
  ChevronDown,
  Plus,
  X,
  Archive,
  RotateCcw,
} from "lucide-react";

// Address sa backend server
const API = "http://localhost:5000/api";

/* Capsule status colors */
// Ang mga ngalan kinahanglan parehas sa gi-save sa database
const STATUS = {
  Available: { dot: "bg-[#2F9E7A]", tile: "bg-[#86D0BB]", text: "text-[#0B3B2A]" },
  Reserved: { dot: "bg-[#EDB04F]", tile: "bg-[#F0B65A]", text: "text-[#4A3208]" },
  Occupied: { dot: "bg-[#A66BE6]", tile: "bg-[#B27DEB]", text: "text-[#2C1250]" },
  "Coming Soon": { dot: "bg-[#E5D04F]", tile: "bg-[#EAD86D]", text: "text-[#4A430F]" },
  "Under Maintenance": { dot: "bg-[#DC5F5F]", tile: "bg-[#E06666]", text: "text-[#4A1010]" },
};

/* Capsule types */
// Standard ug Premium ra ang gitugot sa database
const ROOM_TYPES = ["Standard", "Premium"];

/* Empty form values */
// Gi-usab: id, code (capsule name), rate (per hour), room. Wala na ang notes
const EMPTY_FORM = {
  id: "",
  code: "",
  type: "Standard",
  status: "Available",
  rate: "",
  room: "Room 1",
};

// I-convert ang database document ngadto sa row nga gamiton sa page
function toRow(c) {
  return {
    id: c.capsuleId,
    code: c.capsuleName,
    type: c.type,
    status: c.status,
    rate: c.pricePerHour,
    room: c.room || "Room 1",
  };
}


/* Dropdown box */
function Select({ value, onChange, options, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full cursor-pointer appearance-none rounded-lg bg-[#2F9E7A] pl-4 pr-10 text-sm font-semibold text-white outline-none transition hover:bg-[#2a8f6f] focus-visible:ring-offset-2"
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

/* Form field */
function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-[#0B3B2A]">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-[#C0392B]">{error}</span>}
    </label>
  );
}

/* Input style */
const inputCls =
  "h-10 w-full rounded-lg border border-[#CFE3D9] bg-white px-3 text-sm text-[#0B3B2A] outline-none placeholder:text-[#8AA699] focus:border-[#2F9E7A] focus:ring-2 focus:ring-[#2F9E7A]/25";


/* Add or edit capsule window */
// Gi-usab: Delete nahimong Archive/Restore kay archive ang naa sa backend
function CapsuleModal({ capsule, existingIds, isArchivedTab, onSave, onArchive, onClose }) {
  /* Check the editing*/
  const editing = Boolean(capsule);
  // Kung edit, ibutang ang datos sa capsule sa form (ang rate himuon string)
  const [form, setForm] = useState(
    capsule ? { ...capsule, rate: String(capsule.rate) } : EMPTY_FORM
  );
  const [errors, setErrors] = useState({});

  /* Change a form value */
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  /* form submission */
  const submit = (e) => {
    e.preventDefault();
    const next = {};
    const id = form.id.trim();
    const code = form.code.trim().toUpperCase();
    // Check sa Capsule ID (para sa bag-o ra)
    if (!editing) {
      if (!id) next.id = "Enter a capsule ID, for example C107.";
      else if (existingIds.includes(id)) next.id = "This ID is already in use.";
    }
    if (!code) next.code = "Enter a capsule name, for example R-13.";
    if (form.rate === "" || Number(form.rate) <= 0) next.rate = "Enter a price greater than 0.";
    setErrors(next);
    if (Object.keys(next).length) return;
    onSave({ ...form, id, code, rate: Number(form.rate) });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#04281A]/50 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "Edit capsule" : "Add capsule"}
        className="w-full max-w-md rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-[#DCEBE3] px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-[#0B3B2A]">
              {editing ? `Edit ${capsule.code}` : "Add capsule"}
            </h2>
            <p className="text-sm text-[#5F7F70]">
              {editing ? "Update capsule details and status." : "Enter the details for the new capsule."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-[#5F7F70] hover:bg-[#EAF4EE]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 px-6 py-5">
          {/* Bag-ong field: Capsule ID (dili na ma-usab kung edit) */}
          <Field label="Capsule ID" error={errors.id}>
            <input
              className={`${inputCls} disabled:bg-slate-100 disabled:text-slate-500`}
              placeholder="C107"
              value={form.id}
              disabled={editing}
              onChange={(e) => set("id")(e.target.value)}
              autoFocus={!editing}
            />
          </Field>
          <Field label="Capsule name" error={errors.code}>
            <input
              className={inputCls}
              placeholder="R-13"
              value={form.code}
              onChange={(e) => set("code")(e.target.value)}
            />
          </Field>
          <Field label="Room type">
            <select className={inputCls} value={form.type} onChange={(e) => set("type")(e.target.value)}>
              {ROOM_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          {/* Gi-usab: per hour na, dili na per night */}
          <Field label="Price per hour (₱)" error={errors.rate}>
            <input
              type="number"
              min="0"
              className={inputCls}
              placeholder="36"
              value={form.rate}
              onChange={(e) => set("rate")(e.target.value)}
            />
          </Field>
          {/* Gi-usab: text na ang Rooms (gi-save isip "room" sa database) */}
          <div className="col-span-2">
            <Field label="Room">
              <input
                className={inputCls}
                placeholder="Room 1"
                value={form.room}
                onChange={(e) => set("room")(e.target.value)}
              />
            </Field>
          </div>
          <div className="col-span-2">
            <Field label="Status">
              <div className="grid grid-cols-3 gap-2">
                {Object.keys(STATUS).map((s) => (
                  <button
                    type="button"
                    key={s}
                    onClick={() => set("status")(s)}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-medium transition ${
                      form.status === s
                        ? "border-[#0B3B2A] bg-[#EAF4EE] text-[#0B3B2A]"
                        : "border-[#CFE3D9] text-[#5F7F70] hover:bg-[#F5FAF7]"
                    }`}
                  >
                    <span className={`h-2 w-2 rounded-full ${STATUS[s].dot}`} />
                    {s}
                  </button>
                ))}
              </div>
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#DCEBE3] px-6 py-4">
          {/* Archive o Restore ang gamit imbes nga Delete */}
          {editing ? (
            <button
              type="button"
              onClick={() => onArchive(capsule.id)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[#C0392B] hover:bg-[#FDECEA]"
            >
              {isArchivedTab ? (
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
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-[#0B3B2A] hover:bg-[#EAF4EE]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-[#2F9E7A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2a8f6f]"
            >
              {editing ? "Save changes" : "Add capsule"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

/* ---------- Page ---------- */

/* Main page */
export default function AdminCapsule() {
  const navigate = useNavigate();
  const location = useLocation();

  /* Store capsules */
  // Gikan na sa database, wala na ang SEED nga sample data
  const [capsules, setCapsules] = useState([]);
  // true samtang nag-load pa
  const [loading, setLoading] = useState(true);
  // "capsules" o "archived"
  const [activeTab, setActiveTab] = useState("capsules");
  /* Store selected status */
  const [statusFilter, setStatusFilter] = useState("All status");
  /* Store selected room type */
  const [roomFilter, setRoomFilter] = useState("All rooms");
  /* Store search text */
  const [query, setQuery] = useState("");
  /* Store the open modal */
  const [modal, setModal] = useState(null);

  const active =
    location.pathname === "/customers"
      ? "Customers"
      : location.pathname === "/capsule" || location.pathname === "/admincapsule"
        ? "Capsule"
        : "Dashboard";

  function handleNavigate(section) {
    if (section === "Customers") {
      navigate("/customers");
      return;
    }
    if (section === "Capsule") {
      navigate("/admincapsule");
      return;
    }
    if (section === "Staff Management" || section === "Management") {
      navigate("/management");
      return;
    }
    if (section === "Reservation") {
      navigate("/reservation");
      return;
    }
    navigate("/dashboard");
  }

  // Mokuha sa mga capsule gikan sa database (depende sa tab: active o archived)
  const loadCapsules = useCallback(async () => {
    try {
      const res = await fetch(`${API}/capsules?archived=${activeTab === "archived"}`);
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();
      setCapsules(data.map(toRow));
    } catch (err) {
      console.error(err);
      alert("Could not load capsules. Is the server running?");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Mo-load sa pag-abli sa page ug kada mo-switch og tab
  useEffect(() => {
    let current = true;
    fetch(`${API}/capsules?archived=${activeTab === "archived"}`)
      .then((res) => {
        if (!res.ok) throw new Error("Request failed");
        return res.json();
      })
      .then((data) => {
        if (current) setCapsules(data.map(toRow));
      })
      .catch((err) => {
        console.error(err);
        if (current) alert("Could not load capsules. Is the server running?");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [activeTab]);

  /* Get capsules that match the filters */
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return capsules.filter(
      (c) =>
        (statusFilter === "All status" || c.status === statusFilter) &&
        (roomFilter === "All rooms" || c.type === roomFilter) &&
        (!q || `${c.code} ${c.type} ${c.status}`.toLowerCase().includes(q))
    );
  }, [capsules, statusFilter, roomFilter, query]);

  /* Count each status */
  const counts = useMemo(
    () => Object.keys(STATUS).map((s) => [s, capsules.filter((c) => c.status === s).length]),
    [capsules]
  );

  /* Save capsule data */
  // I-save sa database: POST kung bag-o, PUT kung edit
  const save = async (data) => {
    const isEdit = modal !== "new";
    const url = isEdit ? `${API}/capsules/${data.id}` : `${API}/capsules`;

    const body = {
      capsuleName: data.code,
      room: data.room,
      type: data.type,
      pricePerHour: data.rate,
      status: data.status,
    };
    if (!isEdit) body.capsuleId = data.id;

    try {
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.message || "Could not save capsule.");
        return;
      }

      setModal(null);
      loadCapsules();
    } catch (err) {
      console.error(err);
      alert("Could not reach the server.");
    }
  };

  /* Remove a capsule */
  // Archive (o restore) imbes nga delete, parehas sa Staff Capsule Management
  const archive = async (id) => {
    const action = activeTab === "archived" ? "restore" : "archive";
    try {
      const res = await fetch(`${API}/capsules/${id}/${action}`, { method: "PATCH" });
      if (!res.ok) throw new Error("Request failed");
      setModal(null);
      loadCapsules();
    } catch (err) {
      console.error(err);
      alert(`Could not ${action} capsule.`);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900">
      <Sidebar active={active} onNavigate={handleNavigate} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header active={active} query={query} setQuery={setQuery} />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <section className="rounded-2xl bg-white shadow-sm">
            {/* Bag-ong tabs: Capsules ug Archived */}
            <div className="flex gap-6 border-b border-[#CFE3D9] px-6 pt-4">
              {[
                ["capsules", "Capsules"],
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

            <div className="flex flex-wrap items-center gap-3 px-6 py-5">
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={["All status", ...Object.keys(STATUS)]}
                className="w-48"
              />
              <Select
                value={roomFilter}
                onChange={setRoomFilter}
                options={["All rooms", ...ROOM_TYPES]}
                className="w-40"
              />
              <button
                onClick={() => setModal("new")}
                className="ml-auto inline-flex h-10 items-center gap-1.5 rounded-lg bg-[#2F9E7A] px-4 text-sm font-semibold text-white transition hover:bg-[#2a8f6f] focus-visible:ring-2 focus-visible:ring-[#0B3B2A] focus-visible:ring-offset-2"
              >
                <Plus className="h-4 w-4" /> Add capsule
              </button>
            </div>

            <ul className="flex flex-wrap gap-x-6 gap-y-2 border-t border-[#CFE3D9] px-6 py-3 text-xs text-[#4E6B5D]">
              {counts.map(([s, n]) => (
                <li key={s} className="flex items-center gap-2">
                  <span className={`h-3 w-3 rounded-full ${STATUS[s].dot}`} />
                  {s} <span className="font-semibold text-[#0B3B2A]">({n})</span>
                </li>
              ))}
            </ul>

            <div className="px-6 pb-6 pt-3">
              {/* Loading message samtang nag-load pa */}
              {loading ? (
                <div className="py-16 text-center text-sm text-[#6F8E7F]">Loading...</div>
              ) : visible.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <p className="font-semibold">No capsules match these filters</p>
                  <p className="mt-1 text-sm text-[#6F8E7F]">Clear a filter or add a new capsule.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
                  {visible.map((c) => {
                    const s = STATUS[c.status] ?? STATUS.Available;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setModal(c)}
                        title={`${c.type} · ${c.room} · ₱${c.rate}/hour`}
                        className={`flex aspect-[1/0.95] flex-col items-center justify-center rounded-2xl ${s.tile} ${s.text} shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-[#0B3B2A] focus-visible:ring-offset-2`}
                      >
                        <span className="text-2xl font-medium tracking-wide">{c.code}</span>
                        <span className="text-xs">{c.status}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      {modal && (
        <CapsuleModal
          capsule={modal === "new" ? null : modal}
          existingIds={capsules.map((c) => c.id)}
          isArchivedTab={activeTab === "archived"}
          onSave={save}
          onArchive={archive}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}