import type { Metadata } from "next";
import { CheckoutStatus } from "@/components/checkout/checkout-status";
import { ClearCart } from "@/components/checkout/clear-cart";

export const metadata: Metadata = {
  title: "Pago aprobado",
  robots: { index: false },
};

export default function CheckoutSuccessPage() {
  return (
    <>
      <ClearCart />
      <CheckoutStatus
        tone="ok"
        title="Pago aprobado"
        message="Recibimos tu pago. Te escribimos por Instagram para coordinar el envío de tu pieza."
        note="Drop 001 · Plata 925"
      />
    </>
  );
}
