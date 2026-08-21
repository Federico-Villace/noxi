import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartTrigger } from "./cart-trigger";
import { useCartStore } from "@/core/cart/infrastructure/cart-store";
import type { Product } from "@/core/catalog/domain/product";

const tortuga: Product = {
  id: "NX-001",
  slug: "dije-tortuga",
  name: "Tortuga",
  description: "",
  priceInCents: 4_800_000,
  images: [],
  material: "Plata 925",
  stock: 4,
  drop: "DROP 001",
};

beforeEach(() => {
  useCartStore.setState({ lines: [], isOpen: false, lastAdded: null });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CartTrigger", () => {
  it("muestra cuántas unidades hay", () => {
    render(<CartTrigger />);
    expect(screen.getByRole("button")).toHaveTextContent("[0]");
  });

  it("abre el carrito al tocarlo", async () => {
    const user = userEvent.setup();
    render(<CartTrigger />);

    await user.click(screen.getByRole("button"));

    expect(useCartStore.getState().isOpen).toBe(true);
  });

  it("suma la unidad al agregar, sin abrir el carrito", () => {
    render(<CartTrigger />);

    act(() => useCartStore.getState().add(tortuga));

    expect(screen.getByRole("button")).toHaveTextContent("[1]");
    expect(useCartStore.getState().isOpen).toBe(false);
  });

  /** Sin esto, quien usa lector de pantalla no se entera de nada. */
  it("anuncia la pieza agregada en una región viva", () => {
    render(<CartTrigger />);

    act(() => useCartStore.getState().add(tortuga));

    expect(screen.getByText("Tortuga agregada al carrito")).toBeInTheDocument();
  });

  it("no anuncia nada antes de agregar", () => {
    render(<CartTrigger />);

    expect(screen.queryByText(/agregada al carrito/)).toBeNull();
  });
});
