/**
 * Datos de la compradora y del envío.
 *
 * Igual que `product-draft` para el panel: la traducción de "lo que escribió
 * un humano" a "lo que entra al dominio" pasa UNA vez, acá, y se testea sin
 * navegador y sin base. El formulario solo dibuja; no decide qué es un
 * teléfono válido.
 */

export interface RawCustomer {
  name: string;
  email: string;
  phone: string;
  docId: string;
  street: string;
  /** Piso, depto, torre. Opcional de verdad: hay casas. */
  streetExtra: string;
  city: string;
  province: string;
  zip: string;
  notes: string;
}

/** Ya validado y normalizado. Es lo que se guarda y lo que sale en el comprobante. */
export type Customer = RawCustomer;

export type CustomerErrors = Partial<Record<keyof RawCustomer, string>>;

export type ParseCustomerResult =
  | { ok: true; value: Customer }
  | { ok: false; errors: CustomerErrors };

/** Las 24 jurisdicciones. Es un select, no un campo libre: "Bs As" no despacha. */
export const PROVINCIAS = [
  "Buenos Aires",
  "Ciudad Autónoma de Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
] as const;

const MAX_NOTAS = 500;

/**
 * Deliberadamente laxa. Validar emails con una regex "completa" es una trampa
 * conocida: la del RFC tiene cientos de caracteres y igual acepta direcciones
 * que no existen. Esto descarta lo evidentemente roto; lo demás lo dice el
 * mail que rebota.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Solo dígitos y los separadores que la gente escribe, con un + opcional. */
const TELEFONO_ESCRITO = /^\+?[\d\s().-]+$/;

const DOCUMENTO = /^\d{7,8}$/;

/** CP viejo (1425) o CPA nuevo (C1425DKE). Los dos siguen circulando. */
const CP_VIEJO = /^\d{4}$/;
const CPA = /^[A-Z]\d{4}[A-Z]{3}$/;

export function parseCustomer(entrada: RawCustomer): ParseCustomerResult {
  const errors: CustomerErrors = {};

  // Un solo campo para nombre y apellido: es un dato menos que completar, y se
  // guarda junto igual porque va tal cual en la etiqueta del paquete.
  const name = entrada.name.trim().replace(/\s+/g, " ");
  if (!name) {
    errors.name = "Poné tu nombre y apellido.";
  } else if (name.split(" ").length < 2) {
    errors.name = "Falta el apellido: va en la etiqueta del envío.";
  }

  const email = entrada.email.trim().toLowerCase();
  if (!EMAIL.test(email)) {
    errors.email = "Revisá el mail: ahí te llega el comprobante.";
  }

  const phone = normalizarTelefono(entrada.phone);
  if (!phone) {
    errors.phone = "Poné un teléfono con característica, sin el 0 ni el 15.";
  }

  const docId = entrada.docId.trim().replace(/[.\s]/g, "");
  if (!DOCUMENTO.test(docId)) {
    errors.docId = "El DNI son 7 u 8 números, sin puntos.";
  }

  const street = entrada.street.trim();
  if (!street) errors.street = "Poné la calle y el número.";

  const city = entrada.city.trim();
  if (!city) errors.city = "Poné la localidad.";

  const province = provinciaCanonica(entrada.province);
  if (!province) errors.province = "Elegí una provincia de la lista.";

  const zip = entrada.zip.trim().toUpperCase();
  if (!CP_VIEJO.test(zip) && !CPA.test(zip)) {
    errors.zip = "Código postal: 4 números (1425) o el CPA (C1425DKE).";
  }

  const notes = entrada.notes.trim();
  if (notes.length > MAX_NOTAS) {
    errors.notes = `La nota no puede pasar de ${MAX_NOTAS} caracteres.`;
  }

  if (Object.keys(errors).length > 0 || !phone || !province) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      name,
      email,
      phone,
      docId,
      street,
      streetExtra: entrada.streetExtra.trim(),
      city,
      province,
      zip,
      notes,
    },
  };
}

/**
 * Deja solo dígitos y conserva el `+` inicial si estaba.
 *
 * La gente escribe "(011) 4321-1234", "11 2345 6789" y "+54 9 11...". Los tres
 * son el mismo dato con distinta puntuación: se guarda uno solo para poder
 * armar un link de WhatsApp sin adivinar. Devuelve `null` si no es un teléfono.
 */
function normalizarTelefono(entrada: string): string | null {
  const escrito = entrada.trim();

  if (!TELEFONO_ESCRITO.test(escrito)) return null;

  const digitos = escrito.replace(/\D/g, "");
  if (digitos.length < 8 || digitos.length > 15) return null;

  return escrito.startsWith("+") ? `+${digitos}` : digitos;
}

/**
 * El select manda un valor de la lista, pero un POST directo manda lo que
 * quiera. Se compara sin distinguir mayúsculas y se devuelve SIEMPRE la forma
 * canónica, así la base no termina con "santa fe", "Santa Fe" y "SANTA FE"
 * como si fueran tres provincias.
 */
function provinciaCanonica(entrada: string): string | null {
  const buscada = entrada.trim().toLowerCase();

  return PROVINCIAS.find((p) => p.toLowerCase() === buscada) ?? null;
}
