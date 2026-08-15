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
 * Baja y alta lógica. Sin borrado físico: una pieza vendida es la referencia
 * de órdenes viejas y del comprobante que tiene la clienta.
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

export type UploadImageResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

/**
 * Sube una foto y devuelve su URL pública, para que el formulario la agregue a
 * la lista sin recargar. La foto viaja a Storage ANTES de que el producto se
 * guarde: si después se abandona el formulario, queda un archivo huérfano en
 * el bucket. Es el precio de poder previsualizar, y es barato.
 */
export async function uploadProductImage(
  formData: FormData,
): Promise<UploadImageResult> {
  await requireAdmin();

  const archivo = formData.get("file");
  const slug = String(formData.get("slug") ?? "").trim() || "sin-slug";

  if (!(archivo instanceof File)) {
    return { ok: false, message: "No llegó ningún archivo." };
  }

  try {
    return { ok: true, url: await imageStorage.upload(archivo, slug) };
  } catch (error) {
    console.error("[admin] fallo al subir la imagen", error);

    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo subir la imagen.",
    };
  }
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
