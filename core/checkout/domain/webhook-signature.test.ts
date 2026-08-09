import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { verifyWebhookSignature } from "./webhook-signature";

const SECRET = "clave-secreta-de-prueba";

/** Firma como la firmaría MercadoPago, para poder probar el camino feliz. */
function sign(manifest: string, secret = SECRET): string {
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

function header(ts: string, v1: string): string {
  return `ts=${ts},v1=${v1}`;
}

describe("verifyWebhookSignature", () => {
  const ts = "1742505638683";
  const requestId = "bb56a2f1-6aae-46ac-982e-9dcd3581d08e";
  const dataId = "123456";
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;

  it("acepta una firma válida", () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: header(ts, sign(manifest)),
        requestId,
        dataId,
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("rechaza si alguien altera el id del pago", () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: header(ts, sign(manifest)),
        requestId,
        dataId: "999999",
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rechaza si la firma se generó con otro secreto", () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: header(ts, sign(manifest, "secreto-del-atacante")),
        requestId,
        dataId,
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rechaza si el timestamp fue manipulado", () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: header("1111111111111", sign(manifest)),
        requestId,
        dataId,
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rechaza cuando falta el header", () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: null,
        requestId,
        dataId,
        secret: SECRET,
      }),
    ).toBe(false);
  });

  it("rechaza un header malformado sin lanzar", () => {
    for (const bad of ["", "cualquier-cosa", "ts=123", "v1=abc", "ts=,v1="]) {
      expect(() =>
        verifyWebhookSignature({
          signatureHeader: bad,
          requestId,
          dataId,
          secret: SECRET,
        }),
      ).not.toThrow();

      expect(
        verifyWebhookSignature({
          signatureHeader: bad,
          requestId,
          dataId,
          secret: SECRET,
        }),
      ).toBe(false);
    }
  });

  it("rechaza si el secreto está vacío, en vez de validar contra nada", () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: header(ts, sign(manifest, "")),
        requestId,
        dataId,
        secret: "",
      }),
    ).toBe(false);
  });

  it("omite del manifest las partes ausentes, como indica la doc de MP", () => {
    const sinRequestId = `id:${dataId};ts:${ts};`;

    expect(
      verifyWebhookSignature({
        signatureHeader: header(ts, sign(sinRequestId)),
        requestId: null,
        dataId,
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("normaliza a minúsculas los data.id alfanuméricos", () => {
    const enMinuscula = `id:abc-def;request-id:${requestId};ts:${ts};`;

    expect(
      verifyWebhookSignature({
        signatureHeader: header(ts, sign(enMinuscula)),
        requestId,
        dataId: "ABC-DEF",
        secret: SECRET,
      }),
    ).toBe(true);
  });

  it("acepta una firma armada sin request-id aunque el header venga", () => {
    const sinRequestId = `id:${dataId};ts:${ts};`;

    expect(
      verifyWebhookSignature({
        signatureHeader: header(ts, sign(sinRequestId)),
        requestId, // MP mandó el header pero no lo firmó
        dataId,
        secret: SECRET,
      }),
    ).toBe(true);
  });

  /**
   * La tolerancia de formato NO puede aflojar la detección de manipulación:
   * si hay data.id, TODA variante lo incluye. Aceptar un manifest sin id
   * permitiría reusar una firma válida apuntando a otro pago.
   */
  it("ninguna variante permite alterar el data.id", () => {
    for (const manifestFalso of [
      `ts:${ts};`,
      `request-id:${requestId};ts:${ts};`,
    ]) {
      expect(
        verifyWebhookSignature({
          signatureHeader: header(ts, sign(manifestFalso)),
          requestId,
          dataId: "999999",
          secret: SECRET,
        }),
      ).toBe(false);
    }
  });

  it("no revienta cuando la firma recibida tiene otro largo", () => {
    expect(
      verifyWebhookSignature({
        signatureHeader: header(ts, "abc"),
        requestId,
        dataId,
        secret: SECRET,
      }),
    ).toBe(false);
  });
});
