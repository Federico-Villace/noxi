import type { Product } from "../domain/product";

/**
 * Catálogo del drop vigente.
 *
 * Para cargar una pieza:
 *  1. Dejá la foto en `public/products/<slug>.jpg`
 *     (cuadrada, fondo negro, 1400x1400 mínimo).
 *  2. Agregá el objeto acá con `images: ["/products/<slug>.jpg"]`.
 *
 * `images: []` significa "todavía sin foto": se renderiza un marco vacío
 * intencional con el SKU. NO pongas una ruta a un archivo que no existe:
 * el test `toda imagen declarada existe en public/` te lo va a rebotar,
 * y con razón — en producción sería un cuadrado vacío para la clienta.
 */
export const CATALOG: readonly Product[] = [
  {
    id: "NX-001",
    slug: "dije-tortuga",
    name: "Tortuga",
    description:
      "Dije de tortuga en plata 950 con caparazón texturado a mano. Pieza maciza, terminación pulida espejo. Se entrega con bolsa sellada del drop.",
    priceInCents: 4_800_000,
    images: ["/products/dije-tortuga.jpg"],
    material: "Plata 950",
    stock: 4,
    drop: "DROP 001",
  },
  {
    id: "NX-002",
    slug: "cadena-veneciana-45",
    name: "Veneciana 45",
    description:
      "Cadena veneciana de 45 cm, eslabón cuadrado de 2 mm. Plata 950 maciza con cierre mosquetón reforzado.",
    priceInCents: 6_200_000,
    images: [],
    material: "Plata 950",
    stock: 6,
    drop: "DROP 001",
  },
  {
    id: "NX-003",
    slug: "anillo-sello-negro",
    name: "Sello Negro",
    description:
      "Anillo sello de superficie plana con pátina negra en los bordes. Plata 950. Talles 16 a 22.",
    priceInCents: 5_400_000,
    images: [],
    material: "Plata 950",
    stock: 3,
    drop: "DROP 001",
  },
  {
    id: "NX-004",
    slug: "argollas-industrial",
    name: "Industrial",
    description:
      "Par de argollas de 14 mm, sección hexagonal. Plata 950 con acabado mate arenado.",
    priceInCents: 3_900_000,
    images: [],
    material: "Plata 950",
    stock: 2,
    drop: "DROP 001",
  },
  {
    id: "NX-005",
    slug: "pulsera-eslabon-grueso",
    name: "Eslabón",
    description:
      "Pulsera de eslabón grueso, 19 cm. Plata 950 maciza, 42 g. Cierre de seguridad doble.",
    priceInCents: 9_800_000,
    images: [],
    material: "Plata 950",
    stock: 2,
    drop: "DROP 001",
  },
  {
    id: "NX-006",
    slug: "dije-llave",
    name: "Llave",
    description:
      "Dije llave antigua fundido en plata 950. Terminación envejecida con relieve profundo.",
    priceInCents: 4_100_000,
    images: [],
    material: "Plata 950",
    stock: 5,
    drop: "DROP 001",
  },
  {
    id: "NX-007",
    slug: "cadena-cartier-50",
    name: "Cartier 50",
    description:
      "Cadena cartier de 50 cm, eslabón oval de 4 mm. Plata 950 maciza, pulido espejo.",
    priceInCents: 8_600_000,
    images: [],
    material: "Plata 950",
    stock: 0,
    drop: "DROP 001",
  },
  {
    id: "NX-008",
    slug: "anillo-banda-martillada",
    name: "Martillada",
    description:
      "Banda de 6 mm con textura martillada irregular. Plata 950. Cada pieza es única.",
    priceInCents: 3_400_000,
    images: [],
    material: "Plata 950",
    stock: 0,
    drop: "DROP 001",
  },
];
