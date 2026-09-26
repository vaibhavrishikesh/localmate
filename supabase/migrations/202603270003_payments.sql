-- LocalMate marketplace payments foundation (paise, ledger, Route-ready)
-- Does not enable live money movement by itself.

do $$ begin
  create type public.marketplace_payment_status as enum (
    'created', 'pending', 'authorized', 'captured', 'failed', 'cancelled', 'refunded', 'partially_refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.ledger_entry_type as enum (
    'customer_charge',
    'platform_commission',
    'helper_payable',
    'provider_fee',
    'tax',
    'refund',
    'refund_reversal',
    'payout',
    'payout_reversal',
    'adjustment'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payout_status as enum (
    'pending', 'processing', 'paid', 'failed', 'reversed', 'on_hold'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.refund_status as enum (
    'requested', 'processing', 'processed', 'failed', 'cancelled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.webhook_processing_status as enum (
    'received', 'processed', 'ignored', 'failed'
  );
exception when duplicate_object then null; end $$;

-- Helper Linked Account / KYC tracking (Razorpay Route)
create table if not exists public.helper_payment_accounts (
  id uuid primary key default gen_random_uuid(),
  helper_id uuid not null unique references public.profiles (id) on delete cascade,
  provider text not null default 'razorpay',
  provider_account_id text,
  kyc_status text not null default 'not_started',
  bank_verified boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 1. payments (provider orders / captures)
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete restrict,
  customer_id uuid not null references public.profiles (id) on delete restrict,
  helper_id uuid references public.profiles (id) on delete set null,
  amount_paise integer not null check (amount_paise > 0),
  currency text not null default 'INR',
  commission_paise integer not null check (commission_paise >= 0),
  helper_gross_paise integer not null check (helper_gross_paise >= 0),
  provider text not null default 'simulated',
  provider_order_id text,
  provider_payment_id text,
  idempotency_key text not null,
  status public.marketplace_payment_status not null default 'created',
  is_simulated boolean not null default true,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  captured_at timestamptz,
  constraint payments_commission_split check (commission_paise + helper_gross_paise = amount_paise),
  constraint payments_idempotency unique (idempotency_key),
  constraint payments_provider_order unique (provider, provider_order_id)
);

create index if not exists payments_task_idx on public.payments (task_id);
create index if not exists payments_customer_idx on public.payments (customer_id);
create index if not exists payments_status_idx on public.payments (status);

-- 2. payment_ledger (immutable)
create table if not exists public.payment_ledger (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete restrict,
  entry_type public.ledger_entry_type not null,
  amount_paise integer not null,
  currency text not null default 'INR',
  direction text not null check (direction in ('debit', 'credit')),
  party_profile_id uuid references public.profiles (id),
  description text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payment_ledger_payment_idx on public.payment_ledger (payment_id, created_at);

-- Prevent updates/deletes on ledger (immutability)
create or replace function public.forbid_ledger_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'payment_ledger is immutable';
end;
$$;

drop trigger if exists payment_ledger_no_update on public.payment_ledger;
create trigger payment_ledger_no_update
  before update or delete on public.payment_ledger
  for each row execute function public.forbid_ledger_mutation();

-- 3. payouts
create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete restrict,
  helper_id uuid not null references public.profiles (id) on delete restrict,
  amount_paise integer not null check (amount_paise > 0),
  currency text not null default 'INR',
  provider text not null default 'razorpay',
  provider_payout_id text,
  provider_transfer_id text,
  status public.payout_status not null default 'pending',
  failure_reason text,
  idempotency_key text not null unique,
  is_simulated boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists payouts_helper_idx on public.payouts (helper_id, status);

-- 4. refunds
create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments (id) on delete restrict,
  amount_paise integer not null check (amount_paise > 0),
  reason text not null default '',
  provider_refund_id text,
  status public.refund_status not null default 'requested',
  idempotency_key text not null unique,
  is_simulated boolean not null default true,
  requested_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists refunds_payment_idx on public.refunds (payment_id);

-- 5. webhook_events (idempotent ingest)
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  payload jsonb not null,
  processing_status public.webhook_processing_status not null default 'received',
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (provider, provider_event_id)
);

-- Paise commission helper (half-up via round)
create or replace function public.commission_split_paise(base_paise integer)
returns table (amount_paise integer, commission_paise integer, helper_gross_paise integer)
language sql
immutable
as $$
  select
    base_paise as amount_paise,
    round(base_paise * 0.10)::integer as commission_paise,
    base_paise - round(base_paise * 0.10)::integer as helper_gross_paise;
$$;

-- RLS
alter table public.helper_payment_accounts enable row level security;
alter table public.payments enable row level security;
alter table public.payment_ledger enable row level security;
alter table public.payouts enable row level security;
alter table public.refunds enable row level security;
alter table public.webhook_events enable row level security;

drop policy if exists helper_accounts_select on public.helper_payment_accounts;
create policy helper_accounts_select on public.helper_payment_accounts
  for select to authenticated
  using (helper_id = auth.uid() or public.is_admin());

drop policy if exists helper_accounts_update_own on public.helper_payment_accounts;
create policy helper_accounts_update_own on public.helper_payment_accounts
  for update to authenticated
  using (helper_id = auth.uid() or public.is_admin())
  with check (helper_id = auth.uid() or public.is_admin());

-- Users can read own payment rows; cannot update status/amounts (no update policy for non-admin)
drop policy if exists payments_select on public.payments;
create policy payments_select on public.payments
  for select to authenticated
  using (customer_id = auth.uid() or helper_id = auth.uid() or public.is_admin());

drop policy if exists ledger_select on public.payment_ledger;
create policy ledger_select on public.payment_ledger
  for select to authenticated
  using (
    exists (
      select 1 from public.payments p
      where p.id = payment_id
        and (p.customer_id = auth.uid() or p.helper_id = auth.uid())
    )
    or public.is_admin()
  );

drop policy if exists payouts_select on public.payouts;
create policy payouts_select on public.payouts
  for select to authenticated
  using (helper_id = auth.uid() or public.is_admin()
    or exists (select 1 from public.payments p where p.id = payment_id and p.customer_id = auth.uid()));

drop policy if exists refunds_select on public.refunds;
create policy refunds_select on public.refunds
  for select to authenticated
  using (
    exists (
      select 1 from public.payments p
      where p.id = payment_id and (p.customer_id = auth.uid() or p.helper_id = auth.uid())
    )
    or public.is_admin()
  );

-- webhook_events: no client access
drop policy if exists webhook_deny_all on public.webhook_events;
create policy webhook_deny_all on public.webhook_events
  for all to authenticated
  using (false)
  with check (false);

-- Writes go through service role only (no insert policies for authenticated on payments/ledger/payouts/refunds/webhooks)
