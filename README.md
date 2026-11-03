# AGENTiX CRM

Kanban CRM for clients, leads, stories and team management. React + Vite frontend, Express + Drizzle (Postgres) backend, Google sign-in. Installable as an app (PWA).

## Run locally

```
npm install
cp .env.example .env   # fill in DATABASE_URL, SESSION_SECRET, GOOGLE_CLIENT_ID/SECRET
npm run dev            # http://localhost:5000
```

## Build and run (production)

```
npm run build
npm start
```

The Dockerfile does the same. See `.env.example` for all settings.

## File uploads

Uploaded files are stored on disk in `STORAGE_DIR` (default `./storage`), one folder per bucket:

```
storage/uploads/invoices/
storage/uploads/documents/
storage/uploads/proposals/
storage/uploads/attachments/
```

Files are only served through the authenticated `/api/files/:bucket/:file` route; `invoices` and `documents` are co-founder only.

**Deploying with Docker/Coolify:** mount a persistent volume at `/app/storage`, otherwise uploaded files disappear on every rebuild. Include that folder in your backups.

## Scheduled jobs

`GET /api/cron/check-deadlines` sends deadline reminder emails. Call it daily with `Authorization: Bearer $CRON_SECRET` (it is disabled when `CRON_SECRET` is not set).

## Access

Only users already in the `users` table (added by an admin or HR) and the co-founder emails can sign in.
