# LocalMate backend foundation (Supabase)

## What was implemented

1. **SQL migrations** — `supabase/migrations/`
   - profiles, tasks, task_applications, conversations, messages, reviews,
     notifications, user_blocks, reports, verification_records, task_status_history,
     payment_holds (simulated)
2. **RLS + privilege triggers** — users cannot self-grant `identity_verified`, rating, admin
3. **Supabase clients** — browser (anon), server (SSR cookies), admin (service role, server-only)
4. **Dual backend**
   - No Supabase env → existing **demo-json** (Maya/Rahul) — UI unchanged
   - With Supabase env → Auth email sign-up/sign-in + DB-backed core mutations
5. **API wiring** — `/api/state`, `/api/auth`, `/api/mutate` branch on `backendMode()`
6. **Middleware** — refreshes Supabase session cookies when configured
7. **`.env.example`** — placeholders only
8. **Setup guide** — `docs/SUPABASE_SETUP.md`
9. **Unit tests** — workflow + backend mode (no live Supabase required)

## Required env vars

| Variable | Required for | Client? |
|----------|--------------|---------|
| `LOCALMATE_ADMIN_SECRET` | Demo admin verify | No |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase mode | Yes (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase mode | Yes (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Atomic admin ops / holds | **No — server only** |
| `NEXT_PUBLIC_SITE_URL` | Auth email redirects | Yes |

## Manual setup

See `docs/SUPABASE_SETUP.md`. Until migrations are applied and env is set, **Supabase Auth/DB are not live**.

## Remaining limitations

- Phone OTP: schema/docs ready; needs Supabase Phone provider + SMS gateway — **not claimed working**
- Some mutate actions still return 501 in Supabase mode: `confirmAndReview`, `reportUser`, `blockUser`, `unblockUser`, `markRead` (extend `src/server/supabase/mutations.ts`)
- Login UI still demos Maya/Rahul until you add email fields when `backend === "supabase"` (API already supports `signinEmail` / `signupEmail`)
- No automatic migration of `localmate-db.json` rows into Postgres
- Payment holds are **simulated**, not Stripe/UPI charges
- Identity verification remains staff/provider-backed, not DigiLocker

## Checks

Run:

```bash
npm run test
npm run lint
npx tsc --noEmit
```
