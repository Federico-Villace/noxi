/**
 * El dinero se guarda SIEMPRE en centavos enteros. Nunca en float.
 * Un 0.1 + 0.2 en el subtotal de un carrito es plata real que se pierde.
 */
const grouping = new Intl.NumberFormat("es-AR");

export function formatPrice(cents: number): string {
  const abs = Math.abs(Math.round(cents));
  const units = Math.trunc(abs / 100);
  const fraction = abs % 100;

  const grouped = grouping.format(units);
  const body =
    fraction === 0
      ? grouped
      : `${grouped},${String(fraction).padStart(2, "0")}`;

  return `${cents < 0 ? "-" : ""}$ ${body}`;
}
