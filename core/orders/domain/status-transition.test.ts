import { describe, it, expect } from "vitest";
import { shouldApplyTransition } from "./status-transition";

describe("shouldApplyTransition", () => {
  it("aplica el avance normal de una compra", () => {
    expect(shouldApplyTransition("iniciada", "pendiente")).toBe(true);
    expect(shouldApplyTransition("iniciada", "pagada")).toBe(true);
    expect(shouldApplyTransition("pendiente", "pagada")).toBe(true);
  });

  it("es idempotente: el mismo estado no se reaplica", () => {
    for (const s of ["iniciada", "pendiente", "pagada", "rechazada"] as const) {
      expect(shouldApplyTransition(s, s)).toBe(false);
    }
  });

  /**
   * MercadoPago NO garantiza el orden de las notificaciones y reintenta las
   * viejas. Si llega un "pending" atrasado después del "approved", despagar la
   * orden sería desastroso: la clienta pagó y el sistema diría que no.
   */
  it("nunca despaga una orden ya pagada", () => {
    expect(shouldApplyTransition("pagada", "pendiente")).toBe(false);
    expect(shouldApplyTransition("pagada", "iniciada")).toBe(false);
  });

  /**
   * Con Checkout Pro, si un pago se rechaza la compradora puede reintentar
   * sobre la MISMA preferencia. Ese reintento aprobado es legítimo y no puede
   * quedar tapado por el rechazo anterior.
   */
  it("permite que un reintento aprobado supere un rechazo", () => {
    expect(shouldApplyTransition("rechazada", "pagada")).toBe(true);
    expect(shouldApplyTransition("cancelada", "pagada")).toBe(true);
  });

  it("un rechazo posterior no puede tapar un pago aprobado", () => {
    expect(shouldApplyTransition("pagada", "rechazada")).toBe(false);
    expect(shouldApplyTransition("pagada", "cancelada")).toBe(false);
  });

  it("una devolución sí supera al pago: es un hecho posterior real", () => {
    expect(shouldApplyTransition("pagada", "devuelta")).toBe(true);
  });

  it("devuelta es terminal contable: nada la revierte", () => {
    for (const s of ["pagada", "pendiente", "rechazada", "iniciada"] as const) {
      expect(shouldApplyTransition("devuelta", s)).toBe(false);
    }
  });
});
