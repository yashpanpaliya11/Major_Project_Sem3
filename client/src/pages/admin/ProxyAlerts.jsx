import React, { useState, useEffect } from "react";
import { ShieldAlert, Check, Ban, Flag, Filter } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import { useSocket } from "../../hooks/useSocket";
import DataTable from "../../components/common/DataTable";
import Badge from "../../components/common/Badge";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { formatDateTime } from "../../utils/helpers";

export default function ProxyAlerts() {
  const { socket } = useSocket();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterResolved, setFilterResolved] = useState("all");

  const fetchAlerts = async () => {
    try {
      const url =
        filterResolved === "all"
          ? "/admin/proxy-alerts"
          : `/admin/proxy-alerts?resolved=${filterResolved === "resolved"}`;
      const res = await api.get(url);
      setAlerts(res.data.alerts);
    } catch {
      toast.error("Failed to load proxy alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterResolved]);

  useEffect(() => {
    if (!socket) return;
    const handleNewAlert = ({ alert }) => {
      toast.error(`Proxy flagged for ${alert?.student?.name || "student"}`);
      fetchAlerts();
    };
    socket.on("proxy:alert", handleNewAlert);
    return () => {
      socket.off("proxy:alert", handleNewAlert);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, filterResolved]);

  const handleAction = async (alertId, action) => {
    try {
      await api.patch(`/admin/proxy-alerts/${alertId}`, { action });
      toast.success(`Action applied: ${action}`);
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alertId ? { ...a, resolved: action !== "FLAG" } : a
        )
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update alert action");
    }
  };

  const columns = [
    {
      header: "Student",
      key: "studentName",
      accessor: (row) => row.student?.name,
      render: (row) => (
        <div className="flex items-center gap-3">
          <img
            src={row.student?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.student?.name}`}
            alt="Avatar"
            className="w-8 h-8 rounded-full bg-sky-50 border border-sky-200"
          />
          <div>
            <p className="font-bold text-sky-950 text-sm">{row.student?.name}</p>
            <p className="text-xs text-slate-500 font-medium">
              {row.student?.rollNumber || "No Roll"} • {row.student?.department}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: "Course",
      key: "course",
      accessor: (row) => row.session?.course?.code,
      render: (row) => (
        <div className="text-left">
          <p className="font-bold text-sky-950 text-sm">{row.session?.course?.code || "N/A"}</p>
          <p className="text-xs text-slate-500 line-clamp-1">{row.session?.course?.name}</p>
        </div>
      ),
    },
    {
      header: "Violation",
      key: "reason",
      render: (row) => (
        <div className="max-w-xs">
          <span className="text-xs font-semibold text-rose-700 line-clamp-2">{row.reason}</span>
        </div>
      ),
    },
    {
      header: "Time",
      key: "flaggedAt",
      render: (row) => <span className="text-xs text-slate-600 font-medium">{formatDateTime(row.flaggedAt)}</span>,
    },
    {
      header: "Status",
      key: "resolved",
      render: (row) => (
        <Badge variant={row.resolved ? "success" : "danger"} size="sm">
          {row.resolved ? "Resolved" : "Pending"}
        </Badge>
      ),
    },
    {
      header: "Action",
      key: "actions",
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleAction(row.id, "APPROVE")}
            title="Approve (set to Present)"
            className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleAction(row.id, "BLOCK")}
            title="Block (confirm absence)"
            className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 transition"
          >
            <Ban className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleAction(row.id, "FLAG")}
            title="Keep open for review"
            className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition"
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-sky-950 tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="w-7 h-7 text-rose-500" />
            <span>Anti-Proxy Threat Quarantine</span>
          </h2>
          <p className="text-sm text-sky-700/80 mt-1.5">
            Geofence breaches, multi-IP bursts, and duplicate device fingerprint violations.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-white border border-sky-100 p-1.5 rounded-2xl shadow-xs">
          <Filter className="w-4 h-4 text-sky-400 ml-1.5" />
          {["all", "pending", "resolved"].map((f) => (
            <button
              key={f}
              onClick={() => setFilterResolved(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                filterResolved === f
                  ? "bg-sky-500 text-white shadow-xs"
                  : "text-sky-800 hover:text-sky-950 hover:bg-sky-50"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" text="Scanning proxy quarantine feed..." />
      ) : (
        <DataTable
          columns={columns}
          data={alerts}
          searchPlaceholder="Search by student or reason..."
          emptyMessage="No proxy flags on record."
        />
      )}
    </div>
  );
}
