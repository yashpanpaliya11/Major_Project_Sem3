import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Download,
  Mail,
  Copy,
  Check,
  Send,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";
import DataTable from "../../components/common/DataTable";
import Badge from "../../components/common/Badge";
import Modal from "../../components/common/Modal";
import LoadingSpinner from "../../components/common/LoadingSpinner";

export default function StudentRisk() {
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  const [alertModalOpen, setAlertModalOpen] = useState(false);
  const [activeNotice, setActiveNotice] = useState(null);
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [activeCourseId, setActiveCourseId] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSentResult, setEmailSentResult] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/faculty/student-risk");
        setAtRiskStudents(res.data.atRisk || []);
      } catch {
        toast.error("Failed to load risk roster");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleGenerateNotice = async (studentId, courseId = null) => {
    try {
      setActiveStudentId(studentId);
      setActiveCourseId(courseId);
      setEmailSentResult(null);
      const res = await api.post("/attendance/generate-alert", { studentId });
      setActiveNotice(res.data.notice);
      setAlertModalOpen(true);
      setCopied(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to generate notice");
    }
  };

  const handleDispatchLiveEmail = async () => {
    if (!activeStudentId) return;
    setSendingEmail(true);
    try {
      const res = await api.post("/faculty/intervention/send-warning", {
        studentId: activeStudentId,
        courseId: activeCourseId,
        notes: "Mandatory advisory session required before next examination cycle.",
      });

      if (res.data?.success) {
        setEmailSentResult(res.data);
        toast.success("Real warning email & in-app notification dispatched!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to dispatch email");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleCopyNotice = () => {
    if (!activeNotice) return;
    navigator.clipboard
      .writeText(activeNotice.content)
      .then(() => {
        setCopied(true);
        toast.success("Notice copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error("Could not copy the notice"));
  };

  const handleDownloadNotice = () => {
    if (!activeNotice) return;
    const blob = new Blob([activeNotice.content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `attendance-warning-${activeNotice.recipient.split("@")[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    toast.success("Notice downloaded");
  };

  const columns = [
    {
      header: "Student",
      key: "name",
      render: (row) => (
        <div className="text-left">
          <p className="font-bold text-sky-950 text-sm">{row.name}</p>
          <p className="text-xs text-slate-500 font-medium">
            Roll: {row.rollNumber} • {row.department}
          </p>
        </div>
      ),
    },
    {
      header: "Attendance",
      key: "overallPercentage",
      render: (row) => (
        <span
          className={`font-black text-sm ${
            row.overallPercentage < 50
              ? "text-rose-600"
              : row.overallPercentage < 65
              ? "text-amber-600"
              : "text-amber-500"
          }`}
        >
          {row.overallPercentage}%
        </span>
      ),
    },
    {
      header: "Risk Level",
      key: "riskLevel",
      render: (row) => (
        <Badge
          variant={
            row.riskLevel === "CRITICAL"
              ? "danger"
              : row.riskLevel === "WARNING"
              ? "warning"
              : "amber"
          }
          size="sm"
        >
          {row.riskLevel}
        </Badge>
      ),
    },
    {
      header: "Breached Courses",
      key: "courseBreaches",
      accessor: (row) =>
        (row.courseBreaches || []).map((cb) => `${cb.courseCode}: ${cb.percentage}%`).join(" "),
      render: (row) => (
        <div className="flex flex-wrap gap-1.5 max-w-xs">
          {row.courseBreaches?.map((cb) => (
            <span
              key={cb.courseCode}
              className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-sky-50 text-sky-800 border border-sky-200"
            >
              {cb.courseCode}: {cb.percentage}%
            </span>
          ))}
        </div>
      ),
    },
    {
      header: "Action",
      key: "action",
      sortable: false,
      render: (row) => (
        <button
          onClick={() => handleGenerateNotice(row.studentId)}
          className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 text-xs font-bold transition flex items-center gap-1.5"
        >
          <Mail className="w-3.5 h-3.5 text-sky-500" />
          <span>Issue Notice</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div>
        <h2 className="text-2xl font-black text-sky-950 tracking-tight flex items-center gap-2.5">
          <AlertTriangle className="w-7 h-7 text-amber-500" />
          <span>Intervention &amp; Escalation Panel</span>
        </h2>
        <p className="text-sm text-sky-700/80 mt-1.5">
          Auto-detects students below the 75% aggregate threshold for counselling and parent alerts.
        </p>
      </div>

      {loading ? (
        <LoadingSpinner size="lg" text="Scanning attendance thresholds..." />
      ) : (
        <DataTable
          columns={columns}
          data={atRiskStudents}
          searchPlaceholder="Search by name or roll..."
          emptyMessage="No students currently below the 75% threshold."
        />
      )}

      <Modal
        isOpen={alertModalOpen}
        onClose={() => setAlertModalOpen(false)}
        title="Official Academic Escalation Notice"
        maxWidth="max-w-2xl"
      >
        {activeNotice && (
          <div className="space-y-4">
            <div className="p-4 bg-sky-50/60 border border-sky-100 rounded-2xl text-xs text-sky-900 space-y-1">
              <p>
                <strong className="text-sky-950">Recipient:</strong> {activeNotice.recipient}
              </p>
              <p>
                <strong className="text-sky-950">Subject:</strong> {activeNotice.subject}
              </p>
            </div>

            {emailSentResult && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Real Email &amp; In-App Notification Dispatched Successfully</span>
                </div>
                {emailSentResult.emailResult?.previewUrl && (
                  <a
                    href={emailSentResult.emailResult.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold hover:bg-emerald-200 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Open Live Delivered Email in Browser
                  </a>
                )}
              </div>
            )}

            <pre className="p-4 bg-slate-50 border border-sky-100 rounded-2xl text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
              {activeNotice.content}
            </pre>

            <div className="flex flex-wrap justify-between items-center gap-3 pt-4 border-t border-sky-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyNotice}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-sky-200 text-xs font-bold text-sky-800 hover:bg-sky-50 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-sky-600" />}
                  <span>{copied ? "Copied" : "Copy Text"}</span>
                </button>
                <button
                  onClick={handleDownloadNotice}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-sky-200 text-xs font-bold text-sky-800 hover:bg-sky-50 transition"
                >
                  <Download className="w-3.5 h-3.5 text-sky-600" />
                  <span>Download</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAlertModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-sky-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Close
                </button>
                <button
                  onClick={handleDispatchLiveEmail}
                  disabled={sendingEmail}
                  className="btn-primary flex items-center gap-1.5 text-xs px-4 py-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingEmail ? "Transmitting..." : "Dispatch Real Email & Notification"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
