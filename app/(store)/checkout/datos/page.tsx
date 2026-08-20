import type { Metadata } from "next";
import { CustomerForm } from "@/components/checkout/customer-form";

export const metadata: Metadata = {
  title: "Tus datos",
  robots: { index: false },
};

export default function CheckoutDatosPage() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-14 md:py-20">
      <p className="label text-silver">Paso 1 de 2</p>

      <h1 className="mt-3 text-[clamp(2rem,6vw,3rem)] font-medium uppercase leading-[0.9] tracking-[-0.03em] text-chrome">
        Tus datos
      </h1>

      <div className="mt-6 mb-10 h-px w-full bg-blood" />

      <CustomerForm />
    </section>
  );
}
