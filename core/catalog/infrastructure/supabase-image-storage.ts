import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/core/orders/infrastructure/supabase-client";
import type { ImageStorage } from "../domain/image-storage";
import {
  MAX_IMAGE_BYTES,
  imageObjectPath,
  isSupportedImage,
  isTooLarge,
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
};
