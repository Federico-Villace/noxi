import { createHmac, timingSafeEqual } from "node:crypto";

interface VerifyInput {
  /** Header `x-signature`, con formato `ts=...,v1=...`. */
  signatureHeader: string | null;
  /** Header `x-request-id`. */
  requestId: string | null;
  /** `data.id` de la notificación (query o body). */
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
 * Variantes de manifest que MercadoPago usa en la práctica.
 *
 * REGLA DE SEGURIDAD: si la notificación trae `data.id`, TODAS las variantes lo
 * incluyen. Nunca se acepta un manifest sin el id cuando el id existe — si no,
 * alguien podría reutilizar una firma válida apuntando a otro pago.
 * Lo que sí varía es la inclusión de `request-id` y el casing del id, que no
 * afectan a qué pago se refiere la notificación.
 */
function manifestVariants(
  dataId: string | null,
  requestId: string | null,
  ts: string,
): Array<{ name: string; manifest: string }> {
  const idParts = dataId
    ? [
        { name: "id-lower", value: `id:${dataId.toLowerCase()};` },
        { name: "id-raw", value: `id:${dataId};` },
      ]
    : [{ name: "sin-id", value: "" }];

  const requestParts = requestId
    ? [
        { name: "con-request-id", value: `request-id:${requestId};` },
        { name: "sin-request-id", value: "" },
      ]
    : [{ name: "sin-request-id", value: "" }];

  const seen = new Set<string>();
  const variants: Array<{ name: string; manifest: string }> = [];

  for (const id of idParts) {
    for (const req of requestParts) {
      const manifest = `${id.value}${req.value}ts:${ts};`;
      if (seen.has(manifest)) continue;
      seen.add(manifest);
      variants.push({ name: `${id.name}/${req.name}`, manifest });
    }
  }

  return variants;
}

/**
 * Devuelve el nombre de la variante que validó, o null si ninguna.
 *
 * Probar varias formas NO debilita la seguridad: cada una se verifica con
 * HMAC-SHA256 contra el mismo secreto. Sin el secreto no se puede forjar
 * ninguna. Lo que evita es fallar por una diferencia de formato.
 */
export function matchSignatureVariant({
  signatureHeader,
  requestId,
  dataId,
  secret,
}: VerifyInput): string | null {
  if (!secret || !signatureHeader) return null;

  const signature = parseSignature(signatureHeader);
  if (!signature) return null;

  for (const variant of manifestVariants(dataId, requestId, signature.ts)) {
    const expected = createHmac("sha256", secret)
      .update(variant.manifest)
      .digest("hex");

    if (equalsInConstantTime(expected, signature.v1)) return variant.name;
  }

  return null;
}

/**
 * Valida que una notificación venga realmente de MercadoPago.
 *
 * Sin esto, cualquiera que conozca la URL del webhook puede POSTear
 * "pago aprobado" y llevarse la mercadería sin pagar.
 */
export function verifyWebhookSignature(input: VerifyInput): boolean {
  return matchSignatureVariant(input) !== null;
}
