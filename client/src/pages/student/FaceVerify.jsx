import { useState, useEffect } from 'react';
import { ScanFace } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import FaceCapture from '../../components/attendance/FaceCapture';
import LoadingSpinner from '../../components/common/LoadingSpinner';

export default function FaceVerify() {
  const [activeSessions, setActiveSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSessions() {
      try {
        const res = await api.get('/student/dashboard');
        const sessions = res.data.activeSessions || [];
        setActiveSessions(sessions);
        if (sessions.length > 0) {
          setSelectedSessionId(sessions[0].id);
        }
      } catch {
        toast.error('Could not load active classes');
      } finally {
        setLoading(false);
      }
    }
    loadSessions();
  }, []);

  if (loading) return <LoadingSpinner size="lg" text="Searching active class sessions..." />;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-sky-950 tracking-tight flex items-center justify-center gap-2">
          <ScanFace className="w-7 h-7 text-sky-500" />
          <span>AI Biometric Face Verification Terminal</span>
        </h2>
        <p className="text-xs text-sky-700/80 max-w-md mx-auto">
          Capture live facial landmarks via HTML5 WebRTC &amp; Canvas neural bounding box detection.
        </p>
      </div>

      {/* Session Selection */}
      <div className="max-w-md mx-auto bg-white border border-sky-100 p-4 rounded-2xl shadow-sm">
        <label className="block text-xs font-semibold text-sky-900 mb-1.5">
          Select Active Lecture Session
        </label>
        {activeSessions.length > 0 ? (
          <select
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
            className="w-full bg-white border border-sky-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400/50"
          >
            {activeSessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.courseCode ? `${s.courseCode} — ${s.courseName}` : `Session ${s.id.slice(0, 8)}`} ({s.sessionType})
              </option>
            ))}
          </select>
        ) : (
          <p className="text-xs text-amber-700 font-medium">
            No live lecture sessions active right now. Have faculty start a session first.
          </p>
        )}
      </div>

      {activeSessions.length > 0 ? (
        <FaceCapture sessionId={selectedSessionId} />
      ) : (
        <div className="max-w-lg mx-auto p-8 rounded-3xl border-2 border-dashed border-sky-200 bg-white text-center shadow-xs">
          <ScanFace className="w-10 h-10 text-sky-400 mx-auto mb-3" />
          <p className="text-sm font-bold text-sky-950">No active lecture session</p>
          <p className="text-xs text-sky-600/70 mt-1">
            Face verification becomes available when a faculty member starts a session for one of
            your courses.
          </p>
        </div>
      )}
    </div>
  );
}
