# LocalMate payment architecture

## Provider selection: Razorpay Route (India)

LocalMate is a **one-to-many marketplace** (customers → many helpers). Ordinary Razorpay Checkout / “merchant payment” alone does **not** equal marketplace payouts. Helpers need **Linked Accounts** and **Transfers** under [Razorpay Route](https://razorpay.com/docs/payments/route/).

### Why Route (vs plain Checkout)

| Need | Plain Checkout | Route |
|------|----------------|-------|
| Collect from customer | Yes | Yes |
| Split to helper bank | Manual / Payouts product only | Transfers to Linked Accounts |
| Hold until task confirm | Limited | Settlement hold / deferred transfer |
| Refunds with reversals | Merchant refund | Refund + transfer reverse patterns |

**Alternatives considered:** Cashfree Easy Split, PayU Marketplace, Stripe Connect (weaker India UPI ubiquity for this launch). For Rishikesh/India first launch, **Razorpay Route** is the primary target. Approval is **not guaranteed** — product enablement is account-by-account.

### What Route is not

- Not “escrow” in the legal sense unless your entity + Razorpay contract say so. LocalMate language: **settlement hold / deferred transfer**.
- Gateway fees and GST are **separate** from LocalMate’s 10% commission. Do not silently subtract gateway fees from helper earnings without an explicit ledger entry.

### Business onboarding (production blockers)

1. LocalMate company / proprietorship registration, PAN, bank account.
2. Razorpay merchant KYC + activate **Route** (RBI PA guidelines / turnover proofs may apply — confirm with Razorpay Support; requirements change).
3. Each helper: Linked Account + KYC (PAN, bank, penny test) + cooling period before transfers.
4. Webhook endpoint over HTTPS with signature verification.
5. Live keys only after sandbox E2E; never mix test/live keys.

### Fee sketch (illustrative — confirm on your Razorpay contract)

- Gateway fee on customer charge (e.g. ~2% + GST — **varies**).
- Transfer fee on Route transfers (e.g. small % + GST — **varies**).
- LocalMate platform commission: **10% of agreed task price** (commission base = `agreed_amount`), calculated in **paise**.

### Settlement timing

- Linked Account settlements often ~**T+2 working days** after transfer settles (confirm in dashboard).
- Settlement can be held until LocalMate marks the task eligible (product feature: settlement on hold).

---

## Commission math (server-only)

- Store money as **integer paise** (₹1 = 100 paise).
- Commission base = agreed task amount in paise.
- `platform_commission_paise = round(base * 0.10)` using half-away-from-zero via `Math.round`.
- `helper_gross_paise = base - platform_commission_paise`.
- Example: ₹500 → 50000 paise → commission 5000 → helper 45000.
- Gateway fees recorded as separate `payment_ledger` entries (`provider_fee`), never silently folded into commission.

---

## Modes

| Mode | When | Behavior |
|------|------|----------|
| `simulated` | No Razorpay keys | Existing LocalMate hold/release; labeled **SIMULATED** |
| `razorpay_test` | Test keys set | Orders + webhook verification against test API |
| `razorpay_live` | Live keys + `PAYMENTS_LIVE=true` | Real money — blocked until explicitly enabled |

---

## Flow (target)

1. Task status `pay`, authenticated customer owns task.
2. Server creates `payments` row + Razorpay Order (or simulated order).
3. Customer pays via Razorpay Checkout (hosted) — never card data on LocalMate servers.
4. Webhook `payment.captured` verified with signature → ledger entries → status `captured`.
5. After customer confirms job, create transfer to helper Linked Account (or mark payout pending if not onboarded).
6. Refunds/disputes = new ledger rows; never rewrite history.

## Honesty

Code in this repo prepares the foundation. **Real payments are not claimed working** until sandbox credentials are configured and tests pass against Razorpay test mode.

---

## Sandbox setup checklist

1. Razorpay Dashboard → Test mode API keys → set `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `NEXT_PUBLIC_RAZORPAY_KEY_ID`.
2. Apply `supabase/migrations/202603270003_payments.sql`.
3. Add webhook URL: `https://YOUR_DOMAIN/api/payments/webhook` (events: `payment.captured`, `payment.failed`, `transfer.*` when Route enabled).
4. Set `RAZORPAY_WEBHOOK_SECRET`.
5. Keep `PAYMENTS_LIVE=false`.
6. Call `POST /api/payments/create-order` with `{ "taskId": "..." }` while authenticated as task customer.
7. Confirm via Checkout → `POST /api/payments/confirm` with signature fields.
8. **Route / Linked Accounts:** request product access; onboard a test Linked Account; do not call transfer until KYC + penny test succeed.

## Production blockers

- [ ] Company KYC on Razorpay + **Route enabled**
- [ ] RBI PA / turnover declarations if required by Razorpay for Route
- [ ] Helper Linked Account KYC for each payout recipient
- [ ] Legal review: settlement hold ≠ escrow wording on UI/ToS
- [ ] GST / invoice process for platform commission
- [ ] Live keys + `PAYMENTS_LIVE=true` only after sandbox E2E
- [ ] PCI: only hosted Checkout / tokenized fields — never store PAN/CVV
- [ ] Webhook HTTPS + replay/idempotency monitoring
