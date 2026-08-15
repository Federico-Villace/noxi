import { describe, it, expect } from "vitest";
import {
  MAX_IMAGE_BYTES,
  isSupportedImage,
  isTooLarge,
  imageObjectPath,
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
