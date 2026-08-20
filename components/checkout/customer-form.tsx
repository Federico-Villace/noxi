"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { startCheckout } from "@/app/actions/checkout";
import { subtotalInCents } from "@/core/cart/domain/cart";
import { useCartStore } from "@/core/cart/infrastructure/cart-store";
import {
  PROVINCIAS,
  type CustomerErrors,
  type RawCustomer,
} from "@/core/checkout/domain/customer";
import { formatPrice } from "@/core/shared/domain/money";
import { useHydrated } from "@/lib/use-hydrated";

const VACIO: RawCustomer = {
  name: "",
  email: "",
  phone: "",
  docId: "",
  street: "",
  streetExtra: "",
  city: "",
  province: "",
  zip: "",
  notes: "",
};

/**
 * Los datos se piden ANTES de mandar a MercadoPago, no después.
 *
 * Así la orden queda guardada con nombre, mail y dirección aunque el pago se
 * abandone a mitad de camino: eso es una venta recuperable en vez de un
 * carrito fantasma del que no se sabe ni quién era.
 */
export function CustomerForm() {
  const lines = useCartStore((state) => state.lines);
  const hydrated = useHydrated();

  const [datos, setDatos] = useState<RawCustomer>(VACIO);
  const [errors, setErrors] = useState<CustomerErrors>({});
  const [general, setGeneral] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();

  const set = (campo: keyof RawCustomer) => (valor: string) =>
    setDatos((previo) => ({ ...previo, [campo]: valor }));

  function onSubmit(evento: React.FormEvent) {
    evento.preventDefault();
    setErrors({});
    setGeneral(null);

    startTransition(async () => {
      // Igual que siempre: solo qué y cuánto. El precio lo pone el servidor.
      const resultado = await startCheckout(
        lines.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
        })),
        datos,
      );

      if (resultado.ok) {
        window.location.href = resultado.redirectUrl;
        return;
      }

      setErrors(resultado.errors ?? {});
      setGeneral(resultado.message);
    });
  }

  // Hasta que hidrate no sabemos qué hay en el carrito: localStorage no existe
  // en el servidor. Mostrar "vacío" acá sería mentirle a quien tiene 3 piezas.
  if (!hydrated) {
    return <p className="label text-silver">Cargando tu carrito…</p>;
  }

  if (lines.length === 0) {
    return (
      <div>
        <p className="text-sm leading-relaxed text-silver">
          Tu carrito está vacío.
        </p>
        <Link
          href="/"
          className="label mt-8 inline-block border border-chrome bg-chrome px-8 py-4 text-void transition-colors hover:border-blood hover:bg-blood"
        >
          Volver al drop
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-16">
      <form onSubmit={onSubmit} noValidate>
        <fieldset className="border-t border-line pt-6">
          <legend className="label text-blood">Tus datos</legend>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <Campo
              label="Nombre y apellido"
              error={errors.name}
              className="sm:col-span-2"
            >
              <input
                value={datos.name}
                onChange={(e) => set("name")(e.target.value)}
                autoComplete="name"
                className={inputClass}
              />
            </Campo>

            <Campo label="Email" error={errors.email} hint="Ahí te llega el comprobante">
              <input
                type="email"
                value={datos.email}
                onChange={(e) => set("email")(e.target.value)}
                autoComplete="email"
                className={inputClass}
              />
            </Campo>

            <Campo label="Teléfono" error={errors.phone} hint="Con característica, sin 0 ni 15">
              <input
                type="tel"
                value={datos.phone}
                onChange={(e) => set("phone")(e.target.value)}
                autoComplete="tel"
                className={inputClass}
              />
            </Campo>

            <Campo label="DNI" error={errors.docId} hint="Lo pide el correo para despachar">
              <input
                inputMode="numeric"
                value={datos.docId}
                onChange={(e) => set("docId")(e.target.value)}
                className={inputClass}
              />
            </Campo>
          </div>
        </fieldset>

        <fieldset className="mt-10 border-t border-line pt-6">
          <legend className="label text-blood">Envío</legend>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <Campo label="Calle y número" error={errors.street} className="sm:col-span-2">
              <input
                value={datos.street}
                onChange={(e) => set("street")(e.target.value)}
                autoComplete="address-line1"
                className={inputClass}
              />
            </Campo>

            <Campo
              label="Piso / depto"
              error={errors.streetExtra}
              hint="Opcional"
              className="sm:col-span-2"
            >
              <input
                value={datos.streetExtra}
                onChange={(e) => set("streetExtra")(e.target.value)}
                autoComplete="address-line2"
                className={inputClass}
              />
            </Campo>

            <Campo label="Localidad" error={errors.city}>
              <input
                value={datos.city}
                onChange={(e) => set("city")(e.target.value)}
                autoComplete="address-level2"
                className={inputClass}
              />
            </Campo>

            <Campo label="Código postal" error={errors.zip} hint="1425 o C1425DKE">
              <input
                value={datos.zip}
                onChange={(e) => set("zip")(e.target.value)}
                autoComplete="postal-code"
                className={inputClass}
              />
            </Campo>

            <Campo label="Provincia" error={errors.province} className="sm:col-span-2">
              <select
                value={datos.province}
                onChange={(e) => set("province")(e.target.value)}
                className={inputClass}
              >
                <option value="">Elegí una</option>
                {PROVINCIAS.map((provincia) => (
                  <option key={provincia} value={provincia}>
                    {provincia}
                  </option>
                ))}
              </select>
            </Campo>

            <Campo
              label="Nota para la entrega"
              error={errors.notes}
              hint="Opcional. Timbre, horarios, referencias."
              className="sm:col-span-2"
            >
              <textarea
                value={datos.notes}
                onChange={(e) => set("notes")(e.target.value)}
                rows={3}
                className={`${inputClass} resize-y`}
              />
            </Campo>
          </div>
        </fieldset>

        {general && (
          <p role="alert" className="label mt-8 text-blood">
            {general}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando}
          className="label mt-10 w-full border border-chrome bg-chrome py-4 text-void transition-colors hover:border-blood hover:bg-blood disabled:cursor-not-allowed disabled:border-line disabled:bg-carbon disabled:text-silver/40"
        >
          {enviando ? "Redirigiendo…" : "Ir a pagar"}
        </button>

        <p className="label mt-4 text-silver/50">
          El pago se hace en MercadoPago. Tus datos de tarjeta no pasan por acá.
        </p>
      </form>

      <aside className="border-t border-line pt-6 lg:sticky lg:top-20 lg:self-start">
        <p className="label text-silver">Tu pedido</p>

        <ul className="mt-5 flex flex-col gap-4">
          {lines.map((line) => (
            <li key={line.productId} className="flex justify-between gap-4">
              <span className="text-sm text-chrome">
                {line.name}
                <span className="label ml-2 text-silver/60">×{line.quantity}</span>
              </span>
              <span className="label shrink-0 tabular-nums text-silver">
                {formatPrice(line.priceInCents * line.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-between border-t border-line pt-4">
          <span className="label text-chrome">Total</span>
          <span className="font-mono tabular-nums text-chrome">
            {formatPrice(subtotalInCents(lines))}
          </span>
        </div>
      </aside>
    </div>
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
