-- Vale Games Store (Supabase) — schema mínimo
-- Execute no Supabase SQL Editor

-- Produtos
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text default '',
  price numeric(10,2) default 0,
  tags text[] default '{}',
  platforms text[] default '{android,ios,web}',
  cover_url text default '',
  pay_link text default '',
  android_url text default '',
  ios_link text default '',
  web_link text default '',
  updated_at timestamptz default now()
);

-- Pedidos (checkout gera; admin marca pago)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique not null,
  product_slug text not null,
  product_name text not null,
  total numeric(10,2) default 0,
  status text default 'created', -- created | paid | delivered | canceled
  deliver_token text default '',
  created_at timestamptz default now(),
  paid_at timestamptz,
  buyer_note text default ''
);

-- Entregas (token -> links)
create table if not exists public.deliveries (
  token text primary key,
  product_slug text not null,
  product_name text not null,
  android_url text default '',
  ios_link text default '',
  web_link text default '',
  created_at timestamptz default now(),
  expires_at timestamptz
);

-- ===== RLS =====
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.deliveries enable row level security;

-- Leitura pública de catálogo
create policy "public can read products"
on public.products for select
to anon, authenticated
using (true);

-- Admin (authenticated) pode escrever produtos
create policy "admin can write products"
on public.products for all
to authenticated
using (true)
with check (true);

-- Pedidos: público pode inserir (checkout) e ler (por código aleatório)
create policy "public can insert orders"
on public.orders for insert
to anon, authenticated
with check (true);

create policy "public can read orders"
on public.orders for select
to anon, authenticated
using (true);

-- Admin pode atualizar/deletar pedidos
create policy "admin can update orders"
on public.orders for update
to authenticated
using (true)
with check (true);

create policy "admin can delete orders"
on public.orders for delete
to authenticated
using (true);

-- Entregas: público pode ler (token secreto), admin pode escrever
create policy "public can read deliveries"
on public.deliveries for select
to anon, authenticated
using (true);

create policy "admin can write deliveries"
on public.deliveries for all
to authenticated
using (true)
with check (true);
