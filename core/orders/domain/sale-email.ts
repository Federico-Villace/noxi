import { formatPrice } from "@/core/shared/domain/money";
import type { OrderRecord } from "./order";

export interface SaleEmail {
  subject: string;
  text: string;
  /** Mail de la compradora: apretar Responder le escribe a ella, no a la tienda. */
  replyTo?: string;
}

/**
 * El aviso de venta que le llega a la tienda.
 *
 * TEXTO PLANO, y es a propósito. Esto no es una pieza de marca: es una orden
 * de trabajo que se lee en el teléfono y de la que se copia una dirección a un
 * formulario de despacho. El texto plano se ve igual en todos lados, no lo
 * recorta Gmail y se copia sin arrastrar estilos. Un HTML lindo acá sería
 * peor de usar.
 *
 * Función pura: no manda nada, solo arma el contenido. Por eso se testea sin
 * proveedor de email y sin red.
 */
export function buildSaleEmail(order: OrderRecord): SaleEmail {
  const { customer } = order;
  const total = formatPrice(order.totalInCents);

  const quien = customer.name || "Sin datos de compradora";

  const piezas = order.lines
    .map(
      (line) =>
        `  · ${line.title} (${line.productId}) × ${line.quantity} — ${formatPrice(
          line.unitPriceInCents * line.quantity,
        )}`,
    )
    .join("\n");

  // Cada parte se filtra por separado: no hay casas con piso, y un ", ,"
  // en una etiqueta de envío se ve como un error de sistema.
  const direccion = [
    customer.street,
    customer.streetExtra,
    `${customer.city}, ${customer.province}`,
    `CP ${customer.zip}`,
  ]
    .filter((parte) => parte.trim() && parte.trim() !== "CP")
    .join("\n  ");

  const bloques = [
    `VENTA CONFIRMADA — ${total}`,
    `PIEZAS\n${piezas}\n\n  Total: ${total}`,
    `ENVIAR A\n  ${quien}\n  DNI ${customer.docId}\n  ${direccion}`,
    `CONTACTO\n  ${customer.email}\n  ${customer.phone}`,
  ];

  if (customer.notes.trim()) {
    bloques.push(`NOTA DE ENTREGA\n  ${customer.notes}`);
  }

  bloques.push(
    `REFERENCIA\n  ${order.reference}${
      order.paymentId ? `\n  Pago MP ${order.paymentId}` : ""
    }`,
  );

  return {
    subject: `Venta ${total} · ${quien}`,
    text: `${bloques.join("\n\n")}\n`,
    replyTo: customer.email || undefined,
  };
}
