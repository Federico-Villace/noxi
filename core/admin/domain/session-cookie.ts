/**
 * Vive solo, sin dependencias, porque lo comparten dos mundos que no se pueden
 * importar entre sí: `core/admin/index.ts` (que usa `next/headers`) y
 * `proxy.ts` (que corre antes de que exista un request de React).
 */

export const ADMIN_COOKIE = "noxi_admin";

export const ADMIN_LOGIN_PATH = "/admin/login";

export const ADMIN_HOME_PATH = "/admin";
