import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Sesión del panel admin: un token firmado, sin estado en el servidor.
 *
 * Formato: `<vencimiento en ms>.<HMAC-SHA256 del vencimiento>`
 *
 * El vencimiento viaja en claro —no es secreto— pero va firmado: tocarlo
 * invalida la firma. No hay tabla de sesiones ni nada que limpiar; el token
 * se muere solo. Para un panel de una persona, es todo lo que hace falta.
 */

const SEPARADOR = ".";

/**
 * La clave de firma se DERIVA de la contraseña, no es la contraseña.
 *
 * Dos razones: la contraseña nunca sale de este proceso ni siquiera derivada
 * en la cookie, y rotar `ADMIN_PASSWORD` invalida de una todas las sesiones
 * abiertas. Eso último no es un efecto colateral: es la única forma de echar a
 * alguien de un esquema sin estado.
 */
function claveDeFirma(secreto: string): Buffer {
  return createHmac("sha256", secreto)
    .update("noxi/admin/session/v1")
    .digest();
}

function firmar(secreto: string, mensaje: string): string {
  return createHmac("sha256", claveDeFirma(secreto))
    .update(mensaje)
    .digest("hex");
}

export function signSessionToken(secreto: string, expiraEnMs: number): string {
  const exp = String(Math.trunc(expiraEnMs));
  return `${exp}${SEPARADOR}${firmar(secreto, exp)}`;
}

export function verifySessionToken(
  token: string | undefined | null,
  secreto: string,
  ahoraMs: number,
): boolean {
  if (!token || !secreto) return false;

  const partes = token.split(SEPARADOR);
  if (partes.length !== 2) return false;

  const [exp, firma] = partes;

  // `Number("")` es 0 y `Number("12abc")` es NaN: se exige entero puro.
  if (!/^\d+$/.test(exp)) return false;
  if (Number(exp) <= ahoraMs) return false;

  return igualEnTiempoConstante(firma, firmar(secreto, exp));
}

/**
 * Comparación de contraseña en tiempo constante.
 *
 * Se comparan los digests SHA-256, no los strings: siempre miden lo mismo, así
 * que `timingSafeEqual` no explota por largos distintos y el tiempo de
 * respuesta no filtra cuántos caracteres acertó quien está probando.
 */
export function matchesPassword(candidata: string, esperada: string): boolean {
  if (!esperada) return false;
  return igualEnTiempoConstante(digest(candidata), digest(esperada));
}

function digest(valor: string): string {
  return createHmac("sha256", "noxi/admin/password/v1")
    .update(valor)
    .digest("hex");
}

function igualEnTiempoConstante(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");

  if (bufA.length !== bufB.length) return false;

  return timingSafeEqual(bufA, bufB);
}
