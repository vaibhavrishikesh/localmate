-- LocalMate RLS policies
-- Principle: least privilege; privileged writes via service role / security definer RPCs

alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.task_applications enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.user_blocks enable row level security;
alter table public.reports enable row level security;
alter table public.verification_records enable row level security;
alter table public.task_status_history enable row level security;
alter table public.payment_holds enable row level security;

-- Helpers
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.are_blocked(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

create or replace function public.is_task_party(task_row public.tasks)
returns boolean
language sql
stable
as $$
  select auth.uid() = task_row.customer_id
      or auth.uid() = task_row.helper_id;
$$;

-- PROFILES
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (true);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- No direct insert from clients (trigger on auth.users creates row)
drop policy if exists profiles_insert_self on public.profiles;
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

-- TASKS
drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select to authenticated
  using (
    status = 'looking'
    or customer_id = auth.uid()
    or helper_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.task_applications a
      where a.task_id = tasks.id and a.helper_id = auth.uid()
    )
  );

drop policy if exists tasks_insert_customer on public.tasks;
create policy tasks_insert_customer on public.tasks
  for insert to authenticated
  with check (
    customer_id = auth.uid()
    and status = 'looking'
    and helper_id is null
  );

drop policy if exists tasks_update_party on public.tasks;
create policy tasks_update_party on public.tasks
  for update to authenticated
  using (customer_id = auth.uid() or helper_id = auth.uid() or public.is_admin())
  with check (customer_id = auth.uid() or helper_id = auth.uid() or public.is_admin());

-- APPLICATIONS
drop policy if exists applications_select on public.task_applications;
create policy applications_select on public.task_applications
  for select to authenticated
  using (
    helper_id = auth.uid()
    or exists (select 1 from public.tasks t where t.id = task_id and t.customer_id = auth.uid())
    or public.is_admin()
  );

drop policy if exists applications_insert_helper on public.task_applications;
create policy applications_insert_helper on public.task_applications
  for insert to authenticated
  with check (
    helper_id = auth.uid()
    and status = 'pending'
    and not public.are_blocked(auth.uid(), (select customer_id from public.tasks where id = task_id))
    and exists (
      select 1 from public.tasks t
      join public.profiles p on p.id = auth.uid()
      where t.id = task_id
        and t.status = 'looking'
        and p.role = 'helper'
        and p.identity_verified = true
        and p.phone_verified = true
        and p.conduct_accepted = true
    )
  );

drop policy if exists applications_update on public.task_applications;
create policy applications_update on public.task_applications
  for update to authenticated
  using (
    helper_id = auth.uid()
    or exists (select 1 from public.tasks t where t.id = task_id and t.customer_id = auth.uid())
    or public.is_admin()
  )
  with check (
    helper_id = auth.uid()
    or exists (select 1 from public.tasks t where t.id = task_id and t.customer_id = auth.uid())
    or public.is_admin()
  );

-- CONVERSATIONS / MESSAGES
drop policy if exists conversations_select on public.conversations;
create policy conversations_select on public.conversations
  for select to authenticated
  using (customer_id = auth.uid() or helper_id = auth.uid() or public.is_admin());

drop policy if exists conversations_insert on public.conversations;
create policy conversations_insert on public.conversations
  for insert to authenticated
  with check (customer_id = auth.uid() or helper_id = auth.uid() or public.is_admin());

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.customer_id = auth.uid() or c.helper_id = auth.uid())
    )
    or public.is_admin()
  );

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.customer_id = auth.uid() or c.helper_id = auth.uid())
        and not public.are_blocked(c.customer_id, c.helper_id)
    )
  );

-- REVIEWS
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews
  for select to authenticated
  using (true);

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews
  for insert to authenticated
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and t.status in ('review', 'completed')
        and (t.customer_id = auth.uid() or t.helper_id = auth.uid())
        and reviewee_id = case when t.customer_id = auth.uid() then t.helper_id else t.customer_id end
    )
  );

