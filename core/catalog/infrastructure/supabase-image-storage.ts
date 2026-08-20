import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/core/orders/infrastructure/supabase-client";
import type { ImageStorage } from "../domain/image-storage";
import {
  MAX_IMAGE_BYTES,
  imageObjectPath,
  isSupportedImage,
  isTooLarge,
  objectPathFromPublicUrl,
} from "../domain/image-upload";

/** Bucket PÚBLICO de Supabase Storage. Ver README para crearlo. */
export const PRODUCTS_BUCKET = "products";

/**
 * Un año de cache. La URL lleva un sufijo único por archivo, así que una foto
 * nunca cambia de contenido bajo la misma URL: cachearla para siempre es
 * gratis y correcto.
 */
const CACHE_CONTROL = "31536000";

export const supabaseImageStorage: ImageStorage = {
  async upload(archivo, slug) {
    // El navegador ya validó, pero el navegador miente: esta es la que cuenta.
    if (!isSupportedImage(archivo.type)) {
      throw new Error(
        `Formato no soportado (${archivo.type || "desconocido"}). Usá JPG, PNG, WEBP o AVIF.`,
      );
    }

    if (isTooLarge(archivo.size)) {
      throw new Error(
        `La imagen pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB. El máximo son ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`,
      );
    }

    const path = imageObjectPath(slug, archivo.name, randomUUID().slice(0, 8));

    const { error } = await supabaseAdmin()
      .storage.from(PRODUCTS_BUCKET)
      .upload(path, archivo, {
        contentType: archivo.type,
        cacheControl: CACHE_CONTROL,
        // Nunca pisar: el sufijo único ya garantiza que el path es nuevo.
        // Si esto colisiona, hay un bug — que grite en vez de perder una foto.
        upsert: false,
      });

    if (error) {
      throw new Error(
        `No se pudo subir la imagen: ${error.message}. ` +
          `Revisá que el bucket "${PRODUCTS_BUCKET}" exista y sea público.`,
      );
    }

    const { data } = supabaseAdmin()
      .storage.from(PRODUCTS_BUCKET)
      .getPublicUrl(path);

    return data.publicUrl;
  },

  async remove(urls) {
    // Las rutas del catálogo viejo (`/products/x.jpg`) viven en el repo, no
    // acá: `objectPathFromPublicUrl` las descarta y no se les manda nada.
    const paths = urls
      .map((url) => objectPathFromPublicUrl(url, PRODUCTS_BUCKET))
      .filter((path): path is string => path !== null);

    if (paths.length === 0) return;

    const { error } = await supabaseAdmin()
      .storage.from(PRODUCTS_BUCKET)
      .remove(paths);

    // A propósito NO se lanza. Si el producto ya se borró de la base y esto
    // falla, quedan archivos huérfanos: basura barata. Lanzar acá dejaría el
    // borrado a medias, que es mucho peor. Queda el log para limpiarlo.
    if (error) {
      console.error("[admin] no se pudieron borrar las fotos", {
        paths,
        message: error.message,
      });
    }
  },
};
