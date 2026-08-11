export type ProductId = string;

export interface Product {
  id: ProductId;
  slug: string;
  name: string;
  description: string;
  /** Centavos de peso argentino. Entero. Nunca float. */
  priceInCents: number;
  images: string[];
  material: string;
  /** Unidades disponibles. Los drops son limitados: 0 = agotado. */
  stock: number;
  drop: string;
}

export function isSoldOut(product: Product): boolean {
  return product.stock <= 0;
}

export function isLastUnits(product: Product): boolean {
  return product.stock > 0 && product.stock <= 2;
}

/**
 * Los agotados van al final: un drop tiene que verse vivo.
 * Vive en el dominio para que TODO adaptador ordene igual.
 */
export function sortForDrop(products: readonly Product[]): Product[] {
  return [...products].sort(
    (a, b) => Number(isSoldOut(a)) - Number(isSoldOut(b)),
  );
}
