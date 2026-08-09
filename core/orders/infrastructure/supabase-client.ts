import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Cliente con service_role: saltea RLS.
 *
 * SOLO puede importarse desde código de servidor. Si esta clave llegara al
 * bundle del navegador, cualquiera leería, editaría y borraría todas las
 * órdenes. Por eso la variable NO lleva prefijo NEXT_PUBLIC_: las
 * NEXT_PUBLIC_ se inlinean en el build y viajan al cliente.
 */
export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. Cargalas en .env.local y en Vercel (ver README).",
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return cached;
}
