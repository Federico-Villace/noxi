"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  ADMIN_HOME_PATH,
  ADMIN_LOGIN_PATH,
} from "@/core/admin/domain/session-cookie";
import { closeAdminSession, openAdminSession, requireAdmin } from "@/core/admin";
import {
  existingProductIds,
  imageStorage,
  productAdminRepository,
} from "@/core/catalog/admin";
import {
  parseProductDraft,
  type ProductDraftErrors,
  type RawProductDraft,
} from "@/core/catalog/domain/product-draft";

/**
 * Los server actions son endpoints POST de verdad: se los puede invocar con un
 * `curl` sin pasar nunca por la UI. Por eso TODOS empiezan con `requireAdmin()`
 * —ninguno confía en que el layout ya filtró— salvo el login, que es el que
 * justamente todavía no tiene sesión.
 */

// ─────────────────────────────────────────────────────────────── sesión ──

export interface LoginState {
  error?: string;
}

/**
 * Un intento fallido cuesta medio segundo. No frena a nadie con la contraseña
 * en la mano, pero convierte un ataque de diccionario de miles de intentos por
 * minuto en algo que no vale la pena empezar.
 */
const CASTIGO_MS = 500;

export async function login(
  _anterior: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");

  if (await openAdminSession(password)) redirect(ADMIN_HOME_PATH);

  await new Promise((resolve) => setTimeout(resolve, CASTIGO_MS));

  return { error: "Contraseña incorrecta." };
}

export async function logout(): Promise<void> {
  await closeAdminSession();
  redirect(ADMIN_LOGIN_PATH);
}

// ──────────────────────────────────────────────────────────── productos ──

export interface ProductFormState {
  errors: ProductDraftErrors;
  /** Falla que no es de un campo puntual (la base, la red). */
  message?: string;
}

function leerBorrador(formData: FormData): RawProductDraft {
  return {
    id: String(formData.get("id") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    price: String(formData.get("price") ?? ""),
    // `getAll`: el formulario manda un input hidden por foto cargada.
    images: formData.getAll("images").map(String),
    material: String(formData.get("material") ?? ""),
    stock: String(formData.get("stock") ?? ""),
    drop: String(formData.get("drop") ?? ""),
    // Un checkbox no marcado no viaja en el FormData: ausente es `false`.
    active: formData.get("active") === "on",
  };
}

/**
 * Alta y edición en una sola acción, distinguidas por el campo `mode`.
 *
 * Es la MISMA validación para las dos: si fueran dos funciones, tarde o
 * temprano una acepta algo que la otra rechaza y el catálogo queda con datos
 * que dependen de por qué pantalla entraron.
 */
export async function saveProduct(
  _anterior: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const esAlta = formData.get("mode") !== "edit";

  const parsed = parseProductDraft(leerBorrador(formData), {
    // Solo hace falta al dar de alta sin id, para autonumerar.
    existingIds: esAlta ? await existingProductIds() : [],
  });

  if (!parsed.ok) return { errors: parsed.errors };

  const guardado = esAlta
    ? await productAdminRepository.create(parsed.value)
    : await productAdminRepository.update(parsed.value);

  if (!guardado.ok) {
    const campo = guardado.reason === "slug-duplicado" ? "slug" : "id";
    return { errors: { [campo]: guardado.message } };
  }

  revalidarVitrina(parsed.value.slug);
  redirect(ADMIN_HOME_PATH);
}

/**
 * Baja y alta lógica: saca la pieza de la vitrina sin borrarla.
 *
 * Es lo que corresponde para algo que se vendió y se discontinuó — queda
 * navegable en el panel y se puede volver a publicar. Para lo cargado por
 * error está `deleteProduct`.
 */
export async function toggleProductActive(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const active = formData.get("active") === "true";

  if (!id) return;

  await productAdminRepository.setActive(id, active);

  revalidarVitrina(slug);
  revalidatePath(ADMIN_HOME_PATH);
}

type SubidaDeArchivo =
  | { ok: true; url: string }
  | { ok: false; message: string };

export interface UploadImagesResult {
  /** URLs subidas, en el mismo orden en que se eligieron los archivos. */
  urls: string[];
  /** Una línea por archivo que falló. El resto igual subió. */
  errors: string[];
}

/**
 * Sube varias fotos de una. Cada archivo se resuelve por separado: si una foto
 * pesa de más, las otras cuatro igual entran y el error habla solo de esa.
 * Un lote que se cae entero porque uno falló obliga a rehacer todo el trabajo.
 *
 * Las fotos viajan a Storage ANTES de guardar el producto, para poder
 * previsualizarlas. Si después se abandona el formulario quedan archivos
 * huérfanos en el bucket: es el precio de ver lo que estás cargando.
 */
export async function uploadProductImages(
  formData: FormData,
): Promise<UploadImagesResult> {
  await requireAdmin();

  const archivos = formData
    .getAll("files")
    .filter((f): f is File => f instanceof File && f.size > 0);

  const slug = String(formData.get("slug") ?? "").trim() || "sin-slug";

  if (archivos.length === 0) {
    return { urls: [], errors: ["No llegó ningún archivo."] };
  }

  // `Promise.all` con el try adentro de cada uno: se resuelven todos, ninguno
  // cancela a los demás, y el orden de selección se conserva.
  const resultados: SubidaDeArchivo[] = await Promise.all(
    archivos.map(async (archivo) => {
      try {
        return { ok: true as const, url: await imageStorage.upload(archivo, slug) };
      } catch (error) {
        console.error("[admin] fallo al subir una imagen", archivo.name, error);

        const detalle =
          error instanceof Error ? error.message : "no se pudo subir";

        return { ok: false as const, message: `${archivo.name}: ${detalle}` };
      }
    }),
  );

  return {
    urls: resultados.flatMap((r) => (r.ok ? [r.url] : [])),
    errors: resultados.flatMap((r) => (r.ok ? [] : [r.message])),
  };
}

/**
 * Borrado FÍSICO de una pieza. Irreversible.
 *
 * Es seguro: `order_lines` guarda título y precio como snapshot y no tiene
 * foreign key a `products`, así que las órdenes viejas siguen diciendo lo
 * mismo. Para una pieza que se vendió y se discontinuó conviene igual
 * `toggleProductActive`, que la saca de la vitrina y conserva el historial.
 */
export async function deleteProduct(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Se lee ANTES de borrar: después de que la fila no está, no hay forma de
  // saber qué fotos le pertenecían.
  const product = await productAdminRepository.findById(id);
  if (!product) redirect(ADMIN_HOME_PATH);

  await productAdminRepository.remove(id);

  // Las fotos van DESPUÉS de la fila y no lanzan. En el peor caso quedan
  // archivos huérfanos; al revés quedaría un producto publicado apuntando a
  // fotos que ya no existen, que es lo que sí ve una clienta.
  await imageStorage.remove(product.images);

  revalidarVitrina(product.slug);
  revalidatePath(ADMIN_HOME_PATH);
  redirect(ADMIN_HOME_PATH);
}

/**
 * La tienda cachea: home y ficha tienen `revalidate = 60`. Sin esto, una pieza
 * recién cargada tardaría hasta un minuto en aparecer y parecería que el panel
 * no guardó nada.
 */
function revalidarVitrina(slug: string): void {
  revalidatePath("/");
  if (slug) revalidatePath(`/producto/${slug}`);
}
