"use server";

import { randomUUID } from "node:crypto";
import { productRepository } from "@/core/catalog";
import { paymentGateway, siteUrl } from "@/core/checkout";
import { orderRepository } from "@/core/orders";
import {
  buildOrder,
  type CheckoutRequestLine,
} from "@/core/checkout/domain/build-order";
import {
  parseCustomer,
  type CustomerErrors,
  type RawCustomer,
} from "@/core/checkout/domain/customer";

export type StartCheckoutResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; message: string; errors?: CustomerErrors };

const MESSAGES: Record<string, string> = {
  "carrito-vacio": "El carrito está vacío.",
  "sin-items-disponibles":
    "Las piezas del carrito ya no están disponibles. Actualizá la página.",
};

/**
 * Inicia el checkout.
 *
 * El cliente manda SOLO `productId` y `quantity`. Precio y stock se resuelven
 * acá contra el catálogo del servidor — ver `buildOrder`.
 *
 * Los datos de la compradora se validan de nuevo ACÁ aunque el formulario ya
 * los haya validado en el navegador. Esto es un endpoint POST alcanzable con
 * un curl: la validación del cliente es comodidad, no control.
 */
export async function startCheckout(
  items: CheckoutRequestLine[],
  datos: RawCustomer,
): Promise<StartCheckoutResult> {
  const customer = parseCustomer(datos);

  if (!customer.ok) {
    return {
      ok: false,
      message: "Revisá los datos marcados.",
      errors: customer.errors,
    };
  }

  const catalog = await productRepository.findAll();
  const result = buildOrder(items, catalog, `noxi-${randomUUID()}`);

  if (!result.ok) {
    return { ok: false, message: MESSAGES[result.reason] };
  }

  try {
    // La orden se guarda ANTES de mandar a pagar. Si esto falla, el checkout
    // falla: es preferible perder una venta a cobrarla sin poder registrarla.
    await orderRepository().create({
      reference: result.order.reference,
      status: "iniciada",
      lines: result.order.lines,
      totalInCents: result.order.totalInCents,
      // Se guardan ANTES de mandar a pagar. Si abandona el pago, la orden
      // queda en "iniciada" pero con los datos: es una venta recuperable en
      // vez de un carrito fantasma.
      customer: customer.value,
    });

    const base = siteUrl();

    // Si la base no es https pública, MP no redirige (omitimos auto_return) ni
    // puede alcanzar el webhook. Falla silenciosa y carísima de diagnosticar:
    // que grite en los logs en vez de descubrirlo pagando.
    if (!base.startsWith("https://") || base.includes("localhost")) {
      console.error(
        `[checkout] NEXT_PUBLIC_SITE_URL no es una URL pública https: "${base}". ` +
          "Sin esto MercadoPago no redirige ni notifica el pago.",
      );
    }

    const session = await paymentGateway().createCheckout(result.order, {
      success: `${base}/checkout/exito`,
      failure: `${base}/checkout/error`,
      pending: `${base}/checkout/pendiente`,
      notification: `${base}/api/webhooks/mercadopago`,
    });

    console.info("[checkout] preferencia creada", {
      reference: result.order.reference,
      preference: session.providerReference,
      base,
    });

    return { ok: true, redirectUrl: session.redirectUrl };
  } catch (error) {
    // El detalle queda en el log del servidor; al comprador no se le filtra nada.
    console.error("[checkout] fallo al crear la preferencia", error);
    return {
      ok: false,
      message: "No pudimos iniciar el pago. Probá de nuevo en un momento.",
    };
  }
}
