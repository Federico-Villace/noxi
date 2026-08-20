import { requireAdmin } from "@/core/admin";
import { orderRepository } from "@/core/orders";
import type { OrderStatus } from "@/core/orders/domain/order-status";
import { formatPrice } from "@/core/shared/domain/money";
import { Receipt } from "@/components/checkout/receipt";

/** Nunca cacheado: una orden de hace treinta segundos tiene que estar acá. */
export const dynamic = "force-dynamic";

const LIMITE = 50;

const TONO: Record<OrderStatus, string> = {
  pagada: "border-chrome text-chrome",
  pendiente: "border-line-strong text-silver",
  iniciada: "border-line text-silver/50",
  rechazada: "border-blood text-blood",
  cancelada: "border-blood text-blood",
  devuelta: "border-blood text-blood",
};

const fecha = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Argentina/Buenos_Aires",
});

export default async function OrdenesPage() {
  await requireAdmin();

  const orders = await orderRepository().findRecent(LIMITE);
  const pagadas = orders.filter((o) => o.status === "pagada");
  const aRevisar = orders.filter((o) => o.needsReview);

  return (
    <>
      <h1 className="font-display text-2xl uppercase tracking-tight">Órdenes</h1>
      <p className="label mt-2 text-silver">
        {orders.length} últimas · {pagadas.length} pagadas
        {aRevisar.length > 0 && (
          <span className="text-blood"> · {aRevisar.length} a revisar</span>
        )}
      </p>

      <div className="mt-6 h-px w-full bg-blood" />

      {orders.length === 0 ? (
        <p className="label mt-10 text-silver">Todavía no hay órdenes.</p>
      ) : (
        <ul className="mt-2">
          {orders.map((order) => (
            <li key={order.reference} className="border-b border-line">
              {/*
                `<details>` nativo: el resumen alcanza para barrer la lista y el
                comprobante completo está a un clic. Cero JavaScript, y el
                teclado lo abre solo.
              */}
              <details className="group">
                <summary className="flex cursor-pointer flex-wrap items-center gap-x-5 gap-y-2 py-4 marker:content-['']">
                  <span className="label w-24 shrink-0 text-silver/60 tabular-nums">
                    {order.createdAt ? fecha.format(new Date(order.createdAt)) : "—"}
                  </span>

                  <span className="min-w-40 flex-1 text-sm text-chrome">
                    {order.customer.name || (
                      <span className="text-silver/50">Sin datos</span>
                    )}
                  </span>

                  <span className="label w-28 shrink-0 tabular-nums text-chrome">
                    {formatPrice(order.totalInCents)}
                  </span>

                  <span
                    className={`label shrink-0 border px-2.5 py-1.5 ${TONO[order.status]}`}
                  >
                    {order.status}
                  </span>

                  {order.needsReview && (
                    <span className="label shrink-0 bg-blood px-2.5 py-1.5 text-void">
                      Revisar
                    </span>
                  )}
                </summary>

                <div className="pb-6">
                  <Receipt order={order} />

                  <div className="mt-4 flex flex-wrap gap-5">
                    {order.customer.phone && (
                      <a
                        href={`tel:${order.customer.phone}`}
                        className="label text-silver transition-colors hover:text-chrome"
                      >
                        Llamar {order.customer.phone}
                      </a>
                    )}
                    {order.customer.email && (
                      <a
                        href={`mailto:${order.customer.email}?subject=Tu pedido ${order.reference}`}
                        className="label text-silver transition-colors hover:text-chrome"
                      >
                        Escribir por mail
                      </a>
                    )}
                  </div>
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
