"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

interface DeleteProductButtonProps {
  productId: string;
  productName: string;
  /**
   * La server action llega por prop, no importada acá adentro.
   *
   * Así el componente es presentacional puro: sabe de confirmar, no de borrar.
   * Se puede testear con una función falsa sin arrastrar Supabase ni cookies
   * al entorno de test, y quien lo usa decide qué hace el submit.
   */
  action: (formData: FormData) => void | Promise<void>;
}

/**
 * Borrar es irreversible, así que va en dos tiempos.
 *
 * Nada de `confirm()` del navegador: se puede bloquear, no se puede estilar y
 * dice "¿estás seguro?" sin decir de qué. Este paso intermedio nombra la pieza
 * — que es la única forma de que alguien lea antes de apretar.
 */
export function DeleteProductButton({
  productId,
  productName,
  action,
}: DeleteProductButtonProps) {
  const [confirmando, setConfirmando] = useState(false);

  if (!confirmando) {
    return (
      <button
        type="button"
        onClick={() => setConfirmando(true)}
        className="label text-silver transition-colors hover:text-blood"
      >
        Borrar pieza
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-4">
      <input type="hidden" name="id" value={productId} />

      <p className="label max-w-xs text-blood">
        Se borra <strong className="font-semibold">{productName}</strong> y sus
        fotos. No se puede deshacer.
      </p>

      <Confirmar />

      <button
        type="button"
        onClick={() => setConfirmando(false)}
        className="label text-silver transition-colors hover:text-chrome"
      >
        Cancelar
      </button>
    </form>
  );
}

function Confirmar() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="label border border-blood bg-blood px-5 py-2.5 text-void transition-opacity hover:opacity-80 disabled:opacity-40"
    >
      {pending ? "Borrando…" : "Sí, borrar"}
    </button>
  );
}
