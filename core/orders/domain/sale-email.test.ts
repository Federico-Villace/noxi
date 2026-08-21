import { describe, it, expect } from "vitest";
import { buildSaleEmail } from "./sale-email";
import type { OrderRecord } from "./order";

function orden(overrides: Partial<OrderRecord> = {}): OrderRecord {
  return {
    reference: "noxi-abc123",
    status: "pagada",
    totalInCents: 5_760_000,
    paymentId: "171978151367",
    lines: [
      {
        productId: "NX-001",
        title: "Tortuga",
        unitPriceInCents: 4_800_000,
        quantity: 1,
      },
      {
        productId: "NX-004",
        title: "Industrial",
        unitPriceInCents: 3_900_000,
        quantity: 1,
      },
    ],
    customer: {
      name: "Camila Rodríguez",
      email: "camila@ejemplo.com",
      phone: "1123456789",
      docId: "35123456",
      street: "Av. Corrientes 1234",
      streetExtra: "Piso 4 Depto B",
      city: "Buenos Aires",
      province: "Ciudad Autónoma de Buenos Aires",
      zip: "1425",
      notes: "Timbre 4B",
    },
    ...overrides,
  };
}

describe("buildSaleEmail", () => {
  describe("asunto", () => {
    /**
     * Es lo único que se ve en la notificación del teléfono. Tiene que decir
     * cuánto y de quién sin abrir nada.
     */
    it("dice el total y quién compró", () => {
      const { subject } = buildSaleEmail(orden());

      expect(subject).toContain("57.600");
      expect(subject).toContain("Camila Rodríguez");
    });

    it("aguanta una orden sin datos de compradora", () => {
      const { subject } = buildSaleEmail(
        orden({ customer: { ...orden().customer, name: "" } }),
      );

      expect(subject).toContain("57.600");
      expect(subject).not.toContain("undefined");
    });
  });

  describe("cuerpo", () => {
    it("lista cada pieza con cantidad y SKU", () => {
      const { text } = buildSaleEmail(orden());

      expect(text).toContain("Tortuga");
      expect(text).toContain("NX-001");
      expect(text).toContain("Industrial");
      expect(text).toContain("NX-004");
    });

    it("muestra el total", () => {
      expect(buildSaleEmail(orden()).text).toContain("57.600");
    });

    /** Sin esto hay que abrir el panel para despachar. Ese es todo el punto. */
    it("trae la dirección completa para el envío", () => {
      const { text } = buildSaleEmail(orden());

      expect(text).toContain("Av. Corrientes 1234");
      expect(text).toContain("Piso 4 Depto B");
      expect(text).toContain("Buenos Aires");
      expect(text).toContain("1425");
    });

    it("trae el contacto y el documento", () => {
      const { text } = buildSaleEmail(orden());

      expect(text).toContain("camila@ejemplo.com");
      expect(text).toContain("1123456789");
      expect(text).toContain("35123456");
    });

    it("incluye la nota de entrega cuando hay", () => {
      expect(buildSaleEmail(orden()).text).toContain("Timbre 4B");
    });

    it("omite la sección de nota cuando no hay", () => {
      const sinNota = orden({ customer: { ...orden().customer, notes: "" } });

      expect(buildSaleEmail(sinNota).text.toLowerCase()).not.toContain("nota");
    });

    it("omite el piso cuando es una casa", () => {
      const casa = orden({ customer: { ...orden().customer, streetExtra: "" } });
      const { text } = buildSaleEmail(casa);

      expect(text).toContain("Av. Corrientes 1234");
      expect(text).not.toContain("undefined");
    });

    it("incluye la referencia para cruzarla con MercadoPago", () => {
      expect(buildSaleEmail(orden()).text).toContain("noxi-abc123");
    });
  });

  describe("responder", () => {
    /**
     * Contestarle a la compradora tiene que ser apretar Responder, no copiar
     * el mail a mano desde el cuerpo.
     */
    it("propone el mail de la compradora como destinatario de respuesta", () => {
      expect(buildSaleEmail(orden()).replyTo).toBe("camila@ejemplo.com");
    });

    it("no propone respuesta si la orden es vieja y no tiene mail", () => {
      const vieja = orden({ customer: { ...orden().customer, email: "" } });

      expect(buildSaleEmail(vieja).replyTo).toBeUndefined();
    });
  });
});
