import { describe, it, expect } from "vitest";
import { fromMercadoPagoStatus, isFinal, type OrderStatus } from "./order-status";

describe("fromMercadoPagoStatus", () => {
  it("mapea los estados de MercadoPago al vocabulario del dominio", () => {
    const casos: Array<[string, OrderStatus]> = [
      ["approved", "pagada"],
      ["pending", "pendiente"],
      ["in_process", "pendiente"],
      ["in_mediation", "pendiente"],
      ["authorized", "pendiente"],
      ["rejected", "rechazada"],
      ["cancelled", "cancelada"],
      ["refunded", "devuelta"],
      ["charged_back", "devuelta"],
    ];

    for (const [mp, esperado] of casos) {
      expect(fromMercadoPagoStatus(mp)).toBe(esperado);
    }
  });

  /**
   * Si MP inventa un estado nuevo, NO lo tratamos como pagada. Un default
   * optimista acá significa entregar mercadería por un pago que no entró.
   */
  it("ante un estado desconocido cae en 'pendiente', nunca en 'pagada'", () => {
    for (const raro of ["algo_nuevo", "", "APPROVED_TYPO", "unknown"]) {
      expect(fromMercadoPagoStatus(raro)).toBe("pendiente");
    }
  });

  it("es insensible a mayúsculas y espacios", () => {
    expect(fromMercadoPagoStatus(" Approved ")).toBe("pagada");
    expect(fromMercadoPagoStatus("REJECTED")).toBe("rechazada");
  });

  it("trata null e undefined como pendiente", () => {
    expect(fromMercadoPagoStatus(null)).toBe("pendiente");
    expect(fromMercadoPagoStatus(undefined)).toBe("pendiente");
  });
});

describe("isFinal", () => {
  it("reconoce los estados que ya no cambian", () => {
    expect(isFinal("pagada")).toBe(true);
    expect(isFinal("rechazada")).toBe(true);
    expect(isFinal("cancelada")).toBe(true);
    expect(isFinal("devuelta")).toBe(true);
  });

  it("iniciada y pendiente todavía pueden cambiar", () => {
    expect(isFinal("iniciada")).toBe(false);
    expect(isFinal("pendiente")).toBe(false);
  });
});
