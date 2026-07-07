-- =====================================================================
-- ThriftAI Phase 4 — Commerce & Social Marketplace
-- Additive, idempotent. Run AFTER supabase-schema.sql.
--
-- Follows existing conventions:
--   * user-owned data  -> owner read/write via auth.uid()
--   * ledger/moderation -> service-role writes, owner/participant reads
--   * public social     -> public read, owner-scoped writes
-- =====================================================================

-- ---------------------------------------------------------------------
-- Wallets & transactions (buyer + seller unified wallet)
-- ---------------------------------------------------------------------
create table if not exists wallets (
  user_id uuid primary key references profiles(id) on delete cascade,
  balance numeric default 0,
  currency text default 'USD',
  updated_at timestamptz default now()
);

create table if not exists wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text not null,
  amount numeric not null,
  balance_after numeric default 0,
  order_id uuid references orders(id) on delete set null,
  reference text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Shipping
-- ---------------------------------------------------------------------
create table if not exists shipping_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  full_name text not null,
  phone text,
  line1 text not null,
  line2 text,
  city text,
  state text,
  postal_code text,
  country text,
  is_default boolean default false,
  created_at timestamptz default now()
);

create table if not exists shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  address_id uuid references shipping_addresses(id) on delete set null,
  carrier text,
  tracking_number text,
  shipping_method text,
  status text default 'PENDING',
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists delivery_otps (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  shipment_id uuid references shipments(id) on delete cascade,
  code text not null,
  verified boolean default false,
  expires_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  requested_by uuid references profiles(id) on delete cascade,
  reason text,
  status text default 'REQUESTED',
  resolution text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Reviews & ratings (seller<->buyer and product reviews)
-- ---------------------------------------------------------------------
create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references profiles(id) on delete cascade,
  target_type text not null,           -- 'seller' | 'buyer' | 'product'
  target_id uuid not null,
  order_id uuid references orders(id) on delete set null,
  rating integer not null,
  comment text,
  status text default 'visible',       -- 'visible' | 'hidden'
  reported boolean default false,
  report_reason text,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Social
-- ---------------------------------------------------------------------
create table if not exists seller_followers (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid references profiles(id) on delete cascade,
  follower_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(seller_id, follower_id)
);

create table if not exists activity_feed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  activity_type text not null,
  target_type text,
  target_id uuid,
  metadata jsonb,
  created_at timestamptz default now()
);

-- ---------------------------------------------------------------------
-- Notifications (referenced by the app but previously missing)
-- ---------------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text not null,
  title text,
  content text,
  link text,
  is_read boolean default false,
  metadata jsonb,
  created_at timestamptz default now()
);

-- =====================================================================
-- RLS
-- =====================================================================

-- wallets: owner reads, service-role writes
alter table wallets enable row level security;
drop policy if exists wallets_owner_select on wallets;
create policy wallets_owner_select on wallets for select using (auth.uid() = user_id);

alter table wallet_transactions enable row level security;
drop policy if exists wallet_tx_owner_select on wallet_transactions;
create policy wallet_tx_owner_select on wallet_transactions for select using (auth.uid() = user_id);

-- shipping_addresses: owner CRUD
alter table shipping_addresses enable row level security;
drop policy if exists shipping_addresses_owner on shipping_addresses;
create policy shipping_addresses_owner on shipping_addresses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- shipments: participants read, service-role writes
alter table shipments enable row level security;
drop policy if exists shipments_select_participants on shipments;
create policy shipments_select_participants on shipments
  for select using (
    exists (select 1 from orders o where o.id = order_id
            and (auth.uid() = o.buyer_id or auth.uid() = o.seller_id))
  );

-- delivery_otps: service-role only (no policy)
alter table delivery_otps enable row level security;

-- return_requests: participants read, service-role writes
alter table return_requests enable row level security;
drop policy if exists return_requests_select_participants on return_requests;
create policy return_requests_select_participants on return_requests
  for select using (
    auth.uid() = requested_by
    or exists (select 1 from orders o where o.id = order_id
               and (auth.uid() = o.buyer_id or auth.uid() = o.seller_id))
  );

-- reviews: visible-or-own read, author insert, moderation via service-role
alter table reviews enable row level security;
drop policy if exists reviews_select on reviews;
create policy reviews_select on reviews
  for select using (status = 'visible' or auth.uid() = author_id);
drop policy if exists reviews_insert_author on reviews;
create policy reviews_insert_author on reviews
  for insert with check (auth.uid() = author_id);

-- seller_followers: public read (counts), owner-scoped writes
alter table seller_followers enable row level security;
drop policy if exists seller_followers_select on seller_followers;
create policy seller_followers_select on seller_followers for select using (true);
drop policy if exists seller_followers_insert on seller_followers;
create policy seller_followers_insert on seller_followers
  for insert with check (auth.uid() = follower_id);
drop policy if exists seller_followers_delete on seller_followers;
create policy seller_followers_delete on seller_followers
  for delete using (auth.uid() = follower_id);

-- activity_feed: public read, service-role writes
alter table activity_feed enable row level security;
drop policy if exists activity_feed_select on activity_feed;
create policy activity_feed_select on activity_feed for select using (true);

-- notifications: owner read + owner mark-read, service-role writes
alter table notifications enable row level security;
drop policy if exists notifications_owner_select on notifications;
create policy notifications_owner_select on notifications for select using (auth.uid() = user_id);
drop policy if exists notifications_owner_update on notifications;
create policy notifications_owner_update on notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
