import { describe, it, expect } from "vitest";
import { formatPrice } from "./money";

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
