-- Anti-bait helper navigation: record when helper confirms official pin arrival.
alter table public.tasks
  add column if not exists helper_arrived_at timestamptz;
