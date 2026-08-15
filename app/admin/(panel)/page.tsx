import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/core/admin";
import { productAdminRepository } from "@/core/catalog/admin";
import { formatPrice } from "@/core/shared/domain/money";
import { toggleProductActive } from "@/app/admin/actions";

/**
 * El panel lee SIEMPRE en vivo. Un catálogo cacheado acá le mostraría a quien
 * está cargando un stock que ya no es, y lo llevaría a corregir algo que no
 * está roto.
 */
export const dynamic = "force-dynamic";

export default async function CatalogoPage() {
  await requireAdmin();

  const products = await productAdminRepository.findAll();
  const visibles = products.filter((p) => p.active).length;
  const agotados = products.filter((p) => p.stock <= 0).length;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-tight">
            Catálogo
          </h1>
          <p className="label mt-2 text-silver">
            {products.length} piezas · {visibles} visibles · {agotados} agotadas
          </p>
        </div>

        <Link
          href="/admin/nuevo"
          className="label border border-line-strong bg-chrome px-6 py-3 text-void transition-colors hover:bg-blood hover:text-chrome"
        >
          + Nueva pieza
        </Link>
      </div>

      <div className="mt-6 h-px w-full bg-blood" />

      {products.length === 0 ? (
        <p className="label mt-10 text-silver">
          Todavía no hay piezas cargadas.
        </p>
      ) : (
        <ul className="mt-2">
          {products.map((product) => (
            <li
              key={product.id}
              className="flex flex-wrap items-center gap-4 border-b border-line py-4"
            >
              <div className="relative size-14 shrink-0 border border-line bg-carbon">
                {product.images[0] ? (
                  <Image
                    src={product.images[0]}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : (
                  <span className="label absolute inset-0 grid place-items-center text-silver/40">
                    {product.id.replace("NX-", "")}
                  </span>
                )}
              </div>

              <div className="min-w-48 flex-1">
                <Link
                  href={`/admin/${product.id}`}
                  className="font-display uppercase tracking-tight transition-colors hover:text-blood"
                >
                  {product.name}
                </Link>
                <p className="label mt-1 text-silver/60">
                  {product.id} · /{product.slug}
                </p>
              </div>

              <p className="label w-28 tabular-nums text-chrome">
                {formatPrice(product.priceInCents)}
              </p>

              <p
                className={`label w-20 tabular-nums ${
                  product.stock <= 0 ? "text-blood" : "text-silver"
                }`}
              >
                {product.stock <= 0 ? "Agotada" : `Stock ${product.stock}`}
              </p>

              {/*
                Un <form> pelado con server action: sin JS en el cliente, y
                funciona igual si la hidratación todavía no llegó.
              */}
              <form action={toggleProductActive}>
                <input type="hidden" name="id" value={product.id} />
                <input type="hidden" name="slug" value={product.slug} />
                <input
                  type="hidden"
                  name="active"
                  value={String(!product.active)}
                />
                <button
                  type="submit"
                  className={`label border px-3 py-2 transition-colors ${
                    product.active
                      ? "border-line-strong text-chrome hover:border-blood hover:text-blood"
                      : "border-line text-silver/50 hover:text-chrome"
                  }`}
                >
                  {product.active ? "Visible" : "Oculta"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
