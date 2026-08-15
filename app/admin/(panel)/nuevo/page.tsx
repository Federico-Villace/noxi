import { requireAdmin } from "@/core/admin";
import { ProductForm } from "@/components/admin/product-form";

export default async function NuevaPiezaPage() {
  await requireAdmin();

  return (
    <>
      <h1 className="font-display text-2xl uppercase tracking-tight">
        Nueva pieza
      </h1>
      <div className="mt-6 mb-8 h-px w-full bg-blood" />

      <ProductForm />
    </>
  );
}
