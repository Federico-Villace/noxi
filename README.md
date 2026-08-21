# NOXICLTS

Ecommerce minimalista de joyería de plata 950. Drops limitados.

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
    domain/        product.ts
                   product-repository.ts        ← PUERTO de lectura (tienda)
                   product-admin-repository.ts  ← PUERTO de escritura (panel)
                   image-storage.ts             ← PUERTO de fotos
                   product-draft.ts             ← validación del formulario
    infrastructure/ supabase-*.ts               ← ADAPTADORES
                    catalog.data.ts             ← semilla del arranque
    index.ts       ← cableado de la tienda (solo lectura)
    admin.ts       ← cableado del panel (lectura + escritura)
  admin/
    domain/        session-token.ts  ← HMAC de la sesión, cero dependencias
    index.ts       ← requireAdmin() y compañía
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

## Cargar productos — panel admin

`/admin`. Ahí se carga, se edita, se ajusta stock y se muestra u oculta una
pieza. Cubre **todas** las columnas de la tabla `products`: no queda nada que
haya que ir a tocar al SQL editor.

### Puesta en marcha (una sola vez)

1. Corré `supabase/migrations/0003_products_bucket.sql` y
   `0004_customer_details.sql` en el SQL Editor. El primero crea el bucket
   público `products` (donde van las fotos); el segundo agrega a `orders` los
   datos de la compradora y del envío.
