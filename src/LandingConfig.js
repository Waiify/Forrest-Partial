// Edit everything about the site here. Replace every "PLACEHOLDER" value.
export const site = {
  name: "Forrest Study Hub",
  tagline: "A quiet place to do your best work.",
  intro:
    "Fast Wi-Fi, comfortable seats and a calm, green atmosphere. Come in for an hour, a day or the whole semester.",

  // ---- Location (used by the Google Map) ----
  location: { 
    lat: 8.157752646516787, // PLACEHOLDER: replace with your hub's latitude
    lng: 125.12491639812347, // PLACEHOLDER: replace with your hub's longitude
    address: "2nd Floor, Lim, Estrada's Building, Cudal St, Malaybalay City, Bukidnon",
    zoom: 16,
  },

  phone: "09338228939",
  email: "hello@forreststudyhub.com",
  social: { facebook: "https://facebook.com/", instagram: "https://instagram.com/" },

  hours: [
    ["Monday to Friday", "7:00 AM to 10:00 PM"],
    ["Saturday", "8:00 AM to 9:00 PM"],
    ["Sunday", "9:00 AM to 6:00 PM"],
  ],
};

export const features = [
  { icon: "📶", title: "Fast, stable Wi-Fi", text: "Fiber internet that keeps up with video calls and online exams." },
  { icon: "🔇", title: "Quiet zones", text: "Silent study areas, with a separate space for group discussions." },
  { icon: "🔌", title: "Power at every seat", text: "Outlets and USB ports at each desk so your devices stay charged." },
  { icon: "❄️", title: "Air-conditioned", text: "A cool, comfortable room even in the middle of the afternoon." },
  { icon: "🖨️", title: "Printing and scanning", text: "Print your readings and requirements without leaving the hub." },
  { icon: "☕", title: "Coffee and snacks", text: "Refill your energy at our pantry corner." },
];

export const plans = [
  { name: "Hourly", price: "₱50", per: "per hour", items: ["Any open seat", "Free Wi-Fi", "Outlet access"] },
  { name: "Day pass", price: "₱200", per: "per day", featured: true, items: ["Reserved seat for the day", "Free Wi-Fi", "One free coffee", "Locker use"] },
  { name: "Monthly", price: "₱3,500", per: "per month", items: ["Your own assigned desk", "Unlimited access during opening hours", "Locker included", "Discounted printing"] },
];

export const testimonials = [
  { quote: "I finally found a place where I can focus. The quiet zone is a lifesaver during exam weeks.", name: "Student name", role: "Nursing student" },
  { quote: "Stable internet and a comfortable chair. I do my remote work here every day.", name: "Customer name", role: "Freelancer" },
  { quote: "Our review group meets here every weekend. The staff are friendly and the space is always clean.", name: "Customer name", role: "Board exam reviewee" },
];

export const faqs = [
  { q: "Do I need to reserve a seat?", a: "Walk-ins are welcome. For day passes and monthly desks, we recommend contacting us first so we can hold your spot." },
  { q: "Can I bring my own food and drinks?", a: "Light snacks and covered drinks are fine at the pantry corner. Please keep the study areas clean." },
  { q: "Are there group study rooms?", a: "Yes. Ask our staff about our discussion area for groups." },
  { q: "How do I pay?", a: "We accept cash and common e-wallets. Message us for the current options." },
];