-- FASE 2 — Productos y descuento de stock.
-- Correr en Supabase: SQL Editor > New query > pegar > Run.

create table products (
  id             text    primary key,
  slug           text    not null unique,
  name           text    not null,
  description    text    not null default '',
  price_in_cents bigint  not null check (price_in_cents >= 0),
  images         text[]  not null default '{}',
  material       text    not null default 'Plata 925',
  stock          integer not null default 0,
  -- "drop" es palabra reservada en SQL.
  drop_name      text    not null default 'DROP 001',
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index products_active_idx on products (active);

-- Igual que orders: solo el servidor con service_role.
alter table products enable row level security;

-- Marca de que a esta orden ya se le descontó el stock.
alter table orders add column stock_applied boolean not null default false;

/*
  Descuento de stock atómico e idempotente.

  Dos problemas resueltos de una:

  1. IDEMPOTENCIA — el `update ... where stock_applied = false` es un reclamo
     atómico. Si dos confirmaciones llegan a la vez (webhook + vuelta al sitio),
     solo una gana; la otra sale sin tocar nada. Sin esto, una venta descontaría
     stock dos veces.

  2. ATOMICIDAD — una función plpgsql corre en UNA transacción. El reclamo y el
     descuento viven o mueren juntos: es imposible marcar la orden como aplicada
     y que el stock no baje.

  Devuelve el stock resultante de cada pieza. Si alguno quedó NEGATIVO hubo
  sobreventa, y el caller marca la orden para revisión.
*/
create or replace function apply_stock_for_order(p_reference text)
returns table (product_id text, remaining integer)
language plpgsql
set search_path = public
as $$
declare
  v_claimed boolean;
begin
  update orders
     set stock_applied = true
   where reference = p_reference
     and stock_applied = false
  returning true into v_claimed;

  -- Ya se había aplicado: no hay nada que descontar.
  if v_claimed is null then
    return;
  end if;

  return query
  update products p
     set stock = p.stock - l.quantity,
         updated_at = now()
    from order_lines l
   where l.order_reference = p_reference
     and p.id = l.product_id
  returning p.id, p.stock;
end;
$$;
