create table public.announcements (
  id uuid not null default gen_random_uuid (),
  title text not null,
  announcement_datetime timestamp without time zone not null,
  description text null,
  image_url text null,
  created_at timestamp without time zone null default now(),
  constraint announcements_pkey primary key (id)
) TABLESPACE pg_default;

create table public.artifacts (
  id uuid not null default gen_random_uuid (),
  name text not null,
  qr_code text null,
  category text not null,
  created_at timestamp without time zone null default now(),
  constraint artifacts_pkey primary key (id),
  constraint artifacts_qr_code_key unique (qr_code),
  constraint artifacts_category_check check (
    (
      category = any (
        array[
          'Sacred Vessels'::text,
          'Liturgical Books'::text,
          'Vestments'::text,
          'Altar Furnishings'::text,
          'Devotional Objects'::text,
          'Sacramentals'::text,
          'Musical Instruments'::text,
          'Architectural and Decorative Elements'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_artifacts_category on public.artifacts using btree (category) TABLESPACE pg_default;


create table public.audio_guides (
  id uuid not null default gen_random_uuid (),
  artifact_id uuid null,
  artifact_name text null,
  audio_url text null,
  created_at timestamp without time zone null default now(),
  constraint audio_guides_pkey primary key (id),
  constraint audio_guides_artifact_id_fkey foreign KEY (artifact_id) references artifacts (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.events (
  id uuid not null default gen_random_uuid (),
  title text not null,
  event_datetime timestamp without time zone not null,
  description text null,
  image_url text null,
  created_at timestamp without time zone null default now(),
  constraint events_pkey primary key (id)
) TABLESPACE pg_default;


create table public.live_mass (
  id uuid not null default gen_random_uuid (),
  title text null,
  stream_url text null,
  is_live boolean null default false,
  started_at timestamp without time zone null,
  created_at timestamp without time zone null default now(),
  constraint live_mass_pkey primary key (id)
) TABLESPACE pg_default;


create table public.user_ratings (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  artifact_id uuid null,
  rating integer null,
  feedback text null,
  created_at timestamp without time zone null default now(),
  constraint user_ratings_pkey primary key (id),
  constraint user_ratings_artifact_id_fkey foreign KEY (artifact_id) references artifacts (id) on delete CASCADE,
  constraint user_ratings_rating_check check (
    (
      (rating >= 1)
      and (rating <= 5)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_ratings_user on public.user_ratings using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_ratings_artifact on public.user_ratings using btree (artifact_id) TABLESPACE pg_default;

create table public.user_ratings (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  artifact_id uuid null,
  rating integer null,
  feedback text null,
  created_at timestamp without time zone null default now(),
  constraint user_ratings_pkey primary key (id),
  constraint user_ratings_artifact_id_fkey foreign KEY (artifact_id) references artifacts (id) on delete CASCADE,
  constraint user_ratings_rating_check check (
    (
      (rating >= 1)
      and (rating <= 5)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_ratings_user on public.user_ratings using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_ratings_artifact on public.user_ratings using btree (artifact_id) TABLESPACE pg_default;