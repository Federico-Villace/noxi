import { describe, it, expect } from "vitest";
import type { Product } from "@/core/catalog/domain/product";
import { buildOrder } from "./build-order";

const tortuga: Product = {
  id: "NX-001",
  slug: "dije-tortuga",
  name: "Tortuga",
  description: "Plata 950.",
  priceInCents: 4_800_000,
  images: [],
  material: "Plata 950",
  stock: 3,
  drop: "DROP 001",
};

const agotado: Product = { ...tortuga, id: "NX-009", slug: "agotado", stock: 0 };

const catalog = [tortuga, agotado];

describe("buildOrder", () => {
  it("arma la orden con los datos del catálogo", () => {
    const result = buildOrder(
      [{ productId: "NX-001", quantity: 2 }],
      catalog,
      "ref-1",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.order.reference).toBe("ref-1");
    expect(result.order.lines).toEqual([
      {
        productId: "NX-001",
        title: "Tortuga",
        quantity: 2,
        unitPriceInCents: 4_800_000,
      },
    ]);
    expect(result.order.totalInCents).toBe(9_600_000);
  });

  /**
   * LA prueba que justifica todo este módulo: el precio SIEMPRE sale del
   * servidor. Si confiáramos en el cliente, cualquiera abre las devtools,
   * manda priceInCents: 1 y se lleva la pieza por un centavo.
   */
  it("ignora cualquier precio que mande el cliente", () => {
    const result = buildOrder(
      [
        {
          productId: "NX-001",
          quantity: 1,
          priceInCents: 1,
        } as never,
      ],
      catalog,
      "ref-2",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.order.lines[0].unitPriceInCents).toBe(4_800_000);
  });

  it("recorta la cantidad al stock real del drop", () => {
    const result = buildOrder(
      [{ productId: "NX-001", quantity: 99 }],
      catalog,
      "ref-3",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.order.lines[0].quantity).toBe(3);
  });

  it("descarta productos agotados", () => {
    const result = buildOrder(
      [{ productId: "NX-009", quantity: 1 }],
      catalog,
      "ref-4",
    );

    expect(result).toEqual({ ok: false, reason: "sin-items-disponibles" });
  });

  it("descarta ids que no existen en el catálogo", () => {
    const result = buildOrder(
      [{ productId: "NO-EXISTE", quantity: 1 }],
      catalog,
      "ref-5",
    );

    expect(result).toEqual({ ok: false, reason: "sin-items-disponibles" });
  });

  it("rechaza un carrito vacío", () => {
    expect(buildOrder([], catalog, "ref-6")).toEqual({
      ok: false,
      reason: "carrito-vacio",
    });
  });

  it("rechaza cantidades no positivas", () => {
    expect(
      buildOrder([{ productId: "NX-001", quantity: 0 }], catalog, "ref-7"),
    ).toEqual({ ok: false, reason: "sin-items-disponibles" });
  });

  it("agrupa líneas repetidas del mismo producto", () => {
    const result = buildOrder(
      [
        { productId: "NX-001", quantity: 1 },
        { productId: "NX-001", quantity: 1 },
      ],
      catalog,
      "ref-8",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.order.lines).toHaveLength(1);
    expect(result.order.lines[0].quantity).toBe(2);
  });
});
