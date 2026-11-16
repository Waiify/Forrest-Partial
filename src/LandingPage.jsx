import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BellRing,
  CalendarClock,
  CheckCheck,
  Clock3,
  History,
  MapPin,
  ShieldCheck,
  TimerReset,
} from "lucide-react";
import MapView from "./components/MapView.jsx";
import { site } from "./LandingConfig.js";
import useSettings from "./useSettings2.js";
import logo from "./assets/logo.jpg";

const links = [
  ["Features", "#features"],
  ["How it works", "#how"],
  ["Rates", "#rates"],
  ["Find us", "#location"],
  ["FAQ", "#faq"],
];

const features = [
  { icon: CheckCheck, title: "Real-time availability", text: "See each capsule's status — available, reserved, occupied or under maintenance — before you book." },
  { icon: CalendarClock, title: "Choose date & time", text: "Browse open time slots, search by your preferred schedule and submit a reservation request in minutes." },
  { icon: BellRing, title: "Status updates & reminders", text: "Get notified when your request is approved, before your session starts and when it is about to end." },
  { icon: TimerReset, title: "Remaining time tracker", text: "Follow a live countdown on your active reservation so you can plan your session." },
  { icon: History, title: "Reservation history", text: "Review past reservations, capsule usage and activity records anytime from your dashboard." },
  { icon: ShieldCheck, title: "Easy sign-in", text: "Register with your email or log in with Google, and reset your password with a verification code." },
];

const steps = [
  ["Create your account", "Register with your details or continue with Google."],
  ["Check availability", "Pick a date and time, then see which capsules are open."],
  ["Request a reservation", "Submit your preferred capsule and wait for staff approval."],
  ["Check in & focus", "Arrive on time and track your remaining time on your dashboard."],
];

const rateIncludes = [
  "Private capsule for focused work",
  "High-speed Wi-Fi",
  "Online reservation with staff approval",
  "Reminders before your session and expiry alerts",
];

const faqs = [
  { q: "How do I reserve a capsule?", a: "Create an account, choose your preferred date and time, pick an available capsule and submit your request. Staff will review it and you will be notified of the result." },
  { q: "How much does it cost?", a: "Capsules are ₱60 per hour. You only pay for the time you reserve." },
  { q: "Will I get a reminder?", a: "Yes. You will receive reminders before your reservation starts and a notice when it is about to expire." },
  { q: "Can I see my past reservations?", a: "Yes. Your dashboard keeps your reservation history, capsule usage and activity records." },
  { q: "I forgot my password. What do I do?", a: "Request a verification code from the login page, then use it to set a new password." },
];

