import React, { useState, useEffect, useRef } from 'react';
import { Bell, ExternalLink, CheckCheck, AlertTriangle, Info, ShieldAlert } from 'lucide-react';
import api from '../../api/axios';
import { useSocket } from '../../hooks/useSocket';
import { formatDateTime } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { socket } = useSocket();

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/student/notifications');
      if (res.data?.success) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch {
      // Non-students or network error
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Listen for real-time notifications over WebSockets
  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = ({ notification }) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((c) => c + 1);
      toast((t) => (
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-sky-950">{notification.title}</p>
            <p className="text-[11px] text-sky-700 mt-0.5">{notification.message}</p>
          </div>
        </div>
      ), { duration: 5000 });
    };

    socket.on('notification:new', handleNewNotification);
    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/student/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Ignore
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-xl border border-sky-200 bg-white hover:bg-sky-50 text-sky-700 transition-colors shadow-sm"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse shadow-md shadow-rose-500/30">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-sky-100 shadow-2xl z-50 overflow-hidden">
          <div className="p-4 border-b border-sky-100 flex items-center justify-between bg-sky-50/50">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-sky-950">Notifications</h4>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold border border-rose-200">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <button
              onClick={fetchNotifications}
              className="text-xs text-sky-600 hover:text-sky-800 font-bold"
            >
              Refresh
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-sky-50">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-sky-400 font-medium">
                No notifications logged.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 transition-colors ${
                    n.read ? 'bg-white' : 'bg-sky-50/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      {n.type === 'CRITICAL' ? (
                        <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      ) : n.type === 'WARNING' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-xs font-bold text-sky-950 leading-tight">
                          {n.title}
                        </p>
                        <p className="text-[11px] text-sky-800 mt-1 leading-relaxed font-medium">
                          {n.message}
                        </p>
                        <p className="text-[10px] text-sky-400 mt-1.5 font-medium">
                          {formatDateTime(n.createdAt)}
                        </p>

                        {n.emailUrl && (
                          <a
                            href={n.emailUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 text-[11px] font-bold hover:bg-sky-100 transition shadow-sm"
                          >
                            <ExternalLink className="w-3 h-3 text-sky-500" />
                            View Dispatched Email Notice
                          </a>
                        )}
                      </div>
                    </div>

                    {!n.read && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="text-sky-400 hover:text-sky-700 p-1 rounded"
                        title="Mark as read"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
