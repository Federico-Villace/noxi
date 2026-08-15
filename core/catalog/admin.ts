import type { ImageStorage } from "./domain/image-storage";
import type { ProductAdminRepository } from "./domain/product-admin-repository";
import { supabaseImageStorage } from "./infrastructure/supabase-image-storage";
import { supabaseProductAdminRepository } from "./infrastructure/supabase-product-admin-repository";

/**
 * Cableado del panel. Igual que `core/catalog/index.ts` para la tienda: el
 * ÚNICO archivo que sabe qué adaptador concreto se está usando.
 *
 * Está separado del barrel público a propósito. Si `index.ts` exportara
 * también la escritura, cualquier componente de la tienda podría importar
 * `setActive` sin querer. Lo que no se exporta, no se puede usar mal.
 */
export const productAdminRepository: ProductAdminRepository =
  supabaseProductAdminRepository;

export const imageStorage: ImageStorage = supabaseImageStorage;

export { existingProductIds } from "./infrastructure/supabase-product-admin-repository";

export type {
  AdminProduct,
  ProductAdminRepository,
  SaveProductResult,
} from "./domain/product-admin-repository";
