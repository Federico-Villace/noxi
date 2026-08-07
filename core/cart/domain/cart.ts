import type { Product, ProductId } from "@/core/catalog/domain/product";

export interface CartLine {
  productId: ProductId;
  slug: string;
  name: string;
  image: string;
  /** Precio congelado al momento de agregar al carrito. */
  priceInCents: number;
  /** Stock del drop congelado al momento de agregar. Techo duro de la cantidad. */
  maxStock: number;
  quantity: number;
}

function clamp(quantity: number, max: number): number {
  return Math.min(Math.max(quantity, 0), max);
}

function toLine(product: Product, quantity: number): CartLine {
  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    image: product.images[0] ?? "",
    priceInCents: product.priceInCents,
    maxStock: product.stock,
    quantity: clamp(quantity, product.stock),
  };
}

export function addLine(
  lines: readonly CartLine[],
  product: Product,
  quantity = 1,
): CartLine[] {
  if (product.stock <= 0) return [...lines];

  const existing = lines.find((line) => line.productId === product.id);
  if (!existing) return [...lines, toLine(product, quantity)];

  return lines.map((line) =>
    line.productId === product.id
      ? { ...line, quantity: clamp(line.quantity + quantity, line.maxStock) }
      : line,
  );
}

export function setQuantity(
  lines: readonly CartLine[],
  productId: ProductId,
  quantity: number,
): CartLine[] {
  if (quantity <= 0) return removeLine(lines, productId);

  return lines.map((line) =>
    line.productId === productId
      ? { ...line, quantity: clamp(quantity, line.maxStock) }
      : line,
  );
}

export function removeLine(
  lines: readonly CartLine[],
  productId: ProductId,
): CartLine[] {
  return lines.filter((line) => line.productId !== productId);
}

export function subtotalInCents(lines: readonly CartLine[]): number {
  return lines.reduce(
    (total, line) => total + line.priceInCents * line.quantity,
    0,
  );
}

export function totalUnits(lines: readonly CartLine[]): number {
  return lines.reduce((total, line) => total + line.quantity, 0);
}
