-- FASE 5 — La marca pasa de plata 925 a plata 950.
-- Correr en Supabase: SQL Editor > New query > pegar > Run.
--
-- El código ya dice 950, pero el catálogo VIVE EN LA BASE: cambiar
-- `catalog.data.ts` no toca ni una fila. Las piezas que ya están cargadas
-- siguen diciendo 925 hasta que corra esto.

-- ── 1. Mirá qué se va a tocar ANTES de tocarlo ────────────────────────────
--
-- Descomentá y corré solo esto primero. Si alguna fila no tendría que
-- cambiar, frená y avisá.
--
-- select id, name, material, description
--   from products
--  where material ilike '%925%' or description ilike '%925%';

-- ── 2. El default de la columna ───────────────────────────────────────────
alter table products
  alter column material set default 'Plata 950';

-- ── 3. Las piezas ya cargadas ─────────────────────────────────────────────
--
-- `where material = 'Plata 925'` y no un update a secas: si alguna pieza
-- tiene un material distinto cargado a mano —una combinada con oro, por
-- ejemplo— no se pisa.
update products
   set material = 'Plata 950',
       updated_at = now()
 where material = 'Plata 925';

-- Las descripciones vinieron del catálogo semilla y muchas nombran el
-- material en el texto corrido. `replace` cambia solo esa parte y deja el
-- resto intacto. Las dos formas, porque en las descripciones va en minúscula.
update products
   set description = replace(replace(description, 'plata 925', 'plata 950'), 'Plata 925', 'Plata 950'),
       updated_at = now()
 where description like '%925%';

-- ── 4. Qué quedó ──────────────────────────────────────────────────────────
--
-- Debería devolver cero filas.
--
-- select id, name, material from products
--  where material ilike '%925%' or description ilike '%925%';

notify pgrst, 'reload schema';
