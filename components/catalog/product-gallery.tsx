"use client";

import Image from "next/image";
import { useState } from "react";
import { ProductMedia } from "./product-media";

interface ProductGalleryProps {
  /** Vacío = pieza sin foto todavía. La primera es la portada. */
  images: string[];
  alt: string;
  sku: string;
  soldOut: boolean;
}

/**
 * La columna de fotos de la ficha.
 *
 * El panel admin siempre dejó cargar varias fotos por pieza —la columna es un
 * `text[]`— pero la vitrina mostraba solo la portada. Acá se muestran todas.
 *
 * Es el ÚNICO componente cliente de la ficha: el resto sigue siendo server. Lo
 * único que necesita estado es cuál foto se está mirando.
 */
export function ProductGallery({
  images,
  alt,
  sku,
  soldOut,
}: ProductGalleryProps) {
  const [actual, setActual] = useState(0);

  // Una miniatura sola no es una galería, es ruido. La mayoría del catálogo
  // tiene una foto y no tiene por qué pagar esa barra.
  const hayVarias = images.length > 1;

  return (
    <div className="flex h-full flex-col">
      <div className="grain relative aspect-square bg-void lg:aspect-auto lg:flex-1">
        {/*
          `key` por ruta: ProductMedia recuerda internamente si la imagen
          falló. Sin remontarlo, una foto rota dejaría en blanco a todas las
          que se elijan después.
        */}
        <ProductMedia
          key={images[actual] ?? "sin-foto"}
          src={images[actual]}
          alt={alt}
          sku={sku}
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
        />

        {soldOut && (
          <div className="absolute inset-0 grid place-items-center bg-void/70 backdrop-grayscale">
            <span className="label border border-line-strong px-4 py-2.5 text-silver">
              Agotado
            </span>
          </div>
        )}
      </div>

      {hayVarias && (
        // `gap-px` sobre fondo `line`: la separación ES la retícula de 1px,
        // no aire. Misma regla que la grilla del drop.
        <div className="flex shrink-0 gap-px overflow-x-auto border-t border-line bg-line">
          {images.map((src, indice) => (
            <button
              key={src}
              type="button"
              onClick={() => setActual(indice)}
              aria-pressed={indice === actual}
              aria-label={`Foto ${indice + 1} de ${images.length}`}
              className={`relative size-20 shrink-0 bg-void transition-opacity md:size-24 ${
                indice === actual ? "opacity-100" : "opacity-40 hover:opacity-75"
              }`}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="96px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
