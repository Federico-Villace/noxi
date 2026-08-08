import { describe, it, expect } from "vitest";
import { centsToPesos, formatPrice } from "./money";

describe("centsToPesos", () => {
  it("convierte centavos a pesos para la API de MercadoPago", () => {
    expect(centsToPesos(4_800_000)).toBe(48_000);
  });

  it("conserva los centavos cuando existen", () => {
    expect(centsToPesos(1_200_050)).toBe(12_000.5);
  });

  it("nunca devuelve más de dos decimales", () => {
    for (const cents of [1, 33, 999, 123_456, 7_777_777]) {
      const pesos = centsToPesos(cents);
      expect(Number(pesos.toFixed(2))).toBe(pesos);
    }
  });

  it("el total en pesos coincide con el total en centavos", () => {
    const lines = [
      { cents: 4_800_000, qty: 3 },
      { cents: 6_200_000, qty: 1 },
      { cents: 1_200_050, qty: 2 },
    ];

    const totalCents = lines.reduce((t, l) => t + l.cents * l.qty, 0);
    const totalPesos = lines.reduce(
      (t, l) => t + centsToPesos(l.cents) * l.qty,
      0,
    );

    expect(totalPesos).toBeCloseTo(centsToPesos(totalCents), 2);
  });
});

describe("formatPrice", () => {
  it("formatea centavos como pesos argentinos con separador de miles", () => {
    expect(formatPrice(4_500_000)).toBe("$ 45.000");
  });

  it("no muestra decimales cuando el monto es entero", () => {
    expect(formatPrice(1_200_000)).toBe("$ 12.000");
  });

  it("muestra decimales solo cuando existen centavos", () => {
    expect(formatPrice(1_200_050)).toBe("$ 12.000,50");
  });

  it("formatea el cero", () => {
    expect(formatPrice(0)).toBe("$ 0");
  });

  it("no usa espacios duros que rompan el layout", () => {
    expect(formatPrice(4_500_000)).not.toMatch(/ /);
  });
});
