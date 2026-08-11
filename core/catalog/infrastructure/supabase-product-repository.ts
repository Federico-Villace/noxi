import { supabaseAdmin } from "@/core/orders/infrastructure/supabase-client";
import { sortForDrop, type Product } from "../domain/product";
import type { ProductRepository } from "../domain/product-repository";

interface ProductRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_in_cents: number;
  images: string[] | null;
  material: string;
  stock: number;
  drop_name: string;
}

const COLUMNS =
  "id, slug, name, description, price_in_cents, images, material, stock, drop_name";

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    priceInCents: Number(row.price_in_cents),
    images: row.images ?? [],
    material: row.material,
    stock: row.stock,
    drop: row.drop_name,
  };
}

/**
 * ADAPTADOR de Supabase. Implementa el MISMO puerto que el estático, así que
 * ningún componente cambia al pasar de uno al otro.
 */
export const supabaseProductRepository: ProductRepository = {
  async findAll() {
    const { data, error } = await supabaseAdmin()
      .from("products")
      .select(COLUMNS)
      .eq("active", true);

    if (error) {
      throw new Error(`No se pudo leer el catálogo: ${error.message}`);
    }

    return sortForDrop((data as ProductRow[]).map(toProduct));
  },

  async findBySlug(slug) {
    const { data, error } = await supabaseAdmin()
      .from("products")
      .select(COLUMNS)
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();

    if (error) {
      throw new Error(`No se pudo leer el producto: ${error.message}`);
    }

    return data ? toProduct(data as ProductRow) : null;
  },
};
