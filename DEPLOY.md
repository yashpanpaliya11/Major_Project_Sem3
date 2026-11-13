# Deploy EduPulse

This setup follows the project documentation's React 19 + Vite 8 frontend, Express 5 + Socket.io backend, Prisma 6 ORM, and PostgreSQL 18 database. Caddy provides HTTPS and forwards WebSocket connections. Use a Linux VPS with Docker Compose, a public domain, and ports 80 and 443 open.

1. Point your domain's A record to the VPS public IP.
2. Copy `.env.deploy.example` to `.env`. Set `DOMAIN` to that domain. Replace all three secrets with unique random values. Use letters and digits for `DB_PASSWORD` because it is included in a database URL. Generate values with `openssl rand -hex 32`.
3. Run `docker compose up -d --build` from the project root. The app waits for PostgreSQL, applies the Prisma schema, and starts the web server.
4. Visit `https://YOUR_DOMAIN/api/health` and confirm `database` is `up`. Then open `https://YOUR_DOMAIN`.

Do not run `db:seed` on a public or real institution database. The seed creates demonstration accounts. Create real users through the application's registration flow and provision an administrator using a private, reviewed procedure. Public admin signup stays disabled.

For updates, back up the database and run `docker compose up -d --build`. `prisma db push` runs at startup and refuses destructive changes without an explicit flag. Review schema changes before deploying them. Back up PostgreSQL with `docker compose exec -T db pg_dump -U edupulse -d edupulse > edupulse-backup.sql`. Do not reuse a PostgreSQL 16 data volume with the PostgreSQL 18 image. Migrate or restore data using a reviewed database upgrade procedure.

This project supports in-person, online, and hybrid lecture modes. Face matching is simulated in the current source and must not be presented as biometric identity verification. Email delivery is not configured. The QR rotation runs inside one app process, so keep one app replica unless the scheduler is moved to shared infrastructure.
