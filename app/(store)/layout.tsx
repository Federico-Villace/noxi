import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CartDrawer } from "@/components/cart/cart-drawer";

/**
 * El cascarón de la TIENDA. Todo lo que ve una clienta cuelga de acá.
 *
 * `(store)` entre paréntesis es un route group: organiza el árbol sin tocar la
 * URL. `/` sigue siendo `/`, `/producto/x` sigue siendo `/producto/x`.
 */
export default function StoreLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <CartDrawer />
    </>
  );
}
