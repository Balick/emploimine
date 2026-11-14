-- EmploiMine database schema.
--
-- Security model:
--   * the public (anon) key can only READ offers;
--   * every write (scraper, newsletter) goes through the service-role key,
--     which is only available server-side and in GitHub Actions secrets.

create extension if not exists citext;

-- --------------------------------------------------------------------------
-- Job offers
-- --------------------------------------------------------------------------
create table public.offers (
  id               uuid primary key default gen_random_uuid(),
  -- Scraper source id (src/lib/scraper/sources/<source>.ts) and the offer id
  -- inside that source. Together they identify an offer across runs.
  source           text not null,
  external_id      text not null,
  title            text not null,
  company          text not null,
  url              text not null,
  location         text,
  city             text,
  contract_type    text check (contract_type in ('CDI', 'CDD', 'Stage', 'Consultance', 'Intérim')),
  description_html text,
  level            text,
  vacancies        integer check (vacancies > 0),
  published_at     date,
  closes_at        date,
  first_seen_at    timestamptz not null default now(),
  last_seen_at     timestamptz not null default now(),
  -- Set when the offer disappears from its source; cleared if it comes back.
  removed_at       timestamptz,
  -- Set once subscribers have been told about the offer (or when it was
  -- imported silently). Pending offers are emailed by the next run, so a
  -- failed digest is retried instead of lost.
  notified_at      timestamptz,
  -- Id of the offer in the pre-2026 database, to keep old links working.
  legacy_id        text unique,
  unique (source, external_id)
);

comment on column public.offers.removed_at is
  'When the offer stopped being listed by its source. Removed or expired offers appear in the history page.';

create index offers_first_seen_at_idx on public.offers (first_seen_at desc);
create index offers_closes_at_idx on public.offers (closes_at);
create index offers_open_idx on public.offers (source) where removed_at is null;
create index offers_pending_notification_idx on public.offers (id) where notified_at is null;

alter table public.offers enable row level security;

create policy "Offers are publicly readable"
  on public.offers for select
  to anon, authenticated
  using (true);

-- Defence in depth on top of RLS: the public roles never write.
revoke insert, update, delete, truncate on public.offers from anon, authenticated;

-- --------------------------------------------------------------------------
-- Newsletter subscribers
-- --------------------------------------------------------------------------
create table public.subscribers (
  id                uuid primary key default gen_random_uuid(),
  email             citext not null unique,
  -- Secret used in the confirmation and unsubscribe links (double opt-in).
  unsubscribe_token uuid not null unique default gen_random_uuid(),
  -- Null until the subscriber clicks the link of the confirmation email;
  -- only confirmed subscribers receive offers.
  confirmed_at      timestamptz,
  -- Last confirmation email, to throttle re-sends.
  confirmation_sent_at timestamptz not null default now(),
  created_at        timestamptz not null default now()
);

-- No policy on purpose: subscribers are only reachable with the service role.
alter table public.subscribers enable row level security;
revoke all on public.subscribers from anon, authenticated;
