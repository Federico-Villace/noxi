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

## Pagos — MercadoPago Checkout Pro

**Por qué MercadoPago y no Stripe:** Stripe no procesa pagos locales argentinos
(ni tarjetas en pesos, ni cuotas, ni Rapipago/PagoFácil). Checkout Pro además
delega el PCI compliance entero: los datos de tarjeta nunca tocan este código.

### Variables de entorno

Creá un `.env.local` (ya está en `.gitignore` — **los secretos no se commitean
nunca**):

```bash
# Tus integraciones > tu app > Pruebas > Credenciales de prueba
MP_ACCESS_TOKEN=TEST-xxxxxxxxxxxx

# Tus integraciones > tu app > Webhooks > Configurar notificaciones
# La clave secreta se genera al guardar la configuración.
MP_WEBHOOK_SECRET=xxxxxxxxxxxx

# Base pública. MercadoPago tiene que poder alcanzarla:
# localhost NO sirve para el webhook. Usá la URL del preview de Vercel.
NEXT_PUBLIC_SITE_URL=https://noxi.vercel.app
```

En Vercel, las mismas tres con `vercel env add`.

### Flujo

```
carrito → startCheckout (server action)
            └─ buildOrder: precio y stock desde el SERVIDOR
            └─ preference → redirect a init_point (MP)
                              └─ paga en MercadoPago
                                   ├─ back_urls → /checkout/{exito,error,pendiente}
                                   └─ webhook  → /api/webhooks/mercadopago
```

### Las dos reglas de seguridad

1. **El cliente nunca manda precios.** `startCheckout` solo acepta
   `{ productId, quantity }`; el precio y el stock salen del catálogo del
   servidor (`core/checkout/domain/build-order.ts`). Si confiáramos en el
   navegador, cualquiera edita el precio en devtools y se lleva una pieza por
   un centavo. Hay un test que lo blinda.

2. **El webhook valida firma antes de leer el cuerpo.**
   `core/checkout/domain/webhook-signature.ts` calcula HMAC-SHA256 sobre
   `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` y compara en tiempo
   constante. Sin esto, cualquiera que conozca la URL postea "pago aprobado".

### Pendiente

- **Persistencia de órdenes**: el webhook hoy solo loguea. Con Supabase hay que
  guardar la orden y marcarla pagada usando `external_reference` como clave
  idempotente (ver `TODO(persistencia)` en la ruta del webhook).
- **Descuento de stock** post-pago: hoy el stock es estático.
- **Envío**: se coordina por Instagram. Para automatizarlo, la API de
  **MiCorreo (Correo Argentino)** no exige acuerdo comercial ni volumen mínimo;
  Andreani y OCA sí.
