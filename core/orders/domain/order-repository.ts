import type { OrderRecord } from "./order";
import type { OrderStatus } from "./order-status";

export interface ConfirmPaymentInput {
  reference: string;
  status: OrderStatus;
  paymentId: string;
  payerEmail?: string | null;
}

/**
 * Resultado explícito en vez de `OrderRecord | null`.
 *
 * El webhook necesita distinguir "actualicé la orden" de "ya estaba así, la
 * ignoré": solo en el primer caso hay que disparar efectos como descontar
 * stock o mandar el mail de confirmación.
 */
export type ConfirmPaymentResult =
  | { outcome: "actualizada"; order: OrderRecord }
  | { outcome: "ignorada"; order: OrderRecord }
  | { outcome: "no-encontrada" };

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
   * la misma notificación y no garantiza el orden de llegada.
   */
  confirmPayment(input: ConfirmPaymentInput): Promise<ConfirmPaymentResult>;

  findByReference(reference: string): Promise<OrderRecord | null>;

  /** Las últimas órdenes, para el panel. De la más nueva a la más vieja. */
  findRecent(limit: number): Promise<OrderRecord[]>;

  markForReview(reference: string, motivo: string): Promise<void>;
}
