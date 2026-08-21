import type { Metadata, Viewport } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
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
    default: "NOXICLTS — Joyería de plata 950",
    template: "%s — NOXICLTS",
  },
  description:
    "Joyería de plata 950 en drops limitados. Piezas macizas, diseño moderno. Buenos Aires.",
  openGraph: {
    title: "NOXICLTS — Joyería de plata 950",
    description: "Drops limitados de joyería de plata 950. Buenos Aires.",
    type: "website",
    locale: "es_AR",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

/**
 * Solo el documento: fuentes, idioma, fondo.
 *
 * El header, el footer y el carrito bajaron al layout de `(store)`. El panel
 * admin vive en el mismo dominio pero NO es la tienda: no tiene que arrastrar
 * un carrito ni el logo de la marca sobre cada pantalla de carga. Los route
 * groups no cambian ni una URL — `(store)` no aparece en la ruta.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-AR"
      className={`${archivo.variable} ${jetbrains.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-void">{children}</body>
    </html>
  );
}
