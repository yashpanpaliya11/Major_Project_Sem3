import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Users, Edit3, StopCircle, Radio, AlertTriangle, Zap, Timer, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useSocket } from "../../hooks/useSocket";
import QrDisplay from "../../components/attendance/QrDisplay";
import Badge from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { formatDateTime } from "../../utils/helpers";

export default function LiveAttendance() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [sessionId, setSessionId] = useState(searchParams.get("sessionId") || "");
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [overrideStatus, setOverrideStatus] = useState("PRESENT");

  // Engagement challenge state for Online/Hybrid lectures
  const [activePing, setActivePing] = useState(null);
  const [triggeringPing, setTriggeringPing] = useState(false);
  const [pingCountdown, setPingCountdown] = useState(0);

  const fetchLiveSession = useCallback(async (sId) => {
    if (!sId) return;
    try {
      const res = await api.get(`/faculty/sessions/${sId}/live`);
      setSessionData(res.data);
    } catch {
      toast.error("Unable to load live session data");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      try {
        const res = await api.get("/faculty/dashboard");
        if (cancelled) return;
        const active = res.data.activeSessions || [];
        if (!sessionId && active.length > 0) {
          setSessionId(active[0].id);
        } else if (!sessionId) {
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          toast.error("Failed to load active classes");
          setLoading(false);
        }
      }
    }
    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sessionId) return undefined;
    let cancelled = false;
    async function load() {
      try {
        const res = await api.get(`/faculty/sessions/${sessionId}/live`);
        if (!cancelled) setSessionData(res.data);
      } catch {
        if (!cancelled) toast.error("Could not load session details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  useEffect(() => {
    if (!socket || !sessionId) return;
    socket.emit("join:session", { sessionId });
    const handleRefresh = () => fetchLiveSession(sessionId);
    const handleProxy = () => {
      toast.error("Anti-proxy alert detected");
      fetchLiveSession(sessionId);
    };
    const handleSessionEnded = (data) => {
      if (data?.sessionId && data.sessionId !== sessionId) return;
      toast("This lecture session has ended", { icon: "⏹️" });
      navigate("/faculty");
    };
    const handleEngagementAck = ({ studentName, count }) => {
      setActivePing((prev) => prev ? { ...prev, respondedCount: count } : null);
      toast.success(`${studentName} confirmed active attendance!`, { icon: '⚡', id: 'eng-ack' });
    };

    socket.on("attendance:new", handleRefresh);
    socket.on("proxy:alert", handleProxy);
    socket.on("session:ended", handleSessionEnded);
    socket.on("engagement:acknowledged", handleEngagementAck);
    return () => {
      socket.off("attendance:new", handleRefresh);
      socket.off("proxy:alert", handleProxy);
      socket.off("session:ended", handleSessionEnded);
      socket.off("engagement:acknowledged", handleEngagementAck);
      socket.emit("leave:session", { sessionId });
    };
  }, [socket, sessionId, fetchLiveSession, navigate]);

  // Engagement ping countdown timer
  useEffect(() => {
    if (!activePing) return;
    const interval = setInterval(() => {
      setPingCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setActivePing(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activePing]);

  const handleTriggerEngagement = async () => {
    if (!sessionId) return;
    setTriggeringPing(true);
    try {
      const res = await api.post(`/faculty/sessions/${sessionId}/engagement-ping`);
      if (res.data?.success) {
        setActivePing({
          code: res.data.code,
          respondedCount: 0,
        });
        setPingCountdown(res.data.durationSeconds || 60);
        toast.success(`Active engagement challenge code: ${res.data.code}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to trigger ping");
    } finally {
      setTriggeringPing(false);
    }
  };

  const handleEndSession = async () => {
    if (!confirm("End this lecture session? The QR token will be deactivated."))
      return;
    try {
      await api.post(`/faculty/sessions/${sessionId}/end`);
      toast.success("Lecture session ended");
      navigate("/faculty");
    } catch {
      toast.error("Failed to end lecture");
    }
  };

  const handleManualOverride = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    try {
      await api.post("/faculty/override", {
        sessionId,
        studentId: selectedStudentId,
        status: overrideStatus,
      });
      toast.success(`Marked student as ${overrideStatus}`);
      setOverrideModalOpen(false);
      fetchLiveSession(sessionId);
    } catch {
      toast.error("Failed to apply override");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <LoadingSpinner size="lg" text="Connecting to lecture hall feed..." />
      </div>
    );
  }

  if (!sessionId || !sessionData) {
    return (
      <div className="p-12 text-center max-w-md mx-auto space-y-4">
        <Radio className="w-12 h-12 text-slate-600 mx-auto" />
        <h3 className="text-lg font-bold text-white">No Active Session Selected</h3>
        <p className="text-sm text-slate-400 max-w-sm mx-auto">
          Launch a new session from the dashboard or choose an active lecture to continue.
        </p>
        <button
          onClick={() => navigate("/faculty/launch-session")}
          className="btn-primary"
        >
          Launch Session
        </button>
      </div>
    );
  }

  const { session, stats } = sessionData;
  const enrolledStudents = session?.course?.enrollments || [];
  const records = session?.records || [];

  const getStatusVariant = (status) => {
    if (status === "PRESENT") return "success";
    if (status === "LATE") return "warning";
    if (status === "FLAG_REJECTED") return "danger";
    return "slate";
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Session Header */}
      <div className="card-hover flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-sky-100 bg-white">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge variant="brand" size="sm">
              {session.course.code}
            </Badge>
            <Badge variant="slate" size="sm">
              {session.sessionType}
            </Badge>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
              Live Broadcasting
            </span>
          </div>
          <h2 className="text-xl font-black text-sky-950 mt-2.5">{session.course.name}</h2>
          <p className="text-xs text-sky-600/90 font-medium mt-1">
            {session.latitude != null
              ? `Geofence: ${session.radiusMeters}m classroom radius`
              : "Remote check-in enabled (no geofence)"}
            {" • "}
            Started {formatDateTime(session.startTime)}
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => setOverrideModalOpen(true)}
            className="btn-secondary flex items-center gap-2 text-xs font-bold"
          >
            <Edit3 className="w-4 h-4" />
            <span>Manual Override</span>
          </button>
          <button
            onClick={handleEndSession}
            className="btn-danger flex items-center gap-2 text-xs"
          >
            <StopCircle className="w-4 h-4" />
            <span>End Class</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="card p-4">
          <p className="text-xs text-sky-600 font-bold uppercase tracking-wider">
            Turnout Rate
          </p>
          <h4 className="text-xl font-black text-sky-950 mt-1">{stats?.attendanceRate || 0}%</h4>
        </div>
        <div className="card p-4">
          <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider">
            Present
          </p>
          <h4 className="text-xl font-black text-emerald-600 mt-1">{stats?.presentCount || 0}</h4>
        </div>
        <div className="card p-4">
          <p className="text-xs text-amber-600 font-bold uppercase tracking-wider">
            Late Arrivals
          </p>
          <h4 className="text-xl font-black text-amber-600 mt-1">{stats?.lateCount || 0}</h4>
        </div>
        <div className="card p-4">
          <p className="text-xs text-rose-600 font-bold uppercase tracking-wider">
            Quarantined
          </p>
          <h4 className="text-xl font-black text-rose-600 mt-1">{stats?.proxyCount || 0}</h4>
        </div>
        <div className="card p-4">
          <p className="text-xs text-sky-700 font-bold uppercase tracking-wider">
            Enrolled
          </p>
          <h4 className="text-xl font-black text-sky-950 mt-1">{stats?.totalEnrolled || 0}</h4>
        </div>
      </div>

      {/* Online / Hybrid Engagement Challenge Radar */}
      <div className="card p-5 border border-sky-200 bg-sky-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-white border border-sky-200 text-sky-500 shadow-sm">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-sky-950">
                  Online &amp; Hybrid Attendance Engagement Radar
                </h4>
                <Badge variant="brand" size="sm">Anti-Proxy Ping</Badge>
              </div>
              <p className="text-xs text-sky-700/90 font-medium mt-0.5">
                Broadcast an attention challenge to ensure remote students are actively participating at their devices.
              </p>
            </div>
          </div>

          <div>
            {activePing ? (
              <div className="flex items-center gap-3 bg-white p-2.5 px-4 rounded-xl border border-sky-200 shadow-sm">
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-amber-600 flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5 animate-spin" />
                    <span>{pingCountdown}s remaining</span>
                  </div>
                  <p className="text-[11px] text-sky-700 font-medium">
                    Code: <strong className="text-sky-950 font-mono text-xs">{activePing.code}</strong> • {activePing.respondedCount || 0} / {stats?.totalEnrolled || 0} Confirmed
                  </p>
                </div>
              </div>
            ) : (
              <button
                onClick={handleTriggerEngagement}
                disabled={triggeringPing || Boolean(session.endTime)}
                className="btn-primary flex items-center gap-2 text-xs px-4 py-2"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{triggeringPing ? "Broadcasting..." : "Broadcast 60s Engagement Ping"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* QR + Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 card">
          <QrDisplay
            sessionId={session.id}
            initialToken={session.activeQrToken}
            sessionName={session.course.code}
            sessionEnded={Boolean(session.endTime)}
          />
        </div>

        <div className="lg:col-span-3 card flex flex-col overflow-hidden">
          <div className="p-5 border-b border-sky-100 flex items-center justify-between">
            <h4 className="text-base font-bold text-sky-950 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-500" />
              Live Check-In Stream
            </h4>
            <span className="text-xs text-sky-600 font-bold">{records.length} verified</span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[420px] p-4 space-y-2.5 scrollbar-thin">
            {records.length > 0 ? (
              records.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-xl bg-sky-50/50 border border-sky-100 hover:border-sky-200 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${rec.student.name}`}
                      alt="Avatar"
                      className="w-8 h-8 rounded-full bg-white border border-sky-200 object-cover flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-sky-950 truncate">{rec.student.name}</p>
                      <p className="text-xs text-sky-600 font-medium truncate">
                        Roll: {rec.student.rollNumber || "N/A"} • {rec.method}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-sky-500 font-medium">
                      {formatDateTime(rec.timestamp, { timeOnly: true })}
                    </span>
                    <Badge variant={getStatusVariant(rec.status)} size="sm">
                      {rec.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-16 text-center text-sm text-sky-400 font-medium">
                Waiting for students to scan the projector QR code...
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Manual Override Modal */}
      <Modal
        isOpen={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        title="Manual Faculty Override"
      >
        <form onSubmit={handleManualOverride} className="space-y-4">
          <div>
            <label className="label">Enrolled Student</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="input"
            >
              <option value="">Select student...</option>
              {enrolledStudents.map((enr) => (
                <option key={enr.student.id} value={enr.student.id}>
                  {enr.student.name} — {enr.student.rollNumber || "No Roll"}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Status to Assign</label>
            <select
              value={overrideStatus}
              onChange={(e) => setOverrideStatus(e.target.value)}
              className="input"
            >
              <option value="PRESENT">PRESENT — medical / exemption</option>
              <option value="LATE">LATE — arrived after cutoff</option>
              <option value="ABSENT">ABSENT — unexcused</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setOverrideModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedStudentId}
              className="btn-primary px-5 disabled:opacity-40"
            >
              Save Override
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