-- NOTIFICATIONS
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert to authenticated
  with check (public.is_admin() or user_id = auth.uid());

-- BLOCKS
drop policy if exists blocks_select on public.user_blocks;
create policy blocks_select on public.user_blocks
  for select to authenticated
  using (blocker_id = auth.uid() or blocked_id = auth.uid() or public.is_admin());

drop policy if exists blocks_insert on public.user_blocks;
create policy blocks_insert on public.user_blocks
  for insert to authenticated
  with check (blocker_id = auth.uid());

drop policy if exists blocks_delete on public.user_blocks;
create policy blocks_delete on public.user_blocks
  for delete to authenticated
  using (blocker_id = auth.uid());

-- REPORTS
drop policy if exists reports_select on public.reports;
create policy reports_select on public.reports
  for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists reports_insert on public.reports;
create policy reports_insert on public.reports
  for insert to authenticated
  with check (reporter_id = auth.uid());

-- VERIFICATION RECORDS (read own; write admin/service only)
drop policy if exists verification_select on public.verification_records;
create policy verification_select on public.verification_records
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists verification_admin_write on public.verification_records;
create policy verification_admin_write on public.verification_records
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- STATUS HISTORY
drop policy if exists history_select on public.task_status_history;
create policy history_select on public.task_status_history
  for select to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (t.customer_id = auth.uid() or t.helper_id = auth.uid())
    )
    or public.is_admin()
  );

-- PAYMENT HOLDS (simulated) — parties can read; writes via service role / RPC
drop policy if exists payment_holds_select on public.payment_holds;
create policy payment_holds_select on public.payment_holds
  for select to authenticated
  using (customer_id = auth.uid() or helper_id = auth.uid() or public.is_admin());

-- Secure RPC: request identity review (sets pending only)
create or replace function public.request_identity_review()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.profiles;
begin
  update public.profiles
  set identity_review_status = 'pending',
      identity_verified = false,
      updated_at = now()
  where id = auth.uid()
    and identity_verified = false
  returning * into row;
  if row is null then
    raise exception 'No profile to review';
  end if;
  insert into public.verification_records (user_id, verification_type, provider, status)
  values (auth.uid(), 'identity', 'localmate_staff', 'pending');
  return row;
end;
$$;

revoke all on function public.request_identity_review() from public;
grant execute on function public.request_identity_review() to authenticated;

-- Secure RPC: staff clear identity (requires is_admin)
create or replace function public.admin_set_identity_verified(target uuid, cleared boolean)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Unauthorized';
  end if;
  update public.profiles
  set identity_verified = cleared,
      identity_review_status = case when cleared then 'cleared'::public.identity_review_status else 'rejected'::public.identity_review_status end,
      phone_verified = case when cleared then true else phone_verified end,
      updated_at = now()
  where id = target
  returning * into row;

  insert into public.verification_records (user_id, verification_type, provider, status, provider_reference)
  values (
    target,
    'identity',
    'localmate_staff',
    case when cleared then 'verified'::public.verification_status else 'rejected'::public.verification_status end,
    auth.uid()::text
  );
  return row;
end;
$$;

revoke all on function public.admin_set_identity_verified(uuid, boolean) from public;
grant execute on function public.admin_set_identity_verified(uuid, boolean) to authenticated;

-- Storage: private bucket for optional sensitive docs (no public read)
insert into storage.buckets (id, name, public)
values ('verification-docs', 'verification-docs', false)
on conflict (id) do nothing;

drop policy if exists verification_docs_own_read on storage.objects;
create policy verification_docs_own_read on storage.objects
  for select to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists verification_docs_own_insert on storage.objects;
create policy verification_docs_own_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists verification_docs_admin on storage.objects;
create policy verification_docs_admin on storage.objects
  for all to authenticated
  using (bucket_id = 'verification-docs' and public.is_admin())
  with check (bucket_id = 'verification-docs' and public.is_admin());
