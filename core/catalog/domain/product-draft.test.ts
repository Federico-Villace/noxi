import { describe, it, expect } from "vitest";
import {
  centsToPriceInput,
  parseProductDraft,
  pesosToCents,
  slugify,
  nextProductId,
  type RawProductDraft,
} from "./product-draft";

function raw(overrides: Partial<RawProductDraft> = {}): RawProductDraft {
  return {
    id: "NX-009",
    slug: "sello-negro",
    name: "Sello Negro",
    description: "Anillo sello de superficie plana.",
    price: "54000",
    images: ["/products/sello-negro.jpg"],
    material: "Plata 925",
    stock: "3",
    drop: "DROP 001",
    active: true,
    ...overrides,
  };
}

describe("pesosToCents", () => {
  it("convierte pesos enteros a centavos", () => {
    expect(pesosToCents("48000")).toBe(4_800_000);
  });

  it("acepta coma como decimal, que es como se escribe acá", () => {
    expect(pesosToCents("48000,50")).toBe(4_800_050);
  });

  it("acepta punto como decimal, que es lo que manda un input number", () => {
    expect(pesosToCents("48000.50")).toBe(4_800_050);
  });

  it("tolera espacios y el signo peso", () => {
    expect(pesosToCents("  $ 48000 ")).toBe(4_800_000);
  });

  /**
   * El caso que rompe todo sistema que multiplica por 100 en float:
   * 0.29 * 100 === 28.999999999999996. Un centavo perdido por producto.
   */
  it("no pierde centavos por el redondeo binario del float", () => {
    expect(pesosToCents("0.29")).toBe(29);
    expect(pesosToCents("1.15")).toBe(115);
    expect(pesosToCents("8.11")).toBe(811);
  });

  /**
   * "48.000" es ambiguo: puede ser cuarenta y ocho mil o cuarenta y ocho
   * pesos. Antes que adivinar y publicar una pieza a $48, se rechaza y se le
   * pide al humano que lo escriba sin separador de miles.
   */
  it("rechaza el separador de miles por ambiguo", () => {
    expect(pesosToCents("48.000")).toBeNull();
    expect(pesosToCents("48,000")).toBeNull();
  });

  it.each(["", "   ", "abc", "-5", "1.005", "1,2,3", "12."])(
    "rechaza %o",
    (entrada) => {
      expect(pesosToCents(entrada)).toBeNull();
    },
  );
});

describe("centsToPriceInput", () => {
  /** Es la vuelta de `pesosToCents`: lo que ve la persona al editar. */
  it("muestra los pesos redondos sin decimales de adorno", () => {
    expect(centsToPriceInput(4_800_000)).toBe("48000");
  });

  it("muestra los centavos cuando los hay", () => {
    expect(centsToPriceInput(4_800_050)).toBe("48000.50");
  });

  it("no usa separador de miles: sería ilegible al volver a guardar", () => {
    expect(centsToPriceInput(4_800_000)).not.toContain(".000");
  });

  it("es la inversa exacta de pesosToCents", () => {
    for (const cents of [1, 29, 100, 4_800_050, 9_800_000]) {
      expect(pesosToCents(centsToPriceInput(cents))).toBe(cents);
    }
  });
});

describe("slugify", () => {
  it.each([
    ["Sello Negro", "sello-negro"],
    ["Cadena Veneciana 45", "cadena-veneciana-45"],
    ["Anillo Ñandú", "anillo-nandu"],
    ["  Doble   espacio  ", "doble-espacio"],
    ["¡Hola! ¿Qué?", "hola-que"],
    ["Plata 925 — edición", "plata-925-edicion"],
  ])("convierte %o en %o", (nombre, esperado) => {
    expect(slugify(nombre)).toBe(esperado);
  });

  it("devuelve vacío si no queda nada usable", () => {
    expect(slugify("!!!")).toBe("");
  });
});

describe("nextProductId", () => {
  it("arranca en NX-001 con el catálogo vacío", () => {
    expect(nextProductId([])).toBe("NX-001");
  });

  it("sigue desde el mayor, no desde la cantidad", () => {
    expect(nextProductId(["NX-001", "NX-008"])).toBe("NX-009");
  });

  it("ignora ids que no siguen la convención", () => {
    expect(nextProductId(["cargado-a-mano", "NX-003"])).toBe("NX-004");
  });

  it("crece más allá de tres dígitos sin romperse", () => {
    expect(nextProductId(["NX-999"])).toBe("NX-1000");
  });
});