2. Cargá `ADMIN_PASSWORD` en `.env.local` y en Vercel (ver
   [Variables de entorno](#variables-de-entorno)).

Listo. `/admin` pide esa contraseña y adentro está todo.

### Cómo funciona

- **Precio**: se escribe en pesos, sin separador de miles (`54000`, o
  `54000.50` con centavos). Adentro se guarda en centavos enteros —
  `4_800_000` = $48.000. Nunca float: `0.1 + 0.2` en un subtotal es plata real
  perdida.
- **Slug**: sale solo del nombre y es la URL pública de la pieza
  (`/producto/anillo-sello-negro`). Es único: si chocás con uno existente, el
  panel te lo dice.
- **ID**: vacío se autonumera (`NX-009`). Va desde el mayor existente, no desde
  la cantidad, así no puede repetir uno ya usado.
- **Fotos**: se suben desde el panel a Supabase Storage, **varias de una vez**.
  La primera es la portada y se puede reordenar. La ficha de producto las
  muestra todas con miniaturas; la grilla muestra solo la portada. Si una foto
  del lote falla, las demás igual entran y el error nombra cuál falló. Sin
  fotos, la tienda muestra un marco vacío con el SKU — se lee como diseño, no
  como bug.
- **Stock 0** = agotada, y va al final de la grilla.
- **Ocultar** (`active = false`) saca la pieza de la vitrina sin borrarla.
  Es lo que corresponde para algo que se vendió y se discontinuó: queda en el
  panel y se puede volver a publicar.
- **Borrar** es físico y es irreversible: se va la fila y sus fotos del bucket.
  Es para lo que cargaste por error, y vive solo en la ficha de edición, detrás
  de una confirmación que nombra la pieza.

  > Borrar no rompe el historial. `order_lines` guarda `title` y
  > `unit_price_in_cents` como snapshot y **no** tiene foreign key a
  > `products`: una orden vieja sigue diciendo lo mismo aunque la pieza ya no
  > exista.

Al guardar se revalidan la home y la ficha, así que el cambio se ve en la
tienda al instante y no dentro de 60 segundos.

## Comprobante y órdenes

La compradora ve el comprobante completo en `/checkout/exito` al volver del
pago —piezas, total, sus datos y la dirección de envío— y lo puede imprimir o
guardar como PDF desde el navegador. Hay `@media print` en `globals.css`: sin
eso saldría una hoja negra, ilegible y carísima en tinta.

Vos ves lo mismo en **`/admin/ordenes`**: las últimas 50, con estado, total y
un `<details>` que despliega el comprobante entero para preparar el paquete.
Las marcadas **Revisar** son sobreventas — se confirmó un pago y el stock no
alcanzaba.

Es el **mismo componente** (`components/checkout/receipt.tsx`) en las dos
pantallas. Si fueran dos, tarde o temprano uno muestra un dato que el otro no y
hay que cotejar pantallas para contestar un reclamo.

### Aviso de venta por mail

Cuando un pago se confirma sale un mail a la tienda con el comprobante: qué se
vendió, a quién, y la dirección para despachar. **Responder le escribe a la
compradora**, no a la tienda — el `replyTo` es su mail.

Va en TEXTO PLANO a propósito. No es una pieza de marca: es una orden de
trabajo que se lee en el teléfono y de la que se copia una dirección a un
formulario de despacho. El texto plano se ve igual en todos lados y se copia
sin arrastrar estilos.

Se dispara en `confirmOrderPayment`, dentro de la MISMA guarda que descuenta
el stock (`outcome === "actualizada"`). Esa guarda es el control de
concurrencia optimista de `confirmPayment`: MercadoPago reintenta la misma
notificación y además está el canal de la vuelta al sitio, así que sin ella una
venta mandaría cinco mails.

Si falla el envío, **la venta no se cae**: queda el log y la orden sigue en
`/admin/ordenes`. El mail es un aviso, no el registro.

#### Puesta en marcha

1. Creá la cuenta de Resend **con la casilla de la tienda**
   (`noxiclts@gmail.com`). Sin dominio propio verificado, Resend solo entrega
   a la dirección con la que se registró la cuenta — por eso importa cuál usás.
2. Cargá en Vercel `RESEND_API_KEY` y `SALE_EMAIL_TO`.

Sin esas dos variables el aviso no sale y queda un `warn` en el log. Nada se
rompe: es una notificación, no parte del cobro.

#### El día que haya dominio propio

Verificás el dominio en Resend, cambiás `SALE_EMAIL_FROM` a algo como
`NOXICLTS <ventas@noxiclts.com>` y listo — **cero cambios de código**. Recién
ahí se puede mandar el comprobante a la compradora, porque cada una tiene un
mail distinto y eso exige dominio verificado.

### Por qué los datos van en `orders` y no en una tabla `customers`

Mismo criterio que `order_lines`: es un **snapshot** contable. Si la clienta se
muda el año que viene, la orden de hoy tiene que seguir diciendo adónde se
despachó hoy. Con una foreign key, editar un dato reescribiría el pasado.

### La seguridad del panel

- La contraseña **nunca** viaja en la cookie. La cookie es un token firmado con
  HMAC-SHA256 (`core/admin/domain/session-token.ts`): dice cuándo vence y va
  firmado, así que estirarle el vencimiento a mano lo invalida.
- La clave de firma se **deriva** de `ADMIN_PASSWORD`. Cambiar la contraseña
  cierra de una todas las sesiones abiertas — es la única forma de echar a
  alguien de un esquema sin estado.
- La cookie es `httpOnly` (un XSS no se la lleva) y `sameSite: lax` (corta el
  CSRF sobre los server actions).
- `requireAdmin()` corre en **cada página y cada server action**, no solo en el
  layout. Un server action es un endpoint POST de verdad: se lo puede invocar
  con un `curl` sin pasar nunca por la UI.
- `proxy.ts` (el ex-middleware, renombrado en Next 16) hace solo un chequeo
  optimista de que la cookie exista. Nada de criptografía ni de base: corre en
  cada request, incluidos los prefetch.

### El catálogo estático

`core/catalog/infrastructure/catalog.data.ts` y `pnpm seed:products` siguen
existiendo como semilla del arranque. Una vez que cargás desde el panel, la
fuente de verdad es la base: **no vuelvas a correr el seed**, porque pisa el
stock con el del archivo.

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

# Entrada al panel /admin. Es la única puerta: que sea RANDOM, no memorizable.
# Generala con: openssl rand -hex 32
#
# 32 bytes random = 256 bits. Lo que importa no es que sea larga, es que sea
# aleatoria: "NoxiCults2026!" tiene más caracteres que entropía y un
# diccionario la saca en minutos. Y en hex son solo 0-9a-f, así que no hay
# `+`, `/` ni `=` que se rompan al pegarla en Vercel o al citarla en un .env.
ADMIN_PASSWORD=xxxxxxxxxxxx

# Aviso de venta (Resend). Sin estas dos, el mail no sale y no se rompe nada.
RESEND_API_KEY=re_xxxxxxxxxxxx
SALE_EMAIL_TO=noxiclts@gmail.com

# Opcional. Sin dominio verificado dejalo sin definir: se usa el remitente
# de Resend, que es el único que funciona en ese caso.
# SALE_EMAIL_FROM=NOXICLTS <ventas@noxiclts.com>
```

> **Nunca le pongas `NEXT_PUBLIC_` al service role key ni a `ADMIN_PASSWORD`.**
> Las variables `NEXT_PUBLIC_` se inlinean en el build y viajan al navegador.
> El service role key saltea el RLS: en el bundle equivale a dar acceso total a
> las órdenes. Y `ADMIN_PASSWORD` en el bundle es el panel abierto para
> cualquiera que abra las devtools.

En Vercel, las mismas con `vercel env add`. Sin `ADMIN_PASSWORD` el panel queda
cerrado (y avisa en los logs del servidor).

### Flujo

```
carrito → /checkout/datos  (formulario: contacto + envío)
            └─ startCheckout (server action)
                 ├─ parseCustomer: valida OTRA VEZ en el servidor
                 ├─ buildOrder: precio y stock desde el SERVIDOR
                 ├─ orders.create: guarda la orden CON los datos
                 └─ preference → redirect a init_point (MP)
                                   └─ paga en MercadoPago
                                        ├─ back_urls → /checkout/{exito,error,pendiente}
                                        └─ webhook  → /api/webhooks/mercadopago
```

Los datos se piden **antes** de salir del sitio. Si el pago se abandona, la
orden queda en `iniciada` pero con nombre, mail y dirección: es una venta
recuperable en vez de un carrito fantasma.

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
