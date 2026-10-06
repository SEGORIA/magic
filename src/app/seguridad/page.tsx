"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Field, Submit } from "@/components/ui";
export const dynamic = "force-dynamic";
export default function Security() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [factor, setFactor] = useState(""),
    [qr, setQr] = useState(""),
    [secret, setSecret] = useState(""),
    [verified, setVerified] = useState(false);
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
  useEffect(() => {
    send({ action: "mfa-status" })
      .then((d) => {
        setFactor(d.factors?.[0]?.id ?? "");
        setVerified(d.level === "aal2");
      })
      .catch((e) => setMessage(e.message));
  }, []);
  return (
    <main className="security-panel">
      <span className="eyebrow">PROTEGEMOS TU MAGIC</span>
      <h1>Seguridad de tu cuenta</h1>
      <p>
        Configura tu contraseña y verifica tu acceso. Administración requiere un
        segundo factor.
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
      <h2>Segundo factor</h2>
      {verified ? (
        <p>Tu sesión está verificada.</p>
      ) : (
        <>
          {!factor && (
            <button
              className="btn secondary space-top"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const d = await send({ action: "mfa-enroll" });
                  setFactor(d.id);
                  setQr(d.qr);
                  setSecret(d.secret);
                } catch (e) {
                  setMessage((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Configurar aplicación autenticadora
            </button>
          )}
          {qr && (
            <>
              <p>Escanea este código con tu aplicación autenticadora.</p>
              <img
                className="qr"
                src={
                  qr.startsWith("data:")
                    ? qr
                    : `data:image/svg+xml,${encodeURIComponent(qr)}`
                }
                alt="Código QR para configurar segundo factor"
              />
              <p>
                Si no puedes escanear: <code>{secret}</code>
              </p>
            </>
          )}
          {factor && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                const f = new FormData(e.currentTarget);
                try {
                  await send({
                    action: "mfa-verify",
                    id: factor,
                    code: f.get("code"),
                  });
                  setVerified(true);
                  setSecret("");
                  setQr("");
                  setMessage("Segundo factor verificado. Ya puedes continuar.");
                } catch (e) {
                  setMessage((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Field label="Código de seis dígitos">
                <input
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  required
                  maxLength={6}
                />
              </Field>
              <Submit busy={busy}>Verificar acceso</Submit>
            </form>
          )}
        </>
      )}
      <Link className="btn primary full space-top" href="/admin">
        Continuar a My Magic
      </Link>
      <Link className="text-btn" href="/acceso">
        Volver al acceso
      </Link>
    </main>
  );
}
