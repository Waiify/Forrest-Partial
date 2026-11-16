import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Html5QrcodeScanner } from "html5-qrcode";
import StaffHeader from "./components/StaffHeader.jsx";
import StaffSidebar from "./components/StaffSidebar.jsx";
import { readSessionUser } from "./permissionUtils.js";
import useSettings from "./useSettings2.js";

const API = "http://localhost:5000/api";

export default function StaffQRScanner() {
  const navigate = useNavigate();
  const user = readSessionUser();
  const authorized = ["staff", "admin"].includes(user?.role);
  const settings = useSettings();
  const scannerEnabled = settings.settingsLoaded && settings.qrCodeEnabled !== false;
  const [feedback, setFeedback] = useState(null);
  const processing = useRef(false);
  const lastScanned = useRef("");

  useEffect(() => {
    if (!authorized || !scannerEnabled) return undefined;

    const scanner = new Html5QrcodeScanner(
      "reservation-qr-reader",
      { fps: 10, qrbox: { width: 240, height: 240 } },
      false,
    );

    scanner.render(async (token) => {
      if (processing.current || token === lastScanned.current) return;
      processing.current = true;
      lastScanned.current = token;
      setFeedback({ kind: "pending", message: "Validating reservation..." });

      try {
        const response = await fetch(`${API}/reservations/check-in`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();

        if (!response.ok) {
          setFeedback({ kind: "error", message: data.message || "Check-in failed." });
          return;
        }

        setFeedback({
          kind: "success",
          message: `${data.message}: ${data.reservation.guestName} - capsule ${data.reservation.capsuleId}.`,
        });
      } catch (error) {
        console.error("Reservation QR check-in failed:", error);
        setFeedback({
          kind: "error",
          message: "Could not reach the server. Check your connection and try again.",
        });
      } finally {
        processing.current = false;
      }
    }, () => {});

    return () => {
      scanner.clear().catch((error) => {
        console.error("Could not stop the QR scanner:", error);
      });
    };
  }, [authorized, scannerEnabled]);

  if (!authorized) return <Navigate to="/" replace />;

  const handleNavigate = (section) => {
    const routes = {
      Dashboard: "/StaffDashboard",
      StaffSpacesandServicesManagement: "/StaffSpacesandServicesManagement",
      StaffSpacesandServicesAvailability: "/StaffSpacesandServicesAvailability",
      StaffReservation: "/StaffReservation",
      StaffReservationHistory: "/StaffReservationHistory",
      StaffQRScanner: "/StaffQRScanner",
      StaffSystemLogs: "/StaffSystemLogs",
    };
    navigate(routes[section] || routes.Dashboard);
  };

  const messageStyle = feedback?.kind === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : feedback?.kind === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-blue-200 bg-blue-50 text-blue-800";

  return (
    <div className="flex h-screen w-full bg-slate-50 text-slate-900">
      <StaffSidebar active="StaffQRScanner" onNavigate={handleNavigate} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <StaffHeader active="QR Scanner" subtitle="Scan a confirmed reservation to check in its customer" />
        <main className="flex-1 overflow-y-auto p-6 pb-24 md:p-8">
          <section className="mx-auto max-w-3xl rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0B3B2A]">Reservation check-in</h2>
            <p className="mt-1 text-sm text-[#6F8E7F]">
              Allow camera access, then scan the customer&apos;s current reservation QR code.
            </p>

            {feedback && (
              <div role="status" className={`mt-5 rounded-xl border p-4 text-sm ${messageStyle}`}>
                {feedback.message}
              </div>
            )}

            {!settings.settingsLoaded ? (
              <p className="mt-5 text-sm text-[#6F8E7F]">Loading integration settings...</p>
            ) : settings.qrCodeEnabled === false ? (
              <p className="mt-5 rounded-xl bg-[#EEF3F0] p-4 text-sm text-[#5F7F70]">
                Reservation QR check-in is disabled in Settings.
              </p>
            ) : (
              <>
                <div className="mx-auto mt-5 max-w-md" id="reservation-qr-reader" />
                <button
                  type="button"
                  onClick={() => {
                    lastScanned.current = "";
                    setFeedback(null);
                  }}
                  className="mt-4 rounded-lg border border-[#CFE3D9] px-4 py-2 text-sm font-medium text-[#0B4A2E] transition hover:bg-[#EEF7F2]"
                >
                  Scan another reservation
                </button>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
