import type { Metadata } from "next";
import { CheckoutStatus } from "@/components/checkout/checkout-status";

export const metadata: Metadata = {
  title: "Pago pendiente",
  robots: { index: false },
};

export default function CheckoutPendingPage() {
  return (
    <CheckoutStatus
      tone="pending"
      title="Pago pendiente"
      message="Tu pago está siendo procesado. Puede tardar unos minutos si pagaste en efectivo. Te avisamos apenas se acredite."
      note="Guardá el comprobante de MercadoPago"
    />
  );
}
