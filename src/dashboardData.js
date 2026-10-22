import {
  CalendarDays,
  BedSingle,
  CheckCircle2,
  DoorOpen,
} from "lucide-react";

import capsule1 from "./assets/capsules/capsule1.png";
import capsule2 from "./assets/capsules/capsule2.png";
import capsule3 from "./assets/capsules/capsule3.png";
import capsule4 from "./assets/capsules/capsule4.png";
import capsule5 from "./assets/capsules/capsule5.png";
import capsule6 from "./assets/capsules/capsule6.png";
import capsule7 from "./assets/capsules/capsule7.png";


export const CAPSULES = [
  {
    id: "A1",
    status: "Available",
    image: capsule3,
  },
  {
    id: "A2",
    status: "Available",
    image: capsule2,
  },
  {
    id: "A3",
    status: "Occupied",
    image: capsule4,
  },
  {
    id: "A4",
    status: "Reserved",
    image: capsule5,
  },
  {
    id: "A5",
    status: "Under Maintenance",
    image: capsule6,
  },
  {
  id: "A6",
  name: "Capsule A6",
  status: "Available",
  image: capsule7,
},
];

/* Upcoming reservation */
export const UPCOMING = {
  capsule: "A3",
  status: "Confirmed",
  date: "Apr 28, 2025",
  day: "Monday",
  checkIn: "09:00 AM",
  checkOut: "12:00 PM",
  image: capsule1,
};

/* para sa reservation history  */
export const RESERVATIONS = [
  {
    id: 1,
    date: "Apr 28, 2025 (Mon)",
    capsule: "A3",
    checkIn: "09:00 AM",
    checkOut: "12:00 PM",
    status: "Confirmed",
  },
  {
    id: 2,
    date: "Apr 25, 2025 (Fri)",
    capsule: "A1",
    checkIn: "01:00 PM",
    checkOut: "05:00 PM",
    status: "Completed",
  },
  {
    id: 3,
    date: "Apr 22, 2025 (Tue)",
    capsule: "A2",
    checkIn: "10:00 AM",
    checkOut: "01:00 PM",
    status: "Completed",
  },
  {
    id: 4,
    date: "Apr 18, 2025 (Fri)",
    capsule: "A4",
    checkIn: "02:00 PM",
    checkOut: "05:00 PM",
    status: "Completed",
  },
  {
    id: 5,
    date: "Apr 15, 2025 (Tue)",
    capsule: "A1",
    checkIn: "09:00 AM",
    checkOut: "12:00 PM",
    status: "Completed",
  },
];

/* for summary cards ni*/
export const STATS = [
  {
    label: "Upcoming Reservations",
    value: 1,
    note: "Next reservation is in 2 days",
    icon: CalendarDays,
    tint: "bg-[#CFE9DC]",
    go: "My Reservation",
  },
  {
    label: "Active Reservation",
    value: 0,
    note: "No active bookings",
    icon: BedSingle,
    tint: "bg-[#E4D3F7]",
    go: "My Reservations",
  },
  {
    label: "Completed Visits",
    value: 8,
    note: "Total visits so far",
    icon: CheckCircle2,
    tint: "bg-[#CFE9DC]",
    go: "Reservation History",
  },
  {
  label: "Available Capsules",
  value: 3,
  note: "Ready for booking",
  icon: DoorOpen,
  tint: "bg-[#CFE9DC]",
  go: "Book a Capsule",
},
];


export function getUser() {
  try {
    return JSON.parse(sessionStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}