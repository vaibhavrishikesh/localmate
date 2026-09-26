# Supabase setup for LocalMate

LocalMate runs in **demo-json** mode until Supabase env vars are set.
With vars present, Auth + Postgres + RLS take over for core flows.

## 1. Create a Supabase project

1. Open https://supabase.com and create a project (region close to India if possible).
2. Wait for the database to finish provisioning.
3. **Settings → API**: copy Project URL, `anon` key, and `service_role` key.

## 2. Configure env

```bash
cp .env.example .env.local
```

Fill:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3040`)
- Keep `LOCALMATE_ADMIN_SECRET` for legacy admin routes if needed

## 3. Apply migrations

### Option A — SQL Editor

In Supabase Dashboard → **SQL → New query**, run in order:

1. `supabase/migrations/202603270001_schema.sql`
2. `supabase/migrations/202603270002_rls.sql`

### Option B — Supabase CLI

```bash
npx supabase login
npx supabase link --project-ref YOUR_REF
npx supabase db push
```

## 4. Auth settings

- **Authentication → Providers → Email**: enable email/password.
- Enable **Confirm email** for production; you may disable confirmation for local testing only.
- **Phone OTP**: enable only after attaching a real SMS provider in Supabase. Do not add fake OTP UIs.
- **URL configuration**: add `http://localhost:3040` and your production URL to redirect allow-list.

## 5. Storage

Migration creates private bucket `verification-docs`.
Do **not** store passports/Aadhaar unless you have a compliant process.
Prefer provider-backed verification status in `verification_records`.

## 6. Seed (dev only)

Demo Maya/Rahul live in the JSON backend (`data/localmate-db.json` / `src/lib/seed.ts`).
They are **not** automatically copied into Supabase.

To create a real user:

1. Sign up via the app (`signupEmail`) once Supabase is on.
2. In SQL, optionally mark staff:

```sql
update public.profiles set is_admin = true where email = 'you@example.com';
```

3. Clear identity for a helper (as admin user via RPC `admin_set_identity_verified`).

## 7. Migrating old demo JSON

Optional: export `data/localmate-db.json` and map fields to tables using the mappers in `src/lib/supabase/map.ts`.
Do not delete the JSON file until you have confirmed Supabase data.
Mark imported rows with `is_demo = true`.

## 8. Verify mode

```bash
npm run dev -- -p 3040
curl -s http://localhost:3040/api/state | head
```

Response includes `"backend":"supabase"` or `"backend":"demo-json"`.

## Honesty

Configured env ≠ production-ready payments or government KYC.
Payment holds remain **simulated** (`payment_holds.is_simulated = true`).
