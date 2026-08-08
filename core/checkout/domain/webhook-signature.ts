import { createHmac, timingSafeEqual } from "node:crypto";

interface VerifyInput {
  /** Header `x-signature`, con formato `ts=...,v1=...`. */
  signatureHeader: string | null;
  /** Header `x-request-id`. */
  requestId: string | null;
  /** Query param `data.id` de la notificación. */
  dataId: string | null;
  secret: string;
}

function parseSignature(header: string): { ts: string; v1: string } | null {
  let ts = "";
  let v1 = "";

  for (const part of header.split(",")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;

    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();

    if (key === "ts") ts = value;
    else if (key === "v1") v1 = value;
  }

  return ts && v1 ? { ts, v1 } : null;
}

/** Comparación en tiempo constante: comparar con === filtra el secreto por timing. */
function equalsInConstantTime(expected: string, received: string): boolean {
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(received, "hex");

  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Valida que una notificación venga realmente de MercadoPago.
 *
 * Sin esto, cualquiera que conozca la URL del webhook puede POSTear
 * "pago aprobado" y llevarse la mercadería sin pagar. El manifest y el
 * algoritmo están definidos por MP:
 *   id:<data.id>;request-id:<x-request-id>;ts:<ts>;
 * Las partes ausentes se omiten del manifest.
 */
export function verifyWebhookSignature({
  signatureHeader,
  requestId,
  dataId,
  secret,
}: VerifyInput): boolean {
  if (!secret || !signatureHeader) return false;

  const signature = parseSignature(signatureHeader);
  if (!signature) return false;

  const manifest = [
    // MP normaliza a minúscula los data.id alfanuméricos.
    dataId ? `id:${dataId.toLowerCase()};` : "",
    requestId ? `request-id:${requestId};` : "",
    `ts:${signature.ts};`,
  ].join("");

  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  return equalsInConstantTime(expected, signature.v1);
}
