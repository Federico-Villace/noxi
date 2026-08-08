import type { Product } from "@/core/catalog/domain/product";

/** Lo ÚNICO que el cliente tiene permitido enviar. */
export interface CheckoutRequestLine {
  productId: string;
  quantity: number;
}

export interface OrderLine {
  productId: string;
  title: string;
  quantity: number;
  unitPriceInCents: number;
}

export interface Order {
  reference: string;
  lines: OrderLine[];
  totalInCents: number;
}

export type BuildOrderResult =
  | { ok: true; order: Order }
  | { ok: false; reason: "carrito-vacio" | "sin-items-disponibles" };

/**
 * Traduce un pedido del cliente a una orden confiable.
 *
 * Regla innegociable: el precio y el stock salen SIEMPRE del catálogo del
 * servidor. El cliente solo dice QUÉ quiere y CUÁNTO; nunca cuánto cuesta.
 * Si confiáramos en el precio del navegador, cualquiera lo edita en devtools
 * y se lleva una pieza de plata por un centavo.
 */
export function buildOrder(
  requested: readonly CheckoutRequestLine[],
  catalog: readonly Product[],
  reference: string,
): BuildOrderResult {
  if (requested.length === 0) return { ok: false, reason: "carrito-vacio" };

  const quantityByProduct = new Map<string, number>();
  for (const line of requested) {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) continue;

    const current = quantityByProduct.get(line.productId) ?? 0;
    quantityByProduct.set(line.productId, current + Math.floor(line.quantity));
  }

  const lines: OrderLine[] = [];
  for (const [productId, quantity] of quantityByProduct) {
    const product = catalog.find((candidate) => candidate.id === productId);
    if (!product || product.stock <= 0) continue;

    lines.push({
      productId: product.id,
      title: product.name,
      quantity: Math.min(quantity, product.stock),
      unitPriceInCents: product.priceInCents,
    });
  }

  if (lines.length === 0) return { ok: false, reason: "sin-items-disponibles" };

  return {
    ok: true,
    order: {
      reference,
      lines,
      totalInCents: lines.reduce(
        (total, line) => total + line.unitPriceInCents * line.quantity,
        0,
      ),
    },
  };
}
