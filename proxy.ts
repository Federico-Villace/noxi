import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  ADMIN_LOGIN_PATH,
} from "@/core/admin/domain/session-cookie";

/**
 * En Next 16 el middleware se llama Proxy. Mismo comportamiento, otro nombre y
 * otro archivo: `proxy.ts` en la raíz. Ver `getting-started/16-proxy`.
 *
 * Acá va SOLO un chequeo optimista: ¿hay cookie? Nada de verificar la firma ni
 * tocar la base. El proxy corre en cada request, incluidos los prefetch, y
 * meterle criptografía o I/O es pagarlo en cada navegación de la tienda.
 *
 * La verificación DE VERDAD —firma y vencimiento— vive en `requireAdmin()`, y
 * la llama cada página y cada server action del panel. Esto de acá es solo
 * para que un no autenticado vea el login rápido en vez de renderizar media
 * pantalla y rebotar.
 *
 * Deliberadamente NO redirige de /admin/login hacia /admin cuando hay cookie:
 * con una cookie vencida o falsa se armaría un rebote infinito entre el proxy
 * (que solo ve que existe) y `requireAdmin` (que ve que no sirve). Esa
 * redirección la hace la página de login, que sí verifica.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(ADMIN_LOGIN_PATH)) return NextResponse.next();

  if (!request.cookies.has(ADMIN_COOKIE)) {
    return NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
