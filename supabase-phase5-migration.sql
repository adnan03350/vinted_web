-- Phase 5: production schema alignment and notification channels

alter table products add column if not exists brand text;

alter table profiles add column if not exists bio text;
alter table profiles add column if not exists is_suspended boolean default false;

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now(),
  unique(user_id, endpoint)
);

create index if not exists idx_products_status_created on products(status, created_at desc);
create index if not exists idx_orders_status_created on orders(status, created_at desc);
create index if not exists idx_messages_conversation_created on messages(conversation_id, created_at desc);
create index if not exists idx_notifications_user_read on notifications(user_id, is_read, created_at desc);
