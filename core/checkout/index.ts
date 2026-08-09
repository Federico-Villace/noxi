import type { PaymentGateway } from "./domain/payment-gateway";
import type { PaymentVerifier } from "./domain/payment-verifier";
import { createMercadoPagoGateway } from "./infrastructure/mercadopago-gateway";
import { createMercadoPagoPaymentVerifier } from "./infrastructure/mercadopago-payment-verifier";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Falta la variable de entorno ${name}. Cargala en .env.local (ver README).`,
    );
  }
  return value;
}

/**
 * ÚNICO punto de acoplamiento con el proveedor de pagos.
 *
 * Se resuelve perezosamente a propósito: sin esto, un build sin credenciales
 * reventaría en tiempo de import en vez de fallar recién cuando alguien
 * intenta pagar.
 */
export function paymentGateway(): PaymentGateway {
  return createMercadoPagoGateway(required("MP_ACCESS_TOKEN"));
}

/** Consulta la verdad sobre un pago a la API de MercadoPago. */
export function paymentVerifier(): PaymentVerifier {
  return createMercadoPagoPaymentVerifier(required("MP_ACCESS_TOKEN"));
}

export function webhookSecret(): string {
  return required("MP_WEBHOOK_SECRET");
}

/** Base pública del sitio. Las back_urls y el webhook deben ser alcanzables por MP. */
export function siteUrl(): string {
  return required("NEXT_PUBLIC_SITE_URL").replace(/\/$/, "");
}

export type {
  PaymentGateway,
  CheckoutSession,
  CheckoutUrls,
} from "./domain/payment-gateway";
export type {
  PaymentVerifier,
  VerifiedPayment,
} from "./domain/payment-verifier";
export type { Order, OrderLine } from "./domain/build-order";