describe("parseProductDraft", () => {
  it("acepta un borrador completo y lo normaliza al dominio", () => {
    const resultado = parseProductDraft(raw());

    expect(resultado).toEqual({
      ok: true,
      value: {
        id: "NX-009",
        slug: "sello-negro",
        name: "Sello Negro",
        description: "Anillo sello de superficie plana.",
        priceInCents: 5_400_000,
        images: ["/products/sello-negro.jpg"],
        material: "Plata 925",
        stock: 3,
        drop: "DROP 001",
        active: true,
      },
    });
  });

  it("recorta los espacios de los textos", () => {
    const resultado = parseProductDraft(raw({ name: "  Sello Negro  " }));

    expect(resultado.ok && resultado.value.name).toBe("Sello Negro");
  });

  it("deriva el slug del nombre cuando no se lo escribe", () => {
    const resultado = parseProductDraft(raw({ slug: "", name: "Sello Negro" }));

    expect(resultado.ok && resultado.value.slug).toBe("sello-negro");
  });

  it("deriva el id del catálogo existente cuando no se lo escribe", () => {
    const resultado = parseProductDraft(raw({ id: "" }), {
      existingIds: ["NX-001", "NX-002"],
    });

    expect(resultado.ok && resultado.value.id).toBe("NX-003");
  });

  it("descarta las imágenes vacías en vez de guardar rutas rotas", () => {
    const resultado = parseProductDraft(
      raw({ images: ["/products/a.jpg", "", "   ", "/products/b.jpg"] }),
    );

    expect(resultado.ok && resultado.value.images).toEqual([
      "/products/a.jpg",
      "/products/b.jpg",
    ]);
  });

  it("acepta una pieza sin fotos todavía", () => {
    const resultado = parseProductDraft(raw({ images: [] }));

    expect(resultado.ok && resultado.value.images).toEqual([]);
  });

  it("completa material y drop con los mismos defaults que la tabla", () => {
    const resultado = parseProductDraft(raw({ material: "", drop: "" }));

    expect(resultado.ok && resultado.value.material).toBe("Plata 925");
    expect(resultado.ok && resultado.value.drop).toBe("DROP 001");
  });

  it("acepta descripción vacía: la foto y el precio son lo obligatorio", () => {
    const resultado = parseProductDraft(raw({ description: "" }));

    expect(resultado.ok && resultado.value.description).toBe("");
  });

  it("acepta stock cero: agotado es un estado válido, no un error", () => {
    const resultado = parseProductDraft(raw({ stock: "0" }));

    expect(resultado.ok && resultado.value.stock).toBe(0);
  });

  describe("rechazos", () => {
    it("exige nombre", () => {
      const resultado = parseProductDraft(raw({ name: "   " }));

      expect(resultado.ok).toBe(false);
      expect(!resultado.ok && resultado.errors.name).toBeTruthy();
    });

    /** El slug es la URL pública: si no es kebab-case, la URL sale rota. */
    it.each(["Con Mayúsculas", "con espacios", "con_guion_bajo", "-borde", "acento-ñ"])(
      "rechaza el slug %o",
      (slug) => {
        const resultado = parseProductDraft(raw({ slug }));

        expect(resultado.ok).toBe(false);
        expect(!resultado.ok && resultado.errors.slug).toBeTruthy();
      },
    );

    it("rechaza un nombre del que no se puede derivar slug", () => {
      const resultado = parseProductDraft(raw({ slug: "", name: "¡!¿?" }));

      expect(resultado.ok).toBe(false);
      expect(!resultado.ok && resultado.errors.slug).toBeTruthy();
    });

    it("rechaza un precio ilegible", () => {
      const resultado = parseProductDraft(raw({ price: "carísimo" }));

      expect(resultado.ok).toBe(false);
      expect(!resultado.ok && resultado.errors.price).toBeTruthy();
    });

    it("rechaza precio cero: una pieza gratis es siempre un error de carga", () => {
      const resultado = parseProductDraft(raw({ price: "0" }));

      expect(resultado.ok).toBe(false);
      expect(!resultado.ok && resultado.errors.price).toBeTruthy();
    });

    it.each(["-1", "2.5", "muchas", ""])("rechaza el stock %o", (stock) => {
      const resultado = parseProductDraft(raw({ stock }));

      expect(resultado.ok).toBe(false);
      expect(!resultado.ok && resultado.errors.stock).toBeTruthy();
    });

    /**
     * Devolver un error por vez obliga a mandar el formulario cinco veces
     * para enterarse de los cinco problemas. Se devuelven todos juntos.
     */
    it("acumula todos los errores en una sola pasada", () => {
      const resultado = parseProductDraft(
        raw({ name: "", slug: "MAL", price: "x", stock: "-3" }),
      );

      expect(resultado.ok).toBe(false);
      expect(!resultado.ok && Object.keys(resultado.errors).sort()).toEqual([
        "name",
        "price",
        "slug",
        "stock",
      ]);
    });
  });
});
