# LocalMate

Prototype local task marketplace for **Rishikesh**.

> Need something done? Find a trusted local.

## Backends

| Mode | When | Persistence |
|------|------|-------------|
| **demo-json** (default) | No Supabase env | `data/localmate-db.json` + cookie session (Maya/Rahul) |
| **supabase** | `NEXT_PUBLIC_SUPABASE_*` set | Postgres + Supabase Auth + RLS |

See **[docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md)** and **[docs/BACKEND.md](docs/BACKEND.md)**.

## What this app includes

- Customer + helper flows (demo: **Maya** / **Rahul**)
- Post tasks, offers, chat (EN/HI), active job, GPS + Google Maps
- Payment hold (simulated): amount locked on accept; helper paid only after customer confirms
- ID review: users request review; only staff can clear (no self-verify)

## Run locally (demo-json)

```bash
npm install
cp .env.example .env.local   # set LOCALMATE_ADMIN_SECRET; leave Supabase blank for demo
npm run dev -- -p 3040
```

Open [http://localhost:3040](http://localhost:3040).

## Enable Supabase

1. Create a Supabase project
2. Run SQL migrations in `supabase/migrations/`
3. Fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`
4. Restart `npm run dev`
5. Confirm `/api/state` returns `"backend":"supabase"`

Auth then uses email/password (`signinEmail` / `signupEmail`). Demo Maya/Rahul sign-in is disabled in that mode.

## Checks

```bash
npm run test
npm run typecheck
npm run lint
```

## Honesty

Demo payments are **hold/release on the server**, not live card charges. ID clearance is staff-only — not a real government KYC product. Supabase is not live until you configure a project and apply migrations.
