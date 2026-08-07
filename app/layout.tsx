import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { CartDrawer } from "@/components/cart/cart-drawer";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NOXICLTS — Joyería de plata 925",
    template: "%s — NOXICLTS",
  },
  description:
    "Joyería de plata 925 en drops limitados. Piezas macizas, diseño moderno. Buenos Aires.",
  openGraph: {
    title: "NOXICLTS — Joyería de plata 925",
    description: "Drops limitados de joyería de plata 925. Buenos Aires.",
    type: "website",
    locale: "es_AR",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${archivo.variable} ${jetbrains.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-void">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <CartDrawer />
      </body>
    </html>
  );
}
