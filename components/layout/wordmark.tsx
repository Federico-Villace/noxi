/**
 * Wordmark full-bleed.
 *
 * En HTML con `font-size: Nvw` el ancho del texto depende de las métricas de la
 * fuente: hay que adivinar un vw que entre, y se rompe con otra tipografía.
 * Acá el SVG escala por viewBox y `textLength` fuerza el ancho exacto:
 * ocupa el 100% del contenedor en TODO viewport. Cero overflow, cero magia.
 */
export function Wordmark({ label = "Noxiclts" }: { label?: string }) {
  return (
    <svg
      viewBox="0 0 1000 115"
      className="block w-full"
      role="img"
      aria-label={label}
    >
      <text
        x="0"
        y="105"
        textLength="1000"
        lengthAdjust="spacingAndGlyphs"
        className="fill-chrome"
        style={{
          fontFamily: "var(--font-archivo)",
          fontSize: 140,
          fontWeight: 500,
        }}
      >
        {label.toUpperCase()}
      </text>
    </svg>
  );
}
