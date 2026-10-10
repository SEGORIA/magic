"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

function ActivationForm() {
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const token_hash = params.get("token_hash") ?? "";
  const type = params.get("type") ?? "";
  const valid = /^[a-f0-9]{32,256}$/i.test(token_hash) &&
    ["signup", "invite", "recovery", "email", "magiclink"].includes(type);

  async function activate() {
    if (!valid) return setMessage("El enlace de activación no es válido.");
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token_hash, type }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      location.replace("/seguridad");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "No pudimos activar tu acceso.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-art">
        <img src="/assets/img/magic-allstars-logo.svg" alt="Magic All Stars" />
        <h1>Tu Magic<br />empieza aquí.</h1>
        <p>Activa tu cuenta para acompañar cada avance de tu equipo.</p>
      </section>
      <section className="auth-form-wrap">
        <div className="auth-form">
          <span className="eyebrow">BIENVENIDA A MY MAGIC</span>
          <h1>Activa tu acceso</h1>
          <p>Confirma que deseas abrir tu cuenta antes de continuar.</p>
          {message && <div className="alert error" role="alert">{message}</div>}
          <button className="btn primary full" disabled={busy || !valid} onClick={activate}>
            {busy ? "Activando…" : <>Activar mi cuenta <ArrowRight size={17} /></>}
          </button>
          <p className="form-note"><ShieldCheck size={15} /> Este enlace es personal y de un solo uso.</p>
        </div>
      </section>
    </main>
  );
}

export default function ActivatePage() {
  return <Suspense fallback={<main className="center-page">Preparando tu acceso…</main>}><ActivationForm /></Suspense>;
}
