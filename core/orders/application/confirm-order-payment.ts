import type { PaymentVerifier } from "@/core/checkout/domain/payment-verifier";
import type { OrderRecord } from "../domain/order";
import type { OrderRepository } from "../domain/order-repository";
import { fromMercadoPagoStatus } from "../domain/order-status";

export type ConfirmOrderPaymentResult =
  | { outcome: "actualizada"; order: OrderRecord }
  | { outcome: "ignorada"; order: OrderRecord }
  | { outcome: "no-encontrada" }
  | { outcome: "pago-inexistente" }
  | { outcome: "sin-referencia" };

interface Deps {
  verifier: PaymentVerifier;
  orders: OrderRepository;
}

/**
 * Confirma una orden a partir de un ID de pago, venga de donde venga.
 *
 * Lo usan DOS canales independientes: el webhook y la vuelta del comprador a
 * /checkout/exito. Ninguno de los dos es confiable por sí mismo, y no hace
 * falta que lo sea: acá el único dato que se cree es el que devuelve la API de
 * MercadoPago consultada con nuestro access token.
 *
 * Que existan dos caminos no es redundancia inútil: si el webhook falla
 * —como nos está pasando— la venta se confirma igual cuando la compradora
 * vuelve al sitio.
 */
export async function confirmOrderPayment(
  paymentId: string,
  { verifier, orders }: Deps,
): Promise<ConfirmOrderPaymentResult> {
  const payment = await verifier.getPayment(paymentId);

  if (!payment) return { outcome: "pago-inexistente" };
  if (!payment.externalReference) return { outcome: "sin-referencia" };

  return orders.confirmPayment({
    reference: payment.externalReference,
    // El estado sale de MercadoPago, jamás de quien nos llamó.
    status: fromMercadoPagoStatus(payment.status),
    paymentId: payment.id,
    payerEmail: payment.payerEmail ?? null,
  });
}
