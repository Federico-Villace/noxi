# NOXICLTS

Ecommerce minimalista de joyería de plata 925. Drops limitados.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Zustand · Vitest

```bash
pnpm dev     # http://localhost:3000
pnpm test    # dominio + integridad del catálogo
pnpm lint
```

## Arquitectura

El dominio no sabe que existe React, y la UI no sabe de dónde salen los datos.

```
core/
  catalog/
    domain/        product.ts · product-repository.ts  ← PUERTO
    infrastructure/ static-product-repository.ts       ← ADAPTADOR
                    catalog.data.ts                    ← el drop
    index.ts       ← ÚNICO punto de acoplamiento
  cart/
    domain/        cart.ts  ← funciones puras, cero React
    infrastructure/ cart-store.ts ← zustand, solo orquesta el dominio
  shared/domain/   money.ts
components/        UI (server components salvo lo que necesita estado)
```

### Migrar el catálogo a Supabase

1. Escribí `core/catalog/infrastructure/supabase-product-repository.ts`
   implementando `ProductRepository`.
2. Cambiá **una línea** en `core/catalog/index.ts`.

Nada más. La firma del puerto ya es asincrónica justamente para esto: ningún
componente cambia.

## Cargar productos

1. Dejá la foto en `public/products/<slug>.jpg` — cuadrada, fondo negro,
   1400×1400 mínimo.
2. Agregá el objeto en `core/catalog/infrastructure/catalog.data.ts` con
   `images: ["/products/<slug>.jpg"]`.

`images: []` = todavía sin foto, se renderiza un marco vacío con el SKU.

> **No apuntes a un archivo que no existe.** El test
> `toda imagen declarada existe en public/` falla — porque en producción eso
> sería un cuadrado vacío para la clienta.

Los precios van en **centavos enteros** (`priceInCents: 4_800_000` = $48.000).
Nunca float: `0.1 + 0.2` en un subtotal es plata real perdida.

`stock: 0` marca la pieza como agotada y la manda al final de la grilla.

## Diseño

Negro absoluto (`#000`), tipografía blanca, rojo (`#ff1f1f`) como realzador
puntual, plata como único brillo. Estética techno berlinés: la retícula de
hairlines de 1px **es** el diseño — por eso la grilla no tiene `gap`.

Tokens en `app/globals.css` (`@theme`). Mobile-first.

El wordmark es SVG con `textLength`: ocupa el 100% del ancho en cualquier
viewport sin depender de las métricas de la fuente.

## Pendiente: MercadoPago Checkout Pro

El botón de checkout en `components/cart/cart-drawer.tsx` está deshabilitado y
marcado con `SEAM DE PAGOS`. Falta:

- `core/checkout/domain/payment-gateway.ts` (puerto)
- adaptador con el SDK oficial `mercadopago`
- ruta que crea la *preference* y redirige a `init_point`
- webhook `/api/webhooks/mercadopago` con verificación de firma `x-signature`
- páginas de retorno success / failure / pending

**Por qué MercadoPago y no Stripe:** Stripe no procesa pagos locales argentinos
(ni tarjetas en pesos, ni cuotas, ni Rapipago/PagoFácil). Checkout Pro además
delega el PCI compliance entero: los datos de tarjeta nunca tocan este código.
