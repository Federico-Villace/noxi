import type { Metadata } from "next";
import { CheckoutStatus } from "@/components/checkout/checkout-status";

export const metadata: Metadata = {
  title: "Pago rechazado",
  robots: { index: false },
};

export default function CheckoutFailurePage() {
  return (
    <CheckoutStatus
      tone="error"
      title="Pago rechazado"
      message="No pudimos procesar el pago. No se te cobró nada. Tu carrito sigue como estaba, podés intentar con otro medio de pago."
    />
  );
}
