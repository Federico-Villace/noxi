import type { PaymentVerifier } from "@/core/checkout/domain/payment-verifier";
import type { OrderRecord } from "../domain/order";
import type { OrderNotifier } from "../domain/order-notifier";
import type { OrderRepository } from "../domain/order-repository";
import { fromMercadoPagoStatus } from "../domain/order-status";
import type { StockAdjuster } from "../domain/stock-adjuster";

export type ConfirmOrderPaymentResult =
  | { outcome: "actualizada"; order: OrderRecord }
  | { outcome: "ignorada"; order: OrderRecord }
  | { outcome: "no-encontrada" }
  | { outcome: "pago-inexistente" }
  | { outcome: "sin-referencia" };

interface Deps {
  verifier: PaymentVerifier;
  orders: OrderRepository;
  /** Opcional: sin él la orden se confirma igual, solo no se descuenta stock. */
  stock?: StockAdjuster;
  /** Opcional: sin él la orden se confirma igual, solo no sale el aviso. */
  notifier?: OrderNotifier;
}

/**
 * Descuenta stock UNA sola vez por venta.
 *
 * Se llama solo cuando la transición realmente ocurrió (`actualizada`) y el
 * resultado es `pagada`. Las confirmaciones duplicadas devuelven `ignorada` y
 * no llegan acá — que es lo que evita descontar dos veces la misma pieza.
 */
async function applyStock(
  reference: string,
  { orders, stock }: Deps,
): Promise<void> {
  if (!stock) return;

  try {
    const adjustments = await stock.applyForOrder(reference);
    const oversold = adjustments.filter((item) => item.remaining < 0);

    if (oversold.length > 0) {
      await orders.markForReview(
        reference,
        `Sobreventa: ${oversold
          .map((item) => `${item.productId} (${item.remaining})`)
          .join(", ")}`,
      );
    }
  } catch (error) {
    // El pago YA ocurrió: no podemos desconfirmar la orden porque falló el
    // stock. Se deja constancia para que un humano lo resuelva.
    console.error("[orders] falló el descuento de stock", { reference, error });
    await orders.markForReview(
      reference,
      "No se pudo descontar el stock automáticamente",
    );
  }
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
  deps: Deps,
): Promise<ConfirmOrderPaymentResult> {
  const payment = await deps.verifier.getPayment(paymentId);

  if (!payment) return { outcome: "pago-inexistente" };
  if (!payment.externalReference) return { outcome: "sin-referencia" };

  const result = await deps.orders.confirmPayment({
    reference: payment.externalReference,
    // El estado sale de MercadoPago, jamás de quien nos llamó.
    status: fromMercadoPagoStatus(payment.status),
    paymentId: payment.id,
    payerEmail: payment.payerEmail ?? null,
  });

  // `actualizada` ocurre UNA vez por venta: el control de concurrencia
  // optimista de `confirmPayment` descarta las notificaciones repetidas de
  // MercadoPago. Por eso los dos efectos —descontar stock y avisar— viven
  // acá adentro: es la única guarda que garantiza que pasen una sola vez.
  if (result.outcome === "actualizada" && result.order.status === "pagada") {
    await applyStock(payment.externalReference, deps);
    await deps.notifier?.saleConfirmed(result.order);
  }

  return result;
}
