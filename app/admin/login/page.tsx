import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/core/admin";
import { ADMIN_HOME_PATH } from "@/core/admin/domain/session-cookie";
import { LoginForm } from "@/components/admin/login-form";

export const metadata = {
  title: "Panel",
  // Un panel de administración no tiene por qué estar en Google.
  robots: { index: false, follow: false },
};

/**
 * Fuera del route group `(panel)`: es la única ruta de /admin que NO puede
 * estar detrás de la guardia, o no habría forma de llegar a loguearse.
 *
 * La redirección "ya estás adentro" se hace ACÁ y no en el proxy: acá se
 * verifica la firma de verdad. El proxy solo ve si la cookie existe, y con una
 * cookie vencida armaría un rebote infinito contra `requireAdmin`.
 */
export default async function LoginPage() {
  if (await isAdminAuthenticated()) redirect(ADMIN_HOME_PATH);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-20">
      <div className="w-full max-w-sm">
        <p className="label text-silver">NOXICLTS</p>
        <h1 className="mt-2 font-display text-2xl uppercase tracking-tight">
          Panel
        </h1>
        <div className="mt-6 mb-8 h-px w-full bg-blood" />

        <LoginForm />
      </div>
    </main>
  );
}
