-- LocalMate schema foundation
-- Maps existing AppState domain onto Postgres + auth.users
-- Apply via Supabase SQL editor or: supabase db push

create extension if not exists "pgcrypto";

-- Enums aligned with src/lib/types.ts
do $$ begin
  create type public.app_role as enum ('customer', 'helper');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.price_mode as enum ('fixed', 'negotiable');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.task_status as enum (
    'looking', 'matched', 'active', 'awaiting_customer_confirmation',
    'pay', 'review', 'completed', 'cancelled', 'flagged'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.application_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.identity_review_status as enum ('none', 'pending', 'cleared', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.verification_type as enum ('phone', 'email', 'identity', 'conduct');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.verification_status as enum ('none', 'pending', 'verified', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('held', 'released', 'refunded');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

-- 1. profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  avatar_url text,
  phone text,
  email text,
  preferred_language text not null default 'en',
  city text not null default 'Rishikesh',
  area text default '',
  role public.app_role not null default 'customer',
  phone_verified boolean not null default false,
  identity_verified boolean not null default false,
  identity_review_status public.identity_review_status not null default 'none',
  conduct_accepted boolean not null default false,
  categories text[] not null default '{}',
  bio_en text not null default '',
  bio_hi text not null default '',
  rating numeric(3,2) not null default 5.00,
  tasks_completed integer not null default 0,
  response_rate integer not null default 100,
  is_demo boolean not null default false,
  is_admin boolean not null default false,
  member_since timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_rating_range check (rating >= 0 and rating <= 5),
  constraint profiles_phone_verified_gate check (phone_verified = false or phone is not null)
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_city_idx on public.profiles (city);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, preferred_language, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email, 'user'), '@', 1)),
    new.email,
    new.phone,
    coalesce(new.raw_user_meta_data->>'preferred_language', 'en'),
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'customer')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete restrict,
  category text not null,
  title text not null,
  title_hi text,
  description text not null,
  description_hi text,
  location_area text not null,
  to_area text,
  latitude double precision,
  longitude double precision,
  when_id text not null default 'custom',
  when_label text not null,
  when_label_hi text,
  scheduled_at timestamptz,
  price_mode public.price_mode not null default 'fixed',
  budget integer not null check (budget >= 50),
  status public.task_status not null default 'looking',
  helper_id uuid references public.profiles (id) on delete set null,
  agreed_amount integer,
  location_shared boolean not null default false,
  helper_marked_done_at timestamptz,
  customer_confirmed_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  cancelled_by uuid references public.profiles (id),
  flagged_at timestamptz,
  flag_reason text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_customer_idx on public.tasks (customer_id);
create index if not exists tasks_helper_idx on public.tasks (helper_id);
create index if not exists tasks_feed_idx on public.tasks (status, created_at desc);

-- 3. task_applications (offers)
create table if not exists public.task_applications (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  helper_id uuid not null references public.profiles (id) on delete cascade,
  offer_amount integer not null check (offer_amount >= 1),
  message text not null default '',
  status public.application_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, helper_id)
);

create index if not exists task_applications_task_idx on public.task_applications (task_id);
create index if not exists task_applications_helper_idx on public.task_applications (helper_id);

-- 4. conversations
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null unique references public.tasks (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  helper_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 5. messages
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  original_text text not null,
  translated_text text,
  source_lang text,
  target_lang text,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);

-- 6. reviews
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text not null default '',
  created_at timestamptz not null default now(),
  unique (task_id, reviewer_id)
);

-- 7. notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null default 'general',
  title text not null,
  title_hi text,
  message text not null,
  message_hi text,
  related_task_id uuid references public.tasks (id) on delete set null,
  href text not null default '/',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

-- 8. user_blocks
create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  reason text,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  constraint user_blocks_no_self check (blocker_id <> blocked_id)
);

-- 9. reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_user_id uuid not null references public.profiles (id) on delete cascade,
  task_id uuid references public.tasks (id) on delete set null,
  reason text not null,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 10. verification_records (no raw OTP / no ID document blobs)
create table if not exists public.verification_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  verification_type public.verification_type not null,
  provider text,
  provider_reference text,
  status public.verification_status not null default 'none',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists verification_records_user_idx on public.verification_records (user_id, verification_type);

-- 11. task_status_history
create table if not exists public.task_status_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  previous_status public.task_status,
  new_status public.task_status not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists task_status_history_task_idx on public.task_status_history (task_id, created_at);

-- Simulated payment holds (not real money movement)
create table if not exists public.payment_holds (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null unique references public.tasks (id) on delete cascade,
  customer_id uuid not null references public.profiles (id),
  helper_id uuid not null references public.profiles (id),
  amount integer not null check (amount >= 50),
  fee integer not null check (fee >= 0),
  helper_amount integer not null check (helper_amount >= 0),
  status public.payment_status not null default 'held',
  is_simulated boolean not null default true,
  held_at timestamptz not null default now(),
  released_at timestamptz
);

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists tasks_updated_at on public.tasks;
create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

drop trigger if exists task_applications_updated_at on public.task_applications;
create trigger task_applications_updated_at before update on public.task_applications
  for each row execute function public.set_updated_at();

-- Log status changes
create or replace function public.log_task_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' and old.status is distinct from new.status then
    insert into public.task_status_history (task_id, actor_id, previous_status, new_status, reason)
    values (new.id, auth.uid(), old.status, new.status, coalesce(new.cancel_reason, new.flag_reason));
  elsif tg_op = 'INSERT' then
    insert into public.task_status_history (task_id, actor_id, previous_status, new_status, reason)
    values (new.id, new.customer_id, null, new.status, 'created');
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_status_history on public.tasks;
create trigger tasks_status_history
  after insert or update of status on public.tasks
  for each row execute function public.log_task_status_change();

-- Server-side 10% commission helper (for payment hold creation)
create or replace function public.split_fee(amount integer)
returns table (total integer, fee integer, helper integer)
language sql
immutable
as $$
  select amount as total,
         greatest(1, round(amount * 0.10)::integer) as fee,
         amount - greatest(1, round(amount * 0.10)::integer) as helper;
$$;

-- Prevent clients from self-granting privileged profile fields
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  -- service role bypasses via JWT role claim (supabase service_role)
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;
  if old.identity_verified is distinct from new.identity_verified
     or old.identity_review_status is distinct from new.identity_review_status
     or old.phone_verified is distinct from new.phone_verified
     or old.rating is distinct from new.rating
     or old.tasks_completed is distinct from new.tasks_completed
     or old.is_admin is distinct from new.is_admin
     or old.is_demo is distinct from new.is_demo then
    -- Allow identity_review_status → pending only (request review)
    if old.identity_verified = new.identity_verified
       and old.phone_verified = new.phone_verified
       and old.rating = new.rating
       and old.tasks_completed = new.tasks_completed
       and old.is_admin = new.is_admin
       and old.is_demo = new.is_demo
       and new.identity_review_status = 'pending'
       and old.identity_review_status in ('none', 'rejected', 'pending') then
      return new;
    end if;
    raise exception 'Cannot modify privileged profile fields';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges
  before update on public.profiles
  for each row execute function public.protect_profile_privileges();
