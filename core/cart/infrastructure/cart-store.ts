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

interface CartState {
  lines: CartLine[];
  isOpen: boolean;
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
      add: (product, quantity = 1) =>
        set((state) => ({
          lines: addLine(state.lines, product, quantity),
          isOpen: true,
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
