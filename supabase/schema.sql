-- Run this in Supabase Dashboard > SQL Editor.
create table if not exists public.vocab_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day_number integer not null check (day_number > 0),
  created_at timestamptz not null default now(),
  unique (user_id, day_number)
);

create table if not exists public.vocab_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day_number integer not null check (day_number > 0),
  word text not null check (char_length(trim(word)) > 0),
  meaning text not null check (char_length(trim(meaning)) > 0),
  example text not null check (char_length(trim(example)) > 0),
  created_at timestamptz not null default now(),
  constraint vocab_words_day_fk foreign key (user_id, day_number)
    references public.vocab_days(user_id, day_number) on delete cascade
);

create index if not exists vocab_words_user_day_created_idx
  on public.vocab_words(user_id, day_number, created_at);

alter table public.vocab_days enable row level security;
alter table public.vocab_words enable row level security;

drop policy if exists "Users manage their own days" on public.vocab_days;
create policy "Users manage their own days" on public.vocab_days
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users manage their own words" on public.vocab_words;
create policy "Users manage their own words" on public.vocab_words
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, delete on public.vocab_days to authenticated;
grant select, insert, delete on public.vocab_words to authenticated;
