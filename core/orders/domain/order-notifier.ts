import type { OrderRecord } from "./order";

/**
 * PUERTO de avisos de venta.
 *
 * Mismo criterio que el resto: el caso de uso no sabe que del otro lado hay
 * Resend. Si mañana es otro proveedor —o un mensaje de WhatsApp— cambia el
 * adaptador y `confirmOrderPayment` no se entera.
 */
export interface OrderNotifier {
  /**
   * Avisa que una venta quedó confirmada.
   *
   * NUNCA lanza. El pago ya ocurrió: que falle un mail no puede tumbar la
   * confirmación ni la pantalla de gracias. Deja rastro en el log y sigue.
   */
  saleConfirmed(order: OrderRecord): Promise<void>;
}
