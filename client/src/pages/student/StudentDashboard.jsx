import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle,
  AlertTriangle,
  QrCode,
  Calendar,
  ArrowRight,
  Radio,
  BookOpen,
  Info,
  Activity,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import StatCard from "../../components/common/StatCard";
import Badge from "../../components/common/Badge";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import AttendanceDonutChart from "../../components/charts/AttendanceDonutChart";
import { formatDateTime } from "../../utils/helpers";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await api.get("/student/dashboard");
        setData(res.data);
      } catch {
        toast.error("Failed to load attendance statistics");
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return <LoadingSpinner size="lg" text="Retrieving attendance record..." />;
  }

  const { overallStats, courseStats, recentRecords, hasActiveSession } = data || {};
  const hasOverallData = (overallStats?.totalSessions || 0) > 0;

  return (
    <div className="space-y-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Active Session Banner */}
      {hasActiveSession && (
        <div className="card-hover flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl border border-sky-300 bg-sky-50 shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-white border border-sky-200 text-sky-500 shadow-sm">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-sky-950 flex items-center gap-2">
                <span>Lecture In Progress — Live Roll Call</span>
              </h3>
              <p className="text-sm text-sky-700 mt-0.5 font-medium">
                An active dynamic QR code is broadcasting for your enrolled class.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/student/scan-attend")}
            className="btn-primary flex items-center gap-2 shadow-lg"
          >
            <QrCode className="w-4 h-4" />
            <span>Scan QR Now</span>
          </button>
        </div>
      )}

      {/* Risk Warning */}
      {overallStats?.isAtRisk && (
        <div className="card-hover p-4 rounded-2xl border border-rose-200 bg-rose-50 shadow-sm">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-rose-800">
                Attendance Shortfall Warning
              </p>
              <p className="text-xs text-rose-700 mt-1 font-medium leading-relaxed">
                Your aggregate attendance is{" "}
                <strong className="text-rose-900 font-bold">{overallStats?.percentage}%</strong>, strictly below the
                mandatory 75% threshold. Please meet with your academic advisor.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Overall Attendance"
          value={hasOverallData ? `${overallStats.percentage}%` : "—"}
          subtitle={
            !hasOverallData
              ? "No completed lectures yet"
              : overallStats?.isAtRisk
                ? "Below 75% threshold"
                : "Good Standing"
          }
          icon={CheckCircle}
          color={
            !hasOverallData ? "brand" : overallStats?.isAtRisk ? "danger" : "success"
          }
        />
        <StatCard
          title="Classes Attended"
          value={overallStats?.present || 0}
          subtitle={`Out of ${overallStats?.totalSessions || 0} total held`}
          icon={Calendar}
          color="brand"
        />
        <StatCard
          title="Late Arrivals"
          value={overallStats?.late || 0}
          subtitle="Partial attendance logged"
          icon={AlertTriangle}
          color="warning"
        />
        <StatCard
          title="Enrolled Courses"
          value={courseStats?.length || 0}
          subtitle="Active curriculum subjects"
          icon={BookOpen}
          color="info"
        />
      </div>

      {/* Course Breakdown + Donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-sky-100">
            <h3 className="text-base font-bold text-sky-950 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-500" />
              Subject Turnout
            </h3>
            <span className="text-xs text-sky-600 font-medium">
              Mandatory threshold: 75%
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {courseStats?.map((c) => {
              const hasLectures = c.totalSessions > 0;
              const isAtRisk = hasLectures && c.percentage < 75;
              return (
                <div
                  key={c.courseId}
                  className="p-5 rounded-2xl bg-sky-50/50 border border-sky-100 space-y-3 hover:border-sky-200 transition"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white text-sky-700 border border-sky-200 shadow-sm">
                        {c.code}
                      </span>
                      <Badge
                        variant={
                          !hasLectures ? "slate" : isAtRisk ? "danger" : "success"
                        }
                        size="sm"
                      >
                        {hasLectures ? `${c.percentage}%` : "No data"}
                      </Badge>
                    </div>
                    <h4 className="text-sm font-bold text-sky-950 mt-2.5 truncate">{c.name}</h4>
                    <p className="text-xs text-sky-600 font-medium mt-0.5">Faculty: {c.facultyName}</p>
                  </div>
                  <div className="space-y-1.5 pt-3 border-t border-sky-100">
                    <div className="flex justify-between text-xs text-sky-700 font-medium">
                      <span>
                        Attended: {c.present + c.late}/{c.totalSessions}
                      </span>
                      <span
                        className={
                          !hasLectures
                            ? "text-sky-400"
                            : isAtRisk
                              ? "text-rose-600 font-bold"
                              : "text-emerald-600 font-bold"
                        }
                      >
                        {hasLectures ? `${c.percentage}%` : "—"}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-sky-200/60 overflow-hidden">
                      <div
                        className={
                          isAtRisk
                            ? "bg-rose-500"
                            : hasLectures
                              ? "bg-sky-500"
                              : "bg-slate-300"
                        }
                        style={{
                          width: hasLectures ? `${Math.min(c.percentage, 100)}%` : "0%",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attendance Composition Donut */}
        <div className="card p-6 flex flex-col justify-between">
          <div className="pb-3 border-b border-sky-100">
            <h4 className="text-base font-bold text-sky-950 flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-500" />
              Attendance Composition
            </h4>
            <p className="text-xs text-sky-600 mt-1 font-medium">
              Course-wise distribution breakdown.
            </p>
          </div>
          <div className="h-56 flex items-center justify-center my-auto">
            <AttendanceDonutChart data={courseStats || []} />
          </div>
        </div>
      </div>

      {/* Recent Activity Log */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-sky-100">
          <h3 className="text-base font-bold text-sky-950 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-sky-500" />
            Recent Attendance Log
          </h3>
          <Link
            to="/student/attendance-history"
            className="text-xs font-bold text-sky-600 hover:text-sky-800 flex items-center gap-1 hover:underline"
          >
            <span>View full history</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-sky-50">
          {recentRecords && recentRecords.length > 0 ? (
            recentRecords.map((rec) => (
              <div
                key={rec.id}
                className="py-3.5 flex items-center justify-between hover:bg-sky-50/40 px-3 rounded-xl transition"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100 text-sky-600">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-sky-950">
                      {rec.session.course.code} — {rec.session.course.name}
                    </p>
                    <p className="text-xs text-sky-600 font-medium mt-0.5">
                      {formatDateTime(rec.timestamp)} • {rec.method}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={
                    rec.status === "PRESENT"
                      ? "success"
                      : rec.status === "LATE"
                        ? "warning"
                        : "danger"
                  }
                  size="sm"
                >
                  {rec.status}
                </Badge>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-sm text-sky-400 font-medium">
              No attendance activity recorded yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
