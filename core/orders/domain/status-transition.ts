import type { OrderStatus } from "./order-status";

/**
 * Decide si una notificación debe modificar el estado de la orden.
 *
 * Existe porque MercadoPago NO garantiza el orden de las notificaciones y
 * reintenta las viejas. Sin esta guarda, un "pending" atrasado que llega
 * después del "approved" despagaría una orden ya cobrada.
 *
 * También es el disparador de efectos que deben ocurrir UNA sola vez
 * (descontar stock): solo cuando esto devuelve true para una entrada `pagada`.
 */
export function shouldApplyTransition(
  current: OrderStatus,
  incoming: OrderStatus,
): boolean {
  // Idempotencia: la misma notificación reintentada no hace nada.
  if (current === incoming) return false;

  // Una devolución o contracargo es un hecho contable definitivo.
  if (current === "devuelta") return false;

  // Una orden pagada solo puede evolucionar a devuelta. Ni un rechazo posterior
  // ni un pending atrasado pueden tocarla.
  if (current === "pagada") return incoming === "devuelta";

  // Desde iniciada, pendiente, rechazada o cancelada todo avance es válido:
  // con Checkout Pro la compradora puede reintentar sobre la misma preferencia.
  return true;
}
