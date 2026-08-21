-- FASE 4 — Datos de la compradora y del envío.
-- Correr en Supabase: SQL Editor > New query > pegar > Run.
--
-- Van en `orders` y NO en una tabla `customers` con foreign key. Es a
-- propósito, y es el mismo criterio que `order_lines`: esto es un SNAPSHOT
-- contable. Si la clienta se muda el año que viene, la orden de hoy tiene que
-- seguir diciendo la dirección a la que se despachó hoy. Con una FK, editar
-- un dato reescribiría el pasado.

alter table orders
  add column customer_name     text not null default '',
  add column customer_email    text not null default '',
  add column customer_phone    text not null default '',
  add column customer_doc      text not null default '',

  add column shipping_street   text not null default '',
  -- Piso, depto, torre. Opcional de verdad: hay casas.
  add column shipping_extra    text not null default '',
  add column shipping_city     text not null default '',
  add column shipping_province  text not null default '',
  add column shipping_zip      text not null default '',

  add column customer_notes    text not null default '';

-- `default ''` y no `null`: las órdenes que ya existen quedan con los campos
-- vacíos en vez de nulos, así el panel no tiene que distinguir "no lo pidió
-- todavía" de "lo pidió y lo dejó en blanco". El formulario los exige; la
-- columna no, porque las filas viejas son anteriores a la regla.

-- Para buscar una compra por mail cuando escriben preguntando.
create index orders_customer_email_idx on orders (customer_email);

/*
  Supabase habla con la base a través de PostgREST, que mantiene un CACHE del
  esquema. Después de un `alter table`, la API puede seguir un rato sin ver las
  columnas nuevas y responder "Could not find the 'customer_doc' column of
  'orders' in the schema cache" aunque la columna ya exista.

  Esto le avisa que recargue. Normalmente lo hace solo, pero forzarlo cuesta
  una línea y evita quedarse mirando un error que ya está resuelto.
*/
notify pgrst, 'reload schema';
