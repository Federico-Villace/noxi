"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Product, ProductId } from "@/core/catalog/domain/product";
import {
  addLine,
  removeLine,
  setQuantity,
  subtotalInCents,
  totalUnits,
  type CartLine,
} from "../domain/cart";

/**
 * Señal de "recién agregué algo", para que el trigger del header lo avise.
 *
 * El `tick` existe porque el aviso es visual y dura poco: sin él, agregar la
 * misma pieza dos veces seguidas no volvería a dispararlo y parecería que el
 * segundo clic no hizo nada.
 */
interface LastAdded {
  name: string;
  tick: number;
}

interface CartState {
  lines: CartLine[];
  isOpen: boolean;
  lastAdded: LastAdded | null;
  add: (product: Product, quantity?: number) => void;
  remove: (productId: ProductId) => void;
  setQuantity: (productId: ProductId, quantity: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
}

/**
 * El store NO tiene lógica. Solo orquesta las funciones puras del dominio.
 * Por eso el carrito se testea sin montar un solo componente de React.
 */
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      isOpen: false,
      lastAdded: null,
      // Agregar YA NO abre el drawer. Abrirlo solo tapaba la pantalla justo
      // cuando la clienta estaba recorriendo la grilla: cada pieza que sumaba
      // le cortaba el paseo. El aviso ahora lo da el contador del header.
      add: (product, quantity = 1) =>
        set((state) => ({
          lines: addLine(state.lines, product, quantity),
          lastAdded: {
            name: product.name,
            tick: (state.lastAdded?.tick ?? 0) + 1,
          },
        })),
      remove: (productId) =>
        set((state) => ({ lines: removeLine(state.lines, productId) })),
      setQuantity: (productId, quantity) =>
        set((state) => ({
          lines: setQuantity(state.lines, productId, quantity),
        })),
      clear: () => set({ lines: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
    }),
    {
      name: "noxi.cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ lines: state.lines }),
    },
  ),
);

export const useCartSubtotal = () =>
  useCartStore((state) => subtotalInCents(state.lines));

export const useCartUnits = () =>
  useCartStore((state) => totalUnits(state.lines));
