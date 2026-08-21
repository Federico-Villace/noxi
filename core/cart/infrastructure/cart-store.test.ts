import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore } from "./cart-store";
import type { Product } from "@/core/catalog/domain/product";

const tortuga: Product = {
  id: "NX-001",
  slug: "dije-tortuga",
  name: "Tortuga",
  description: "",
  priceInCents: 4_800_000,
  images: [],
  material: "Plata 950",
  stock: 4,
  drop: "DROP 001",
};

const llave: Product = { ...tortuga, id: "NX-006", slug: "dije-llave", name: "Llave" };

beforeEach(() => {
  useCartStore.setState({ lines: [], isOpen: false, lastAdded: null });
});

describe("cart store", () => {
  describe("agregar", () => {
    /**
     * Antes el drawer se abría solo y te tapaba la pantalla. Si estabas
     * recorriendo la grilla, cada pieza que sumabas te cortaba el paseo.
     */
    it("NO abre el carrito al agregar", () => {
      useCartStore.getState().add(tortuga);

      expect(useCartStore.getState().isOpen).toBe(false);
      expect(useCartStore.getState().lines).toHaveLength(1);
    });

    it("deja constancia de qué se agregó, para poder avisarlo", () => {
      useCartStore.getState().add(tortuga);

      expect(useCartStore.getState().lastAdded?.name).toBe("Tortuga");
    });

    /**
     * El aviso es visual y dura poco. Si el tick no cambiara, agregar la misma
     * pieza dos veces seguidas no volvería a dispararlo y parecería que el
     * segundo clic no hizo nada.
     */
    it("avanza el tick aunque sea la misma pieza dos veces", () => {
      useCartStore.getState().add(tortuga);
      const primero = useCartStore.getState().lastAdded!.tick;

      useCartStore.getState().add(tortuga);

      expect(useCartStore.getState().lastAdded!.tick).toBeGreaterThan(primero);
    });

    it("refleja la última pieza agregada", () => {
      useCartStore.getState().add(tortuga);
      useCartStore.getState().add(llave);

      expect(useCartStore.getState().lastAdded?.name).toBe("Llave");
    });
  });

  describe("abrir y cerrar", () => {
    it("se abre solo cuando alguien lo pide", () => {
      useCartStore.getState().open();
      expect(useCartStore.getState().isOpen).toBe(true);

      useCartStore.getState().close();
      expect(useCartStore.getState().isOpen).toBe(false);
    });
  });
});
