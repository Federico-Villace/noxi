import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeleteProductButton } from "./delete-product-button";

function renderBoton() {
  const action = vi.fn();
  render(
    <DeleteProductButton productId="NX-009" productName="Sello Negro" action={action} />,
  );
  return { action };
}

describe("DeleteProductButton", () => {
  it("arranca cerrado: un solo botón y ninguna confirmación a la vista", () => {
    renderBoton();

    expect(screen.getByRole("button", { name: /borrar pieza/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^sí, borrar/i })).toBeNull();
  });

  /**
   * Borrar es irreversible. Un solo clic no puede alcanzar, y el paso
   * intermedio tiene que decir QUÉ se está por borrar — no un "¿estás seguro?"
   * genérico que nadie lee.
   */
  it("pide confirmación nombrando la pieza", async () => {
    const user = userEvent.setup();
    renderBoton();

    await user.click(screen.getByRole("button", { name: /borrar pieza/i }));

    expect(screen.getByRole("button", { name: /^sí, borrar/i })).toBeInTheDocument();
    expect(screen.getByText(/Sello Negro/)).toBeInTheDocument();
  });

  it("se puede volver atrás sin borrar nada", async () => {
    const user = userEvent.setup();
    const { action } = renderBoton();

    await user.click(screen.getByRole("button", { name: /borrar pieza/i }));
    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(screen.queryByRole("button", { name: /^sí, borrar/i })).toBeNull();
    expect(action).not.toHaveBeenCalled();
  });

  it("no dispara la acción con solo abrir la confirmación", async () => {
    const user = userEvent.setup();
    const { action } = renderBoton();

    await user.click(screen.getByRole("button", { name: /borrar pieza/i }));

    expect(action).not.toHaveBeenCalled();
  });

  /** El id viaja en el form: sin él la acción no sabe qué borrar. */
  it("manda el id de la pieza al confirmar", async () => {
    const user = userEvent.setup();
    renderBoton();

    await user.click(screen.getByRole("button", { name: /borrar pieza/i }));

    const oculto = document.querySelector<HTMLInputElement>('input[name="id"]');
    expect(oculto?.value).toBe("NX-009");
  });
});
