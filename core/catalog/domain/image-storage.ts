/**
 * PUERTO de subida de imágenes.
 *
 * Devuelve la URL pública ya lista para guardar en `Product.images`. Quién la
 * hospeda —Supabase Storage hoy, un CDN mañana— es problema del adaptador: ni
 * el formulario ni el dominio se enteran.
 */
export interface ImageStorage {
  /**
   * @param slug Agrupa las fotos por pieza dentro del bucket.
   * @throws Si el archivo no pasa las reglas de `image-upload` o falla la subida.
   */
  upload(archivo: File, slug: string): Promise<string>;

  /**
   * Borra las fotos que le correspondan a este storage y saltea el resto.
   *
   * NO lanza si alguna no se puede borrar. Una foto huérfana en el bucket es
   * basura barata; una excepción acá dejaría el producto a medio borrar, que
   * es un estado mucho peor.
   */
  remove(urls: readonly string[]): Promise<void>;
}
