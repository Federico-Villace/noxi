import { MercadoPagoConfig, Preference } from "mercadopago";
import { centsToPesos } from "@/core/shared/domain/money";
import type {
  CheckoutSession,
  CheckoutUrls,
  PaymentGateway,
} from "../domain/payment-gateway";
import type { Order } from "../domain/build-order";

/**
 * ADAPTADOR de MercadoPago Checkout Pro.
 *
 * Checkout Pro es redirección pura: se crea una "preference" y se manda al
 * comprador a `init_point`. Los datos de la tarjeta NUNCA tocan este código,
 * así que el PCI compliance queda entero del lado de MP.
 */
export function createMercadoPagoGateway(accessToken: string): PaymentGateway {
  const client = new MercadoPagoConfig({ accessToken });
  const preferences = new Preference(client);

  return {
    async createCheckout(
      order: Order,
      urls: CheckoutUrls,
    ): Promise<CheckoutSession> {
      const response = await preferences.create({
        body: {
          items: order.lines.map((line) => ({
            id: line.productId,
            title: line.title,
            quantity: line.quantity,
            unit_price: centsToPesos(line.unitPriceInCents),
            currency_id: "ARS",
          })),
          external_reference: order.reference,
          back_urls: {
            success: urls.success,
            failure: urls.failure,
            pending: urls.pending,
          },
          // MP rechaza auto_return si la URL de éxito no es https.
          ...(urls.success.startsWith("https://")
            ? { auto_return: "approved" }
            : {}),
          notification_url: urls.notification,
          statement_descriptor: "NOXICLTS",
        },
      });

      const redirectUrl = response.init_point;
      if (!redirectUrl) {
        throw new Error(
          "MercadoPago no devolvió init_point para la preferencia",
        );
      }

      return { redirectUrl, providerReference: response.id ?? "" };
    },
  };
}
