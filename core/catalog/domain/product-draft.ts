import type { Product } from "./product";

/**
 * La frontera entre lo que escribe un humano y lo que entra al dominio.
 *
 * Un formulario solo sabe mandar strings. Acá se validan y se convierten UNA
 * vez, en el dominio, donde se puede testear sin navegador y sin base. Si esta
 * traducción viviera en el componente o en el adaptador de Supabase, cada
 * pantalla nueva tendría su propia versión de "qué es un precio válido".
 */
export interface RawProductDraft {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Pesos, tal cual los escribe la persona. Se convierte a centavos acá. */
  price: string;
  images: string[];
  material: string;
  stock: string;
  drop: string;
  active: boolean;
}

export type ProductDraftErrors = Partial<Record<keyof RawProductDraft, string>>;

export type ParseProductDraftResult =
  | { ok: true; value: Product & { active: boolean } }
  | { ok: false; errors: ProductDraftErrors };

interface ParseOptions {
  /** Para autonumerar el id cuando no se lo escribe. */
  existingIds?: readonly string[];
}

const MATERIAL_POR_DEFECTO = "Plata 950";
const DROP_POR_DEFECTO = "DROP 001";

/** kebab-case estricto: el slug es la URL pública de la pieza. */
const SLUG_VALIDO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Entero, o entero con uno o dos decimales. Sin separador de miles. */
const PESOS_VALIDOS = /^\d+(?:\.\d{1,2})?$/;

const ID_AUTONUMERADO = /^NX-(\d+)$/;

/**
 * Pesos a centavos SIN pasar por punto flotante.
 *
 * `Number("0.29") * 100` da 28.999999999999996, y `Math.trunc` de eso es 28:
 * un centavo perdido en cada pieza. Se parten las partes y se hace aritmética
 * entera, que es exacta por definición.
 *
 * Devuelve `null` si el texto no es un precio legible.
 */
export function pesosToCents(entrada: string): number | null {
  const normalizado = entrada.trim().replace(/[$\s]/g, "").replace(",", ".");

  if (!PESOS_VALIDOS.test(normalizado)) return null;

  const [enteros, decimales = ""] = normalizado.split(".");

  return Number(enteros) * 100 + Number(decimales.padEnd(2, "0"));
}

/**
 * Centavos al texto que va dentro del input al editar.
 *
 * Tiene que ser la inversa EXACTA de `pesosToCents`: lo que se lee es lo que
 * se vuelve a guardar. Por eso sale sin separador de miles y sin `.00` cuando
 * el precio es redondo — el mismo formato que se le pide escribir.
 */
export function centsToPriceInput(cents: number): string {
  const enteros = Math.trunc(cents / 100);
  const decimales = cents % 100;

  return decimales === 0
    ? String(enteros)
    : `${enteros}.${String(decimales).padStart(2, "0")}`;
}

/**
 * Nombre a slug. Los acentos se descomponen y se les saca la tilde en vez de
 * borrarlos: "Ñandú" tiene que quedar "nandu", no "andu".
 */
export function slugify(nombre: string): string {
  return nombre
    .normalize("NFD") // separa la tilde de la letra
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Siguiente id de la serie NX-###.
 *
 * Va desde el MAYOR existente, no desde la cantidad: si se borró una pieza del
 * medio, contar daría un id ya usado y el insert reventaría contra la PK.
 */
export function nextProductId(existentes: readonly string[]): string {
  const mayor = existentes.reduce((max, id) => {
    const match = ID_AUTONUMERADO.exec(id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `NX-${String(mayor + 1).padStart(3, "0")}`;
}

export function parseProductDraft(
  entrada: RawProductDraft,
  { existingIds = [] }: ParseOptions = {},
): ParseProductDraftResult {
  const errors: ProductDraftErrors = {};

  const name = entrada.name.trim();
  if (!name) errors.name = "El nombre es obligatorio.";

  const slug = entrada.slug.trim() || slugify(name);
  if (!slug) {
    errors.slug = "No se pudo derivar un slug del nombre. Escribilo a mano.";
  } else if (!SLUG_VALIDO.test(slug)) {
    errors.slug = "Solo minúsculas, números y guiones (ej: anillo-sello-negro).";
  }

  const priceInCents = pesosToCents(entrada.price);
  if (priceInCents === null) {
    errors.price = "Escribí el precio en pesos, sin separador de miles (ej: 54000).";
  } else if (priceInCents <= 0) {
    errors.price = "El precio tiene que ser mayor a cero.";
  }

  const stock = parseStock(entrada.stock);
  if (stock === null) {
    errors.stock = "El stock tiene que ser un número entero de 0 en adelante.";
  }

  if (Object.keys(errors).length > 0 || priceInCents === null || stock === null) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      id: entrada.id.trim() || nextProductId(existingIds),
      slug,
      name,
      description: entrada.description.trim(),
      priceInCents,
      // Una ruta vacía renderiza un cuadrado roto en la tienda: se filtran acá.
      images: entrada.images.map((i) => i.trim()).filter(Boolean),
      material: entrada.material.trim() || MATERIAL_POR_DEFECTO,
      stock,
      drop: entrada.drop.trim() || DROP_POR_DEFECTO,
      active: entrada.active,
    },
  };
}

function parseStock(entrada: string): number | null {
  const texto = entrada.trim();
  if (!/^\d+$/.test(texto)) return null;

  return Number(texto);
}
