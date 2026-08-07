"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * El carrito vive en localStorage, que en el servidor no existe.
 * Sin este guard, el HTML del server dice "0" y el cliente dice "3":
 * hydration mismatch y React descarta el árbol. Esto lo evita.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
