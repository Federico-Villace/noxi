import Link from "next/link";
import { CartTrigger } from "@/components/cart/cart-trigger";
import { Logo } from "@/components/layout/logo";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-void/85 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <Link href="/" aria-label="Noxiclts — inicio" className="group">
          <Logo className="h-7 transition-colors group-hover:bg-blood" />
        </Link>

        <span className="label hidden text-silver md:block">
          Drop 001 · Plata 950
        </span>

        <CartTrigger />
      </div>
    </header>
  );
}
