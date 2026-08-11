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
NEXT_PUBLIC_SITE_URL=https://noxi-drab.vercel.app

# Supabase (Project Settings > API)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> **Nunca le pongas `NEXT_PUBLIC_` al service role key.** Las variables
> `NEXT_PUBLIC_` se inlinean en el build y viajan al navegador. Esa clave
> saltea el RLS: en el bundle equivale a dar acceso total a las órdenes.

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

## Órdenes (Supabase)

Migración: `supabase/migrations/0001_orders.sql` — correr en Supabase SQL Editor.

**La orden se guarda al crear la preferencia, no en el webhook.** En el checkout
sabemos exactamente qué había en el carrito; el webhook solo conoce el pago. Y
si la notificación nunca llega, igual queda rastro del intento de compra.

Las líneas guardan un **snapshot** de título y precio, sin FK a productos: una
orden es un registro contable, no una vista de datos vivos.

`core/orders/domain/status-transition.ts` decide si una notificación modifica la
orden. MercadoPago **no garantiza el orden de las notificaciones** y reintenta
las viejas: sin esa guarda, un `pending` atrasado despagaría una orden cobrada.
Una devolución sí puede superar a un pago; un rechazo posterior, no.

RLS activo con **cero políticas**: las órdenes solo se tocan desde el servidor
con la `service_role` key.

## Productos y stock (Supabase)

Migración: `supabase/migrations/0002_products_and_stock.sql`.

Sembrar el catálogo inicial desde el archivo estático:

```bash
pnpm seed:products
```

El catálogo ahora sale de Supabase. **Se cambió una sola línea**
(`core/catalog/index.ts`): ni un componente, ni una página, ni el checkout se
tocaron. El adaptador estático sigue vivo como semilla y como sujeto del test
de imágenes en disco.

### Descuento de stock

Todo ocurre en `apply_stock_for_order`, una función de Postgres — **no en
JavaScript**. Leer stock, restar y guardar desde JS abre una ventana entre la
lectura y la escritura donde dos ventas simultáneas se pisan.

La función resuelve dos cosas en una transacción:

- **Idempotencia**: `update orders set stock_applied = true where ... and
  stock_applied = false` es un reclamo atómico. MercadoPago manda hasta tres
  avisos por venta, más la vuelta de la compradora al sitio: solo uno descuenta.
- **Atomicidad**: el reclamo y el descuento viven o mueren juntos.

Si algún stock queda **negativo** hubo sobreventa: la orden se marca con
`needs_review` y el motivo. Si el descuento falla, la orden se confirma igual y
se marca para revisión — el pago ya ocurrió, no se puede "desconfirmar".

### Pendiente

- **Panel admin** para cargar piezas (FASE 3).
- **Firma del webhook**: no valida contra las notificaciones reales de MP
  (`firmaValidada: false` en los logs). Hoy es defensa en profundidad, no un
  bloqueante: la confirmación se hace consultando la API de MP. Queda como
  deuda técnica a resolver.
- **Envío**: se coordina por Instagram. Para automatizarlo, la API de
  **MiCorreo (Correo Argentino)** no exige acuerdo comercial ni volumen mínimo;
  Andreani y OCA sí.
