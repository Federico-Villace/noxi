export interface StockAdjustment {
  productId: string;
  /** Stock resultante. Negativo = se vendió más de lo que había. */
  remaining: number;
}

/**
 * PUERTO para descontar stock de una orden.
 *
 * El contrato exige que la implementación sea ATÓMICA e IDEMPOTENTE: se la
 * llama desde dos canales de confirmación distintos y una venta no puede
 * descontar stock dos veces.
 */
export interface StockAdjuster {
  applyForOrder(reference: string): Promise<StockAdjustment[]>;
}
