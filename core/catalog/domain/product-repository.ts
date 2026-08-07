import type { Product } from "./product";

/**
 * PUERTO. La UI habla SOLO con esta interfaz, nunca con la fuente de datos.
 *
 * Hoy el adaptador es un archivo estático (drops limitados, catálogo chico).
 * Mañana es Supabase. La firma ya es asincrónica justamente para que ese día
 * no haya que tocar un solo componente: se cambia el adaptador y listo.
 */
export interface ProductRepository {
  findAll(): Promise<Product[]>;
  findBySlug(slug: string): Promise<Product | null>;
}
