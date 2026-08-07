"use client";

import Image from "next/image";
import { useState } from "react";

interface ProductMediaProps {
  /** Ausente cuando la pieza todavía no tiene foto cargada. */
  src?: string;
  alt: string;
  sku: string;
  sizes: string;
  priority?: boolean;
}

/**
 * Si la foto todavía no existe en /public/products, no mostramos un ícono roto:
 * mostramos un marco vacío intencional con el SKU. Se lee como diseño, no como bug.
 */
export function ProductMedia({
  src,
  alt,
  sku,
  sizes,
  priority = false,
}: ProductMediaProps) {
  const [failed, setFailed] = useState(false);

  // next/image revienta con src vacío: tratamos "sin foto" igual que "falló".
  if (!src || failed) {
    return (
      <div className="absolute inset-0 grid place-items-center bg-carbon">
        <div className="flex flex-col items-center gap-3">
          <span className="h-px w-8 bg-blood" aria-hidden />
          <span className="label text-silver/50">{sku}</span>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
    />
  );
}
