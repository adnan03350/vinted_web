create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text not null,
  country text,
  role text default 'buyer',
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  price numeric not null,
  currency text not null,
  category text not null,
  condition text not null,
  country text not null,
  seller_id uuid references profiles(id) on delete cascade,
  is_negotiable boolean default false,
  status text default 'Available',
  featured boolean default false,
  created_at timestamptz default now()
);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  image_url text not null,
  created_at timestamptz default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid references profiles(id) on delete cascade,
  seller_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  buyer_id uuid references profiles(id) on delete cascade,
  seller_id uuid references profiles(id) on delete cascade,
  status text default 'Pending',
  amount numeric not null,
  currency text not null,
  created_at timestamptz default now()
);

create table if not exists saved_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id, product_id)
);

create table if not exists listing_ai_analysis (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  ai_analysis jsonb,
  ai_confidence numeric,
  price_estimation jsonb,
  quality_score numeric,
  risk_score numeric,
  generated_metadata jsonb,
  image_analysis jsonb,
  detection_history jsonb,
  listing_improvements jsonb,
  created_at timestamptz default now()
);

create table if not exists search_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  query text not null,
  ai_confidence numeric,
  latency_ms numeric,
  created_at timestamptz default now()
);

create table if not exists saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  query text not null,
  filters jsonb,
  created_at timestamptz default now()
);

create table if not exists search_analytics (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  result_count integer,
  zero_result boolean default false,
  conversion_count integer default 0,
  click_count integer default 0,
  ai_confidence numeric,
  latency_ms numeric,
  created_at timestamptz default now()
);

create table if not exists popular_searches (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  count integer default 1,
  created_at timestamptz default now()
);

create table if not exists ai_search_metadata (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  intent text,
  filters jsonb,
  suggestions jsonb,
  created_at timestamptz default now()
);

create table if not exists user_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  query text,
  activity_type text not null,
  section text,
  created_at timestamptz default now()
);

create table if not exists product_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists recommendation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  event_type text not null,
  section text,
  created_at timestamptz default now()
);

create table if not exists recommendation_metadata (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade,
  score numeric,
  reason text,
  category text,
  created_at timestamptz default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  amount numeric not null,
  currency text not null,
  status text default 'PENDING_HELD',
  platform_fee numeric default 0,
  seller_amount numeric default 0,
  provider_reference text,
  verified_at timestamptz default now()
);

create table if not exists escrow_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  event_type text not null,
  amount numeric default 0,
  currency text not null,
  notes text,
  balance_before numeric default 0,
  balance_after numeric default 0,
  created_at timestamptz default now()
);

create table if not exists disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  opened_by uuid references profiles(id) on delete cascade,
  status text default 'OPEN',
  reason text,
  resolution text,
  resolution_reason text,
  resolved_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists dispute_messages (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid references disputes(id) on delete cascade,
  sender_id uuid references profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists seller_balances (
  user_id uuid primary key references profiles(id) on delete cascade,
  seller_balance numeric default 0,
  pending_balance numeric default 0,
  available_balance numeric default 0,
  currency text default 'USD',
  updated_at timestamptz default now()
);

create table if not exists payout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  amount numeric not null,
  currency text not null,
  status text default 'PENDING',
  requested_at timestamptz default now()
);

create table if not exists admin_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id) on delete cascade,
  action_type text not null,
  target_type text,
  target_id uuid,
  details jsonb,
  created_at timestamptz default now()
);

create table if not exists user_trust_scores (
  user_id uuid primary key references profiles(id) on delete cascade,
  trust_score numeric default 0,
  risk_score numeric default 0,
  verified_email boolean default false,
  completed_orders integer default 0,
  seller_rating numeric default 0,
  response_time_hours numeric default 24,
  dispute_rate numeric default 0,
  cancellation_rate numeric default 0,
  listing_quality_score numeric default 0,
  last_updated timestamptz default now()
);

create table if not exists user_risk_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  event_type text not null,
  score numeric default 0,
  details jsonb,
  created_at timestamptz default now()
);

create table if not exists blocked_chat_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  content text,
  matched_terms jsonb,
  created_at timestamptz default now()
);

create table if not exists moderation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  event_type text not null,
  reason text,
  severity integer default 1,
  details jsonb,
  created_at timestamptz default now()
);

create table if not exists suspicious_listing_flags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  reason text,
  risk_score numeric default 0,
  created_at timestamptz default now()
);
