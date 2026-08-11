import type { OrderRepository } from "./domain/order-repository";
import type { StockAdjuster } from "./domain/stock-adjuster";
import { createSupabaseOrderRepository } from "./infrastructure/supabase-order-repository";
import { createSupabaseStockAdjuster } from "./infrastructure/supabase-stock-adjuster";

let cached: OrderRepository | null = null;

/**
 * ÚNICO punto de acoplamiento con la persistencia de órdenes.
 * Perezoso: sin credenciales no revienta en tiempo de import, falla recién
 * cuando alguien intenta comprar.
 */
export function orderRepository(): OrderRepository {
  if (!cached) cached = createSupabaseOrderRepository();
  return cached;
}

let cachedStock: StockAdjuster | null = null;

export function stockAdjuster(): StockAdjuster {
  if (!cachedStock) cachedStock = createSupabaseStockAdjuster();
  return cachedStock;
}

export type { OrderRecord, OrderLineRecord } from "./domain/order";
export type { OrderStatus } from "./domain/order-status";
export { fromMercadoPagoStatus, isFinal } from "./domain/order-status";
export { shouldApplyTransition } from "./domain/status-transition";
export type {
  OrderRepository,
  ConfirmPaymentResult,
} from "./domain/order-repository";
