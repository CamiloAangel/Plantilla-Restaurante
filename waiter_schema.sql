-- ------------------------------------------------------------
-- VASTAGO - Esquema base para vista de meseros
-- ------------------------------------------------------------
-- Ejecutar en Supabase SQL Editor.
-- Este esquema conecta mesas usando la tabla orders existente.

create extension if not exists pgcrypto;

create table if not exists public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  capacity integer not null default 4 check (capacity between 1 and 20),
  status text not null default 'libre' check (status in ('libre', 'ocupada')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists ux_restaurant_tables_label
  on public.restaurant_tables (label);

alter table public.orders
  add column if not exists table_id uuid references public.restaurant_tables(id) on delete set null;

alter table public.orders
  add column if not exists customer_name text;

alter table public.orders
  add column if not exists waiter_id uuid;

create index if not exists idx_orders_table_id
  on public.orders (table_id);

create index if not exists idx_orders_waiter_id
  on public.orders (waiter_id);

alter table public.order_items
  add column if not exists notes text;

-- Mantener updated_at actualizado automaticamente.
create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_restaurant_tables_updated_at on public.restaurant_tables;
create trigger trg_restaurant_tables_updated_at
before update on public.restaurant_tables
for each row execute function public.set_updated_at_timestamp();
