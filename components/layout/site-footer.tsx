const CELLS = [
  { label: "Marca", value: "Noxiclts" },
  { label: "Material", value: "Plata 925" },
  {
    label: "Contacto",
    value: "Instagram",
    href: "https://instagram.com/noxiclts",
  },
  { label: "Origen", value: "Buenos Aires" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto">
      {/* Mismo patrón de retícula que la grilla de productos:
          borde izquierdo en el contenedor, derecho e inferior en cada celda. */}
      <div className="grid grid-cols-2 border-l border-t border-line md:grid-cols-4">
        {CELLS.map((cell) => (
          <div key={cell.label} className="border-b border-r border-line p-5">
            <p className="label mb-2 text-silver/50">{cell.label}</p>
            {cell.href ? (
              <a
                href={cell.href}
                target="_blank"
                rel="noreferrer"
                className="label text-chrome transition-colors hover:text-blood"
              >
                {cell.value}
              </a>
            ) : (
              <p className="label text-chrome">{cell.value}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="label text-silver/40">
          © {new Date().getFullYear()} Noxiclts
        </p>
        <p className="label text-silver/40">
          Desarrollado por{" "}
          <span className="text-silver">Federico Villace</span>
        </p>
      </div>
    </footer>
  );
}
