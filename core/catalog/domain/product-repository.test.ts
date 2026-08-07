import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { staticProductRepository } from "../infrastructure/static-product-repository";
import { isSoldOut } from "./product";

const repo = staticProductRepository;

describe("ProductRepository (adaptador estático)", () => {
  it("devuelve el catálogo completo", async () => {
    const products = await repo.findAll();
    expect(products.length).toBeGreaterThan(0);
  });

  it("expone slugs únicos, porque son la URL pública", async () => {
    const slugs = (await repo.findAll()).map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("expone ids únicos", async () => {
    const ids = (await repo.findAll()).map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("encuentra un producto por slug", async () => {
    const [first] = await repo.findAll();
    await expect(repo.findBySlug(first.slug)).resolves.toEqual(first);
  });

  it("devuelve null si el slug no existe, no lanza", async () => {
    await expect(repo.findBySlug("no-existe-jamas")).resolves.toBeNull();
  });

  it("ordena los agotados al final, para que el drop se vea vivo", async () => {
    const products = await repo.findAll();
    const firstSoldOut = products.findIndex(isSoldOut);
    if (firstSoldOut === -1) return;
    expect(products.slice(firstSoldOut).every(isSoldOut)).toBe(true);
  });

  it("todos los precios son enteros positivos en centavos", async () => {
    for (const product of await repo.findAll()) {
      expect(Number.isInteger(product.priceInCents)).toBe(true);
      expect(product.priceInCents).toBeGreaterThan(0);
    }
  });

  /**
   * Una ruta de imagen que apunta a un archivo inexistente le muestra un
   * cuadrado vacío a la clienta. No podemos depender de que `onError` del
   * navegador dispare a tiempo: se verifica acá, contra el disco.
   */
  it("toda imagen declarada existe en public/", async () => {
    const faltantes: string[] = [];

    for (const product of await repo.findAll()) {
      for (const image of product.images) {
        const file = resolve(process.cwd(), "public", image.replace(/^\//, ""));
        if (!existsSync(file)) faltantes.push(`${product.id} → ${image}`);
      }
    }

    expect(faltantes).toEqual([]);
  });
});