const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${site.location.lat},${site.location.lng}`;

const btnPrimary =
  "inline-flex items-center justify-center rounded-full bg-canopy px-6 py-3 font-semibold text-mist transition hover:bg-fern";
const btnLight =
  "inline-flex items-center justify-center rounded-full bg-white px-6 py-3 font-semibold text-canopy transition hover:bg-lichen";
const btnOutline =
  "inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10";

function Leaf({ className = "" }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <path d="M20 180C20 80 80 20 180 20c0 100-60 160-160 160z" fill="currentColor" />
      <path d="M20 180L120 80" stroke="#eef3ea" strokeOpacity=".5" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-sage/60 bg-mist/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <a href="#top" className="flex items-center gap-3 font-display text-xl font-semibold text-canopy">
          <img src={logo} alt="Forrest logo" className="h-10 w-10 rounded-full object-cover shadow-sm ring-2 ring-emerald-100" />
          <span>{site.name}</span>
        </a>
        <ul className="hidden items-center gap-8 md:flex">
          {links.map(([label, href]) => (
            <li key={href}><a href={href} className="font-medium hover:text-fern">{label}</a></li>
          ))}
          <li><Link to="/login" className="font-medium hover:text-fern">Log in</Link></li>
          <li><Link to="/CustomerSignUp" className={btnPrimary + " !py-2"}>Sign up</Link></li>
        </ul>
        <button
          className="rounded-lg p-2 md:hidden"
          aria-label="Toggle menu"  
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>
      {open && (
        <ul className="space-y-1 border-t border-sage/60 px-5 pb-4 md:hidden">
          {links.map(([label, href]) => (
            <li key={href}>
              <a href={href} onClick={() => setOpen(false)} className="block py-2 font-medium">{label}</a>
            </li>
          ))}
          <li><Link to="/login" onClick={() => setOpen(false)} className="block py-2 font-medium">Log in</Link></li>
          <li><Link to="/CustomerSignUp" onClick={() => setOpen(false)} className={btnPrimary + " mt-2 w-full"}>Sign up</Link></li>
        </ul>
      )}
    </header>
  );
}

function Hero({ mapsEnabled, settingsLoaded }) {
  return (
    <section id="top" className="relative overflow-hidden bg-canopy text-mist">
      <Leaf className="absolute -right-16 -top-10 h-80 w-80 rotate-12 text-fern/50" />
      <Leaf className="absolute -bottom-24 left-[-3rem] h-72 w-72 -rotate-[100deg] text-fern/40" />
      <div className="relative mx-auto max-w-6xl px-5 py-24 md:py-32">
        <div className="max-w-3xl">
          <h1 className="font-display text-5xl font-semibold leading-[1.05] md:text-7xl">
            Reserve your quiet capsule, <span className="text-lichen">before you arrive.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-sage">
            Book your date and time, get reminders and track your remaining time —
            so your focused session is never interrupted.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link to="/CustomerSignUp" className={btnLight}>Create an account</Link>
            <a href="#how" className={btnOutline}>See how it works</a>
            {settingsLoaded && mapsEnabled && (
              <a href={directionsUrl} target="_blank" rel="noreferrer" className={btnOutline}>Get directions</a>
            )}
          </div>
          <dl className="mt-12 flex flex-wrap gap-x-10 gap-y-4 text-sm text-sage">
            <div><dt className="sr-only">Rate</dt><dd><span className="block font-display text-2xl font-semibold text-white">₱60</span>per hour</dd></div>
            <div><dt className="sr-only">Booking</dt><dd><span className="block font-display text-2xl font-semibold text-white">24/7</span>online booking</dd></div>
            <div><dt className="sr-only">Access</dt><dd><span className="block font-display text-2xl font-semibold text-white">Hourly</span>flexible access</dd></div>
          </dl>
        </div>
      </div>
    </section>
  );
}

function SectionTitle({ eyebrow, title, text }) {
  return (
    <div className="max-w-2xl">
      {eyebrow && <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-fern">{eyebrow}</p>}
      <h2 className="font-display text-3xl font-semibold md:text-5xl">{title}</h2>
      {text && <p className="mt-4 text-lg leading-relaxed text-canopy/75">{text}</p>}
    </div>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <SectionTitle
        eyebrow="Features"
        title="Everything you need to book and focus"
        text="A reservation system built around capsules, so you always know what is available and when your time is up."
      />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="rounded-2xl border border-sage/60 bg-white p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-lichen text-canopy" aria-hidden="true">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-xl font-semibold">{f.title}</h3>
              <p className="mt-2 leading-relaxed text-canopy/75">{f.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section id="how" className="bg-sage/40">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <SectionTitle eyebrow="How it works" title="From sign-up to your seat in four steps" />
        <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([title, text], i) => (
            <li key={title} className="relative border-t-2 border-sage pt-6">
              <span className="absolute -top-4 left-0 flex h-8 w-8 items-center justify-center rounded-full bg-canopy text-sm font-bold text-mist">
                {i + 1}
              </span>
              <h3 className="font-display text-xl font-semibold">{title}</h3>
              <p className="mt-2 leading-relaxed text-canopy/75">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Rates() {
  return (
    <section id="rates" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <SectionTitle eyebrow="Rates" title="Simple, pay-by-the-hour pricing" text="Book only the time you need." />
      <div className="mt-12 grid overflow-hidden rounded-3xl border border-sage/60 bg-white md:grid-cols-2">
        <div className="bg-canopy p-10 text-mist md:p-12">
          <p className="font-display text-6xl font-semibold md:text-7xl">
            ₱60<span className="ml-2 text-xl font-medium text-sage">/ hour</span>
          </p>
          <p className="mt-4 text-sage">Flexible hourly access to a private capsule.</p>
          <Link to="/CustomerSignUp" className={btnLight + " mt-8"}>Reserve a capsule</Link>
        </div>
        <ul className="p-10 md:p-12">
          {rateIncludes.map((item) => (
            <li key={item} className="flex gap-3 border-b border-sage/60 py-3 last:border-0">
              <span className="font-bold text-fern" aria-hidden="true">✓</span>{item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Location({ mapsEnabled, settingsLoaded }) {
  return (
    <section id="location" className="bg-sage/40">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <SectionTitle eyebrow="Find us" title="Visit Forrest Co-working Space" text="Tap the pin for the address, or open directions in Google Maps." />
        <div className="mt-12 grid gap-8 lg:grid-cols-5">
          <div className="h-[420px] overflow-hidden rounded-3xl lg:col-span-3 lg:h-[520px]">
            <MapView enabled={mapsEnabled} settingsLoaded={settingsLoaded} />
          </div>
          <div className="flex flex-col justify-between gap-6 rounded-3xl bg-white p-8 shadow-[0_20px_45px_rgba(11,59,42,0.08)] lg:col-span-2">
            <div className="space-y-5">
              <div className="rounded-2xl border border-sage/60 bg-sage/20 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-canopy text-mist">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <h3 className="font-display text-2xl font-semibold">Address</h3>
                </div>
                <p className="mt-4 leading-relaxed text-canopy/80">{site.location.address}</p>
              </div>

              <div className="rounded-2xl border border-sage/60 bg-mist p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-lichen text-canopy">
                    <Clock3 className="h-4 w-4" />
                  </div>
                  <h3 className="font-display text-2xl font-semibold">Opening hours</h3>
                </div>
                <div className="mt-4 space-y-3">
                  {site.hours.map(([d, h]) => (
                    <div key={d} className="flex items-center justify-between gap-4 border-b border-sage/60 pb-2 last:border-0 last:pb-0">
                      <dt className="text-sm font-medium text-canopy/75">{d}</dt>
                      <dd className="text-sm font-semibold text-canopy">{h}</dd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {settingsLoaded && mapsEnabled && (
              <a href={directionsUrl} target="_blank" rel="noreferrer" className={btnPrimary + " w-full"}>Get directions</a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-20 md:py-28">
      <SectionTitle eyebrow="FAQ" title="Questions people ask" />
      <div className="mt-10 divide-y divide-canopy/15 border-y border-canopy/15">
        {faqs.map((f) => (
          <details key={f.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl font-semibold">
              {f.q}
              <span className="text-2xl text-fern transition group-open:rotate-180" aria-hidden="true">⌄</span>
            </summary>
            <p className="mt-3 leading-relaxed text-canopy/80">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-6xl px-5 pb-20 md:pb-28">
      <div className="flex flex-wrap items-center justify-between gap-8 rounded-[2.5rem] bg-canopy p-10 text-mist md:p-14">
        <div className="max-w-xl">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">Ready for a distraction-free session?</h2>
          <p className="mt-3 text-lg text-sage">Create your account and reserve a capsule today.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link to="/CustomerSignUp" className={btnLight}>Sign up free</Link>
          <a href={`tel:${site.phone.replace(/\s/g, "")}`} className={btnOutline}>Call {site.phone}</a>
          <a href={`mailto:${site.email}`} className={btnOutline}>Email us</a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-sage/60">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm sm:flex-row">
        <p>© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
        <div className="flex gap-6">
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const settings = useSettings();

  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = "smooth";
    return () => { root.style.scrollBehavior = previous; };
  }, []);

  return (
    <div className="bg-mist font-landing text-canopy">
      <Navbar />
      <main>
        <Hero mapsEnabled={settings.googleMapsEnabled} settingsLoaded={settings.settingsLoaded} />
        <Features />
        <HowItWorks />
        <Rates />
        <Location mapsEnabled={settings.googleMapsEnabled} settingsLoaded={settings.settingsLoaded} />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}