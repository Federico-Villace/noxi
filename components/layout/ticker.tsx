const MESSAGES = [
  "Drop 001",
  "Plata 950",
  "Unidades limitadas",
  "Envíos a todo el país",
  "Hecho en Buenos Aires",
];

/**
 * Marquesina infinita: la fila se duplica y se traslada -50%.
 * Al llegar al final, el segundo bloque está exactamente donde arrancó el primero.
 */
export function Ticker() {
  const row = [...MESSAGES, ...MESSAGES];

  return (
    <div className="my-[10px] overflow-hidden border-b border-line bg-blood">
      <div className="flex w-max animate-ticker">
        {[0, 1].map((block) => (
          <ul key={block} className="flex shrink-0" aria-hidden={block === 1}>
            {row.map((message, index) => (
              <li
                key={`${block}-${index}`}
                className="label flex items-center gap-6 py-2.5 pr-6 text-void"
              >
                <span>{message}</span>
                <span aria-hidden>/</span>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}
