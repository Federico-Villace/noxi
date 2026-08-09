import type { Metadata } from "next";
import { paymentVerifier } from "@/core/checkout";
import { orderRepository } from "@/core/orders";
import { confirmOrderPayment } from "@/core/orders/application/confirm-order-payment";
import { CheckoutStatus } from "@/components/checkout/checkout-status";
import { ClearCart } from "@/components/checkout/clear-cart";

export const metadata: Metadata = {
  title: "Pago aprobado",
  robots: { index: false },
};

/**
 * SEGUNDO canal de confirmación, independiente del webhook.
 *
 * MercadoPago vuelve con `payment_id` en la query. Ese dato NO se cree: se usa
 * solo para preguntarle a la API de MP con nuestro access token. Si el webhook
 * falla, la venta igual queda confirmada cuando la compradora vuelve al sitio.
 *
 * Confirmar desde el render es seguro porque `confirmOrderPayment` es
 * idempotente: recargar la página no duplica ni revierte nada.
 */
export default async function CheckoutSuccessPage({
  searchParams,
}: PageProps<"/checkout/exito">) {
  const params = await searchParams;
  const raw = params.payment_id ?? params.collection_id;
  const paymentId = typeof raw === "string" ? raw : null;

  if (paymentId) {
    try {
      const result = await confirmOrderPayment(paymentId, {
        verifier: paymentVerifier(),
        orders: orderRepository(),
      });

      console.info("[checkout/exito] confirmación", {
        paymentId,
        outcome: result.outcome,
      });
    } catch (error) {
      // Nunca romper la pantalla de "gracias por tu compra" por esto:
      // el webhook y sus reintentos siguen siendo la red de contención.
      console.error("[checkout/exito] no se pudo confirmar", error);
    }
  }

  return (
    <>
      <ClearCart />
      <CheckoutStatus
        tone="ok"
        title="Pago aprobado"
        message="Recibimos tu pago. Te escribimos por Instagram para coordinar el envío de tu pieza."
        note="Drop 001 · Plata 925"
      />
    </>
  );
}
