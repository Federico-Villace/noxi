import { describe, it, expect } from "vitest";
import { PROVINCIAS, parseCustomer, type RawCustomer } from "./customer";

function raw(overrides: Partial<RawCustomer> = {}): RawCustomer {
  return {
    name: "Camila Rodríguez",
    email: "camila@ejemplo.com",
    phone: "11 2345 6789",
    docId: "35.123.456",
    street: "Av. Corrientes 1234",
    streetExtra: "Piso 4 Depto B",
    city: "Buenos Aires",
    province: "Ciudad Autónoma de Buenos Aires",
    zip: "1425",
    notes: "Timbre 4B",
    ...overrides,
  };
}

describe("PROVINCIAS", () => {
  it("tiene las 24 jurisdicciones del país", () => {
    expect(PROVINCIAS).toHaveLength(24);
  });

  it("no repite ninguna", () => {
    expect(new Set(PROVINCIAS).size).toBe(PROVINCIAS.length);
  });
});

describe("parseCustomer", () => {
  it("acepta un formulario completo y lo normaliza", () => {
    const resultado = parseCustomer(raw());

    expect(resultado).toEqual({
      ok: true,
      value: {
        name: "Camila Rodríguez",
        email: "camila@ejemplo.com",
        phone: "1123456789",
        docId: "35123456",
        street: "Av. Corrientes 1234",
        streetExtra: "Piso 4 Depto B",
        city: "Buenos Aires",
        province: "Ciudad Autónoma de Buenos Aires",
        zip: "1425",
        notes: "Timbre 4B",
      },
    });
  });

  describe("nombre", () => {
    /** La etiqueta del envío necesita apellido. Un "Cami" solo no despacha. */
    it("exige nombre y apellido", () => {
      const resultado = parseCustomer(raw({ name: "Camila" }));

      expect(resultado.ok).toBe(false);
      expect(!resultado.ok && resultado.errors.name).toBeTruthy();
    });

    it("colapsa los espacios de más", () => {
      const resultado = parseCustomer(raw({ name: "  Camila   Rodríguez  " }));

      expect(resultado.ok && resultado.value.name).toBe("Camila Rodríguez");
    });

    it("rechaza el vacío", () => {
      expect(parseCustomer(raw({ name: "   " })).ok).toBe(false);
    });
  });

  describe("email", () => {
    it("normaliza a minúsculas y recorta", () => {
      const resultado = parseCustomer(raw({ email: "  CAMILA@Ejemplo.COM " }));

      expect(resultado.ok && resultado.value.email).toBe("camila@ejemplo.com");
    });

    it.each(["", "camila", "camila@", "@ejemplo.com", "camila@ejemplo", "a b@c.com"])(
      "rechaza %o",
      (email) => {
        const resultado = parseCustomer(raw({ email }));

        expect(resultado.ok).toBe(false);
        expect(!resultado.ok && resultado.errors.email).toBeTruthy();
      },
    );
  });

  describe("teléfono", () => {
    it.each([
      ["11 2345 6789", "1123456789"],
      ["(011) 2345-6789", "01123456789"],
      ["+54 9 11 2345 6789", "+5491123456789"],
    ])("normaliza %o a %o", (entrada, esperado) => {
      const resultado = parseCustomer(raw({ phone: entrada }));

      expect(resultado.ok && resultado.value.phone).toBe(esperado);
    });

    it.each(["", "123", "no-tengo", "1".repeat(20)])(
      "rechaza %o",
      (phone) => {
        expect(parseCustomer(raw({ phone })).ok).toBe(false);
      },
    );
  });

  describe("documento", () => {
    it.each([
      ["35.123.456", "35123456"],
      ["35123456", "35123456"],
      ["9.123.456", "9123456"],
    ])("normaliza %o a %o", (entrada, esperado) => {
      const resultado = parseCustomer(raw({ docId: entrada }));

      expect(resultado.ok && resultado.value.docId).toBe(esperado);
    });

    it.each(["", "123", "351234567890", "abc"])("rechaza %o", (docId) => {
      expect(parseCustomer(raw({ docId })).ok).toBe(false);
    });
  });

  describe("provincia", () => {
    it("acepta una de la lista", () => {
      const resultado = parseCustomer(raw({ province: "Córdoba" }));

      expect(resultado.ok && resultado.value.province).toBe("Córdoba");
    });

    /** El campo es un select, pero un POST directo puede mandar cualquier cosa. */
    it("rechaza una que no existe", () => {
      const resultado = parseCustomer(raw({ province: "Wakanda" }));

      expect(resultado.ok).toBe(false);
      expect(!resultado.ok && resultado.errors.province).toBeTruthy();
    });

    it("tolera diferencias de mayúsculas y devuelve la forma canónica", () => {
      const resultado = parseCustomer(raw({ province: "sANTA fE" }));

      expect(resultado.ok && resultado.value.province).toBe("Santa Fe");
    });
  });

  describe("código postal", () => {
    it("acepta el de cuatro dígitos de toda la vida", () => {
      expect(parseCustomer(raw({ zip: "1425" })).ok).toBe(true);
    });

    it("acepta el CPA nuevo y lo pasa a mayúsculas", () => {
      const resultado = parseCustomer(raw({ zip: "c1425dke" }));

      expect(resultado.ok && resultado.value.zip).toBe("C1425DKE");
    });

    it.each(["", "142", "12345", "abcd", "C1425DK"])("rechaza %o", (zip) => {
      expect(parseCustomer(raw({ zip })).ok).toBe(false);
    });
  });

  describe("campos opcionales", () => {
    it("acepta sin piso ni depto: hay casas", () => {
      const resultado = parseCustomer(raw({ streetExtra: "" }));

      expect(resultado.ok && resultado.value.streetExtra).toBe("");
    });

    it("acepta sin nota", () => {
      const resultado = parseCustomer(raw({ notes: "" }));

      expect(resultado.ok && resultado.value.notes).toBe("");
    });

    it("rechaza una nota interminable: es un campo, no un chat", () => {
      expect(parseCustomer(raw({ notes: "a".repeat(501) })).ok).toBe(false);
    });
  });

  describe("obligatorios del envío", () => {
    it.each(["street", "city"] as const)("exige %s", (campo) => {
      const resultado = parseCustomer(raw({ [campo]: "  " }));

      expect(resultado.ok).toBe(false);
      expect(!resultado.ok && resultado.errors[campo]).toBeTruthy();
    });
  });

  /** Un error por vez obliga a mandar el formulario ocho veces. */
  it("acumula todos los errores en una sola pasada", () => {
    const resultado = parseCustomer(
      raw({ name: "", email: "x", phone: "1", docId: "a", zip: "z" }),
    );

    expect(resultado.ok).toBe(false);
    expect(!resultado.ok && Object.keys(resultado.errors).sort()).toEqual([
      "docId",
      "email",
      "name",
      "phone",
      "zip",
    ]);
  });
});
