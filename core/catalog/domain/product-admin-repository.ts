import type { Product, ProductId } from "./product";

/**
 * Un producto visto desde el panel: igual que en la tienda, más `active`.
 *
 * `active` es un concepto de administración, no de catálogo. La tienda no
 * necesita saber que existe —solo ve lo activo— y por eso `Product` no lo
 * lleva. Meterlo ahí obligaría a cada componente público a filtrar algo que
 * ya viene filtrado.
 */
export type AdminProduct = Product & { active: boolean };

/**
 * Lo que puede fallar guardando, dicho en términos del negocio.
 *
 * El adaptador traduce los códigos de Postgres a esto. Si dejáramos escapar un
 * "duplicate key value violates unique constraint products_slug_key", la UI
 * tendría que parsear mensajes de la base para decidir qué mostrar — y ahí
 * quedaría acoplada al motor.
 */
export type SaveProductResult =
  | { ok: true }
  | { ok: false; reason: "slug-duplicado" | "id-duplicado"; message: string };

/**
 * PUERTO de escritura del catálogo.
 *
 * Está SEPARADO de `ProductRepository` a propósito. La tienda solo lee, y solo
 * lo activo; el panel lee todo y escribe. Un único puerto con las dos cosas le
 * daría a cada componente público la capacidad de borrar el catálogo.
 */
export interface ProductAdminRepository {
  /** Todo el catálogo, activos e inactivos. */
  findAll(): Promise<AdminProduct[]>;
  findById(id: ProductId): Promise<AdminProduct | null>;
  create(product: AdminProduct): Promise<SaveProductResult>;
  update(product: AdminProduct): Promise<SaveProductResult>;
  /** Baja lógica: la pieza deja la vitrina pero sigue existiendo. */
  setActive(id: ProductId, active: boolean): Promise<void>;

  /**
   * Borrado FÍSICO. Se puede, y no rompe nada: `order_lines` guarda el
   * título y el precio como snapshot y NO tiene foreign key a `products`.
   * Una orden vieja sigue diciendo lo mismo aunque la pieza ya no exista.
   *
   * Es para lo cargado por error. Para una pieza que se vendió y se discontinuó
   * está `setActive(id, false)`, que conserva el historial navegable.
   */
  remove(id: ProductId): Promise<void>;
}
