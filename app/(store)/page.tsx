import { productRepository } from "@/core/catalog";
import { ProductGrid } from "@/components/catalog/product-grid";
import { Ticker } from "@/components/layout/ticker";
import { Wordmark } from "@/components/layout/wordmark";

/**
 * El catálogo ahora vive en Supabase: sin esto la grilla quedaría congelada en
 * el build y mostraría stock viejo. No afecta la correctitud —el stock real se
 * revalida en el servidor al hacer checkout— pero sí lo que ve la clienta.
 */
export const revalidate = 60;

export default async function HomePage() {
  const products = await productRepository.findAll();
  const available = products.filter((product) => product.stock > 0).length;

  return (
    <>
      <section className="border-b border-line px-4 pb-10 pt-16 md:px-6 md:pb-16 md:pt-28">
        <h1>
          <Wordmark />
        </h1>

        <div className="mt-8 h-px w-full bg-blood" />

        <div className="mt-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <p className="label max-w-xs text-silver">
            Joyería de plata 925.
            <br />
            Drops limitados. Buenos Aires.
          </p>
          <p className="label text-silver">
            <span className="text-blood tabular-nums">{available}</span> piezas
            disponibles
          </p>
        </div>
      </section>

      <Ticker />

      <ProductGrid products={products} />
    </>
  );
}
