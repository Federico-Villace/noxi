import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/core/admin";
import { productAdminRepository } from "@/core/catalog/admin";
import { ProductForm } from "@/components/admin/product-form";

/** Se edita sobre lo que hay AHORA en la base, nunca sobre una copia cacheada. */
export const dynamic = "force-dynamic";

export default async function EditarPiezaPage({
  params,
}: PageProps<"/admin/[id]">) {
  await requireAdmin();

  const { id } = await params;
  const product = await productAdminRepository.findById(id);

  if (!product) notFound();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-2xl uppercase tracking-tight">
          {product.name}
        </h1>

        {product.active ? (
          <Link
            href={`/producto/${product.slug}`}
            className="label text-silver transition-colors hover:text-chrome"
          >
            Ver en la tienda ↗
          </Link>
        ) : null}
      </div>

      <div className="mt-6 mb-8 h-px w-full bg-blood" />

      <ProductForm product={product} />
    </>
  );
}
