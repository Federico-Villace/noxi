import { describe, it, expect } from "vitest";
import type { Product } from "@/core/catalog/domain/product";
import {
  addLine,
  removeLine,
  setQuantity,
  subtotalInCents,
  totalUnits,
  type CartLine,
} from "./cart";

const tortuga: Product = {
  id: "nx-001",
  slug: "dije-tortuga",
  name: "Dije Tortuga",
  description: "Plata 950.",
  priceInCents: 4_500_000,
  images: ["/products/tortuga.jpg"],
  material: "Plata 950",
  stock: 3,
  drop: "DROP 001",
};

const cadena: Product = {
  ...tortuga,
  id: "nx-002",
  slug: "cadena-veneciana",
  name: "Cadena Veneciana",
  priceInCents: 2_000_000,
  stock: 1,
};

describe("addLine", () => {
  it("agrega un producto a un carrito vacío con cantidad 1", () => {
    const lines = addLine([], tortuga);
    expect(lines).toHaveLength(1);
    expect(lines[0].productId).toBe("nx-001");
    expect(lines[0].quantity).toBe(1);
  });

  it("incrementa la cantidad si el producto ya está en el carrito", () => {
    const lines = addLine(addLine([], tortuga), tortuga);
    expect(lines).toHaveLength(1);
    expect(lines[0].quantity).toBe(2);
  });

  it("nunca supera el stock disponible del drop", () => {
    let lines: CartLine[] = [];
    for (let i = 0; i < 10; i++) lines = addLine(lines, cadena);
    expect(lines[0].quantity).toBe(1);
  });

  it("ignora productos agotados", () => {
    const agotado: Product = { ...tortuga, stock: 0 };
    expect(addLine([], agotado)).toHaveLength(0);
  });

  it("no muta el array original", () => {
    const original: CartLine[] = [];
    addLine(original, tortuga);
    expect(original).toHaveLength(0);
  });

  it("congela el precio y el stock máximo al momento de agregar", () => {
    const [line] = addLine([], tortuga);
    expect(line.priceInCents).toBe(4_500_000);
    expect(line.maxStock).toBe(3);
  });
});

describe("setQuantity", () => {
  it("actualiza la cantidad de una línea existente", () => {
    const lines = setQuantity(addLine([], tortuga), "nx-001", 3);
    expect(lines[0].quantity).toBe(3);
  });

  it("elimina la línea cuando la cantidad baja a cero", () => {
    const lines = setQuantity(addLine([], tortuga), "nx-001", 0);
    expect(lines).toHaveLength(0);
  });

  it("elimina la línea con cantidades negativas", () => {
    const lines = setQuantity(addLine([], tortuga), "nx-001", -5);
    expect(lines).toHaveLength(0);
  });

  it("recorta la cantidad al stock máximo", () => {
    const lines = setQuantity(addLine([], tortuga), "nx-001", 99);
    expect(lines[0].quantity).toBe(3);
  });
});

describe("removeLine", () => {
  it("saca la línea indicada y conserva el resto", () => {
    const lines = removeLine(addLine(addLine([], tortuga), cadena), "nx-001");
    expect(lines).toHaveLength(1);
    expect(lines[0].productId).toBe("nx-002");
  });
});

describe("subtotalInCents", () => {
  it("suma precio por cantidad de todas las líneas", () => {
    const lines = setQuantity(addLine(addLine([], tortuga), cadena), "nx-001", 2);
    expect(subtotalInCents(lines)).toBe(4_500_000 * 2 + 2_000_000);
  });

  it("devuelve cero para un carrito vacío", () => {
    expect(subtotalInCents([])).toBe(0);
  });
});

describe("totalUnits", () => {
  it("cuenta unidades, no líneas", () => {
    const lines = setQuantity(addLine(addLine([], tortuga), cadena), "nx-001", 3);
    expect(totalUnits(lines)).toBe(4);
  });
});
