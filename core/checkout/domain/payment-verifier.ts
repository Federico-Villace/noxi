export interface VerifiedPayment {
  id: string;
  /** Estado crudo de MercadoPago: approved, rejected, pending, … */
  status: string | null;
  externalReference: string | null;
  payerEmail: string | null;
}

/**
 * PUERTO para consultarle a MercadoPago la verdad sobre un pago.
 *
 * Existe porque una notificación entrante NO es una fuente de verdad, ni
 * siquiera firmada: es un aviso de "andá a fijarte el pago X". El estado real
 * se lee de una respuesta autenticada con NUESTRO access token.
 */
export interface PaymentVerifier {
  getPayment(paymentId: string): Promise<VerifiedPayment | null>;
}
