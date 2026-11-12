import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';
import { config } from '../config/env.js';
import { refreshSessionQr } from '../services/qr.service.js';
import { isValidUuid } from '../utils/validation.js';

// sessionId -> { timer, courseId }
const activeRotations = new Map();

async function canManageSession(user, sessionId) {
  if (!user || !['ADMIN', 'FACULTY'].includes(user.role)) return false;

  const session = await prisma.lectureSession.findUnique({
    where: { id: sessionId },
    select: { endTime: true, course: { select: { facultyId: true } } },
  });

  if (!session) return false;
  if (user.role === 'ADMIN') return session;
  return session.course.facultyId === user.id ? session : false;
}

function decodeTokenAge(token) {
  try {
    const { timeBucket } = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    return Number.isFinite(timeBucket) ? Date.now() - timeBucket : null;
  } catch {
    return null;
  }
}

async function emitCurrentQr(socket, sessionId) {
  const session = await prisma.lectureSession.findUnique({
    where: { id: sessionId },
    select: { activeQrToken: true },
  });

  if (!session?.activeQrToken) return;

  const age = decodeTokenAge(session.activeQrToken);
  const remaining = age === null ? 0 : Math.max(0, config.qrValidityMs - age);

  socket.emit('qr:refresh', {
    sessionId,
    qrPayload: session.activeQrToken,
    expiresIn: remaining,
    timestamp: Date.now(),
  });
}

/**
 * Socket.io setup.
 */
export function setupSocket(io) {
  io.use((socket, next) => {
    try {
      const headerToken = socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
      const token = socket.handshake.auth?.token || headerToken;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      if (!decoded?.id || !decoded?.role) {
        return next(new Error('Invalid session token'));
      }

      socket.user = decoded;
      return next();
    } catch {
      return next(new Error('Invalid or expired session token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;

    if (user.role === 'ADMIN') socket.join('admin-room');
    if (user.role === 'FACULTY') socket.join(`faculty:${user.id}`);

    socket.on('join:session', async (payload = {}) => {
      const sessionId = payload?.sessionId;
      if (!isValidUuid(sessionId)) {
        return socket.emit('session:error', { message: 'Invalid session ID' });
      }

      try {
        const session = await canManageSession(user, sessionId);
        if (!session) {
          return socket.emit('session:error', {
            message: 'You are not authorized to watch this lecture session',
          });
        }

        socket.join(`session:${sessionId}`);

        if (!session.endTime) {
          if (activeRotations.has(sessionId)) {
            await emitCurrentQr(socket, sessionId);
          } else {
            startSessionQrRotation(io, sessionId);
          }
        }
      } catch (err) {
        console.error('join:session error:', err.message);
        socket.emit('session:error', { message: 'Could not join the lecture session' });
      }
    });

    socket.on('leave:session', (payload = {}) => {
      if (isValidUuid(payload?.sessionId)) {
        socket.leave(`session:${payload.sessionId}`);
      }
    });

    socket.on('session:start-qr', async (payload = {}) => {
      const sessionId = payload?.sessionId;
      if (!isValidUuid(sessionId)) return;
      try {
        const session = await canManageSession(user, sessionId);
        if (!session || session.endTime) return;
        startSessionQrRotation(io, sessionId);
      } catch (err) {
        console.error('session:start-qr error:', err.message);
      }
    });

    socket.on('session:stop-qr', async (payload = {}) => {
      const sessionId = payload?.sessionId;
      if (!isValidUuid(sessionId)) return;
      try {
        const session = await canManageSession(user, sessionId);
        if (!session) return;
        stopSessionQrRotation(sessionId);
      } catch (err) {
        console.error('session:stop-qr error:', err.message);
      }
    });
  });

  resumeActiveQrRotations(io);

  return io;
}

/**
 * Start or keep-alive the rolling QR for a lecture session.
 */
export function startSessionQrRotation(io, sessionId) {
  if (activeRotations.has(sessionId)) return;

  const intervalTime = config.qrRefreshInterval;

  const tick = async () => {
    try {
      const session = await prisma.lectureSession.findUnique({
        where: { id: sessionId },
        select: { endTime: true },
      });

      if (!session || session.endTime) {
        stopSessionQrRotation(sessionId);
        io.to(`session:${sessionId}`).emit('session:ended', { sessionId });
        return;
      }

      const qrData = await refreshSessionQr(sessionId);
      io.to(`session:${sessionId}`).emit('qr:refresh', {
        sessionId,
        qrPayload: qrData.payload,
        expiresIn: intervalTime,
        timestamp: Date.now(),
      });
    } catch (err) {
      console.error(`QR rotation error for session ${sessionId}:`, err.message);
      // A deleted session should not leave a timer running forever.
      if (err.code === 'P2025') stopSessionQrRotation(sessionId);
    }
  };

  // Emit immediately so the projector never waits for the first interval.
  tick();
  const timer = setInterval(tick, intervalTime);
  activeRotations.set(sessionId, { timer });
}

export function stopSessionQrRotation(sessionId) {
  const entry = activeRotations.get(sessionId);
  if (entry) {
    clearInterval(entry.timer);
    activeRotations.delete(sessionId);
  }
}

export function stopAllQrRotations() {
  for (const { timer } of activeRotations.values()) {
    clearInterval(timer);
  }
  activeRotations.clear();
}

/**
 * Restart QR rotation for live sessions after a server restart.
 */
export async function resumeActiveQrRotations(io) {
  try {
    const activeSessions = await prisma.lectureSession.findMany({
      where: { endTime: null },
      select: { id: true },
    });

    for (const session of activeSessions) {
      startSessionQrRotation(io, session.id);
    }

    if (activeSessions.length > 0) {
      console.log(`🔁 Resumed rolling QR for ${activeSessions.length} active session(s)`);
    }
  } catch (err) {
    console.error('Could not resume active sessions:', err.message);
  }
}
