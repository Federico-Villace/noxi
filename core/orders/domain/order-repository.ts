import type { OrderRecord } from "./order";
import type { OrderStatus } from "./order-status";

export interface ConfirmPaymentInput {
  reference: string;
  status: OrderStatus;
  paymentId: string;
  payerEmail?: string | null;
}

/**
 * PUERTO de órdenes. Mismo criterio que el catálogo: el dominio no sabe que
 * del otro lado hay Supabase.
 */
export interface OrderRepository {
  /**
   * Guarda la orden apenas se crea la preferencia, en estado "iniciada".
   *
   * Por qué antes de pagar y no en el webhook: en este momento sabemos
   * EXACTAMENTE qué había en el carrito. El webhook solo conoce el pago.
   * Además, si la notificación nunca llega, igual queda rastro de que alguien
   * intentó comprar — que es justo lo que hoy no tenemos.
   */
  create(order: OrderRecord): Promise<void>;

  /**
   * Confirma el resultado del pago. DEBE ser idempotente: MercadoPago reintenta
   * la misma notificación, y a veces manda varias para un mismo pago.
   */
  confirmPayment(input: ConfirmPaymentInput): Promise<OrderRecord | null>;

  findByReference(reference: string): Promise<OrderRecord | null>;

  markForReview(reference: string, motivo: string): Promise<void>;
}
