/** Relación del isotipo ya recortado a su caja de tinta. */
const RELACION = "1749 / 2312";
const ARCHIVO = "url(/brand/isotipo.png)";

/**
 * Isotipo de NOXICLTS.
 *
 * Se pinta por MÁSCARA y no como <img>: el PNG aporta solo la forma (su canal
 * alfa) y el color sale de `bg-*`, o sea del token de diseño.
 *
 * Por qué no usar el PNG directo: el archivo con el color correcto trae el
 * fondo #1C1C1C horneado —se vería un cuadrado gris sobre el negro puro— y el
 * que tiene fondo transparente trae la tinta oscura, invisible acá. Enmascarar
 * evita elegir entre esos dos males y, de paso, deja el color fuera del asset:
 * si mañana cambia la paleta, el logo la sigue solo.
 */
/**
 * Decorativo a propósito: el nombre accesible lo pone quien lo envuelve
 * (el Link del header ya dice "Noxiclts — inicio"). Si además el logo se
 * anunciara, un lector de pantalla leería la marca dos veces.
 */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`block bg-chrome ${className}`}
      style={{
        aspectRatio: RELACION,
        maskImage: ARCHIVO,
        WebkitMaskImage: ARCHIVO,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "left center",
        WebkitMaskPosition: "left center",
      }}
    />
  );
}
