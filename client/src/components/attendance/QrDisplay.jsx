import { useState, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Shield, RefreshCw, Clock, Copy, Check, WifiOff, Square } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSocket } from '../../hooks/useSocket';

export default function QrDisplay({ sessionId, initialToken, sessionName, sessionEnded = false }) {
  const { socket, connected } = useSocket();
  const [token, setToken] = useState(initialToken || null);
  const [expiresAt, setExpiresAt] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(7);
  const [refreshCount, setRefreshCount] = useState(0);
  const [copied, setCopied] = useState(false);
  const [ended, setEnded] = useState(false);
  const isEnded = ended || sessionEnded;

  useEffect(() => {
    if (!socket || !sessionId) return;

    socket.emit('join:session', { sessionId });

    const handleQrRefresh = (data) => {
      if (data?.sessionId !== sessionId || !data?.qrPayload) return;

      const lifetime = Number(data.expiresIn) > 0 ? Number(data.expiresIn) : 7000;
      setToken(data.qrPayload);
      setExpiresAt(Date.now() + lifetime);
      setSecondsLeft(Math.max(1, Math.ceil(lifetime / 1000)));
      setRefreshCount((count) => count + 1);
    };

    const handleSessionEnded = (data) => {
      if (data?.sessionId && data.sessionId !== sessionId) return;
      setEnded(true);
      setToken(null);
      toast('Lecture session ended', { icon: '⏹️' });
    };

    const handleSessionError = (data) => {
      toast.error(data?.message || 'Could not join the lecture session');
    };

    socket.on('qr:refresh', handleQrRefresh);
    socket.on('session:ended', handleSessionEnded);
    socket.on('session:error', handleSessionError);

    return () => {
      socket.off('qr:refresh', handleQrRefresh);
      socket.off('session:ended', handleSessionEnded);
      socket.off('session:error', handleSessionError);
      socket.emit('leave:session', { sessionId });
    };
  }, [socket, sessionId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft(
        expiresAt > 0 ? Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000)) : 7
      );
    }, 250);
    return () => clearInterval(timer);
  }, [expiresAt]);

  const handleCopyToken = useCallback(() => {
    if (!token) return;
    navigator.clipboard
      .writeText(token)
      .then(() => {
        setCopied(true);
        toast.success('Active QR token copied');
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => toast.error('Could not copy the token'));
  }, [token]);

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white border border-sky-100 rounded-3xl shadow-sm relative overflow-hidden">
      <div className="w-full flex items-center justify-between mb-6 pb-4 border-b border-sky-100">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-sky-500" />
          <span className="text-sm font-bold text-sky-950 tracking-wide">
            Dynamic Cryptographic QR
          </span>
        </div>
        <div
          className={`flex items-center gap-1.5 px-3 py-1 border rounded-full text-xs font-semibold ${
            isEnded
              ? 'bg-slate-100 border-slate-200 text-slate-500'
              : 'bg-sky-50 border-sky-200 text-sky-600'
          }`}
        >
          {isEnded ? (
            <>
              <Square className="w-3.5 h-3.5" />
              <span>Ended</span>
            </>
          ) : (
            <>
              <Clock className="w-3.5 h-3.5" />
              <span>Rolling: {secondsLeft}s</span>
            </>
          )}
        </div>
      </div>

      <div className="p-4 bg-sky-50/40 rounded-2xl border border-sky-100 shadow-sm flex items-center justify-center relative transition-all duration-300">
        {token && !isEnded ? (
          <QRCodeSVG value={token} size={220} level="H" marginSize={2} />
        ) : (
          <div className="w-56 h-56 flex flex-col items-center justify-center text-sky-400 gap-2">
            <RefreshCw className={`w-8 h-8 text-sky-500 ${isEnded ? '' : 'animate-spin'}`} />
            <span className="text-xs font-medium">{isEnded ? 'Session ended' : 'Generating token...'}</span>
          </div>
        )}
      </div>

      <div className="mt-6 text-center space-y-3">
        <button
          onClick={handleCopyToken}
          disabled={!token || isEnded}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold transition shadow-sm disabled:opacity-40"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-sky-500" />
          )}
          <span>{copied ? 'Token copied!' : 'Copy active token (quick test)'}</span>
        </button>

        <p className="text-xs text-sky-600/90 font-medium max-w-xs">
          The token rotates every few seconds over Socket.io with an HMAC-SHA256 signature, so
          screenshots and forwarded images expire almost immediately.
        </p>

        {!connected && (
          <div className="inline-flex items-center gap-1.5 text-[11px] text-amber-600 font-medium">
            <WifiOff className="w-3.5 h-3.5" />
            <span>Real-time connection lost — the code will not rotate until reconnected.</span>
          </div>
        )}

        <div className="text-[11px] font-mono text-sky-500 font-medium">
          Refreshed: #{refreshCount} cycles | Session: {sessionName || sessionId?.slice(0, 8)}
        </div>
      </div>
    </div>
  );
}
