"use client";
import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Field, Submit } from "@/components/ui";
export const dynamic = "force-dynamic";
export default function Access() {
  const [recovery, setRecovery] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <main className="auth-shell">
      <section className="auth-art">
        <img src="/assets/img/magic-allstars-logo.svg" alt="Magic All Stars" />
        <h1>
          Tu camino.
          <br />
          Tu progreso.
          <br />
          <em>Tu Magic.</em>
        </h1>
        <p>
          Un espacio para acompañar cada avance y celebrar todo lo que somos
          capaces de lograr.
        </p>
        <span className="giant-star" aria-hidden="true">
          ✦
        </span>
      </section>
      <section className="auth-form-wrap">
        <div className="auth-form">
          <span className="eyebrow">BIENVENIDA A MY MAGIC</span>
          <h1>
            {recovery ? "Recupera tu acceso" : "Aquí empieza tu próximo paso."}
          </h1>
          <p>
            {recovery
              ? "Te enviaremos las instrucciones a tu correo."
              : "Ingresa con la cuenta que te asignó la academia."}
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setMessage("");
              const f = new FormData(e.currentTarget);
              try {
                const res = await fetch("/api/auth", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: recovery ? "recovery" : "login",
                    email: f.get("email"),
                    password: f.get("password"),
                  }),
                });
                const d = await res.json();
                if (!res.ok) throw new Error(d.error);
                if (recovery) setMessage(d.message);
                else location.assign("/admin");
              } catch (e) {
                setMessage(
                  e instanceof Error ? e.message : "No pudimos conectar",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Correo electrónico">
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                required
                maxLength={254}
              />
            </Field>
            {!recovery && (
              <Field label="Contraseña">
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  maxLength={200}
                  placeholder="Tu contraseña"
                />
              </Field>
            )}
            {message && (
              <div className="alert error" role="status">
                {message}
              </div>
            )}
            <Submit busy={busy}>
              {recovery ? (
                "Enviar instrucciones"
              ) : (
                <>
                  Entrar a My Magic <ArrowRight size={17} />
                </>
              )}
            </Submit>
          </form>
          <div className="auth-links">
            <button
              className="text-btn"
              onClick={() => {
                setRecovery(!recovery);
                setMessage("");
              }}
            >
              {recovery ? "Volver al acceso" : "Olvidé mi contraseña"}
            </button>
            <Link href="/">Volver a la web</Link>
          </div>
          <div className="auth-divider" />
          <span className="privacy-pill">
            <ShieldCheck size={16} />
            Tu acceso protege la información de tu equipo.
          </span>
          <p className="form-note">
            ¿Aún no tienes cuenta? Solicita una invitación a administración.
          </p>
          <Link className="text-btn" href="/demo">
            Explorar la demostración <ArrowRight size={15} />
          </Link>
        </div>
      </section>
    </main>
  );
}
