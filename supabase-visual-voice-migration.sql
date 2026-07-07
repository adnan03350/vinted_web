-- =====================================================================
-- ThriftAI Phase 3.8 (AI Image Search) + 3.9 (Voice Search)
-- Additive, idempotent. Run AFTER supabase-schema.sql.
--
-- History tables follow the existing analytics pattern: written by the
-- service-role client (server actions), readable by the owning user.
-- =====================================================================

create table if not exists image_search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  image_name text,
  detected_query text,
  features jsonb,
  result_count integer default 0,
  ai_confidence numeric,
  created_at timestamptz default now()
);

create table if not exists voice_search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  transcript text not null,
  query text,
  result_count integer default 0,
  ai_confidence numeric,
  created_at timestamptz default now()
);

create table if not exists visual_search_metadata (
  id uuid primary key default gen_random_uuid(),
  image_search_id uuid references image_search_history(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  product_type text,
  category text,
  primary_color text,
  material text,
  style text,
  keywords jsonb,
  confidence numeric,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- RLS: owner may read own history; writes are service-role only.
-- ---------------------------------------------------------------------
alter table image_search_history enable row level security;
drop policy if exists image_search_history_owner_select on image_search_history;
create policy image_search_history_owner_select on image_search_history
  for select using (auth.uid() = user_id);

alter table voice_search_history enable row level security;
drop policy if exists voice_search_history_owner_select on voice_search_history;
create policy voice_search_history_owner_select on voice_search_history
  for select using (auth.uid() = user_id);

alter table visual_search_metadata enable row level security;
drop policy if exists visual_search_metadata_owner_select on visual_search_metadata;
create policy visual_search_metadata_owner_select on visual_search_metadata
  for select using (auth.uid() = user_id);
