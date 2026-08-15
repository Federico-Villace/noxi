import { slugify } from "./product-draft";

/**
 * Reglas de las fotos de producto. Viven en el dominio, no en el componente
 * de upload: el navegador puede mentir sobre lo que manda, así que la misma
 * validación tiene que poder correrse en el servidor. Y si vive en un solo
 * lado, corre igual en los dos.
 */

/**
 * Lista BLANCA a propósito.
 *
 * Un `image/svg+xml` es un documento XML que puede traer `<script>`. Servido
 * desde el mismo origen que la tienda, eso es un XSS con cara de foto de
 * producto. Se aceptan formatos que el navegador solo sabe decodificar.
 */
const FORMATOS_ACEPTADOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

/** 5 MB. Una foto de producto bien exportada pesa menos de 1. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/** El nombre visible del objeto. El resto del path lo aportan slug y sufijo. */
const MAX_NOMBRE = 40;

const EXTENSION_POR_DEFECTO = "jpg";

const EXTENSIONES: Record<string, string> = {
  jpg: "jpg",
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  avif: "avif",
};

export function isSupportedImage(contentType: string): boolean {
  // "image/png; charset=binary" es un content-type válido: el parámetro sobra.
  const tipo = contentType.split(";")[0].trim().toLowerCase();

  return FORMATOS_ACEPTADOS.has(tipo);
}

export function isTooLarge(bytes: number): boolean {
  return bytes <= 0 || bytes > MAX_IMAGE_BYTES;
}

/**
 * Ruta del objeto dentro del bucket: `<slug>/<sufijo>-<nombre>.<ext>`.
 *
 * El sufijo único va ADELANTE y el nombre del humano pasa por `slugify`. Eso
 * mata de una tres cosas: que dos fotos con el mismo nombre se pisen, que un
 * `../../` se escape de la carpeta, y que un espacio o un acento rompan la URL
 * pública.
 */
export function imageObjectPath(
  slug: string,
  fileName: string,
  sufijoUnico: string,
): string {
  const punto = fileName.lastIndexOf(".");
  const crudo = punto > 0 ? fileName.slice(0, punto) : fileName;
  const extension = punto > 0 ? fileName.slice(punto + 1).toLowerCase() : "";

  const nombre = slugify(crudo).slice(0, MAX_NOMBRE).replace(/-+$/, "");
  const ext = EXTENSIONES[extension] ?? EXTENSION_POR_DEFECTO;

  // `slugify("!!!")` es "": ahí el sufijo único es todo el nombre.
  const base = nombre ? `${sufijoUnico}-${nombre}` : sufijoUnico;

  return `${slug}/${base}.${ext}`;
}
