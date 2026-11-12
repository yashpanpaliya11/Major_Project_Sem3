import { useState, useEffect } from 'react';
import { CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/axios';
import DataTable from '../../components/common/DataTable';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatDateTime } from '../../utils/helpers';

export default function AttendanceHistory() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await api.get('/student/history');
        setRecords(res.data.records || []);
      } catch {
        toast.error('Failed to load attendance history');
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, []);

  const columns = [
    {
      header: 'Date & Time',
      key: 'timestamp',
      render: (row) => (
        <span className="text-xs text-slate-600 font-medium">{formatDateTime(row.timestamp)}</span>
      ),
    },
    {
      header: 'Course Code',
      key: 'code',
      accessor: (row) => row.session?.course?.code,
      render: (row) => (
        <span className="font-bold text-sky-700 text-xs px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200">
          {row.session?.course?.code || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Course Title',
      key: 'courseName',
      accessor: (row) => row.session?.course?.name,
      render: (row) => (
        <span className="text-xs font-bold text-sky-950">{row.session?.course?.name || 'Class Session'}</span>
      ),
    },
    {
      header: 'Verification Method',
      key: 'method',
      render: (row) => (
        <span className="text-xs text-sky-800 font-mono bg-sky-50/60 px-2 py-0.5 rounded border border-sky-100">
          {row.method}
        </span>
      ),
    },
    {
      header: 'Recorded Status',
      key: 'status',
      render: (row) => (
        <Badge
          variant={
            row.status === 'PRESENT'
              ? 'emerald'
              : row.status === 'LATE'
              ? 'amber'
              : row.status === 'FLAGGED_PROXY'
              ? 'orange'
              : 'rose'
          }
          size="sm"
        >
          {row.status}
        </Badge>
      ),
    },
  ];

  const filteredRecords = statusFilter === 'ALL'
    ? records
    : records.filter((record) => record.status === statusFilter);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-black text-sky-950 tracking-tight flex items-center gap-2.5">
          <CalendarDays className="w-7 h-7 text-sky-500" />
          <span>Personal Attendance Ledger</span>
        </h2>
        <p className="text-xs text-sky-700/80 mt-1">
          Historical log of all recorded present, absent, and late lecture timestamps.
        </p>
      </div>

      {!loading && (
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="attendance-status" className="text-sm font-semibold text-sky-900">
            Status
          </label>
          <select
            id="attendance-status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm text-sky-900 focus:outline-none focus:ring-2 focus:ring-sky-400/30"
          >
            <option value="ALL">All records</option>
            <option value="PRESENT">Present</option>
            <option value="LATE">Late</option>
            <option value="ABSENT">Absent</option>
            <option value="FLAGGED_PROXY">Flagged</option>
          </select>
          <span className="text-xs text-sky-600" aria-live="polite">
            {filteredRecords.length} of {records.length} records
          </span>
        </div>
      )}

      {loading ? (
        <LoadingSpinner size="lg" text="Retrieving attendance ledger..." />
      ) : (
        <DataTable
          columns={columns}
          data={filteredRecords}
          searchPlaceholder="Search history by course code..."
          emptyMessage={statusFilter === 'ALL'
            ? 'No historical records found for this account'
            : 'No records match this status'}
        />
      )}
    </div>
  );
}
