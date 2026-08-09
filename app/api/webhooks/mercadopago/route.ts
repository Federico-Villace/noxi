import { MercadoPagoConfig, Payment } from "mercadopago";
import { verifyWebhookSignature } from "@/core/checkout/domain/webhook-signature";
import { fromMercadoPagoStatus, orderRepository } from "@/core/orders";

/**
 * Receptor de notificaciones de MercadoPago.
 *
 * Orden innegociable: PRIMERO se valida la firma, DESPUÉS se lee el cuerpo.
 * Un POST sin firma válida no debe provocar ni una sola consulta a la API.
 */
export async function POST(request: Request) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhook] falta MP_WEBHOOK_SECRET");
    return new Response(null, { status: 500 });
  }

  const url = new URL(request.url);

  // Parsear el cuerpo NO es actuar sobre él. Se hace antes de validar solo
  // porque `data.id` a veces viaja únicamente en el body y hace falta para
  // construir el manifest. Ningún efecto ocurre antes de verificar la firma.
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

  const signatureHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");

  const valid = verifyWebhookSignature({
    signatureHeader,
    requestId,
    dataId,
    secret,
  });

  if (!valid) {
    // Diagnóstico sin secretos: qué mandó MP y con qué armamos el manifest.
    console.warn("[webhook] firma inválida, notificación descartada", {
      query: url.search,
      tieneSignature: Boolean(signatureHeader),
      tieneRequestId: Boolean(requestId),
      dataId,
      type: body.type,
      action: body.action,
      manifest: `id:${dataId?.toLowerCase() ?? ""};request-id:${requestId ?? ""};ts:<del header>;`,
    });
    return new Response(null, { status: 401 });
  }

  const paymentId = body.data?.id ?? dataId;
  if (body.type !== "payment" || !paymentId) {
    // Otros topics (merchant_order, etc.) se reconocen sin procesar.
    return new Response(null, { status: 200 });
  }

  try {
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN ?? "",
    });
    const payment = await new Payment(client).get({ id: paymentId });

    console.info("[webhook] pago recibido", {
      id: payment.id,
      status: payment.status,
      externalReference: payment.external_reference,
      amount: payment.transaction_amount,
    });

    const reference = payment.external_reference;
    if (!reference) {
      console.warn("[webhook] pago sin external_reference, no hay orden que casar");
      return new Response(null, { status: 200 });
    }

    const result = await orderRepository().confirmPayment({
      reference,
      status: fromMercadoPagoStatus(payment.status),
      paymentId: String(payment.id ?? ""),
      payerEmail: payment.payer?.email ?? null,
    });

    console.info("[webhook] orden", {
      reference,
      outcome: result.outcome,
      status: result.outcome === "no-encontrada" ? null : result.order.status,
    });

    // TODO(FASE 2): si outcome === "actualizada" y el estado quedó "pagada",
    // descontar stock de forma atómica y marcar needs_review si da negativo.
  } catch (error) {
    console.error("[webhook] no se pudo consultar el pago", error);
    // 500 para que MP reintente: perder una confirmación es peor que un reintento.
    return new Response(null, { status: 500 });
  }

  return new Response(null, { status: 200 });
}
