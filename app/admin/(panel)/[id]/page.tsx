import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/core/admin";
import { productAdminRepository } from "@/core/catalog/admin";
import { ProductForm } from "@/components/admin/product-form";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { deleteProduct } from "@/app/admin/actions";

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

      {/*
        Fuera del <form> del producto a propósito: un submit de borrado
        anidado dentro del de guardar es HTML inválido y se comporta distinto
        en cada navegador.
      */}
      <section className="mt-14 max-w-3xl border-t border-line pt-6">
        <p className="label text-silver">Borrar</p>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-silver/70">
          Es para lo que cargaste por error. Si la pieza se vendió y no la
          querés más en la tienda, destildá{" "}
          <span className="text-chrome">Visible en la tienda</span>: queda
          guardada y la podés volver a publicar.
        </p>

        <div className="mt-5">
          <DeleteProductButton
            productId={product.id}
            productName={product.name}
            action={deleteProduct}
          />
        </div>
      </section>
    </>
  );
}
