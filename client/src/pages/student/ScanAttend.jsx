import React from "react";
import { QrCode, CheckCircle, AlertTriangle, Radio } from "lucide-react";
import QrScanner from "../../components/attendance/QrScanner";

export default function ScanAttend() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-sky-950 tracking-tight flex items-center justify-center gap-2.5">
          <QrCode className="w-7 h-7 text-sky-500" />
          <span>Scan &amp; Attend</span>
        </h2>
        <p className="text-sm text-sky-700/80 max-w-md mx-auto">
          Scan the dynamic rotating QR code projected in your classroom. Geofencing and device
          fingerprinting will authenticate your presence.
        </p>
      </div>

      <div className="rounded-3xl border border-sky-100 bg-white p-6 sm:p-8 shadow-sm">
        <QrScanner />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
        <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-xs">
          <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
          <p className="text-xs font-bold text-sky-950 mt-1.5">In-Person</p>
          <p className="text-xs text-sky-600/70 mt-0.5">Geofenced &amp; authenticated</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto" />
          <p className="text-xs font-bold text-sky-950 mt-1.5">Proxy Detection</p>
          <p className="text-xs text-sky-600/70 mt-0.5">Device &amp; network checks active</p>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-sky-100 shadow-xs">
          <Radio className="w-5 h-5 text-sky-500 mx-auto" />
          <p className="text-xs font-bold text-sky-950 mt-1.5">Always-On</p>
          <p className="text-xs text-sky-600/70 mt-0.5">Live feed updates every 7s</p>
        </div>
      </div>
    </div>
  );
}
