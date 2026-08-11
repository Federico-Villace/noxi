/**
 * Carga el catálogo estático a Supabase.
 *
 *   pnpm seed:products
 *
 * Es un upsert por `id`: correrlo dos veces no duplica nada. Útil para el
 * arranque y para reponer stock de un drop desde el archivo.
 *
 * OJO: pisa el stock actual con el del archivo. Una vez que la marca cargue
 * piezas desde el panel admin, esto deja de ser la fuente de verdad.
 */
import { createClient } from "@supabase/supabase-js";
import { CATALOG } from "../core/catalog/infrastructure/catalog.data.ts";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Corré con: pnpm seed:products",
  );
  process.exit(1);
}

const rows = CATALOG.map((product) => ({
  id: product.id,
  slug: product.slug,
  name: product.name,
  description: product.description,
  price_in_cents: product.priceInCents,
  images: product.images,
  material: product.material,
  stock: product.stock,
  drop_name: product.drop,
  active: true,
}));

const { error } = await createClient(url, key)
  .from("products")
  .upsert(rows, { onConflict: "id" });

if (error) {
  console.error("No se pudo sembrar el catálogo:", error.message);
  process.exit(1);
}

console.log(`Catálogo sembrado: ${rows.length} piezas.`);
