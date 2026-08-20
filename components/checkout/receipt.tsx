import Link from "next/link";
import type { OrderRecord } from "@/core/orders/domain/order";
import { formatPrice } from "@/core/shared/domain/money";
import { PrintButton } from "./print-button";

const fecha = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

function formatFecha(iso?: string | null): string {
  if (!iso) return "—";

  const valor = new Date(iso);
  return Number.isNaN(valor.getTime()) ? "—" : fecha.format(valor);
}

/**
 * El comprobante que ve la compradora al volver del pago.
 *
 * Es la MISMA pieza que usa el panel para mostrarle la venta a quien despacha:
 * si fueran dos componentes, tarde o temprano uno muestra un dato que el otro
 * no y hay que cotejar dos pantallas para responder un reclamo.
 *
 * Server component: se arma con la orden ya confirmada, sin JavaScript.
 */
export function Receipt({ order }: { order: OrderRecord }) {
  const { customer } = order;

  return (
    <article className="receipt border border-line">
      <header className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line px-5 py-4 md:px-6">
        <div>
          <p className="label text-silver">Comprobante</p>
          <p className="mt-1.5 font-mono text-sm text-chrome">
            {order.reference}
          </p>
        </div>
        <p className="label text-silver">
          {formatFecha(order.paidAt ?? order.createdAt)}
        </p>
      </header>

      <ul className="px-5 md:px-6">
        {order.lines.map((line) => (
          <li
            key={`${line.productId}-${line.title}`}
            className="flex flex-wrap justify-between gap-4 border-b border-line py-4 last:border-b-0"
          >
            <div>
              <p className="text-sm text-chrome">{line.title}</p>
              <p className="label mt-1.5 text-silver/60">
                {line.productId} · {line.quantity} ×{" "}
                {formatPrice(line.unitPriceInCents)}
              </p>
            </div>
            <p className="label shrink-0 tabular-nums text-chrome">
              {formatPrice(line.unitPriceInCents * line.quantity)}
            </p>
          </li>
        ))}
      </ul>

      <div className="flex justify-between border-t border-line px-5 py-4 md:px-6">
        <span className="label text-chrome">Total</span>
        <span className="font-mono tabular-nums text-chrome">
          {formatPrice(order.totalInCents)}
        </span>
      </div>

      <dl className="grid border-t border-line sm:grid-cols-2">
        <Dato label="Nombre" valor={customer.name} />
        <Dato label="DNI" valor={customer.docId} />
        <Dato label="Email" valor={customer.email} />
        <Dato label="Teléfono" valor={customer.phone} />
        <Dato
          label="Envío"
          valor={[
            customer.street,
            customer.streetExtra,
            customer.city,
            customer.province,
            customer.zip,
          ]
            .filter(Boolean)
            .join(", ")}
          ancho
        />
        {customer.notes ? (
          <Dato label="Nota" valor={customer.notes} ancho />
        ) : null}
      </dl>
    </article>
  );
}

function Dato({
  label,
  valor,
  ancho = false,
}: {
  label: string;
  valor: string;
  ancho?: boolean;
}) {
  return (
    <div
      className={`border-b border-line px-5 py-4 md:px-6 ${
        ancho ? "sm:col-span-2" : "sm:odd:border-r"
      }`}
    >
      <dt className="label text-silver/50">{label}</dt>
      <dd className="mt-2 break-words text-sm text-chrome">{valor || "—"}</dd>
    </div>
  );
}

export function ReceiptActions() {
  return (
    <div className="no-print mt-10 flex flex-wrap gap-4">
      <PrintButton />
      <Link
        href="/"
        className="label border border-line-strong px-8 py-4 text-chrome transition-colors hover:border-blood hover:text-blood"
      >
        Volver al drop
      </Link>
    </div>
  );
}
