"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState, useTransition, type ChangeEvent } from "react";
import { useFormStatus } from "react-dom";
import {
  saveProduct,
  uploadProductImages,
  type ProductFormState,
} from "@/app/admin/actions";
import type { AdminProduct } from "@/core/catalog/domain/product-admin-repository";
import {
  centsToPriceInput,
  slugify,
} from "@/core/catalog/domain/product-draft";

const INICIAL: ProductFormState = { errors: {} };

interface ProductFormProps {
  /** Ausente = alta. Presente = edición. */
  product?: AdminProduct;
}

/**
 * El formulario cubre TODAS las columnas de `products`. Si un campo existe en
 * la base y no está acá, el día que haga falta cambiarlo hay que abrir el SQL
 * editor — que es exactamente lo que este panel vino a evitar.
 *
 * Los campos son CONTROLADOS a propósito. React resetea los formularios no
 * controlados cuando termina una action, así que un error de validación
 * borraría todo lo escrito. Con estado propio, el error se muestra y el
 * trabajo sigue ahí.
 */
export function ProductForm({ product }: ProductFormProps) {
  const [state, formAction] = useActionState(saveProduct, INICIAL);

  const [values, setValues] = useState({
    id: product?.id ?? "",
    slug: product?.slug ?? "",
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product ? centsToPriceInput(product.priceInCents) : "",
    material: product?.material ?? "Plata 925",
    stock: product ? String(product.stock) : "0",
    drop: product?.drop ?? "DROP 001",
  });

  const [active, setActive] = useState(product?.active ?? true);
  const [images, setImages] = useState<string[]>(product?.images ?? []);

  // En una pieza que ya existe el slug es su URL pública: no se toca solo.
  const [slugManual, setSlugManual] = useState(Boolean(product));

  const [subiendo, startUpload] = useTransition();
  const [erroresFoto, setErroresFoto] = useState<string[]>([]);

  const set = (campo: keyof typeof values) => (valor: string) =>
    setValues((previo) => ({ ...previo, [campo]: valor }));

  function onNombre(valor: string) {
    setValues((previo) => ({
      ...previo,
      name: valor,
      // Mientras nadie lo haya editado a mano, el slug sigue al nombre.
      slug: slugManual ? previo.slug : slugify(valor),
    }));
  }

  function onArchivos(evento: ChangeEvent<HTMLInputElement>) {
    const archivos = Array.from(evento.target.files ?? []);
    if (archivos.length === 0) return;

    const payload = new FormData();
    // `append`, no `set`: cada archivo es una entrada más con la misma clave.
    for (const archivo of archivos) payload.append("files", archivo);
    payload.set("slug", values.slug || slugify(values.name) || "sin-slug");

    // Se limpia el input para poder volver a elegir los MISMOS archivos si falló.
    evento.target.value = "";
    setErroresFoto([]);

    startUpload(async () => {
      const { urls, errors } = await uploadProductImages(payload);

      // Se agregan las que SÍ subieron aunque alguna haya fallado. Descartar el
      // lote entero por una foto pesada es trabajo tirado a la basura.
      if (urls.length > 0) setImages((previas) => [...previas, ...urls]);
      setErroresFoto(errors);
    });
  }

  const quitarFoto = (url: string) =>
    setImages((previas) => previas.filter((i) => i !== url));

  const hacerPrincipal = (url: string) =>
    setImages((previas) => [url, ...previas.filter((i) => i !== url)]);

  return (
    <form action={formAction} className="max-w-3xl">
      <input type="hidden" name="mode" value={product ? "edit" : "create"} />

      {/* Las fotos ya subidas viajan como hidden: el <input file> no las lleva. */}
      {images.map((url) => (
        <input key={url} type="hidden" name="images" value={url} />
      ))}

      <div className="grid gap-6 sm:grid-cols-2">
        <Campo
          label="Nombre"
          error={state.errors.name}
          className="sm:col-span-2"
        >
          <input
            name="name"
            value={values.name}
            onChange={(e) => onNombre(e.target.value)}
            autoFocus={!product}
            className={inputClass}
          />
        </Campo>

        <Campo
          label="Slug (URL pública)"
          error={state.errors.slug}
          hint={values.slug ? `/producto/${values.slug}` : "Se arma solo desde el nombre"}
        >
          <input
            name="slug"
            value={values.slug}
            onChange={(e) => {
              setSlugManual(true);
              set("slug")(e.target.value);
            }}
            className={inputClass}
          />
        </Campo>

        <Campo
          label="ID"
          error={state.errors.id}
          hint={product ? "No se puede cambiar" : "Vacío = se numera solo (NX-00X)"}
        >
          <input
            name="id"
            value={values.id}
            onChange={(e) => set("id")(e.target.value)}
            readOnly={Boolean(product)}
            className={`${inputClass} ${product ? "text-silver" : ""}`}
          />
        </Campo>

        <Campo
          label="Descripción"
          error={state.errors.description}
          className="sm:col-span-2"
        >
          <textarea
            name="description"
            value={values.description}
            onChange={(e) => set("description")(e.target.value)}
            rows={4}
            className={`${inputClass} resize-y`}
          />
        </Campo>

        <Campo
          label="Precio en pesos"
          error={state.errors.price}
          hint="Sin puntos de miles. Ej: 54000 o 54000.50"
        >
          <input
            name="price"
            inputMode="decimal"
            value={values.price}
            onChange={(e) => set("price")(e.target.value)}
            className={inputClass}
          />
        </Campo>

        <Campo label="Stock" error={state.errors.stock} hint="0 = agotado">
          <input
            name="stock"
            inputMode="numeric"
            value={values.stock}
            onChange={(e) => set("stock")(e.target.value)}
            className={inputClass}
          />
        </Campo>

        <Campo label="Material" error={state.errors.material}>
          <input
            name="material"
            value={values.material}
            onChange={(e) => set("material")(e.target.value)}
            className={inputClass}
          />
        </Campo>

        <Campo label="Drop" error={state.errors.drop}>
          <input
            name="drop"
            value={values.drop}
            onChange={(e) => set("drop")(e.target.value)}
            className={inputClass}
          />
        </Campo>
      </div>

      <fieldset className="mt-8 border-t border-line pt-6">
        <legend className="label text-silver">Fotos</legend>

        <p className="label mt-3 text-silver/60">
          La primera es la portada · elegí varias de una · JPG, PNG, WEBP o
          AVIF · hasta 5 MB cada una
        </p>

        {images.length > 0 ? (
          <ul className="mt-4 flex flex-wrap gap-3">
            {images.map((url, indice) => (
              <li key={url} className="w-28">
                <div className="relative aspect-square border border-line bg-carbon">
                  <Image
                    src={url}
                    alt=""
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                  {indice === 0 ? (
                    <span className="label absolute left-0 top-0 bg-blood px-1.5 py-1 text-void">
                      Portada
                    </span>
                  ) : null}
                </div>

                <div className="mt-1 flex justify-between">
                  {indice === 0 ? (
                    <span />
                  ) : (
                    <button
                      type="button"
                      onClick={() => hacerPrincipal(url)}
                      className="label text-silver transition-colors hover:text-chrome"
                    >
                      Portada
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => quitarFoto(url)}
                    className="label text-silver transition-colors hover:text-blood"
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="label mt-4 text-silver/50">
            Sin fotos: la tienda muestra un marco vacío con el SKU.
          </p>
        )}

        <label className="label mt-4 inline-block cursor-pointer border border-line-strong px-4 py-3 text-chrome transition-colors hover:border-blood">
          {subiendo ? "Subiendo…" : "+ Agregar fotos"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            multiple
            onChange={onArchivos}
            disabled={subiendo}
            className="sr-only"
          />
        </label>

        {erroresFoto.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-1.5" role="alert">
            {erroresFoto.map((mensaje) => (
              <li key={mensaje} className="label text-blood">
                {mensaje}
              </li>
            ))}
          </ul>
        ) : null}
      </fieldset>

      <label className="mt-8 flex items-center gap-3 border-t border-line pt-6">
        <input
          type="checkbox"
          name="active"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="size-4 accent-blood"
        />
        <span className="label text-chrome">Visible en la tienda</span>
      </label>

      {state.message ? (
        <p className="label mt-6 text-blood" role="alert">
          {state.message}
        </p>
      ) : null}

      <div className="mt-8 flex items-center gap-4 border-t border-line pt-6">
        <Guardar />
        <Link
          href="/admin"
          className="label text-silver transition-colors hover:text-chrome"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

const inputClass =
  "w-full border border-line bg-carbon px-3 py-2.5 font-mono text-sm text-chrome outline-none focus:border-line-strong";

function Campo({
  label,
  error,
  hint,
  className = "",
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-2 ${className}`}>
      <span className="label text-silver">{label}</span>
      {children}
      {error ? (
        <span className="label text-blood" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="label text-silver/50">{hint}</span>
      ) : null}
    </label>
  );
}

function Guardar() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="label border border-line-strong bg-chrome px-8 py-3 text-void transition-colors hover:bg-blood hover:text-chrome disabled:opacity-40"
    >
      {pending ? "Guardando…" : "Guardar"}
    </button>
  );
}
