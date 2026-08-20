import type { Metadata } from "next";
import { paymentVerifier } from "@/core/checkout";
import { orderRepository, stockAdjuster } from "@/core/orders";
import { confirmOrderPayment } from "@/core/orders/application/confirm-order-payment";
import { CheckoutStatus } from "@/components/checkout/checkout-status";
import { ClearCart } from "@/components/checkout/clear-cart";
import { Receipt, ReceiptActions } from "@/components/checkout/receipt";
import type { OrderRecord } from "@/core/orders/domain/order";

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

  let order: OrderRecord | null = null;

  if (paymentId) {
    try {
      const result = await confirmOrderPayment(paymentId, {
        verifier: paymentVerifier(),
        orders: orderRepository(),
        stock: stockAdjuster(),
      });

      // `actualizada` e `ignorada` traen la orden. La segunda es una recarga
      // de la página: el comprobante tiene que salir igual.
      if (result.outcome === "actualizada" || result.outcome === "ignorada") {
        order = result.order;
      }

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

  // Sin orden no se inventa un comprobante: se confirma el pago y listo. Pasa
  // si MP vuelve sin payment_id o si la API no contesta a tiempo — el webhook
  // sigue siendo la red de contención.
  if (!order) {
    return (
      <>
        <ClearCart />
        <CheckoutStatus
          tone="ok"
          title="Pago aprobado"
          message="Recibimos tu pago. Te escribimos al mail que dejaste para coordinar el envío."
          note="Drop 001 · Plata 925"
        />
      </>
    );
  }

  return (
    <>
      <ClearCart />

      <section className="mx-auto max-w-2xl px-5 py-14 md:py-20">
        <span className="block h-px w-16 bg-chrome" aria-hidden />

        <h1 className="mt-8 text-[clamp(2rem,7vw,3.5rem)] font-medium uppercase leading-[0.9] tracking-[-0.03em] text-chrome">
          Pago aprobado
        </h1>

        <p className="mt-6 max-w-md text-sm leading-relaxed text-silver">
          Guardá este comprobante. Preparamos tu pieza y te escribimos a{" "}
          <span className="text-chrome">{order.customer.email}</span> para
          coordinar el envío.
        </p>

        <div className="mt-10">
          <Receipt order={order} />
        </div>

        <ReceiptActions />
      </section>
    </>
  );
}
