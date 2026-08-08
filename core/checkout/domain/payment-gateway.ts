import type { Order } from "./build-order";

export interface CheckoutUrls {
  success: string;
  failure: string;
  pending: string;
  /** Adonde el proveedor postea las notificaciones de pago. */
  notification: string;
}

export interface CheckoutSession {
  /** URL a la que se redirige al comprador para pagar. */
  redirectUrl: string;
  providerReference: string;
}

/**
 * PUERTO de pagos.
 *
 * La app no sabe que existe MercadoPago: pide "cobrame esta orden" y recibe
 * una URL. El día que haya que sumar otro proveedor (o testear sin red),
 * se implementa esta interfaz y listo.
 */
export interface PaymentGateway {
  createCheckout(order: Order, urls: CheckoutUrls): Promise<CheckoutSession>;
}
