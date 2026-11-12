import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Rocket,
  Radio,
  AlertTriangle,
  BookOpen,
  Users,
  Clock,
  ArrowRight,
  TrendingUp,
  LayoutDashboard,
  CircleCheckBig,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import StatCard from "../../components/common/StatCard";
import Badge from "../../components/common/Badge";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { formatDateTime } from "../../utils/helpers";

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/faculty/dashboard");
        setData(res.data);
      } catch {
        toast.error("Failed to load faculty portal data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <LoadingSpinner size="lg" text="Loading faculty classroom metrics..." />
      </div>
    );
  }

  const { stats, courses, activeSessions } = data || {};

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-sky-950 tracking-tight">
            Faculty Lecture Terminal
          </h2>
          <p className="text-sm text-sky-600/90 mt-1.5 font-medium">
            Classroom management, automated rolling QR launch, and student risk tracking.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="brand" size="sm">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse mr-1.5" />
            Live Network
          </Badge>
          <button
            onClick={() => navigate("/faculty/launch-session")}
            className="btn-primary flex items-center gap-2"
          >
            <Rocket className="w-4 h-4" />
            <span>Launch New Session</span>
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Assigned Courses"
          value={stats?.totalCourses || 0}
          subtitle="Curriculum subjects"
          icon={BookOpen}
          color="brand"
        />
        <StatCard
          title="Active Live Sessions"
          value={stats?.activeSessionsCount || 0}
          subtitle="Broadcasting QR tokens"
          icon={Radio}
          color="success"
        />
        <StatCard
          title="Average Turnout"
          value={`${stats?.averageAttendance || 0}%`}
          subtitle="Across all assigned lectures"
          icon={Users}
          color="info"
        />
        <StatCard
          title="Students At Risk"
          value={stats?.flaggedStudentsCount || 0}
          subtitle="Below 75% threshold"
          icon={AlertTriangle}
          color="warning"
        />
      </div>

      {/* Active Live Sessions */}
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-sky-950 flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-500" />
            <span className="text-sm font-bold uppercase tracking-wider text-sky-700">
              Live Sessions In Progress
            </span>
          </h3>
          <span className="text-xs text-sky-600 font-semibold">
            {activeSessions?.length || 0} Session(s) Broadcasting
          </span>
        </div>

        {activeSessions && activeSessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activeSessions.map((session) => (
              <div
                key={session.id}
                className="card-hover flex flex-col justify-between space-y-4 p-5 sm:p-6 bg-white border border-sky-100"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-50 text-sky-600 border border-sky-200">
                          {session.course.code}
                        </span>
                        <Badge variant={session.sessionType === "ONLINE" ? "info" : "slate"} size="sm">
                          {session.sessionType}
                        </Badge>
                      </div>
                      <h4 className="text-base font-bold text-sky-950 mt-2.5">{session.course.name}</h4>
                      <p className="text-xs text-sky-600 font-medium mt-1">
                        {session.sessionType} • Started {formatDateTime(session.startTime)}
                      </p>
                    </div>
                    <Badge variant="success" size="sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                      Active
                    </Badge>
                  </div>
                </div>

                <div className="pt-4 border-t border-sky-100 flex items-center justify-between">
                  <div className="text-xs text-sky-600 font-medium">
                    <span className="font-bold text-sky-950">
                      {session._count?.records || 0}
                    </span>{" "}
                    verified check-ins
                  </div>
                  <button
                    onClick={() => navigate(`/faculty/live-attendance?sessionId=${session.id}`)}
                    className="btn-primary text-xs px-4 py-2 flex items-center gap-1.5"
                  >
                    <span>View Feed &amp; QR</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 border border-dashed border-sky-200 rounded-3xl bg-white text-center space-y-3 shadow-sm">
            <Clock className="w-8 h-8 text-sky-400 mx-auto" />
            <p className="text-sm font-bold text-sky-950">No active lecture sessions right now.</p>
            <p className="text-xs text-sky-600 max-w-sm mx-auto font-medium">
              Launch a session to start rolling dynamic QR attendance and proctoring.
            </p>
            <button
              onClick={() => navigate("/faculty/launch-session")}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Rocket className="w-4 h-4" />
              Launch Session
            </button>
          </div>
        )}
      </div>

      {/* Course Catalog */}
      <Card title="Your Teaching Courses" subtitle="Course catalog with enrollment counts" icon={BookOpen}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses?.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-xl bg-white border border-sky-100 shadow-sm space-y-2.5 hover:border-sky-200 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-50 text-sky-600 border border-sky-200">
                  {c.code}
                </span>
                <span className="text-[11px] text-sky-500 font-medium">{c.department}</span>
              </div>
              <h5 className="text-sm font-bold text-sky-950 line-clamp-1">{c.name}</h5>
              <div className="flex items-center justify-between text-xs text-sky-600 font-medium pt-2 border-t border-sky-50">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  {c._count?.enrollments || 0} students
                </span>
                <span className="flex items-center gap-1.5">
                  <CircleCheckBig className="w-3.5 h-3.5 text-sky-400" />
                  {c._count?.sessions || 0} lectures held
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Card({ title, subtitle, icon: Icon, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-sky-950 flex items-center gap-2">
          <Icon className="w-4 h-4 text-sky-500" />
          {title}
        </h3>
        {subtitle && <span className="text-xs text-sky-500 font-medium">{subtitle}</span>}
      </div>
      {children}
    </div>
  );
}
