import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, MapPin, AlertCircle, CheckCircle2, KeyRound, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import { getDeviceFingerprint } from '../../utils/device';

export default function QrScanner({ onScanComplete }) {
  const [scanning, setScanning] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState(() =>
    'geolocation' in navigator ? null : 'This browser does not support geolocation.'
  );
  const [scanResult, setScanResult] = useState(null);

  const scannerRef = useRef(null);
  const coordsRef = useRef(null);

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) return;

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        coordsRef.current = next;
        setCoords(next);
        setGeoError(null);
        setLocating(false);
      },
      (error) => {
        coordsRef.current = null;
        setCoords(null);
        setGeoError(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission denied. Check-ins without GPS are quarantined by the geofence.'
            : 'Could not acquire GPS location. Move near a window and retry.'
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    if ('geolocation' in navigator) requestLocation();
  }, [requestLocation]);

  const handleProcessToken = useCallback(
    async (tokenPayload) => {
      const token = tokenPayload?.trim();
      if (!token) {
        toast.error('No QR payload found');
        return;
      }

      setLoading(true);
      setScanResult(null);

      try {
        const res = await api.post('/student/scan-qr', {
          qrToken: token,
          ...(coordsRef.current
            ? {
                latitude: coordsRef.current.latitude,
                longitude: coordsRef.current.longitude,
              }
            : {}),
          deviceInfo: getDeviceFingerprint(),
        });

        setScanResult({
          success: true,
          message: res.data.message || 'Attendance verified and marked.',
          record: res.data.record,
        });
        toast.success('Attendance marked!');
        if (onScanComplete) onScanComplete(res.data);
      } catch (err) {
        const errorMsg = err.response?.data?.message || 'Failed to verify attendance';
        setScanResult({
          success: false,
          message: errorMsg,
          reasons: err.response?.data?.reasons || [],
        });
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    },
    [onScanComplete]
  );

  // Initialize the camera scanner only while the viewport is mounted.
  useEffect(() => {
    if (!scanning) return undefined;

    let cancelled = false;

    try {
      const scanner = new Html5QrcodeScanner(
        'reader',
        { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true },
        false
      );

      scanner.render(
        (decodedText) => {
          if (cancelled) return;
          cancelled = true;
          scanner.clear().catch(() => {});
          scannerRef.current = null;
          setScanning(false);
          handleProcessToken(decodedText);
        },
        () => {
          // Frame without a readable QR code — ignore.
        }
      );

      scannerRef.current = scanner;
    } catch (err) {
      console.error('Failed to initialize QR scanner:', err);
      toast.error('Could not start the camera scanner');
      setScanning(false);
    }

    return () => {
      cancelled = true;
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [scanning, handleProcessToken]);

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
      scannerRef.current = null;
    }
    setScanning(false);
  };

  return (
    <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-sm max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 p-3.5 bg-sky-50/60 rounded-2xl border border-sky-100">
        <div className="flex items-center gap-2 text-xs min-w-0">
          <MapPin
            className={`w-4 h-4 flex-shrink-0 ${coords ? 'text-emerald-600' : 'text-amber-500'}`}
          />
          <span className="text-sky-950 font-medium truncate">
            {locating
              ? 'Acquiring GPS location...'
              : coords
              ? `GPS: ${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)} (±${Math.round(coords.accuracy || 0)}m)`
              : 'GPS location unavailable'}
          </span>
        </div>
        <button
          type="button"
          onClick={requestLocation}
          disabled={locating}
          className="flex items-center gap-1 text-[10px] uppercase font-bold px-2.5 py-1 rounded-lg bg-white border border-sky-200 text-sky-700 hover:bg-sky-50 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${locating ? 'animate-spin' : ''}`} />
          Retry
        </button>
      </div>

      {geoError && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
          <span>{geoError}</span>
        </div>
      )}

      {scanning ? (
        <div className="space-y-4">
          <div id="reader" className="w-full rounded-2xl overflow-hidden bg-slate-900 border border-sky-200" />
          <button
            onClick={stopScanner}
            className="w-full py-2.5 rounded-xl border border-sky-200 bg-white text-sky-700 text-sm font-bold hover:bg-sky-50 transition"
          >
            Cancel camera scan
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-sky-200 rounded-2xl bg-sky-50/30 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-600">
            <Camera className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-base font-bold text-sky-950">Scan classroom screen</h4>
            <p className="text-xs text-sky-700/80 mt-1 max-w-sm">
              Point your camera at the rotating QR code on the lecture hall projector. Camera
              access requires HTTPS (or localhost).
            </p>
          </div>
          <button
            onClick={() => {
              setScanResult(null);
              setScanning(true);
            }}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-sm font-bold shadow-md shadow-sky-500/25 transition flex items-center gap-2 disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            <span>Open camera scanner</span>
          </button>
        </div>
      )}

      <div className="pt-4 border-t border-sky-100">
        <label className="block text-xs font-semibold text-sky-900 mb-2 flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5 text-sky-500" />
          <span>Or paste a QR payload</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={manualToken}
            onChange={(e) => setManualToken(e.target.value)}
            placeholder="Paste the active token from the projector"
            className="flex-1 min-w-0 bg-white border border-sky-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
          />
          <button
            onClick={() => handleProcessToken(manualToken)}
            disabled={loading || !manualToken.trim()}
            className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold rounded-xl shadow-xs disabled:opacity-40 transition"
          >
            {loading ? 'Verifying...' : 'Submit'}
          </button>
        </div>
      </div>

      {scanResult && (
        <div
          className={`p-4 rounded-2xl border ${
            scanResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          } space-y-2`}
        >
          <div className="flex items-start gap-2 font-bold text-sm">
            {scanResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span>{scanResult.message}</span>
          </div>

          {scanResult.reasons?.length > 0 && (
            <ul className="text-xs list-disc list-inside space-y-1 text-rose-700">
              {scanResult.reasons.map((reason, index) => (
                <li key={index}>{reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
