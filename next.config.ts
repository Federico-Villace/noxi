import type { NextConfig } from "next";

/**
 * Las fotos que sube el panel viven en Supabase Storage, no en `public/`.
 *
 * `next/image` NO carga desde un host que no esté declarado acá, y hace bien:
 * sin esa lista, cualquiera que logre inyectar una URL en el catálogo usaría
 * el optimizador de la tienda como proxy de imágenes ajenas.
 *
 * El host sale de SUPABASE_URL, que ya existe. Si no está en el momento del
 * build se cae al comodín de Supabase: sigue siendo una lista blanca, apenas
 * más ancha, y evita que un build sin esa variable rompa las fotos.
 */
function supabaseHostname(): string {
  const url = process.env.SUPABASE_URL;

  if (!url) return "*.supabase.co";

  try {
    return new URL(url).hostname;
  } catch {
    return "*.supabase.co";
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname(),
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
