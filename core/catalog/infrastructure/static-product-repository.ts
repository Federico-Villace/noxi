import { sortForDrop } from "../domain/product";
import type { ProductRepository } from "../domain/product-repository";
import { CATALOG } from "./catalog.data";

/**
 * ADAPTADOR estático. Cero red, cero latencia, la grilla se prerenderiza entera.
 *
 * Para migrar a Supabase se crea `supabase-product-repository.ts` implementando
 * el mismo puerto y se cambia el export de `productRepository`. Nada más.
 */
export const staticProductRepository: ProductRepository = {
  async findAll() {
    return sortForDrop(CATALOG);
  },

  async findBySlug(slug) {
    return CATALOG.find((product) => product.slug === slug) ?? null;
  },
};
