"use client";
import { useState } from "react";
import Link from "next/link";
import { Field, Submit } from "@/components/ui";
export const dynamic = "force-dynamic";
export default function Security() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  async function send(d: Record<string, unknown>) {
    const r = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    return data;
  }
  return (
    <main className="security-panel">
      <span className="eyebrow">PROTEGEMOS TU MAGIC</span>
      <h1>Seguridad de tu cuenta</h1>
      <p>
        Actualiza tu contraseña cuando lo necesites para proteger tu acceso.
      </p>
      {message && (
        <div className="alert error" role="status">
          {message}
        </div>
      )}
      <h2>Contraseña</h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          if (f.get("password") !== f.get("confirm")) {
            setMessage("Las contraseñas no coinciden");
            return;
          }
          setBusy(true);
          try {
            await send({ action: "password", password: f.get("password") });
            setMessage("Contraseña actualizada.");
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Nueva contraseña">
          <input
            type="password"
            name="password"
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            required
          />
        </Field>
        <Field label="Repite la contraseña">
          <input
            type="password"
            name="confirm"
            minLength={12}
            maxLength={128}
            autoComplete="new-password"
            required
          />
        </Field>
        <Submit busy={busy}>Actualizar contraseña</Submit>
      </form>
      <Link className="btn primary full space-top" href="/admin">
        Continuar a My Magic
      </Link>
      <Link className="text-btn" href="/acceso">
        Volver al acceso
      </Link>
    </main>
  );
}
