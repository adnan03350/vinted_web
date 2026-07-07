-- =====================================================================
-- ThriftAI Row Level Security
-- Run AFTER supabase-schema.sql. Idempotent: safe to re-run.
--
-- Model:
--   profiles.id == auth.uid()  (signup inserts the profile with the auth user id)
--
--   * user-scoped tables  -> clients read/write only their own rows
--   * participant tables  -> order buyer/seller can read; writes are server-only
--   * privileged tables   -> RLS on with NO client policy, so only the
--                            service-role key (createServiceRoleClient) can touch
--                            them. Escrow / moderation / analytics live here.
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles: public read, owner write
-- ---------------------------------------------------------------------
alter table profiles enable row level security;

drop policy if exists profiles_select_public on profiles;
create policy profiles_select_public on profiles
  for select using (true);

drop policy if exists profiles_insert_self on profiles;
create policy profiles_insert_self on profiles
  for insert with check (auth.uid() = id);

drop policy if exists profiles_update_self on profiles;
create policy profiles_update_self on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------------
-- products: available listings are public; sellers manage their own
-- ---------------------------------------------------------------------
alter table products enable row level security;

drop policy if exists products_select on products;
create policy products_select on products
  for select using (status = 'available' or auth.uid() = seller_id);

drop policy if exists products_insert_owner on products;
create policy products_insert_owner on products
  for insert with check (auth.uid() = seller_id);

drop policy if exists products_update_owner on products;
create policy products_update_owner on products
  for update using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

drop policy if exists products_delete_owner on products;
create policy products_delete_owner on products
  for delete using (auth.uid() = seller_id);

-- ---------------------------------------------------------------------
-- product_images: public read, write by the product's seller
-- ---------------------------------------------------------------------
alter table product_images enable row level security;

drop policy if exists product_images_select on product_images;
create policy product_images_select on product_images
  for select using (true);

drop policy if exists product_images_write_owner on product_images;
create policy product_images_write_owner on product_images
  for all
  using (exists (select 1 from products p where p.id = product_id and p.seller_id = auth.uid()))
  with check (exists (select 1 from products p where p.id = product_id and p.seller_id = auth.uid()));

-- ---------------------------------------------------------------------
-- listing_ai_analysis: public read, write by the product's seller
-- ---------------------------------------------------------------------
alter table listing_ai_analysis enable row level security;

drop policy if exists listing_ai_analysis_select on listing_ai_analysis;
create policy listing_ai_analysis_select on listing_ai_analysis
  for select using (true);

drop policy if exists listing_ai_analysis_write_owner on listing_ai_analysis;
create policy listing_ai_analysis_write_owner on listing_ai_analysis
  for all
  using (exists (select 1 from products p where p.id = product_id and p.seller_id = auth.uid()))
  with check (exists (select 1 from products p where p.id = product_id and p.seller_id = auth.uid()));

-- ---------------------------------------------------------------------
-- favorites / saved_products: owner only
-- ---------------------------------------------------------------------
alter table favorites enable row level security;
drop policy if exists favorites_owner on favorites;
create policy favorites_owner on favorites
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table saved_products enable row level security;
drop policy if exists saved_products_owner on saved_products;
create policy saved_products_owner on saved_products
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- conversations / messages: participants only
-- ---------------------------------------------------------------------
alter table conversations enable row level security;

drop policy if exists conversations_participants on conversations;
create policy conversations_participants on conversations
  for select using (auth.uid() = buyer_id or auth.uid() = seller_id);

drop policy if exists conversations_insert_participant on conversations;
create policy conversations_insert_participant on conversations
  for insert with check (auth.uid() = buyer_id or auth.uid() = seller_id);

alter table messages enable row level security;

drop policy if exists messages_select_participant on messages;
create policy messages_select_participant on messages
  for select using (
    exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (auth.uid() = c.buyer_id or auth.uid() = c.seller_id)
    )
  );

drop policy if exists messages_insert_sender on messages;
create policy messages_insert_sender on messages
  for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversations c
      where c.id = conversation_id
        and (auth.uid() = c.buyer_id or auth.uid() = c.seller_id)
    )
  );

-- ---------------------------------------------------------------------
-- search_history / saved_searches: owner only
-- ---------------------------------------------------------------------
alter table search_history enable row level security;
drop policy if exists search_history_owner on search_history;
create policy search_history_owner on search_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table saved_searches enable row level security;
drop policy if exists saved_searches_owner on saved_searches;
create policy saved_searches_owner on saved_searches
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Participant-readable, server-written (no client write policy):
--   orders, payments, escrow_transactions, disputes, dispute_messages
-- ---------------------------------------------------------------------
alter table orders enable row level security;
drop policy if exists orders_select_participants on orders;
create policy orders_select_participants on orders
  for select using (auth.uid() = buyer_id or auth.uid() = seller_id);

alter table payments enable row level security;
drop policy if exists payments_select_participants on payments;
create policy payments_select_participants on payments
  for select using (
    exists (select 1 from orders o where o.id = order_id
            and (auth.uid() = o.buyer_id or auth.uid() = o.seller_id))
  );

alter table escrow_transactions enable row level security;
drop policy if exists escrow_tx_select_participants on escrow_transactions;
create policy escrow_tx_select_participants on escrow_transactions
  for select using (
    exists (select 1 from orders o where o.id = order_id
            and (auth.uid() = o.buyer_id or auth.uid() = o.seller_id))
  );

alter table disputes enable row level security;
drop policy if exists disputes_select_participants on disputes;
create policy disputes_select_participants on disputes
  for select using (
    exists (select 1 from orders o where o.id = order_id
            and (auth.uid() = o.buyer_id or auth.uid() = o.seller_id))
  );

alter table dispute_messages enable row level security;
drop policy if exists dispute_messages_select_participants on dispute_messages;
create policy dispute_messages_select_participants on dispute_messages
  for select using (
    exists (
      select 1 from disputes d
      join orders o on o.id = d.order_id
      where d.id = dispute_id
        and (auth.uid() = o.buyer_id or auth.uid() = o.seller_id)
    )
  );

-- ---------------------------------------------------------------------
-- Privileged (service-role only): enable RLS, define NO policy.
-- With RLS on and no policy, the anon/authenticated keys are denied;
-- only the service-role key (which bypasses RLS) can read/write.
-- ---------------------------------------------------------------------
alter table seller_balances          enable row level security;
alter table payout_requests          enable row level security;
alter table admin_actions            enable row level security;
alter table user_trust_scores        enable row level security;
alter table user_risk_events         enable row level security;
alter table blocked_chat_attempts    enable row level security;
alter table moderation_events        enable row level security;
alter table suspicious_listing_flags enable row level security;
alter table search_analytics         enable row level security;
alter table popular_searches         enable row level security;
alter table ai_search_metadata       enable row level security;
alter table user_activity            enable row level security;
alter table product_views            enable row level security;
alter table recommendation_events    enable row level security;
alter table recommendation_metadata  enable row level security;
