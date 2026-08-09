import type { OrderStatus } from "./order-status";

export interface OrderLineRecord {
  productId: string;
  /**
   * SNAPSHOT. Título y precio al momento de la compra, no una FK al producto.
   * Si mañana sube el precio del dije, la orden de ayer NO puede cambiar.
   */
  title: string;
  unitPriceInCents: number;
  quantity: number;
}

export interface OrderRecord {
  /** `external_reference` que viaja a MercadoPago. Clave natural e idempotente. */
  reference: string;
  status: OrderStatus;
  lines: OrderLineRecord[];
  totalInCents: number;

  /** Se completan cuando llega la notificación de pago. */
  paymentId?: string | null;
  payerEmail?: string | null;
  /** Marcada cuando el stock no alcanzaba al confirmarse el pago. */
  needsReview?: boolean;

  createdAt?: string;
  paidAt?: string | null;
}
