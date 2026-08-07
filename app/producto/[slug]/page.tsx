import Link from "next/link";
import { notFound } from "next/navigation";
import { isSoldOut, productRepository } from "@/core/catalog";
import { formatPrice } from "@/core/shared/domain/money";
import { ProductMedia } from "@/components/catalog/product-media";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";

export async function generateStaticParams() {
  const products = await productRepository.findAll();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/producto/[slug]">) {
  const { slug } = await params;
  const product = await productRepository.findBySlug(slug);
  if (!product) return {};

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: `${product.name} — NOXICLTS`,
      description: product.description,
      images: product.images,
    },
  };
}

export default async function ProductPage({
  params,
}: PageProps<"/producto/[slug]">) {
  const { slug } = await params;
  const product = await productRepository.findBySlug(slug);

  if (!product) notFound();

  const soldOut = isSoldOut(product);

  return (
    <article className="grid grid-cols-1 lg:grid-cols-2">
      <div className="grain relative aspect-square border-b border-line bg-void lg:sticky lg:top-14 lg:aspect-auto lg:h-[calc(100svh-3.5rem)] lg:border-b-0 lg:border-r">
        <ProductMedia
          src={product.images[0]}
          alt={product.name}
          sku={product.id}
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
        />

        {soldOut && (
          <div className="absolute inset-0 grid place-items-center bg-void/70 backdrop-grayscale">
            <span className="label border border-line-strong px-4 py-2.5 text-silver">
              Agotado
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col">
        <div className="border-b border-line px-5 py-4 md:px-8">
          <Link
            href="/"
            className="label text-silver transition-colors hover:text-blood"
          >
            ← Volver al drop
          </Link>
        </div>

        <div className="px-5 py-8 md:px-8 md:py-12">
          <p className="label mb-4 text-blood">{product.drop}</p>

          <h1 className="text-[clamp(2.25rem,7vw,4rem)] font-medium uppercase leading-[0.9] tracking-[-0.03em] text-chrome">
            {product.name}
          </h1>

          <p className="mt-6 font-mono text-2xl tabular-nums text-chrome">
            {formatPrice(product.priceInCents)}
          </p>

          <p className="mt-8 max-w-md text-sm leading-relaxed text-silver">
            {product.description}
          </p>
        </div>

        <dl className="grid grid-cols-2 border-t border-line">
          <div className="border-b border-r border-line px-5 py-4 md:px-8">
            <dt className="label mb-2 text-silver/50">Material</dt>
            <dd className="label text-chrome">{product.material}</dd>
          </div>
          <div className="border-b border-line px-5 py-4 md:px-8">
            <dt className="label mb-2 text-silver/50">SKU</dt>
            <dd className="label text-chrome">{product.id}</dd>
          </div>
          <div className="border-b border-r border-line px-5 py-4 md:px-8">
            <dt className="label mb-2 text-silver/50">Stock</dt>
            <dd className="label text-chrome">
              {soldOut ? (
                <span className="text-silver/50">Agotado</span>
              ) : (
                <span className="text-blood tabular-nums">
                  {product.stock} unidades
                </span>
              )}
            </dd>
          </div>
          <div className="border-b border-line px-5 py-4 md:px-8">
            <dt className="label mb-2 text-silver/50">Envío</dt>
            <dd className="label text-chrome">Todo el país</dd>
          </div>
        </dl>

        <div className="px-5 py-6 md:px-8">
          <AddToCartButton product={product} />
        </div>
      </div>
    </article>
  );
}
