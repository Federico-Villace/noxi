import type { ProductRepository } from "./domain/product-repository";
import { supabaseProductRepository } from "./infrastructure/supabase-product-repository";

/**
 * ÚNICO punto de acoplamiento entre la app y la fuente de datos.
 *
 * Acá está el cambio: era `staticProductRepository`, ahora es Supabase.
 * Ni un componente, ni una página, ni el checkout se tocaron. Eso es lo que
 * compra un puerto bien puesto.
 *
 * El adaptador estático sigue existiendo: es la semilla de la base
 * (`scripts/seed-products.ts`) y lo que valida el test de imágenes en disco.
 */
export const productRepository: ProductRepository = supabaseProductRepository;

export type { Product, ProductId } from "./domain/product";
export { isSoldOut, isLastUnits } from "./domain/product";
export type { ProductRepository } from "./domain/product-repository";
