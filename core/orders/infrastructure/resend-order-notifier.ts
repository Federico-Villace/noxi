import { Resend } from "resend";
import { buildSaleEmail } from "../domain/sale-email";
import type { OrderNotifier } from "../domain/order-notifier";

/**
 * Remitente por defecto de Resend, el que funciona SIN dominio propio.
 *
 * Con este remitente Resend solo entrega a la casilla con la que se creó la
 * cuenta — que es justo lo que necesitamos: el aviso va a la tienda. El día
 * que haya dominio verificado se cambia `SALE_EMAIL_FROM` en Vercel y no se
 * toca una línea de código.
 */
const FROM_POR_DEFECTO = "NOXICLTS <onboarding@resend.dev>";

export function createResendOrderNotifier(): OrderNotifier {
  return {
    async saleConfirmed(order) {
      const apiKey = process.env.RESEND_API_KEY;
      const to = process.env.SALE_EMAIL_TO;

      // Sin configurar, el aviso simplemente no sale. NO se lanza: una venta
      // real no puede fallar porque falta una variable de notificación.
      if (!apiKey || !to) {
        console.warn(
          "[orders] aviso de venta no enviado: faltan RESEND_API_KEY o SALE_EMAIL_TO",
          { reference: order.reference },
        );
        return;
      }

      const { subject, text, replyTo } = buildSaleEmail(order);

      try {
        const { data, error } = await new Resend(apiKey).emails.send({
          from: process.env.SALE_EMAIL_FROM ?? FROM_POR_DEFECTO,
          to: [to],
          subject,
          text,
          // Responder le escribe a la compradora, no a la propia tienda.
          ...(replyTo ? { replyTo } : {}),
        });

        if (error) {
          console.error("[orders] Resend rechazó el aviso de venta", {
            reference: order.reference,
            error,
          });
          return;
        }

        console.info("[orders] aviso de venta enviado", {
          reference: order.reference,
          emailId: data?.id,
        });
      } catch (error) {
        // La venta YA está cobrada y guardada. El mail es un aviso, no el
        // registro: si el proveedor está caído, la orden sigue en /admin/ordenes.
        console.error("[orders] no se pudo enviar el aviso de venta", {
          reference: order.reference,
          error,
        });
      }
    },
  };
}
