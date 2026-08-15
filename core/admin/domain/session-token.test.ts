import { describe, it, expect } from "vitest";
import {
  signSessionToken,
  verifySessionToken,
  matchesPassword,
} from "./session-token";

const SECRET = "una-clave-larga-y-secreta";
const NOW = 1_700_000_000_000;
const HORA = 60 * 60 * 1000;

describe("session-token", () => {
  describe("firma y verificación", () => {
    it("acepta un token propio antes de su vencimiento", () => {
      const token = signSessionToken(SECRET, NOW + HORA);
      expect(verifySessionToken(token, SECRET, NOW)).toBe(true);
    });

    /**
     * El corazón del asunto: sin la clave no se puede fabricar un token.
     * Si esto fallara, cualquiera se firma su propia sesión de admin.
     */
    it("rechaza un token firmado con otra clave", () => {
      const token = signSessionToken("otra-clave", NOW + HORA);
      expect(verifySessionToken(token, SECRET, NOW)).toBe(false);
    });

    it("rechaza un token vencido", () => {
      const token = signSessionToken(SECRET, NOW - 1);
      expect(verifySessionToken(token, SECRET, NOW)).toBe(false);
    });

    /**
     * Estirar el vencimiento a mano es el ataque obvio: el `exp` viaja en
     * claro. Va firmado justamente para que tocarlo invalide el token.
     */
    it("rechaza un token al que le estiraron el vencimiento", () => {
      const token = signSessionToken(SECRET, NOW - HORA);
      const [, firma] = token.split(".");
      const falsificado = `${NOW + HORA}.${firma}`;

      expect(verifySessionToken(falsificado, SECRET, NOW)).toBe(false);
    });

    it("rechaza un token con la firma alterada", () => {
      const [exp, firma] = signSessionToken(SECRET, NOW + HORA).split(".");
      const alterada = firma.replace(/^./, firma[0] === "a" ? "b" : "a");

      expect(verifySessionToken(`${exp}.${alterada}`, SECRET, NOW)).toBe(false);
    });

    /** Nunca lanza: una cookie basura tiene que ser "no autenticado", no un 500. */
    it.each([
      ["undefined", undefined],
      ["vacío", ""],
      ["sin separador", "cualquiercosa"],
      ["con exp no numérico", "manana.deadbeef"],
      ["con partes de más", "1.2.3"],
    ])("rechaza sin lanzar un token %s", (_caso, token) => {
      expect(() => verifySessionToken(token, SECRET, NOW)).not.toThrow();
      expect(verifySessionToken(token, SECRET, NOW)).toBe(false);
    });

    it("rechaza cualquier token si no hay clave configurada", () => {
      const token = signSessionToken(SECRET, NOW + HORA);
      expect(verifySessionToken(token, "", NOW)).toBe(false);
    });
  });

  describe("matchesPassword", () => {
    it("acepta la contraseña correcta", () => {
      expect(matchesPassword("abrite-sesamo", "abrite-sesamo")).toBe(true);
    });

    it("rechaza la incorrecta", () => {
      expect(matchesPassword("abrite-sesano", "abrite-sesamo")).toBe(false);
    });

    /**
     * Se comparan digests de largo fijo, no los strings: así el tiempo de
     * respuesta no filtra ni el largo de la contraseña ni cuántos caracteres
     * acertó quien la está probando.
     */
    it("rechaza una de largo distinto sin lanzar", () => {
      expect(() => matchesPassword("corta", "muchísimo-más-larga")).not.toThrow();
      expect(matchesPassword("corta", "muchísimo-más-larga")).toBe(false);
    });

    it("rechaza siempre si no hay contraseña configurada", () => {
      expect(matchesPassword("", "")).toBe(false);
      expect(matchesPassword("lo-que-sea", "")).toBe(false);
    });
  });
});
