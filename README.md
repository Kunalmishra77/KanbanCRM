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

## Supabase

The app uses Supabase for everything it stores.

**Database:** set `DATABASE_URL` to the Supabase *Transaction pooler* connection string. The connection is encrypted and verified against Supabase's root CA. After the tables exist, run once:

```
npm run db:secure
```

This turns on row level security for every table and removes all access for the public `anon`/`authenticated` keys, so the data is reachable only through this server.

**Files:** uploads go to four private Supabase Storage buckets (S3-compatible): `invoices`, `documents`, `proposals`, `attachments`. They are created automatically on the first upload. Nothing is public: `/api/files/:bucket/:file` checks the signed-in user's role (`invoices` and `documents` are co-founder only) and then redirects to a 60-second signed link. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (server only). Files are limited to 5 MB and a fixed list of types.

## Scheduled jobs

`GET /api/cron/check-deadlines` sends deadline reminder emails. Call it daily with `Authorization: Bearer $CRON_SECRET` (it is disabled when `CRON_SECRET` is not set).

## Access

Only users already in the `users` table (added by an admin or HR) and the co-founder emails can sign in.
