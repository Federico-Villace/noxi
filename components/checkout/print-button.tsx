"use client";

/**
 * "Guardar como PDF" es una opción del diálogo de impresión de todos los
 * navegadores. Generar el PDF en el servidor sería traer una librería pesada
 * para hacer peor lo que el navegador ya hace bien.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="label border border-chrome bg-chrome px-8 py-4 text-void transition-colors hover:border-blood hover:bg-blood"
    >
      Imprimir o guardar PDF
    </button>
  );
}
