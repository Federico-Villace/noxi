-- FASE 3 — Bucket de fotos de producto.
-- Correr en Supabase: SQL Editor > New query > pegar > Run.
--
-- El panel admin sube las fotos acá. En Vercel el filesystem es de SOLO
-- LECTURA: no existe la opción de escribir en `public/`. Sin este bucket, el
-- panel puede crear productos pero no puede darles foto.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'products',
  'products',
  -- PÚBLICO: son fotos de catálogo, las tiene que poder ver cualquiera que
  -- entre a la tienda. Acá no hay nada privado.
  true,
  -- 5 MB, el mismo tope que valida `core/catalog/domain/image-upload.ts`.
  -- Duplicado a propósito: la app valida para dar un mensaje claro, la base
  -- valida porque es la última línea y no confía en nadie.
  5242880,
  -- Lista BLANCA. Nada de image/svg+xml: un SVG es XML ejecutable, y servido
  -- desde este dominio sería un XSS con cara de foto de producto.
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

/*
  No hacen falta políticas de RLS sobre storage.objects:

  - La ESCRITURA pasa siempre por el servidor con la service_role key, que
    saltea RLS. El navegador nunca habla con Storage directamente.
  - La LECTURA es pública por ser un bucket público, sin pasar por RLS.

  O sea: nadie sin la service_role key puede subir, pisar ni borrar una foto.
*/
