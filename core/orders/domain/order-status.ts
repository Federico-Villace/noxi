/**
 * Vocabulario del negocio, no el de MercadoPago.
 *
 * Está en castellano a propósito: estos valores los va a leer la dueña de la
 * marca en el panel admin, no solo nosotros en la consola.
 */
export type OrderStatus =
  | "iniciada" // se creó la preferencia, todavía no pagó
  | "pendiente" // MP la está procesando (efectivo, revisión)
  | "pagada"
  | "rechazada"
  | "cancelada"
  | "devuelta";

const FROM_MERCADOPAGO: Record<string, OrderStatus> = {
  approved: "pagada",
  pending: "pendiente",
  in_process: "pendiente",
  in_mediation: "pendiente",
  authorized: "pendiente",
  rejected: "rechazada",
  cancelled: "cancelada",
  refunded: "devuelta",
  charged_back: "devuelta",
};

/**
 * El default es "pendiente" y NO "pagada" a propósito.
 *
 * Si MercadoPago agrega un estado que todavía no conocemos, lo peor que puede
 * pasar es que revisemos una orden a mano. Un default optimista, en cambio,
 * significa despachar plata 925 por un pago que nunca entró.
 */
export function fromMercadoPagoStatus(
  status: string | null | undefined,
): OrderStatus {
  if (!status) return "pendiente";
  return FROM_MERCADOPAGO[status.trim().toLowerCase()] ?? "pendiente";
}

const FINAL: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  "pagada",
  "rechazada",
  "cancelada",
  "devuelta",
]);

export function isFinal(status: OrderStatus): boolean {
  return FINAL.has(status);
}
