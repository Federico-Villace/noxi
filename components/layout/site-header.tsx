import Link from "next/link";
import { CartTrigger } from "@/components/cart/cart-trigger";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-void/85 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4 md:px-6">
        <Link
          href="/"
          className="font-mono text-sm font-medium uppercase tracking-[0.3em] text-chrome transition-colors hover:text-blood"
        >
          Noxiclts
        </Link>

        <span className="label hidden text-silver md:block">
          Drop 001 · Plata 925
        </span>

        <CartTrigger />
      </div>
    </header>
  );
}
