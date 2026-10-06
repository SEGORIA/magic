"use client";
import { useEffect, useRef, useState } from "react";
import { Maximize, Pause, Play, SkipForward } from "lucide-react";
import { TvCard } from "@/lib/domain";
export const dynamic = "force-dynamic";
export default function MagicTV() {
  const round = useRef(0),
    refreshRef = useRef<() => void>(() => {});
  const [cards, setCards] = useState<TvCard[]>([]),
    [index, setIndex] = useState(0),
    [message, setMessage] = useState("Conectando con tu Magic…"),
    [demo, setDemo] = useState(false),
    [paused, setPaused] = useState(false),
    [remaining, setRemaining] = useState(100);
  const validUntil = useRef(0),
    currentId = useRef<string | null>(null),
    cardsRef = useRef<TvCard[]>([]),
    sequence = useRef(0);
  useEffect(() => {
    const isDemo = new URLSearchParams(location.search).get("demo") === "1";
    setDemo(isDemo);
    if (isDemo) {
      const sample: TvCard[] = [
        {
          id: "1",
          type: "team",
          team: "Magic Love",
          title: "Magic Love",
          subtitle: "Un equipo. Muchas formas de brillar.",
          seconds: 12,
        },
        {
          id: "2",
          type: "athlete",
          team: "Magic Love",
          title: "Sofía",
          subtitle: "Mi camino Magic · Ejemplo ficticio",
          achievements: ["Rueda lateral", "High V"],
          goal: "Mantener la postura en toda la secuencia.",
          seconds: 10,
        },
        {
          id: "3",
          type: "athlete",
          team: "Magic Love",
          title: "Valentina",
          subtitle: "Mi camino Magic · Ejemplo ficticio",
          achievements: ["High V"],
          goal: "Continuar ganando confianza en cada entrenamiento.",
          seconds: 10,
        },
        {
          id: "4",
          type: "team",
          team: "Magic Beautiful",
          title: "Magic Beautiful",
          subtitle: "Donde empieza el camino.",
          seconds: 12,
        },
      ];
      cardsRef.current = sample;
      setCards(sample);
      return;
    }
    let alive = true;
    let running = false;
    const token = new URLSearchParams(location.hash.slice(1)).get("activate");
    if (token) history.replaceState(null, "", location.pathname);
    async function refresh() {
      if (running) return;
      running = true;
      const version = ++sequence.current;
      try {
        const r = await fetch(`/api/tv/feed?round=${round.current}`, {
          cache: "no-store",
        });
        const d = await r.json();
        if (!alive || version !== sequence.current) return;
        if (!r.ok) {
          if (r.status === 401 || r.status === 403) {
            validUntil.current = 0;
            cardsRef.current = [];
            setCards([]);
          }
          throw new Error(d.error);
        }
        validUntil.current = Math.min(Date.now() + 60000, Number(d.validUntil));
        const incoming: TvCard[] = d.cards;
        const ordered = incoming;
        cardsRef.current = ordered;
        setCards(ordered);
        setIndex((prev) => {
          const same = ordered.findIndex((c) => c.id === currentId.current);
          return same >= 0
            ? same
            : Math.min(prev, Math.max(0, ordered.length - 1));
        });
        setMessage(
          incoming.length
            ? ""
            : "Todo está listo. Los contenidos autorizados aparecerán aquí.",
        );
      } catch (e) {
        if (alive)
          setMessage(e instanceof Error ? e.message : "Esperando conexión…");
      } finally {
        running = false;
      }
    }
    (async () => {
      try {
        if (token) {
          const r = await fetch("/api/tv/activate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
          const d = await r.json();
          if (!r.ok) throw new Error(d.error);
        }
        await refresh();
      } catch (e) {
        if (alive) setMessage((e as Error).message);
      }
    })();
    refreshRef.current = refresh;
    const interval = setInterval(refresh, 30000);
    function expire() {
      if (validUntil.current && Date.now() >= validUntil.current) {
        cardsRef.current = [];
        setCards([]);
        setMessage(
          "Reconectando… Tu Magic vuelve en cuanto recuperemos la conexión.",
        );
      }
    }
    const expiry = setInterval(expire, 500);
    document.addEventListener("visibilitychange", expire);
    return () => {
      alive = false;
      clearInterval(interval);
      clearInterval(expiry);
      document.removeEventListener("visibilitychange", expire);
    };
  }, []);
  const card = cards[index];
  useEffect(() => {
    currentId.current = card?.id ?? null;
    setRemaining(100);
    if (!card || paused) return;
    const start = Date.now(),
      duration = card.seconds * 1000;
    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      setRemaining(Math.max(0, 100 - (elapsed / duration) * 100));
      if (elapsed >= duration) {
        const next = (index + 1) % Math.max(1, cardsRef.current.length);
        if (next === 0) {
          round.current++;
          refreshRef.current();
        }
        setIndex(next);
        clearInterval(timer);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [card?.id, card?.seconds, paused, index]);
  return (
    <main className="tv-stage">
      {demo && <div className="tv-demo">DEMOSTRACIÓN · DATOS FICTICIOS</div>}
      <header className="tv-top">
        <div className="tv-brand">
          <img
            src="/assets/img/magic-allstars-logo.svg"
            alt="Magic All Stars"
          />
          MAGIC TV
        </div>
        <span className="tag">{card?.team ?? "Cada avance cuenta"}</span>
      </header>
      {card ? (
        <section className="tv-content" aria-live="off">
          {card.image ? (
            <img
              key={card.image}
              className={card.type === "photo" ? "tv-photo" : "tv-portrait"}
              src={card.image}
              alt={card.type === "photo" ? card.title : `Foto de ${card.title}`}
            />
          ) : (
            <div className="tv-emblem" aria-hidden="true">
              ✦
            </div>
          )}
          <div>
            <span className="eyebrow">{card.subtitle}</span>
            <h1>{card.title}</h1>
            {card.achievements && (
              <div className="tv-badges">
                {card.achievements.length ? (
                  card.achievements.map((s) => <span key={s}>✧ {s}</span>)
                ) : (
                  <p>Cada entrenamiento abre un nuevo camino.</p>
                )}
              </div>
            )}
            {card.goal && <p>Próximo reto · {card.goal}</p>}
            {card.type === "team" && (
              <p>
                Celebramos el esfuerzo.
                <br />
                Crecemos juntos.
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className="tv-content">
          <div className="tv-emblem">✦</div>
          <div>
            <span className="eyebrow">MY MAGIC</span>
            <h1>Cada avance cuenta.</h1>
            <p role="status">{message}</p>
          </div>
        </section>
      )}
      <footer>
        <div className="tv-bottom">
          <span>Your journey. Your progress. Your Magic.</span>
          <span>
            {card ? `${index + 1} / ${cards.length}` : "MAGIC ALL STARS"}
          </span>
        </div>
        <div className="tv-progress">
          <span style={{ width: `${remaining}%` }} />
        </div>
      </footer>
      <div className="tv-controls">
        <button
          className="icon-btn"
          aria-label={paused ? "Continuar" : "Pausar"}
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play /> : <Pause />}
        </button>
        <button
          className="icon-btn"
          aria-label="Siguiente tarjeta"
          onClick={() => setIndex((i) => (i + 1) % Math.max(1, cards.length))}
        >
          <SkipForward />
        </button>
        <button
          className="icon-btn"
          aria-label="Pantalla completa"
          onClick={() =>
            document.documentElement
              .requestFullscreen()
              .catch(() =>
                setMessage("Activa pantalla completa desde el navegador."),
              )
          }
        >
          <Maximize />
        </button>
      </div>
    </main>
  );
}
