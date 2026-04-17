-- ═══════════════════════════════════════════════════════
--  SHAHID365 — Complete Supabase Database Setup
--  Run this ONCE in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

-- ── PERSONS (actors / directors) ────────────────────────
create table if not exists persons (
  id         uuid default gen_random_uuid() primary key,
  name       text not null,
  name_ar    text,
  photo      text,
  bio        text,
  bio_ar     text,
  tmdb_id    integer,
  created_at timestamptz default now()
);

-- ── MOVIES / SERIES ──────────────────────────────────────
create table if not exists movies (
  id               uuid default gen_random_uuid() primary key,
  type             text not null check(type in ('movie','series')),
  title            text not null,
  title_ar         text,
  orig_title       text,
  description      text,
  description_ar   text,
  poster           text,
  backdrop         text,
  year             integer,
  duration         integer,
  rating           decimal(3,1),
  language         text default 'ar',
  genres           text[] default '{}',
  genres_ar        text[] default '{}',
  cast_data        jsonb default '[]',
  director_name    text,
  director_name_ar text,
  video_url        text,
  dl_url           text,
  trailer_url      text,
  subtitle_url     text,
  quality_profiles jsonb default '[]',
  featured         boolean default false,
  active           boolean default true,
  views            bigint default 0,
  tmdb_id          integer,
  imdb_id          text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- ── SEASONS ──────────────────────────────────────────────
create table if not exists seasons (
  id            uuid default gen_random_uuid() primary key,
  movie_id      uuid references movies(id) on delete cascade,
  season_number integer not null,
  title         text,
  title_ar      text,
  poster        text,
  created_at    timestamptz default now(),
  unique(movie_id, season_number)
);

-- ── EPISODES ─────────────────────────────────────────────
create table if not exists episodes (
  id             uuid default gen_random_uuid() primary key,
  season_id      uuid references seasons(id) on delete cascade,
  movie_id       uuid references movies(id) on delete cascade,
  episode_number integer not null,
  title          text,
  title_ar       text,
  description    text,
  thumbnail      text,
  video_url      text,
  dl_url         text,
  subtitle_url   text,
  duration       integer,
  release_date   date,
  quality_profiles jsonb default '[]',
  created_at     timestamptz default now(),
  unique(season_id, episode_number)
);

-- ── CHANNELS ─────────────────────────────────────────────
create table if not exists channels (
  id           uuid default gen_random_uuid() primary key,
  name         text not null,
  name_ar      text,
  logo         text,
  stream_url   text not null,
  category     text,
  category_ar  text,
  active       boolean default true,
  sort_order   integer default 0,
  created_at   timestamptz default now()
);

-- ── ADS ──────────────────────────────────────────────────
create table if not exists ads (
  id                  uuid default gen_random_uuid() primary key,
  title               text not null,
  ad_format           text not null check(ad_format in ('banner','video','interstitial','native')),
  placement           text default 'home_top' check(placement in ('home_top','movie_player','series_player','channel_player','floating','sidebar','in_content')),
  ad_size             text default '300x250',
  custom_width        integer,
  custom_height       integer,
  image_url           text,
  video_url           text,
  target_url          text not null,
  sound_enabled       boolean default false,
  force_mute          boolean default true,
  skip_after_seconds  integer default 5,
  show_countdown      boolean default true,
  frequency           text default 'once_per_session' check(frequency in ('once_per_session','once_per_day','every_visit')),
  active              boolean default true,
  impressions         bigint default 0,
  clicks              bigint default 0,
  created_at          timestamptz default now()
);

-- ── SUBSCRIPTIONS ────────────────────────────────────────
create table if not exists subscriptions (
  id          uuid default gen_random_uuid() primary key,
  code        text unique not null,
  label       text default '',
  max_devices integer default 1,
  devices     jsonb default '[]',
  active      boolean default true,
  expires_at  timestamptz,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ── SETTINGS (singleton row id=1) ────────────────────────
create table if not exists settings (
  id                  smallint primary key default 1,
  maintenance_on      boolean default false,
  maintenance_msg     text default 'We are upgrading. Back soon.',
  maintenance_msg_ar  text default 'نقوم بتحديث المنصة. سنعود قريباً.',
  sub_required        boolean default false,
  ads_enabled         boolean default true,
  downloads_enabled   boolean default true,
  site_title          text default 'Shahid365',
  site_title_ar       text default 'شاهد 365',
  trending_ids        uuid[] default '{}',
  quality_profiles    jsonb default '["4K","1080p","720p","480p","360p"]',
  allowed_codecs      jsonb default '["H.264","H.265/HEVC","VP9","AV1"]',
  updated_at          timestamptz default now()
);
insert into settings (id) values (1) on conflict (id) do nothing;

-- ── BANNED IPS ────────────────────────────────────────────
create table if not exists banned_ips (
  ip_address  text primary key,
  reason      text,
  created_at  timestamptz default now()
);

-- ── VIEW LOGS (partitioned monthly for optimization) ──────
create table if not exists view_logs (
  id         bigserial,
  movie_id   uuid references movies(id) on delete cascade,
  ip_hash    text,
  watched_at timestamptz default now(),
  primary key (id, watched_at)
) partition by range (watched_at);

-- Create partitions for current + next months
create table if not exists view_logs_2025_01 partition of view_logs for values from ('2025-01-01') to ('2025-02-01');
create table if not exists view_logs_2025_02 partition of view_logs for values from ('2025-02-01') to ('2025-03-01');
create table if not exists view_logs_2025_03 partition of view_logs for values from ('2025-03-01') to ('2025-04-01');
create table if not exists view_logs_2025_04 partition of view_logs for values from ('2025-04-01') to ('2025-05-01');
create table if not exists view_logs_2025_05 partition of view_logs for values from ('2025-05-01') to ('2025-06-01');
create table if not exists view_logs_2025_06 partition of view_logs for values from ('2025-06-01') to ('2025-07-01');
create table if not exists view_logs_2025_07 partition of view_logs for values from ('2025-07-01') to ('2025-08-01');
create table if not exists view_logs_2025_08 partition of view_logs for values from ('2025-08-01') to ('2025-09-01');
create table if not exists view_logs_2025_09 partition of view_logs for values from ('2025-09-01') to ('2025-10-01');
create table if not exists view_logs_2025_10 partition of view_logs for values from ('2025-10-01') to ('2025-11-01');
create table if not exists view_logs_2025_11 partition of view_logs for values from ('2025-11-01') to ('2025-12-01');
create table if not exists view_logs_2025_12 partition of view_logs for values from ('2025-12-01') to ('2026-01-01');
create table if not exists view_logs_2026_01 partition of view_logs for values from ('2026-01-01') to ('2026-02-01');
create table if not exists view_logs_2026_02 partition of view_logs for values from ('2026-02-01') to ('2026-03-01');
create table if not exists view_logs_2026_03 partition of view_logs for values from ('2026-03-01') to ('2026-04-01');
create table if not exists view_logs_2026_04 partition of view_logs for values from ('2026-04-01') to ('2026-05-01');
create table if not exists view_logs_2026_05 partition of view_logs for values from ('2026-05-01') to ('2026-06-01');
create table if not exists view_logs_2026_06 partition of view_logs for values from ('2026-06-01') to ('2026-07-01');
create table if not exists view_logs_2026_07 partition of view_logs for values from ('2026-07-01') to ('2026-08-01');
create table if not exists view_logs_2026_08 partition of view_logs for values from ('2026-08-01') to ('2026-09-01');
create table if not exists view_logs_2026_09 partition of view_logs for values from ('2026-09-01') to ('2026-10-01');
create table if not exists view_logs_2026_10 partition of view_logs for values from ('2026-10-01') to ('2026-11-01');
create table if not exists view_logs_2026_11 partition of view_logs for values from ('2026-11-01') to ('2026-12-01');
create table if not exists view_logs_2026_12 partition of view_logs for values from ('2026-12-01') to ('2027-01-01');
create table if not exists view_logs_2027_01 partition of view_logs for values from ('2027-01-01') to ('2027-02-01');

-- ── INDEXES ───────────────────────────────────────────────
create index if not exists idx_movies_type_feat    on movies(type, featured) where active = true;
create index if not exists idx_movies_views        on movies(views desc) where active = true;
create index if not exists idx_movies_rating       on movies(rating desc nulls last);
create index if not exists idx_movies_created      on movies(created_at desc);
create index if not exists idx_movies_search       on movies using gin(to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(title_ar,'')));
create index if not exists idx_seasons_movie       on seasons(movie_id, season_number);
create index if not exists idx_episodes_season     on episodes(season_id, episode_number);
create index if not exists idx_episodes_movie_date on episodes(movie_id, release_date);
create index if not exists idx_channels_active     on channels(active, sort_order);
create index if not exists idx_ads_active_place    on ads(active, placement);
create index if not exists idx_subs_code           on subscriptions(code);
create index if not exists idx_banned_ips          on banned_ips(ip_address);
create index if not exists idx_view_logs_movie     on view_logs(movie_id, watched_at);

-- ── DISABLE RLS (all public access via anon key) ──────────
alter table movies        disable row level security;
alter table seasons       disable row level security;
alter table episodes      disable row level security;
alter table channels      disable row level security;
alter table persons       disable row level security;
alter table ads           disable row level security;
alter table subscriptions disable row level security;
alter table settings      disable row level security;
alter table banned_ips    disable row level security;
alter table view_logs     disable row level security;

-- ── HELPER FUNCTIONS ──────────────────────────────────────

-- Atomically increment movie views
create or replace function increment_views(row_id uuid)
returns void language sql as $$
  update movies set views = views + 1 where id = row_id;
$$;

-- Atomically increment ad stat
create or replace function increment_ad_stat(row_id uuid, stat_col text)
returns void language plpgsql as $$
begin
  if stat_col = 'impressions' then
    update ads set impressions = impressions + 1 where id = row_id;
  elsif stat_col = 'clicks' then
    update ads set clicks = clicks + 1 where id = row_id;
  end if;
end;
$$;

-- Check if IP is banned
create or replace function is_ip_banned(check_ip text)
returns boolean language sql as $$
  select exists(select 1 from banned_ips where ip_address = check_ip);
$$;

-- Archive old view logs (call via pg_cron)
create or replace function archive_old_views()
returns void language sql as $$
  delete from view_logs where watched_at < now() - interval '6 months';
$$;

-- ── STORAGE BUCKETS (run separately if needed) ────────────
-- insert into storage.buckets (id, name, public)
-- values ('media', 'media', true),
--        ('ads', 'ads', true)
-- on conflict (id) do nothing;
