-- =====================================================================
-- ThriftAI post-schema migration (additive, idempotent)
-- Run AFTER supabase-schema.sql. Does not destroy or rename anything.
-- =====================================================================

-- product_images.is_primary is referenced by the app (and types) but was
-- missing from the base schema, so image inserts failed. Add it.
alter table product_images add column if not exists is_primary boolean default false;

-- Escrow auto-release must count from delivery confirmation, not order
-- creation, so track delivered_at (and a general updated_at) explicitly.
alter table orders add column if not exists delivered_at timestamptz;
alter table orders add column if not exists updated_at timestamptz default now();
