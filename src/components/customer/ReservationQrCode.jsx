import { useEffect, useState } from "react";
import { Download, QrCode, RefreshCw } from "lucide-react";
import QRCode from "qrcode";
import useSettings from "../../useSettings2.js";

export default function ReservationQrCode({ reservation }) {
  const settings = useSettings();
  const [qrImage, setQrImage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!settings.settingsLoaded || settings.qrCodeEnabled === false) return undefined;
    let active = true;

    async function issueQrCode() {
      setLoading(true);
      setError("");
      setQrImage("");

      try {
        const response = await fetch(
          `http://localhost:5000/api/reservations/${encodeURIComponent(reservation.id)}/qr`,
          { method: "POST" },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load QR code.");
        if (typeof data.token !== "string") throw new Error("The server returned an invalid QR code.");

        const image = await QRCode.toDataURL(data.token, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 240,
        });
        if (active) setQrImage(image);
      } catch (issueError) {
        if (active) setError(issueError.message || "Could not load QR code.");
      } finally {
        if (active) setLoading(false);
      }
    }

    issueQrCode();
    return () => {
      active = false;
    };
  }, [
    attempt,
    reservation.id,
    reservation.startAt,
    reservation.endAt,
    settings.qrCodeEnabled,
    settings.settingsLoaded,
  ]);

  return (
    <div className="mt-4 flex flex-col gap-4 border-t border-[#E4EFE9] pt-4 sm:flex-row sm:items-center">
      {!settings.settingsLoaded ? (
        <div className="flex h-32 w-32 items-center justify-center rounded-xl bg-[#F5FAF7] text-xs text-[#6F8E7F]">
          Loading QR settings...
        </div>
      ) : settings.qrCodeEnabled === false ? (
        <p className="text-sm text-[#6F8E7F]">Reservation QR codes are disabled in Settings.</p>
      ) : loading ? (
        <div className="flex h-32 w-32 items-center justify-center rounded-xl bg-[#F5FAF7] text-xs text-[#6F8E7F]">
          Preparing QR code...
        </div>
      ) : qrImage ? (
        <>
          <img
            src={qrImage}
            alt={`Check-in QR code for capsule ${reservation.capsule}`}
            className="h-32 w-32 rounded-lg border border-[#E4EFE9] bg-white p-2"
          />
          <div>
            <p className="font-semibold text-[#0B3B2A]">Your check-in QR code</p>
            <p className="mt-1 text-sm text-[#6F8E7F]">
              Show this code to staff when you arrive. It is valid until your reservation ends.
            </p>
            <a
              href={qrImage}
              download={`reservation-${reservation.id}-qr.png`}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#CFE3D9] px-3 py-2 text-xs font-medium text-[#0B4A2E] transition hover:bg-[#EEF7F2]"
            >
              <Download className="h-3.5 w-3.5" />
              Download QR code
            </a>
          </div>
        </>
      ) : (
        <div className="rounded-xl bg-[#FFF7E8] p-4 text-sm text-[#805B1E]">
          <div className="flex items-center gap-2 font-semibold">
            <QrCode className="h-4 w-4" />
            QR code unavailable
          </div>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            onClick={() => setAttempt((current) => current + 1)}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#E8D6B0] px-3 py-2 text-xs font-medium hover:bg-white/70"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
