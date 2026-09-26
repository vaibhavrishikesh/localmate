# LocalMate

Prototype local task marketplace for **Rishikesh**.

> Need something done? Find a trusted local.

## What this prototype includes

- Customer + helper flows (demo: **Maya** / **Rahul**)
- Post tasks, offers, chat (EN/HI), active job, GPS + Google Maps
- **Server-backed** accounts, tasks, messages (`data/localmate-db.json`)
- **Payment hold**: amount locked on accept; helper paid only after customer confirms
- **ID review**: users can request review; only staff can clear via admin API (no self-verify)

## Run locally

```bash
npm install
cp .env.example .env.local   # set LOCALMATE_ADMIN_SECRET
npm run dev -- -p 3040
```

Open [http://localhost:3040](http://localhost:3040).

### Phone on same Wi‑Fi

```text
http://<your-computer-lan-ip>:3040
```

Example: `http://192.168.0.104:3040`

## Admin ID clearance

```bash
curl -X POST http://localhost:3040/api/admin/verify \
  -H "Content-Type: application/json" \
  -H "X-LocalMate-Admin: YOUR_SECRET" \
  -d "{\"userId\":\"sameer\",\"cleared\":true}"
```

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS v4

## Honesty

Demo payments are **hold/release on the server**, not live card charges. ID clearance is staff-only — not a real government KYC product in this prototype.
