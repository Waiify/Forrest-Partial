import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import MapView from "./components/MapView.jsx";
import { site, features, plans, testimonials, faqs } from "./LandingConfig.js";
import useSettings from "./useSettings2.js";

const links = [
  ["Features", "#features"],
  ["Pricing", "#pricing"],
  ["Reviews", "#reviews"],
  ["Find us", "#location"],
  ["FAQ", "#faq"],
];

const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${site.location.lat},${site.location.lng}`;

const btnPrimary =
  "inline-flex items-center justify-center rounded-full bg-canopy px-6 py-3 font-semibold text-mist transition hover:bg-fern";
const btnLight =
  "inline-flex items-center justify-center rounded-full bg-lichen px-6 py-3 font-semibold text-canopy transition hover:bg-white";

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
        <a href="#top" className="font-display text-xl font-semibold">{site.name}</a>
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
      <Leaf className="absolute -right-16 -top-10 h-80 w-80 rotate-12 text-fern/60" />
      <Leaf className="absolute right-40 top-40 hidden h-44 w-44 -rotate-45 text-moss/50 md:block" />
      <Leaf className="absolute -bottom-20 left-[-3rem] h-72 w-72 -rotate-[100deg] text-fern/40" />
      <div className="relative mx-auto max-w-6xl px-5 py-24 md:py-36">
        <h1 className="max-w-3xl font-display text-5xl font-semibold leading-[1.05] md:text-7xl">
          {site.tagline}
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-sage">{site.intro}</p>
        <div className="mt-10 flex flex-wrap gap-4">
          <a href="#pricing" className={btnLight}>See plans</a>
          {settingsLoaded && mapsEnabled && (
            <a href={directionsUrl} target="_blank" rel="noreferrer"
               className="inline-flex items-center justify-center rounded-full border border-sage/70 px-6 py-3 font-semibold hover:bg-fern">
              Get directions
            </a>
          )}
        </div>
        <p className="mt-10 text-sm text-sage">{site.hours[0][0]}, {site.hours[0][1]}</p>
      </div>
    </section>
  );
}

function SectionTitle({ title, text }) {
  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-3xl font-semibold md:text-5xl">{title}</h2>
      {text && <p className="mt-4 text-lg leading-relaxed text-canopy/75">{text}</p>}
    </div>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <SectionTitle title="Everything you need to focus" text="We set up the space so you can spend your energy on studying, not on finding a seat." />
      <div className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="border-t-2 border-moss pt-5">
            <div className="text-3xl" aria-hidden="true">{f.icon}</div>
            <h3 className="mt-3 font-display text-xl font-semibold">{f.title}</h3>
            <p className="mt-2 leading-relaxed text-canopy/75">{f.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="bg-sage/40">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-20 md:grid-cols-2 md:py-28">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[2.5rem] bg-fern">
          {/* Replace this block with a real photo of your hub: <img src="/hub.jpg" className="h-full w-full object-cover" alt="Inside Forrest Study Hub" /> */}
          <Leaf className="absolute -left-6 bottom-0 h-64 w-64 text-moss" />
          <Leaf className="absolute right-6 top-6 h-32 w-32 rotate-90 text-lichen/70" />
        </div>
        <div>
          <h2 className="font-display text-3xl font-semibold md:text-5xl">Built for students and remote workers</h2>
          <p className="mt-5 text-lg leading-relaxed text-canopy/80">
            Forrest Study Hub is a calm, welcoming space for anyone who needs to concentrate.
            Whether you are reviewing for an exam, finishing a thesis or working remotely,
            you get a reliable desk, a quiet room and friendly staff who keep the place running smoothly.
          </p>
          <a href="#location" className={btnPrimary + " mt-8"}>Find the hub</a>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <SectionTitle title="Simple, flexible plans" text="Pay for the time you need. No sign-up fees." />
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`flex flex-col rounded-3xl p-8 ${p.featured ? "bg-canopy text-mist md:-translate-y-3" : "bg-white"}`}
          >
            <h3 className="font-display text-2xl font-semibold">{p.name}</h3>
            <p className="mt-4"><span className="font-display text-5xl font-semibold">{p.price}</span>{" "}
              <span className={p.featured ? "text-sage" : "text-canopy/60"}>{p.per}</span></p>
            <ul className="mt-6 flex-1 space-y-3">
              {p.items.map((i) => (
                <li key={i} className="flex gap-3">
                  <span className={p.featured ? "text-lichen" : "text-fern"} aria-hidden="true">✓</span>{i}
                </li>
              ))}
            </ul>
            <a href="#contact" className={(p.featured ? btnLight : btnPrimary) + " mt-8"}>Ask about {p.name.toLowerCase()}</a>
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section id="reviews" className="bg-canopy text-mist">
      <div className="mx-auto max-w-6xl px-5 py-20 md:py-28">
        <h2 className="font-display text-3xl font-semibold md:text-5xl">What our members say</h2>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {testimonials.map((t, i) => (
            <figure key={i}>
              <blockquote className="font-display text-xl leading-snug">“{t.quote}”</blockquote>
              <figcaption className="mt-5 text-sage">{t.name}, {t.role}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Location({ mapsEnabled, settingsLoaded }) {
  return (
    <section id="location" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <SectionTitle title="Find us" text="Tap the pin for the address, or open directions in Google Maps." />
      <div className="mt-12 grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3 h-[420px] lg:h-[520px]">
          <MapView enabled={mapsEnabled} settingsLoaded={settingsLoaded} />
        </div>
        <div className="flex flex-col justify-between gap-8 rounded-3xl bg-white p-8 lg:col-span-2">
          <div>
            <h3 className="font-display text-2xl font-semibold">Address</h3>
            <p className="mt-2 leading-relaxed text-canopy/80">{site.location.address}</p>
            <h3 className="mt-8 font-display text-2xl font-semibold">Opening hours</h3>
            <dl className="mt-2 space-y-2">
              {site.hours.map(([d, h]) => (
                <div key={d} className="flex justify-between gap-4 border-b border-sage/60 pb-2">
                  <dt>{d}</dt><dd className="font-medium">{h}</dd>
                </div>
              ))}
            </dl>
          </div>
          {settingsLoaded && mapsEnabled && (
            <a href={directionsUrl} target="_blank" rel="noreferrer" className={btnPrimary}>Get directions</a>
          )}
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="bg-sage/40">
      <div className="mx-auto max-w-3xl px-5 py-20 md:py-28">
        <h2 className="font-display text-3xl font-semibold md:text-5xl">Questions people ask</h2>
        <div className="mt-10 divide-y divide-canopy/15 border-y border-canopy/15">
          {faqs.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-xl font-semibold">
                {f.q}
                <span className="text-2xl transition group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 leading-relaxed text-canopy/80">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <div className="rounded-[2.5rem] bg-fern p-10 text-mist md:p-16">
        <h2 className="max-w-2xl font-display text-3xl font-semibold md:text-5xl">Save a seat for your next study session</h2>
        <p className="mt-4 max-w-xl text-lg text-lichen">Call or message us and we will hold a desk for you.</p>
        <div className="mt-8 flex flex-wrap gap-4">
          <a href={`tel:${site.phone.replace(/\s/g, "")}`} className={btnLight}>Call {site.phone}</a>
          <a href={`mailto:${site.email}`}
             className="inline-flex items-center justify-center rounded-full border border-lichen/70 px-6 py-3 font-semibold hover:bg-canopy">
            Email us
          </a>
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
          <a href={site.social.facebook} target="_blank" rel="noreferrer" className="hover:text-fern">Facebook</a>
          <a href={site.social.instagram} target="_blank" rel="noreferrer" className="hover:text-fern">Instagram</a>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const settings = useSettings();

  // Smooth scrolling for the in-page links, only while this page is open.
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
        <About />
        <Pricing />
        <Testimonials />
        <Location mapsEnabled={settings.googleMapsEnabled} settingsLoaded={settings.settingsLoaded} />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}