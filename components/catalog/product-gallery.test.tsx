import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductGallery } from "./product-gallery";

const FOTOS = ["/products/frente.jpg", "/products/perfil.jpg", "/products/mano.jpg"];

function renderGallery(props: Partial<Parameters<typeof ProductGallery>[0]> = {}) {
  return render(
    <ProductGallery
      images={FOTOS}
      alt="Sello Negro"
      sku="NX-003"
      soldOut={false}
      {...props}
    />,
  );
}

/** next/image reescribe el src al optimizador: se busca la ruta original adentro. */
function muestra(imagen: HTMLElement, ruta: string): boolean {
  return imagen.getAttribute("src")?.includes(encodeURIComponent(ruta)) ?? false;
}

describe("ProductGallery", () => {
  it("arranca mostrando la portada, que es la primera del array", () => {
    renderGallery();

    expect(muestra(screen.getByAltText("Sello Negro"), FOTOS[0])).toBe(true);
  });

  it("ofrece una miniatura por foto", () => {
    renderGallery();

    expect(screen.getAllByRole("button", { name: /^Foto \d+ de 3$/ })).toHaveLength(3);
  });

  it("marca cuál está viéndose, para quien navega con lector de pantalla", () => {
    renderGallery();

    const [primera, segunda] = screen.getAllByRole("button", { name: /^Foto/ });
    expect(primera).toHaveAttribute("aria-pressed", "true");
    expect(segunda).toHaveAttribute("aria-pressed", "false");
  });

  it("cambia la foto principal al tocar una miniatura", async () => {
    const user = userEvent.setup();
    renderGallery();

    await user.click(screen.getByRole("button", { name: "Foto 3 de 3" }));

    expect(muestra(screen.getByAltText("Sello Negro"), FOTOS[2])).toBe(true);
    expect(screen.getByRole("button", { name: "Foto 3 de 3" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  /**
   * Una fila de miniaturas con una sola miniatura no es una galería: es ruido.
   * La mayoría del catálogo tiene una foto sola y no tiene que pagar ese peso
   * visual.
   */
  it("no dibuja la tira de miniaturas si hay una sola foto", () => {
    renderGallery({ images: ["/products/frente.jpg"] });

    expect(screen.queryByRole("button", { name: /^Foto/ })).toBeNull();
  });

  it("no revienta con una pieza todavía sin fotos: muestra el marco con el SKU", () => {
    renderGallery({ images: [] });

    expect(screen.getByText("NX-003")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Foto/ })).toBeNull();
  });

  it("tapa la foto con el cartel de agotado cuando la pieza no tiene stock", () => {
    renderGallery({ soldOut: true });

    expect(screen.getByText("Agotado")).toBeInTheDocument();
  });

  it("no muestra el cartel de agotado si hay stock", () => {
    renderGallery();

    expect(screen.queryByText("Agotado")).toBeNull();
  });
});
