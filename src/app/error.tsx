"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="center-page">
      <h1>No pudimos cargar esta página</h1>
      <p>Tu información guardada no se ha perdido.</p>
      <button className="btn primary" onClick={reset}>
        Intentar de nuevo
      </button>
      <a href="/acceso">Volver al acceso</a>
    </main>
  );
}
