import { RISK_THRESHOLDS, ATTENDANCE_STATUS } from './constants';

export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date, options = {}) {
  if (!date) return '';
  const d = new Date(date);
  if (options.timeOnly) {
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPercentage(value) {
  if (value == null || isNaN(value)) return '0.0%';
  return `${Number(value).toFixed(1)}%`;
}

export function getRiskLevel(percentage) {
  if (percentage < RISK_THRESHOLDS.CRITICAL) return 'critical';
  if (percentage < RISK_THRESHOLDS.WARNING) return 'warning';
  if (percentage < RISK_THRESHOLDS.CAUTION) return 'caution';
  return 'safe';
}

export function getRiskColor(level) {
  switch (level) {
    case 'critical':
      return 'text-rose-500 bg-rose-50 border-rose-200';
    case 'warning':
      return 'text-amber-500 bg-amber-50 border-amber-200';
    case 'caution':
      return 'text-orange-500 bg-orange-50 border-orange-200';
    case 'safe':
      return 'text-emerald-500 bg-emerald-50 border-emerald-200';
    default:
      return 'text-slate-500 bg-slate-50 border-slate-200';
  }
}

export function getStatusColor(status) {
  switch (status) {
    case ATTENDANCE_STATUS.PRESENT:
      return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    case ATTENDANCE_STATUS.ABSENT:
      return 'text-rose-600 bg-rose-50 border-rose-200';
    case ATTENDANCE_STATUS.LATE:
      return 'text-amber-600 bg-amber-50 border-amber-200';
    case ATTENDANCE_STATUS.FLAGGED_PROXY:
      return 'text-orange-600 bg-orange-50 border-orange-200';
    default:
      return 'text-slate-600 bg-slate-50 border-slate-200';
  }
}

export function getStatusLabel(status) {
  switch (status) {
    case ATTENDANCE_STATUS.PRESENT:
      return 'Present';
    case ATTENDANCE_STATUS.ABSENT:
      return 'Absent';
    case ATTENDANCE_STATUS.LATE:
      return 'Late';
    case ATTENDANCE_STATUS.FLAGGED_PROXY:
      return 'Flagged';
    default:
      return status;
  }
}

export function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}
