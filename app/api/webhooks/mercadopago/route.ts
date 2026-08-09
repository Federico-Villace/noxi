import { createHash } from "node:crypto";
import { paymentVerifier } from "@/core/checkout";
import { matchSignatureVariant } from "@/core/checkout/domain/webhook-signature";
import { orderRepository } from "@/core/orders";
import { confirmOrderPayment } from "@/core/orders/application/confirm-order-payment";

/**
 * Receptor de notificaciones de MercadoPago.
 *
 * La notificación NO es la fuente de verdad, ni siquiera cuando la firma
 * valida: es un aviso de "andá a fijarte el pago X". El estado real se lee
 * después de la API de MP con nuestro access token (ver confirmOrderPayment).
 *
 * Por eso una firma que no valida se registra como degradada pero igual
 * dispara la consulta: un atacante tendría que inventar un payment_id que
 * exista en MercadoPago Y cuyo external_reference coincida con una orden
 * nuestra — y aun así el estado lo pondría MP, no él.
 */
export async function POST(request: Request) {
  // .trim(): un salto de línea al copiar el secreto cambia el HMAC entero.
  const secret = process.env.MP_WEBHOOK_SECRET?.trim();
  const url = new URL(request.url);

  let body: { type?: string; action?: string; data?: { id?: string } };
  try {
    body = await request.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const dataId =
    url.searchParams.get("data.id") ??
    url.searchParams.get("id") ??
    body.data?.id ??
    null;

  const topic = body.type ?? url.searchParams.get("topic") ?? null;
  const signatureHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");

  const variant = secret
    ? matchSignatureVariant({ signatureHeader, requestId, dataId, secret })
    : null;

  if (variant) {
    console.info("[webhook] firma válida", { variante: variant, dataId, topic });
  } else {
    console.warn("[webhook] firma NO validada, se confirma contra la API de MP", {
      query: url.search,
      tieneSignature: Boolean(signatureHeader),
      dataId,
      topic,
      action: body.action,
      secretLength: secret?.length ?? 0,
      secretFingerprint: secret
        ? createHash("sha256").update(secret).digest("hex").slice(0, 12)
        : null,
    });
  }

  // Solo nos interesan los avisos de pago. merchant_order y compañía se
  // reconocen y se descartan.
  if (topic !== "payment" || !dataId) {
    return new Response(null, { status: 200 });
  }

  try {
    const result = await confirmOrderPayment(dataId, {
      verifier: paymentVerifier(),
      orders: orderRepository(),
    });

    console.info("[webhook] orden", {
      paymentId: dataId,
      outcome: result.outcome,
      firmaValidada: Boolean(variant),
      status:
        result.outcome === "actualizada" || result.outcome === "ignorada"
          ? result.order.status
          : null,
    });

    // TODO(FASE 2): si outcome === "actualizada" y quedó "pagada",
    // descontar stock de forma atómica y marcar needs_review si da negativo.
  } catch (error) {
    console.error("[webhook] no se pudo confirmar el pago", error);
    // 500 para que MP reintente: perder una confirmación es peor que un reintento.
    return new Response(null, { status: 500 });
  }

  return new Response(null, { status: 200 });
}
