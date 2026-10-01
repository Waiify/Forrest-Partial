import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "./components/AdminHeader.jsx";
import Sidebar from "./components/Adminsidebar.jsx";

import {
  ChevronDown,
  Plus,
  X,
  Trash2,
} from "lucide-react";


/* Capsule status colors */
const STATUS = {
  Available: { dot: "bg-[#2F9E7A]", tile: "bg-[#86D0BB]", text: "text-[#0B3B2A]" },
  Occupied: { dot: "bg-[#A66BE6]", tile: "bg-[#B27DEB]", text: "text-[#2C1250]" },
  Reserved: { dot: "bg-[#EDB04F]", tile: "bg-[#F0B65A]", text: "text-[#4A3208]" },
  Maintenance: { dot: "bg-[#DC5F5F]", tile: "bg-[#E06666]", text: "text-[#4A1010]" },
};

/* Capsule types */
const ROOM_TYPES = ["Standard", "Premium", "Family"];

/* Sample capsule data */
const SEED = [
  ["R-01", "Standard", "Available", 450],
  ["R-02", "Standard", "Reserved", 450],
  ["R-03", "Premium", "Occupied", 650],
  ["R-04", "Premium", "Occupied", 650],
  ["R-05", "Standard", "Available", 450],
  ["R-06", "Family", "Reserved", 900],
  ["R-07", "Family", "Reserved", 900],
  ["R-08", "Premium", "Maintenance", 650],
  ["R-09", "Standard", "Available", 450],
  ["R-10", "Standard", "Reserved", 450],
  ["R-11", "Premium", "Occupied", 650],
  ["R-12", "Standard", "Available", 450],
].map(([code, type, status, rate], i) => ({
  id: i + 1,
  code,
  type,
  status,
  rate,
  floor: i < 6 ? 1 : 2,
  notes: "",
}));

/* Empty form values */
const EMPTY_FORM = {
  code: "",
  type: "Standard",
  status: "Available",
  rate: "",
  floor: 1,
  notes: "",
};


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
function CapsuleModal({ capsule, existingCodes, onSave, onDelete, onClose }) {
  /* Check the editing*/
  const editing = Boolean(capsule);
  const [form, setForm] = useState(capsule ?? EMPTY_FORM);
  const [errors, setErrors] = useState({});

  /* Change a form value */
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  /* form submission */
  const submit = (e) => {
    e.preventDefault();
    const next = {};
    const code = form.code.trim().toUpperCase();
    if (!code) next.code = "Enter a capsule code, for example R-13.";
    else if (existingCodes.includes(code) && code !== capsule?.code)
      next.code = "This code is already in use.";
    if (form.rate === "" || Number(form.rate) <= 0) next.rate = "Enter a rate greater than 0.";
    setErrors(next);
    if (Object.keys(next).length) return;
    onSave({ ...form, code, rate: Number(form.rate), floor: Number(form.floor) });
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
          <Field label="Capsule code" error={errors.code}>
            <input
              className={inputCls}
              placeholder="R-13"
              value={form.code}
              onChange={(e) => set("code")(e.target.value)}
              autoFocus
            />
          </Field>
          <Field label="Room type">
            <select className={inputCls} value={form.type} onChange={(e) => set("type")(e.target.value)}>
              {ROOM_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Rate per night (₱)" error={errors.rate}>
            <input
              type="number"
              min="0"
              className={inputCls}
              placeholder="450"
              value={form.rate}
              onChange={(e) => set("rate")(e.target.value)}
            />
          </Field>
          <Field label="Rooms">
            <input
              type="number"
              min="1"
              className={inputCls}
              value={form.floor}
              onChange={(e) => set("floor")(e.target.value)}
            />
          </Field>
          <div className="col-span-2">
            <Field label="Status">
              <div className="grid grid-cols-4 gap-2">
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
          <div className="col-span-2">
            <Field label="Notes (optional)">
              <textarea
                rows={2}
                className={`${inputCls} h-auto resize-none py-2`}
                placeholder="Amenities, issues, or reminders for staff"
                value={form.notes}
                onChange={(e) => set("notes")(e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#DCEBE3] px-6 py-4">
          {editing ? (
            <button
              type="button"
              onClick={() => onDelete(capsule.id)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-[#C0392B] hover:bg-[#FDECEA]"
            >
              <Trash2 className="h-4 w-4" /> Delete
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
  const [capsules, setCapsules] = useState(SEED);
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
      : location.pathname === "/capsule" || location.pathname === "/capsules"
        ? "Capsule"
        : "Dashboard";

  function handleNavigate(section) {
    if (section === "Customers") {
      navigate("/customers");
      return;
    }
    if (section === "Capsule") {
      navigate("/capsule");
      return;
    }
    navigate("/dashboard");
  }

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
  const save = (data) => {
    setCapsules((list) =>
      modal === "new"
        ? [...list, { ...data, id: Math.max(0, ...list.map((c) => c.id)) + 1 }]
        : list.map((c) => (c.id === modal.id ? { ...c, ...data } : c))
    );
    setModal(null);
  };

  /* Remove a capsule */
  const remove = (id) => {
    setCapsules((list) => list.filter((c) => c.id !== id));
    setModal(null);
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900">
      <Sidebar active={active} onNavigate={handleNavigate} />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header active={active} query={query} setQuery={setQuery} />

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <section className="rounded-2xl bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-3 px-6 py-5">
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={["All status", ...Object.keys(STATUS)]}
                className="w-40"
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
              {visible.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <p className="font-semibold">No capsules match these filters</p>
                  <p className="mt-1 text-sm text-[#6F8E7F]">Clear a filter or add a new capsule.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
                  {visible.map((c) => {
                    const s = STATUS[c.status];
                    return (
                      <button
                        key={c.id}
                        onClick={() => setModal(c)}
                        title={`${c.type} · Floor ${c.floor} · ₱${c.rate}/night`}
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
          existingCodes={capsules.map((c) => c.code)}
          onSave={save}
          onDelete={remove}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

