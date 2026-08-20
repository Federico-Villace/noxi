import { describe, it, expect } from "vitest";
import {
  MAX_IMAGE_BYTES,
  isSupportedImage,
  isTooLarge,
  imageObjectPath,
  objectPathFromPublicUrl,
} from "./image-upload";

describe("isSupportedImage", () => {
  it.each(["image/jpeg", "image/png", "image/webp", "image/avif"])(
    "acepta %s",
    (tipo) => {
      expect(isSupportedImage(tipo)).toBe(true);
    },
  );

  /**
   * La lista es blanca, no negra. Un SVG es un documento ejecutable: servido
   * desde el mismo origen que la tienda, es un XSS con foto de producto.
   */
  it.each(["image/svg+xml", "text/html", "application/pdf", "", "image/"])(
    "rechaza %o",
    (tipo) => {
      expect(isSupportedImage(tipo)).toBe(false);
    },
  );

  it("ignora mayúsculas y parámetros del content-type", () => {
    expect(isSupportedImage("IMAGE/JPEG")).toBe(true);
    expect(isSupportedImage("image/png; charset=binary")).toBe(true);
  });
});

describe("isTooLarge", () => {
  it("acepta un archivo en el límite exacto", () => {
    expect(isTooLarge(MAX_IMAGE_BYTES)).toBe(false);
  });

  it("rechaza uno que se pasa por un byte", () => {
    expect(isTooLarge(MAX_IMAGE_BYTES + 1)).toBe(true);
  });

  it("rechaza un archivo vacío", () => {
    expect(isTooLarge(0)).toBe(true);
  });
});

describe("imageObjectPath", () => {
  it("agrupa por slug y antepone el sufijo único", () => {
    expect(imageObjectPath("sello-negro", "frente.jpg", "k3j9")).toBe(
      "sello-negro/k3j9-frente.jpg",
    );
  });

  /**
   * El nombre que trae el archivo lo eligió un humano en su escritorio:
   * espacios, paréntesis, acentos, mayúsculas. Nada de eso puede viajar
   * crudo a una URL pública.
   */
  it("normaliza el nombre que viene del escritorio", () => {
    expect(imageObjectPath("sello-negro", "Foto Final (1).JPG", "k3j9")).toBe(
      "sello-negro/k3j9-foto-final-1.jpg",
    );
  });

  it("no deja escapar de la carpeta con un nombre malicioso", () => {
    const path = imageObjectPath("sello-negro", "../../secreto.png", "k3j9");

    expect(path).toBe("sello-negro/k3j9-secreto.png");
    expect(path).not.toContain("..");
  });

  it("cae a jpg cuando el archivo no trae extensión usable", () => {
    expect(imageObjectPath("sello-negro", "captura", "k3j9")).toBe(
      "sello-negro/k3j9-captura.jpg",
    );
  });

  it("usa solo el sufijo si del nombre no queda nada", () => {
    expect(imageObjectPath("sello-negro", "!!!.png", "k3j9")).toBe(
      "sello-negro/k3j9.png",
    );
  });

  it("recorta nombres larguísimos: el path tiene límite en el bucket", () => {
    const path = imageObjectPath("sello-negro", `${"a".repeat(300)}.jpg`, "k3j9");

    expect(path.length).toBeLessThanOrEqual(80);
    expect(path.endsWith(".jpg")).toBe(true);
  });
});

describe("objectPathFromPublicUrl", () => {
  const BASE = "https://abcdef.supabase.co/storage/v1/object/public";

  it("recupera la ruta del objeto de una URL pública del bucket", () => {
    expect(
      objectPathFromPublicUrl(`${BASE}/products/sello-negro/k3j9-frente.jpg`, "products"),
    ).toBe("sello-negro/k3j9-frente.jpg");
  });

  it("ignora la query string de una URL firmada o con cache-buster", () => {
    expect(
      objectPathFromPublicUrl(`${BASE}/products/sello-negro/k3j9.jpg?t=123`, "products"),
    ).toBe("sello-negro/k3j9.jpg");
  });

  it("decodifica los caracteres escapados del path", () => {
    expect(
      objectPathFromPublicUrl(`${BASE}/products/sello%20negro/foto.jpg`, "products"),
    ).toBe("sello negro/foto.jpg");
  });

  /**
   * El catálogo viejo tiene rutas locales servidas desde `public/`. Si el
   * borrado las tomara por objetos del bucket, mandaría un delete contra una
   * clave que no existe — o peor, contra una que sí.
   */
  it("devuelve null para una ruta local del repo", () => {
    expect(objectPathFromPublicUrl("/products/dije-tortuga.jpg", "products")).toBeNull();
  });

  it("devuelve null si la URL apunta a otro bucket", () => {
    expect(
      objectPathFromPublicUrl(`${BASE}/facturas/enero/x.jpg`, "products"),
    ).toBeNull();
  });

  it("devuelve null para un host ajeno", () => {
    expect(
      objectPathFromPublicUrl("https://cdn.otro.com/products/foto.jpg", "products"),
    ).toBeNull();
  });

  /** Nunca lanza: una URL basura en la base no puede voltear el borrado. */
  it.each(["", "   ", "no-es-una-url", "://roto"])(
    "devuelve null sin lanzar para %o",
    (url) => {
      expect(() => objectPathFromPublicUrl(url, "products")).not.toThrow();
      expect(objectPathFromPublicUrl(url, "products")).toBeNull();
    },
  );

  it("devuelve null si no queda ruta después del bucket", () => {
    expect(objectPathFromPublicUrl(`${BASE}/products/`, "products")).toBeNull();
  });
});
