import { useEffect, useRef, useState } from "react";
import { site } from "../LandingConfig";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Load the Google Maps script once, no matter how many times the component mounts.
let mapsPromise;
function loadGoogleMaps(key) {
  if (window.google?.maps) return Promise.resolve(window.google.maps);
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    window.__initForrestMap = () => resolve(window.google.maps);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&callback=__initForrestMap&v=weekly`;
    script.async = true;
    script.onerror = () => {
      mapsPromise = undefined;
      reject(new Error("Google Maps failed to load"));
    };
    document.head.appendChild(script);
  });
  return mapsPromise;
}

// Soft green map theme that matches the site.
const mapStyles = [
  { elementType: "geometry", stylers: [{ color: "#eef3ea" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#4a5d4f" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#eef3ea" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#b9ccb3" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dfe8b6" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#a9c9c4" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

// Custom leaf-shaped pin.
const pinSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="60" viewBox="0 0 48 60">
  <path d="M24 2C12 2 4 11 4 22c0 15 20 36 20 36s20-21 20-36C44 11 36 2 24 2z" fill="#17332a"/>
  <circle cx="24" cy="22" r="13" fill="#dfe8b6"/>
  <path d="M17 27c0-9 6-14 15-15 0 9-5 15-15 15z" fill="#356b4a"/>
  <path d="M17 28l9-9" stroke="#dfe8b6" stroke-width="1.6" stroke-linecap="round"/>
</svg>`;

export default function MapView({ enabled = true, settingsLoaded = true }) {
  const ref = useRef(null);
  const [status, setStatus] = useState("loading");
  const visibleStatus = !settingsLoaded ? "loading" : !enabled ? "disabled" : !API_KEY ? "nokey" : status;
  const { lat, lng, zoom, address } = site.location;

  useEffect(() => {
    if (!settingsLoaded || !enabled || !API_KEY) return;
    let cancelled = false;

    loadGoogleMaps(API_KEY)
      .then((maps) => {
        if (cancelled || !ref.current) return;
        const position = { lat, lng };

        const map = new maps.Map(ref.current, {
          center: position,
          zoom,
          styles: mapStyles,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        const marker = new maps.Marker({
          position,
          map,
          title: site.name,
          animation: maps.Animation.DROP,
          icon: {
            url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(pinSvg),
            scaledSize: new maps.Size(40, 50),
            anchor: new maps.Point(20, 50),
          },
        });

        const info = new maps.InfoWindow({
          content: `<div style="font-family:Figtree,sans-serif;max-width:200px">
            <strong style="font-size:15px">${site.name}</strong>
            <p style="margin:4px 0 0">${address}</p></div>`,
        });
        marker.addListener("click", () => info.open({ map, anchor: marker }));
        info.open({ map, anchor: marker });
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("error"));

    return () => {
      cancelled = true;
    };
  }, [enabled, settingsLoaded, lat, lng, zoom, address]);

  return (
    <div className="relative h-full min-h-[360px] w-full overflow-hidden rounded-3xl bg-sage/40">
      <div ref={ref} className="absolute inset-0" role="region" aria-label={`Map showing the location of ${site.name}`} />
      {visibleStatus !== "ready" && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <p className="max-w-xs text-sm text-canopy/80">
            {visibleStatus === "loading" && "Loading map…"}
            {visibleStatus === "disabled" && "Google Maps is currently disabled."}
            {visibleStatus === "nokey" && "The map is not set up yet. Add your Google Maps API key to the .env file as VITE_GOOGLE_MAPS_API_KEY."}
            {visibleStatus === "error" && "The map could not load. Check your API key and internet connection, then reload the page."}
          </p>
        </div>
      )}
    </div>
  );
}