import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';

import { config } from './config/env.js';
import prisma from './config/db.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';
import facultyRoutes from './routes/faculty.routes.js';
import studentRoutes from './routes/student.routes.js';
import courseRoutes from './routes/course.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import errorHandler from './middleware/errorHandler.js';
import { apiLimiter } from './middleware/rateLimit.js';
import { setupSocket, stopAllQrRotations } from './socket/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);

if (config.trustProxy) app.set('trust proxy', 1);
app.disable('x-powered-by');

function isAllowedOrigin(origin, req) {
  if (!origin) return true;

  if (!config.isProduction && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return true;
  }

  if (config.clientUrls.includes(origin)) return true;
  if (config.publicUrl && origin === config.publicUrl) return true;

  // Same-origin requests when the API serves the built client.
  const host = req.headers.host;
  if (host && (origin === `https://${host}` || origin === `http://${host}`)) return true;

  return false;
}

app.use(
  helmet({
    // The API is consumed by the SPA; a strict default CSP would block the
    // chart library's inline styles and remote avatars. The SPA is served with
    // no-cache HTML and immutable hashed assets instead.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    hsts:
      config.isProduction && config.publicUrl.startsWith('https://')
        ? { maxAge: 15552000, includeSubDomains: true, preload: false }
        : false,
  })
);
app.use(compression());

app.use((req, res, next) => {
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin, req)) return callback(null, true);
      const error = new Error('Origin is not allowed by CORS');
      error.statusCode = 403;
      return callback(error);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })(req, res, next);
});

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

// --- Health check (not rate limited, used by deployment platforms) ---
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.json({
      status: 'ok',
      service: 'EduPulse API & WebSocket Server',
      database: 'up',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  } catch {
    return res.status(503).json({
      status: 'degraded',
      service: 'EduPulse API & WebSocket Server',
      database: 'down',
      timestamp: new Date().toISOString(),
    });
  }
});

app.use('/api', apiLimiter);

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/attendance', attendanceRoutes);

// Unmatched API routes must stay JSON, never fall through to the SPA.
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

// --- Built client (single-service deployment) ---
const clientDist = path.resolve(__dirname, '../../client/dist');
const clientIndex = path.join(clientDist, 'index.html');

if (config.serveClient) {
  if (fs.existsSync(clientIndex)) {
    // Hashed assets can be cached forever; index.html must never be cached.
    app.use(
      '/assets',
      express.static(path.join(clientDist, 'assets'), { immutable: true, maxAge: '1y' })
    );
    app.use(express.static(clientDist, { index: false, maxAge: 0 }));

    app.get(/^\/(?!api\/|socket\.io\/).*/, (req, res) => {
      res.set('Cache-Control', 'no-cache');
      res.sendFile(clientIndex);
    });
  } else {
    console.warn(
      `⚠️  SERVE_CLIENT is enabled but ${clientIndex} was not found. Run "npm run build:client" first.`
    );
  }
}

// --- Final 404 for anything else ---
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
});

app.use(errorHandler);

// --- Socket.io ---
const io = new SocketIOServer(server, {
  // Use the same origin allowlist as the HTTP CORS configuration so that
  // WebSocket connections are subject to the same access control.
  cors: {
    origin: (origin, callback) => {
      // Allow server-side / same-origin connections that have no origin header.
      if (!origin) return callback(null, true);
      if (isAllowedOrigin(origin, {})) return callback(null, true);
      return callback(new Error('WebSocket origin not allowed'));
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 1e6,
});

app.set('io', io);
setupSocket(io);

server.listen(config.port, () => {
  console.log('===============================================');
  console.log(`🚀 EduPulse API & Socket.io server running`);
  console.log(`📡 URL: http://localhost:${config.port}`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
  console.log(`🛡️  CORS Origins: ${config.clientUrls.join(', ')}`);
  console.log(`🖥️  Serving client build: ${config.serveClient ? 'yes' : 'no'}`);
  console.log('===============================================');
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n${signal} received — shutting down gracefully...`);
  stopAllQrRotations();

  const forceExit = setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
  forceExit.unref();

  io.close();
  server.close(async () => {
    try {
      await prisma.$disconnect();
    } finally {
      clearTimeout(forceExit);
      process.exit(0);
    }
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err);
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  shutdown('unhandledRejection');
});

export { app, server, io };
