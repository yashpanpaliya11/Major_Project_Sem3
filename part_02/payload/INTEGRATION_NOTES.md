# Final code sync

Base: `ashmitsahu1812/major_ad_pro` at `b8a408d466ac1c86ec00e37de50f3aacf91cbce9`.

Compatible ideas adapted from the earlier EduPulse work:

- Export department attendance averages, student counts, and below-75% counts as CSV from the overview dashboard.
- Protect exported roster and department CSV cells from spreadsheet formula execution.

The earlier EduPulse app uses a different authentication, database, and API model. Its React pages, Prisma controllers, migrations, and Docker setup were not copied into this application because they would not run against this codebase.

Run `npm ci`, then `npm run dev` for local use. Set the environment variables described in `README.md` for your chosen database and Firebase mode. The production frontend was built with `npm run build` and is included in `public/`.
