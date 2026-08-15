import Link from "next/link";
import { requireAdmin } from "@/core/admin";
import { logout } from "@/app/admin/actions";

export const metadata = {
  title: "Panel",
  robots: { index: false, follow: false },
};

/**
 * El cascarón del panel. Todo lo que cuelga de `(panel)` está autenticado.
 *
 * OJO: este `requireAdmin()` es comodidad, no seguridad. Un layout no corre
 * antes de un server action invocado por POST directo. La guardia que cuenta
 * está adentro de cada action y de cada página — acá se repite para no
 * renderizar media pantalla y después rebotar.
 */
export default async function PanelLayout({
  children,
}: LayoutProps<"/admin">) {
  await requireAdmin();

  return (
    <>
      <header className="flex items-center justify-between gap-4 border-b border-line px-4 py-4 md:px-6">
        <div className="flex items-baseline gap-4">
          <Link href="/admin" className="label text-chrome">
            NOXICLTS<span className="text-blood">/</span>PANEL
          </Link>
        </div>

        <div className="flex items-center gap-5">
          <Link
            href="/"
            className="label text-silver transition-colors hover:text-chrome"
          >
            Ver tienda
          </Link>

          <form action={logout}>
            <button
              type="submit"
              className="label text-silver transition-colors hover:text-blood"
            >
              Salir
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 md:px-6">{children}</main>
    </>
  );
}
