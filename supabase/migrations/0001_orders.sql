-- FASE 1 — Órdenes.
-- Correr en Supabase: SQL Editor > New query > pegar > Run.

create type order_status as enum (
  'iniciada',   -- se creó la preferencia, todavía no pagó
  'pendiente',  -- MP la está procesando (efectivo, revisión)
  'pagada',
  'rechazada',
  'cancelada',
  'devuelta'
);

create table orders (
  -- external_reference que viaja a MercadoPago. Clave natural: hace que
  -- reprocesar la misma notificación sea inofensivo.
  reference       text primary key,
  status          order_status not null default 'iniciada',
  total_in_cents  bigint       not null check (total_in_cents >= 0),

  payment_id      text,
  payer_email     text,

  -- Se marca cuando el stock no alcanzaba al confirmarse el pago (sobreventa).
  needs_review    boolean      not null default false,
  review_reason   text,

  created_at      timestamptz  not null default now(),
  paid_at         timestamptz
);

create table order_lines (
  id                   bigint generated always as identity primary key,
  order_reference      text    not null references orders(reference) on delete cascade,

  -- SNAPSHOT, no FK a products: si mañana sube el precio del dije,
  -- la orden de ayer no puede cambiar. Es un registro contable.
  product_id           text    not null,
  title                text    not null,
  unit_price_in_cents  bigint  not null check (unit_price_in_cents >= 0),
  quantity             integer not null check (quantity > 0)
);

create index order_lines_order_reference_idx on order_lines (order_reference);
create index orders_status_idx               on orders (status);
create index orders_created_at_idx           on orders (created_at desc);

-- SEGURIDAD: RLS activo y CERO políticas.
-- Con esto, la anon key (la que puede terminar en el navegador) no lee ni
-- escribe absolutamente nada. Las órdenes se tocan solo desde el servidor con
-- la service_role key. Una tabla con datos de compras nunca debe ser
-- alcanzable desde el cliente.
alter table orders      enable row level security;
alter table order_lines enable row level security;
