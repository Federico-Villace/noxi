"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { login, type LoginState } from "@/app/admin/actions";

const INICIAL: LoginState = {};

function Submit() {
  // `useFormStatus` tiene que leerse desde un hijo del <form>, no desde el
  // componente que lo declara: adentro del mismo, siempre daría `pending: false`.
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="label w-full border border-line-strong bg-chrome py-3 text-void transition-colors hover:bg-blood hover:text-chrome disabled:opacity-40"
    >
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(login, INICIAL);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="label text-silver">Contraseña</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          autoFocus
          required
          className="border border-line bg-carbon px-3 py-3 font-mono text-chrome outline-none focus:border-line-strong"
        />
      </label>

      {state.error ? (
        <p className="label text-blood" role="alert">
          {state.error}
        </p>
      ) : null}

      <Submit />
    </form>
  );
}
