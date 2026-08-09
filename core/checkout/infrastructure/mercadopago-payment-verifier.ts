import { MercadoPagoConfig, Payment } from "mercadopago";
import type {
  PaymentVerifier,
  VerifiedPayment,
} from "../domain/payment-verifier";

export function createMercadoPagoPaymentVerifier(
  accessToken: string,
): PaymentVerifier {
  const client = new MercadoPagoConfig({ accessToken });
  const payments = new Payment(client);

  return {
    async getPayment(paymentId: string): Promise<VerifiedPayment | null> {
      try {
        const payment = await payments.get({ id: paymentId });
        if (!payment?.id) return null;

        return {
          id: String(payment.id),
          status: payment.status ?? null,
          externalReference: payment.external_reference ?? null,
          payerEmail: payment.payer?.email ?? null,
        };
      } catch (error) {
        // 404: el pago no existe → null, y el caller decide.
        // Cualquier otro error (red, 5xx) se propaga: tragárselo haría parecer
        // "pago inexistente" a una caída transitoria, y perderíamos la venta.
        if ((error as { status?: number })?.status === 404) return null;
        throw error;
      }
    },
  };
}
