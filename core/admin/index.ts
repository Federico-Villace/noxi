import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, ADMIN_LOGIN_PATH } from "./domain/session-cookie";
import {
  matchesPassword,
  signSessionToken,
  verifySessionToken,
} from "./domain/session-token";

/**
 * Sesión del panel admin. SOLO servidor: importa `next/headers`, así que si
 * alguien lo arrastra a un componente cliente, el build lo rebota.
 */

export { ADMIN_COOKIE, ADMIN_LOGIN_PATH } from "./domain/session-cookie";

/** 12 horas: una jornada de carga de drop, y a la mañana siguiente se pide de nuevo. */
const DURACION_MS = 12 * 60 * 60 * 1000;

function adminPassword(): string {
  const password = process.env.ADMIN_PASSWORD ?? "";

  if (!password) {
    // No se lanza: eso dejaría el login roto con un 500 y sin explicación.
    // Se niega el acceso y se grita en el log, que es donde se mira.
    console.error(
      "[admin] Falta ADMIN_PASSWORD. El panel queda cerrado hasta que se cargue (ver README).",
    );
  }

  return password;
}

/**
 * Valida la contraseña y, si está bien, deja la cookie de sesión.
 *
 * Devuelve `false` en vez de lanzar: una contraseña equivocada es un caso
 * esperado del flujo, no un error del sistema.
 */
export async function openAdminSession(candidata: string): Promise<boolean> {
  const password = adminPassword();

  if (!matchesPassword(candidata, password)) return false;

  const expiraEn = Date.now() + DURACION_MS;

  (await cookies()).set(ADMIN_COOKIE, signSessionToken(password, expiraEn), {
    httpOnly: true, // sin acceso desde JS: un XSS no se lleva la sesión
    sameSite: "lax", // corta el CSRF sobre los server actions del panel
    secure: process.env.NODE_ENV === "production", // en dev, http://localhost
    path: "/",
    expires: new Date(expiraEn),
  });

  return true;
}

export async function closeAdminSession(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;

  return verifySessionToken(token, adminPassword(), Date.now());
}

/**
 * La guardia real del panel.
 *
 * Se llama en CADA página y en CADA server action, no solo en el layout. Los
 * server actions son endpoints POST de verdad: se los puede invocar con un
 * curl sin pasar jamás por la UI. Verificar en el layout y confiar es dejar
 * la puerta de atrás abierta.
 */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdminAuthenticated())) redirect(ADMIN_LOGIN_PATH);
}
