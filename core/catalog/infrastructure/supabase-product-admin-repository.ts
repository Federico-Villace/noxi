import { supabaseAdmin } from "@/core/orders/infrastructure/supabase-client";
import type { Product } from "../domain/product";
import type {
  AdminProduct,
  ProductAdminRepository,
  SaveProductResult,
} from "../domain/product-admin-repository";

interface AdminProductRow {
  id: string;
  slug: string;
  name: string;
  description: string;
  price_in_cents: number;
  images: string[] | null;
  material: string;
  stock: number;
  drop_name: string;
  active: boolean;
}

const COLUMNS =
  "id, slug, name, description, price_in_cents, images, material, stock, drop_name, active";

/** Postgres: violación de unique. Es lo único que esperamos que falle seguido. */
const UNIQUE_VIOLATION = "23505";

function toAdminProduct(row: AdminProductRow): AdminProduct {
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
    active: row.active,
  };
}

function toRow(product: AdminProduct) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    price_in_cents: product.priceInCents,
    images: product.images,
    material: product.material,
    stock: product.stock,
    drop_name: product.drop,
    active: product.active,
    updated_at: new Date().toISOString(),
  };
}

/**
 * Traduce el error de Postgres al lenguaje del negocio.
 *
 * Un choque de unique en un alta es casi siempre el slug: el id lo autonumera
 * el dominio. Se distingue igual porque el mensaje que ve la persona cambia —
 * y porque un choque de id significa que alguien lo escribió a mano.
 */
function traducirError(
  error: { code?: string; message: string },
  operacion: string,
): SaveProductResult {
  if (error.code !== UNIQUE_VIOLATION) {
    throw new Error(`No se pudo ${operacion} el producto: ${error.message}`);
  }

  const esId = error.message.includes("pkey");

  return esId
    ? {
        ok: false,
        reason: "id-duplicado",
        message: "Ya existe una pieza con ese ID.",
      }
    : {
        ok: false,
        reason: "slug-duplicado",
        message: "Ya existe una pieza con ese slug. El slug es la URL: tiene que ser único.",
      };
}

export const supabaseProductAdminRepository: ProductAdminRepository = {
  async findAll() {
    const { data, error } = await supabaseAdmin()
      .from("products")
      .select(COLUMNS)
      // Por id descendente: la última cargada arriba, que es la que se está
      // por revisar. Acá NO se ordena por agotados como en la tienda.
      .order("id", { ascending: false });

    if (error) {
      throw new Error(`No se pudo leer el catálogo: ${error.message}`);
    }

    return (data as AdminProductRow[]).map(toAdminProduct);
  },

  async findById(id) {
    const { data, error } = await supabaseAdmin()
      .from("products")
      .select(COLUMNS)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`No se pudo leer el producto: ${error.message}`);
    }

    return data ? toAdminProduct(data as AdminProductRow) : null;
  },

  /**
   * INSERT, no upsert. Si el id ya existe tiene que fallar: un upsert acá
   * pisaría en silencio una pieza que ya está publicada y vendiéndose.
   */
  async create(product) {
    const { error } = await supabaseAdmin().from("products").insert(toRow(product));

    return error ? traducirError(error, "crear") : { ok: true };
  },

  async update(product) {
    const { error } = await supabaseAdmin()
      .from("products")
      .update(toRow(product))
      .eq("id", product.id);

    return error ? traducirError(error, "actualizar") : { ok: true };
  },

  async setActive(id, active) {
    const { error } = await supabaseAdmin()
      .from("products")
      .update({ active, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      throw new Error(`No se pudo cambiar el estado del producto: ${error.message}`);
    }
  },

  async remove(id) {
    const { error } = await supabaseAdmin().from("products").delete().eq("id", id);

    // Acá SÍ se lanza: si la fila no se borró, la pieza sigue en la vitrina y
    // quien apretó Borrar tiene que enterarse.
    if (error) {
      throw new Error(`No se pudo borrar el producto: ${error.message}`);
    }
  },
};

/** Solo lo que el panel necesita para autonumerar: no trae el catálogo entero. */
export async function existingProductIds(): Promise<string[]> {
  const { data, error } = await supabaseAdmin().from("products").select("id");

  if (error) {
    throw new Error(`No se pudieron leer los IDs del catálogo: ${error.message}`);
  }

  return (data as Pick<Product, "id">[]).map((row) => row.id);
}
