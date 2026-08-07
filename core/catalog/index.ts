import type { ProductRepository } from "./domain/product-repository";
import { staticProductRepository } from "./infrastructure/static-product-repository";

/**
 * ÚNICO punto de acoplamiento entre la app y la fuente de datos.
 * El día que entre Supabase, se cambia esta línea. Una. Sola. Línea.
 */
export const productRepository: ProductRepository = staticProductRepository;

export type { Product, ProductId } from "./domain/product";
export { isSoldOut, isLastUnits } from "./domain/product";
export type { ProductRepository } from "./domain/product-repository";
