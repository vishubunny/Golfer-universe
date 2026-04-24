-- ════════════════════════════════════════════════════════════════════
--  Digital Heroes Platform – Supabase schema
--  Run in Supabase SQL Editor (one shot). Idempotent where reasonable.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";

-- ─── ENUMS ───────────────────────────────────────────────────────────
do $$ begin
  create type user_role         as enum ('subscriber','admin');
  create type sub_status        as enum ('active','cancelled','lapsed','none');
  create type sub_plan          as enum ('monthly','yearly');
  create type draw_logic        as enum ('random','algorithmic');
  create type draw_status       as enum ('draft','simulated','published');
  create type winner_status     as enum ('pending','approved','rejected','paid');
exception when duplicate_object then null; end $$;

-- ─── PROFILES (1-1 with auth.users) ──────────────────────────────────
create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text unique not null,
  full_name       text,
  role            user_role not null default 'subscriber',
  charity_id      uuid,
  charity_pct     numeric(5,2) not null default 10.00 check (charity_pct >= 10 and charity_pct <= 100),
  created_at      timestamptz not null default now()
);

-- ─── CHARITIES ───────────────────────────────────────────────────────
create table if not exists charities (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  slug            text unique not null,
  description     text,
  image_url       text,
  website         text,
  is_featured     boolean not null default false,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

alter table profiles
  drop constraint if exists profiles_charity_fk,
  add  constraint profiles_charity_fk foreign key (charity_id) references charities(id) on delete set null;

-- ─── SUBSCRIPTIONS ───────────────────────────────────────────────────
create table if not exists subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references profiles(id) on delete cascade,
  plan                     sub_plan not null,
  status                   sub_status not null default 'none',
  amount_cents             integer not null,           -- paid amount in cents
  stripe_customer_id       text,
  stripe_subscription_id   text unique,
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean not null default false,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists idx_sub_user on subscriptions(user_id);
create index if not exists idx_sub_status on subscriptions(status);

-- ─── SCORES (rolling last-5 enforced by trigger) ─────────────────────
create table if not exists scores (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  score         smallint not null check (score between 1 and 45),
  played_on     date not null,
  created_at    timestamptz not null default now(),
  unique (user_id, played_on)            -- one entry per date per PRD §13
);
create index if not exists idx_scores_user_date on scores(user_id, played_on desc);

-- Trigger: keep only the latest 5 scores per user (oldest auto-removed)
create or replace function trim_scores_to_five() returns trigger language plpgsql as $$
begin
  delete from scores
   where id in (
     select id from scores
      where user_id = new.user_id
      order by played_on desc, created_at desc
      offset 5
   );
  return new;
end $$;

drop trigger if exists trg_trim_scores on scores;
create trigger trg_trim_scores after insert on scores
  for each row execute function trim_scores_to_five();

-- ─── DRAWS ───────────────────────────────────────────────────────────
create table if not exists draws (
  id              uuid primary key default gen_random_uuid(),
  period          text unique not null,        -- e.g. '2026-04'
  logic           draw_logic not null default 'random',
  status          draw_status not null default 'draft',
  winning_numbers smallint[] not null,         -- length 5, range 1-45
  pool_total_cents integer not null default 0,
  jackpot_carry_cents integer not null default 0,
  created_at      timestamptz not null default now(),
  published_at    timestamptz
);

-- ─── WINNERS ─────────────────────────────────────────────────────────
create table if not exists winners (
  id              uuid primary key default gen_random_uuid(),
  draw_id         uuid not null references draws(id) on delete cascade,
  user_id         uuid not null references profiles(id) on delete cascade,
  match_count     smallint not null check (match_count between 3 and 5),
  prize_cents     integer not null default 0,
  status          winner_status not null default 'pending',
  proof_url       text,
  reviewed_by     uuid references profiles(id),
  reviewed_at     timestamptz,
  paid_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists idx_winners_draw on winners(draw_id);
create index if not exists idx_winners_user on winners(user_id);

-- ─── DONATIONS (independent + auto from subs) ────────────────────────
create table if not exists donations (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references profiles(id) on delete set null,
  charity_id      uuid not null references charities(id) on delete restrict,
  amount_cents    integer not null check (amount_cents > 0),
  source          text not null default 'subscription', -- 'subscription' | 'independent'
  created_at      timestamptz not null default now()
);
create index if not exists idx_donations_charity on donations(charity_id);

-- ─── HELPER: auto-create profile on signup ───────────────────────────
create or replace function handle_new_user() returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ════════════════════════════════════════════════════════════════════
--  ROW-LEVEL SECURITY
-- ════════════════════════════════════════════════════════════════════
alter table profiles      enable row level security;
alter table subscriptions enable row level security;
alter table scores        enable row level security;
alter table charities     enable row level security;
alter table draws         enable row level security;
alter table winners       enable row level security;
alter table donations     enable row level security;

-- helper: is current user an admin?
create or replace function is_admin() returns boolean language sql stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- profiles: self read/write, admin read all
drop policy if exists p_profile_self on profiles;
create policy p_profile_self on profiles for all using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());

-- subscriptions: self read, admin all
drop policy if exists p_sub_self on subscriptions;
create policy p_sub_self on subscriptions for select using (user_id = auth.uid() or is_admin());
drop policy if exists p_sub_admin on subscriptions;
create policy p_sub_admin on subscriptions for all using (is_admin()) with check (is_admin());

-- scores: self CRUD, admin CRUD
drop policy if exists p_scores_self on scores;
create policy p_scores_self on scores for all
  using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());

-- charities: public read (active), admin write
drop policy if exists p_char_read on charities;
create policy p_char_read on charities for select using (is_active or is_admin());
drop policy if exists p_char_admin on charities;
create policy p_char_admin on charities for all using (is_admin()) with check (is_admin());

-- draws: public read published, admin all
drop policy if exists p_draws_read on draws;
create policy p_draws_read on draws for select using (status = 'published' or is_admin());
drop policy if exists p_draws_admin on draws;
create policy p_draws_admin on draws for all using (is_admin()) with check (is_admin());

-- winners: self read own, admin all
drop policy if exists p_winners_self on winners;
create policy p_winners_self on winners for select using (user_id = auth.uid() or is_admin());
drop policy if exists p_winners_update_proof on winners;
create policy p_winners_update_proof on winners for update
  using (user_id = auth.uid() or is_admin())
  with check (user_id = auth.uid() or is_admin());
drop policy if exists p_winners_admin on winners;
create policy p_winners_admin on winners for all using (is_admin()) with check (is_admin());

-- donations: self read own, admin all
drop policy if exists p_donations_self on donations;
create policy p_donations_self on donations for select using (user_id = auth.uid() or is_admin());
drop policy if exists p_donations_admin on donations;
create policy p_donations_admin on donations for all using (is_admin()) with check (is_admin());

-- ─── STORAGE bucket for winner proofs ────────────────────────────────
insert into storage.buckets (id, name, public)
  values ('winner-proofs', 'winner-proofs', false)
  on conflict (id) do nothing;
