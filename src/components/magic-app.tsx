"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronRight,
  Home,
  Users,
  ShieldCheck,
  MonitorPlay,
  ImagePlus,
  Sparkles,
  Search,
  Plus,
  Settings,
  LogOut,
  Menu,
  X,
  BookOpen,
  Star,
  Clock,
  Upload,
  Link2,
  Trash2,
  UserRound,
  Heart,
  CheckCircle2,
  AlertCircle,
  Copy,
  ListTodo,
} from "lucide-react";
import { demoSnapshot } from "@/lib/demo";
import {
  Athlete,
  Evaluation,
  latestEvaluations,
  Media,
  progress,
  Role,
  Snapshot,
} from "@/lib/domain";
import { Avatar, Empty, Field, Modal, ProgressBar, Submit } from "./ui";

const sectionNames: Record<string, string> = {
  inicio: "Vista general",
  deportistas: "Deportistas",
  equipos: "Equipos",
  entrenadores: "Personas y accesos",
  metodologia: "Mapa de habilidades",
  momentos: "Momentos Magic",
  tareas: "Tareas y metas",
  pantallas: "Magic TV",
  perfil: "Mi perfil",
};
type DialogState = { type: string; id?: string };
export default function MagicApp({
  area,
  section,
  configured,
}: {
  area: string;
  section: string;
  configured: boolean;
}) {
  const demo = area === "demo",
    router = useRouter();
  const [data, setData] = useState<Snapshot | null>(
      demo ? demoSnapshot() : null,
    ),
    [error, setError] = useState(""),
    [toast, setToast] = useState("");
  const [role, setRole] = useState<Role>(
    area === "coach" ? "coach" : area === "mi-magic" ? "family" : "admin",
  );
  const [team, setTeam] = useState("all"),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState<string | null>(null),
    [dialog, setDialog] = useState<DialogState | null>(null),
    [busy, setBusy] = useState(false),
    [mobile, setMobile] = useState(false),
    [link, setLink] = useState("");
  async function load() {
    if (demo) return;
    try {
      const res = await fetch("/api/snapshot", { cache: "no-store" });
      const d = await res.json();
      if (res.status === 401) {
        router.replace("/acceso");
        return;
      }
      if (res.status === 428) {
        router.replace("/seguridad");
        return;
      }
      if (!res.ok) throw new Error(d.error);
      if (!d.roles.includes(role)) {
        router.replace(
          d.roles.includes("admin")
            ? "/admin"
            : d.roles.includes("coach")
              ? "/coach"
              : "/mi-magic",
        );
        return;
      }
      setData(d);
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos cargar tu información",
      );
    }
  }
  useEffect(() => {
    load();
  }, []); // Session access is revalidated by every API call.
  useEffect(() => {
    setSelected(null);
    setSearch("");
    setMobile(false);
  }, [section]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 6500);
    return () => clearTimeout(timer);
  }, [toast]);
  const isAdmin = role === "admin",
    staff = role !== "family";
  const me = demo
    ? role === "coach"
      ? "coach-5"
      : role === "family"
        ? "family-demo"
        : "admin-demo"
    : data?.profile.id;
  const visibleTeams = useMemo(
    () =>
      data?.teams.filter(
        (t) =>
          t.active &&
          (isAdmin ||
            !demo ||
            (role === "coach" &&
              data.assignments.some(
                (a) => a.coach_id === me && a.team_id === t.id,
              )) ||
            (role === "family" &&
              data.memberships.some(
                (m) =>
                  m.team_id === t.id &&
                  data.guardians.some(
                    (g) => g.user_id === me && g.athlete_id === m.athlete_id,
                  ),
              ))),
      ) ?? [],
    [data, role, me, demo, isAdmin],
  );
  const athletes =
    data?.athletes.filter(
      (a) =>
        (team === "all" ||
          data.memberships.some(
            (m) => m.athlete_id === a.id && m.team_id === team,
          )) &&
        (!demo ||
          isAdmin ||
          (role === "coach" &&
            data.memberships.some(
              (m) =>
                m.athlete_id === a.id &&
                visibleTeams.some((t) => t.id === m.team_id),
            )) ||
          (role === "family" &&
            data.guardians.some(
              (g) => g.user_id === me && g.athlete_id === a.id,
            ))) &&
        a.name.toLowerCase().includes(search.toLowerCase()),
    ) ?? [];
  const pending =
    data?.media.filter(
      (m) =>
        m.status === "pending" &&
        m.kind !== "avatar" &&
        (isAdmin ||
          m.team_ids.some((t) => visibleTeams.some((v) => v.id === t))),
    ) ?? [];
  const currentName = demo
    ? role === "admin"
      ? "Administración"
      : role === "coach"
        ? "Milton"
        : "Familia Magic"
    : data?.profile.name.split(" ")[0];
  async function command(action: string, d: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      if (demo) {
        if (action === "evaluate")
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  evaluations: [
                    ...prev.evaluations,
                    {
                      ...d,
                      team_id: prev.skills.find((s) => s.id === d.skill_id)!
                        .team_id,
                      author_id: me,
                      created_at: new Date().toISOString(),
                      revision_of: d.revision_of || null,
                    } as Evaluation,
                  ],
                }
              : prev,
          );
        else if (action === "draft_save")
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  drafts: [
                    ...(prev.drafts ?? []).filter(
                      (x) =>
                        !(
                          x.athlete_id === d.athlete_id &&
                          x.skill_id === d.skill_id
                        ),
                    ),
                    {
                      id: crypto.randomUUID(),
                      athlete_id: String(d.athlete_id),
                      skill_id: String(d.skill_id),
                      payload: d as Partial<Evaluation>,
                    },
                  ],
                }
              : prev,
          );
        else if (action === "athlete_save")
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  athletes: d.id
                    ? prev.athletes.map((a) =>
                        a.id === d.id ? ({ ...a, ...d } as Athlete) : a,
                      )
                    : [
                        ...prev.athletes,
                        {
                          id: crypto.randomUUID(),
                          ...d,
                          tv_consent: false,
                          photo_id: null,
                        } as Athlete,
                      ],
                }
              : prev,
          );
        else if (action === "media_review")
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  media: prev.media.map((m) =>
                    m.id === d.id
                      ? {
                          ...m,
                          status: d.approve ? "approved" : "rejected",
                          tv: !!d.tv,
                          portal: !!d.portal,
                        }
                      : m,
                  ),
                }
              : prev,
          );
        else if (action === "media_withdraw")
          setData((prev) =>
            prev
              ? { ...prev, media: prev.media.filter((m) => m.id !== d.id) }
              : prev,
          );
        else if (action === "coach_assign")
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  assignments: d.remove
                    ? prev.assignments.filter(
                        (a) =>
                          !(
                            a.coach_id === d.coach_id && a.team_id === d.team_id
                          ),
                      )
                    : [
                        ...prev.assignments,
                        {
                          coach_id: String(d.coach_id),
                          team_id: String(d.team_id),
                        },
                      ],
                }
              : prev,
          );
        else if (action === "skill_create")
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  skills: [
                    ...prev.skills,
                    {
                      id: crypto.randomUUID(),
                      name: String(d.name),
                      team_id: String(d.team_id),
                      area: String(d.area),
                      criteria: d.criteria as string[],
                      active: true,
                    },
                  ],
                }
              : prev,
          );
        else if (action === "task_create")
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  tasks: [
                    ...prev.tasks,
                    {
                      id: crypto.randomUUID(),
                      team_id: String(d.team_id),
                      title: String(d.title),
                      instructions: String(d.instructions ?? ""),
                      due_at: d.due_at ? String(d.due_at) : null,
                      active: true,
                      created_by: me!,
                      created_at: new Date().toISOString(),
                    },
                  ],
                }
              : prev,
          );
        else if (action === "monthly_goal_save")
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  monthlyGoals: [
                    ...prev.monthlyGoals.filter(
                      (g) =>
                        !(
                          g.team_id === d.team_id &&
                          g.skill_id === d.skill_id &&
                          g.month === d.month
                        ),
                    ),
                    {
                      id: crypto.randomUUID(),
                      team_id: String(d.team_id),
                      skill_id: String(d.skill_id),
                      month: String(d.month),
                      note: String(d.note ?? ""),
                    },
                  ],
                }
              : prev,
          );
        else if (action === "coach_profile_save")
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  coachProfiles: [
                    ...prev.coachProfiles.filter((p) => p.user_id !== me),
                    {
                      user_id: me!,
                      headline: String(d.headline ?? ""),
                      bio: String(d.bio ?? ""),
                      phone: String(d.phone ?? ""),
                      specialty: String(d.specialty ?? ""),
                      admin_approved: false,
                      admin_note: "Pendiente de revisión por administración.",
                      updated_at: new Date().toISOString(),
                    },
                  ],
                }
              : prev,
          );
        else if (action === "coach_profile_review")
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  coachProfiles: [
                    ...prev.coachProfiles.filter(
                      (profile) => profile.user_id !== d.user_id,
                    ),
                    {
                      user_id: String(d.user_id),
                      headline:
                        prev.coachProfiles.find(
                          (profile) => profile.user_id === d.user_id,
                        )?.headline ?? "",
                      bio:
                        prev.coachProfiles.find(
                          (profile) => profile.user_id === d.user_id,
                        )?.bio ?? "",
                      phone:
                        prev.coachProfiles.find(
                          (profile) => profile.user_id === d.user_id,
                        )?.phone ?? "",
                      specialty:
                        prev.coachProfiles.find(
                          (profile) => profile.user_id === d.user_id,
                        )?.specialty ?? "",
                      admin_approved: !!d.approved,
                      admin_note: String(d.admin_note ?? ""),
                      updated_at: new Date().toISOString(),
                    },
                  ],
                }
              : prev,
          );
        else if (action === "membership")
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  memberships: d.remove
                    ? prev.memberships.filter(
                        (m) =>
                          !(
                            m.athlete_id === d.athlete_id &&
                            m.team_id === d.team_id
                          ),
                      )
                    : [
                        ...prev.memberships,
                        {
                          athlete_id: String(d.athlete_id),
                          team_id: String(d.team_id),
                        },
                      ],
                }
              : prev,
          );
        else if (action === "consent")
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  athletes: prev.athletes.map((a) =>
                    a.id === d.athlete_id
                      ? { ...a, tv_consent: !!d.allowed }
                      : a,
                  ),
                }
              : prev,
          );
        else {
          setToast(
            "Recorrido de demostración: esta acción se guardará al conectar el sistema real.",
          );
          setDialog(null);
          return;
        }
        setToast("Cambio de ejemplo aplicado. Se restablece al recargar.");
      } else {
        const res = await fetch("/api/command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, data: d }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        await load();
        setToast(
          result.warning ?? "Listo. Los cambios se guardaron correctamente.",
        );
      }
      setDialog(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "No pudimos guardar los cambios",
      );
    } finally {
      setBusy(false);
    }
  }
  const nav = [
    { key: "inicio", icon: Home, label: "Vista general" },
    {
      key: "deportistas",
      icon: Users,
      label: staff ? "Deportistas" : "Mis deportistas",
    },
    ...(staff ? [{ key: "equipos", icon: Heart, label: "Mis equipos" }] : []),
    ...(isAdmin
      ? [
          {
            key: "entrenadores",
            icon: ShieldCheck,
            label: "Personas y accesos",
          },
          { key: "metodologia", icon: BookOpen, label: "Habilidades" },
        ]
      : []),
    { key: "tareas", icon: ListTodo, label: "Tareas y metas" },
    { key: "momentos", icon: ImagePlus, label: "Momentos Magic" },
    ...(isAdmin
      ? [{ key: "pantallas", icon: MonitorPlay, label: "Magic TV" }]
      : []),
  ];
  const teamName = (id: string) =>
    data?.teams.find((t) => t.id === id)?.name ?? "Equipo";
  const athleteTeam = (id: string) =>
    data?.memberships
      .filter((m) => m.athlete_id === id)
      .map((m) => teamName(m.team_id))
      .join(" · ") || "Sin equipo asignado";
  function athleteProgress(a: Athlete) {
    const tids = data!.memberships
      .filter(
        (m) => m.athlete_id === a.id && (team === "all" || m.team_id === team),
      )
      .map((m) => m.team_id);
    return progress(
      data!.skills.filter((s) => s.active && tids.includes(s.team_id)),
      data!.evaluations.filter(
        (e) => e.athlete_id === a.id && tids.includes(e.team_id),
      ),
    );
  }
  if (!data)
    return (
      <main className="center-page">
        <img
          src="/assets/img/magic-allstars-logo.svg"
          width="110"
          alt="Magic All Stars"
        />
        <h1>
          {error ? "Vamos a conectar tu Magic" : "Preparando tu espacio…"}
        </h1>
        <p>{error || "Un momento, estamos verificando tu acceso."}</p>
        {error && (
          <>
            <button className="btn primary" onClick={load}>
              Volver a intentar
            </button>
            <Link href="/demo">Explorar la demostración</Link>
            <Link href="/acceso">Ir al acceso</Link>
          </>
        )}
      </main>
    );
  const chosen = data.athletes.find((a) => a.id === selected);
  const totals = athletes.reduce((n, a) => n + athleteProgress(a).mastered, 0);
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Saltar al contenido
      </a>
      {mobile && (
        <button
          aria-label="Cerrar menú"
          className="sidebar-scrim"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "open" : ""}`}>
        <Link href={`/${area}`} className="brand">
          <img src="/assets/img/magic-allstars-logo.svg" alt="" />
          <span>
            my magic<span className="brand-dot">✦</span>
            <small>EVERY SKILL COUNTS</small>
          </span>
        </Link>
        <div className="workspace-label">
          TU ESPACIO MAGIC{" "}
          <span>
            {role === "admin"
              ? "ADMIN"
              : role === "coach"
                ? "COACH"
                : "FAMILIA"}
          </span>
        </div>
        <nav aria-label="Navegación principal">
          {nav.map((n) => (
            <Link
              key={n.key}
              onClick={() => setSelected(null)}
              className={section === n.key ? "active" : ""}
              href={`/${area}/${n.key}`}
            >
              <n.icon size={19} />
              <span>{n.label}</span>
              {n.key === "momentos" && pending.length > 0 && staff && (
                <b className="nav-count">{pending.length}</b>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Sparkles size={20} />
            <strong>
              El progreso se construye
              <br />
              un día a la vez.
            </strong>
            <span>Tu equipo. Tu camino. Tu Magic.</span>
          </div>
          <Link href={`/${area}/perfil`}>
            <Settings size={18} />
            Mi perfil
          </Link>
          <Link href="/seguridad">
            <ShieldCheck size={18} />
            Seguridad de mi cuenta
          </Link>
          <button
            onClick={async () => {
              if (!demo)
                await fetch("/api/auth", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "logout" }),
                });
              router.push("/acceso");
            }}
          >
            <LogOut size={18} />
            Salir
          </button>
        </div>
      </aside>
      <div className="app-main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-menu"
              onClick={() => setMobile(true)}
              aria-label="Abrir menú"
            >
              <Menu />
            </button>
            <span>My Magic</span>
            <ChevronRight size={14} />
            <strong>{sectionNames[section] ?? "Vista general"}</strong>
          </div>
          <div className="topbar-right">
            {!demo && data.roles.length > 1 && (
              <select
                aria-label="Cambiar espacio de trabajo"
                value={role}
                onChange={(e) => {
                  const r = e.target.value as Role;
                  setRole(r);
                  router.push(
                    r === "admin"
                      ? "/admin"
                      : r === "coach"
                        ? "/coach"
                        : "/mi-magic",
                  );
                }}
              >
                {data.roles.map((r) => (
                  <option key={r} value={r}>
                    {r === "admin"
                      ? "Administración"
                      : r === "coach"
                        ? "Entrenador"
                        : "Familia"}
                  </option>
                ))}
              </select>
            )}
            <span className="privacy-pill">
              <ShieldCheck size={14} />
              Espacio privado
            </span>
            <Avatar
              name={data.profile.name}
              id={demo ? null : data.profile.avatar_id}
            />
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            <span>
              <strong>Demostración</strong> · Datos ficticios. Los cambios no se
              guardan.
            </span>
            <label>
              Ver como{" "}
              <select
                aria-label="Rol de demostración"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as Role);
                  setTeam("all");
                  setSelected(null);
                }}
              >
                <option value="admin">Administrador</option>
                <option value="coach">Entrenador</option>
                <option value="family">Familia</option>
              </select>
            </label>
          </div>
        )}
        <main id="main" className="content">
          {error && (
            <div className="alert error" role="alert">
              <AlertCircle size={18} />
              {error}
              <button
                className="icon-btn"
                onClick={() => setError("")}
                aria-label="Cerrar aviso"
              >
                <X size={16} />
              </button>
            </div>
          )}
          {chosen ? (
            <>
              <button
                className="text-btn back"
                onClick={() => setSelected(null)}
              >
                <ArrowLeft size={16} />
                Volver a deportistas
              </button>
              <div className="athlete-hero panel">
                <Avatar name={chosen.name} id={chosen.photo_id} size="large" />
                <div>
                  <span className="eyebrow">MI CAMINO MAGIC</span>
                  <h1>{chosen.name}</h1>
                  <p>{athleteTeam(chosen.id)}</p>
                  <span className={`tag ${chosen.active ? "green" : ""}`}>
                    {chosen.active ? "Deportista activa" : "Inactiva"}
                  </span>
                </div>
                <div className="hero-actions">
                  {staff && (
                    <button
                      className="btn primary"
                      onClick={() =>
                        setDialog({ type: "evaluate", id: chosen.id })
                      }
                    >
                      <Plus size={18} />
                      Registrar avance
                    </button>
                  )}
                  <button
                    className="btn secondary"
                    onClick={() => setDialog({ type: "photo", id: chosen.id })}
                  >
                    <ImagePlus size={17} />
                    Cambiar foto
                  </button>
                  {isAdmin && (
                    <button
                      className="btn secondary"
                      onClick={() =>
                        setDialog({ type: "athlete-settings", id: chosen.id })
                      }
                    >
                      Gestionar ficha
                    </button>
                  )}
                </div>
              </div>
              <div className="stats-grid three">
                <Stat
                  label="Habilidades validadas"
                  value={athleteProgress(chosen).mastered}
                  note="Reconocidas por su coach"
                  icon={<Star />}
                />
                <Stat
                  label="Criterios logrados"
                  value={
                    athleteProgress(chosen).percent === null
                      ? "—"
                      : `${athleteProgress(chosen).percent}%`
                  }
                  note={`Cobertura evaluada: ${athleteProgress(chosen).coverage}%`}
                  icon={<Sparkles />}
                />
                <Stat
                  label="Próximo paso"
                  value="Seguir creciendo"
                  note="A su ritmo, con su equipo"
                  icon={<Heart />}
                />
              </div>
              <div className="split-grid">
                <section className="panel">
                  <PanelTitle
                    title="Su mapa de habilidades"
                    subtitle="Cada pequeño avance tiene un lugar aquí"
                  />
                  {data.skills
                    .filter(
                      (s) =>
                        s.active &&
                        data.memberships.some(
                          (m) =>
                            m.athlete_id === chosen.id &&
                            m.team_id === s.team_id,
                        ),
                    )
                    .map((s) => {
                      const e = latestEvaluations(
                        data.evaluations.filter(
                          (e) => e.athlete_id === chosen.id,
                        ),
                      ).find((e) => e.skill_id === s.id);
                      return (
                        <div className="skill-row" key={s.id}>
                          <span
                            className={`skill-symbol ${e?.mastered ? "achieved" : ""}`}
                          >
                            {e?.mastered ? (
                              <Check size={18} />
                            ) : (
                              <Star size={18} />
                            )}
                          </span>
                          <div>
                            <strong>{s.name}</strong>
                            <small>
                              {s.area} · {teamName(s.team_id)}
                            </small>
                          </div>
                          <span className={`tag ${e?.mastered ? "green" : ""}`}>
                            {e?.mastered
                              ? "Validada"
                              : e
                                ? "En proceso"
                                : "Sin evaluar"}
                          </span>
                        </div>
                      );
                    })}
                  {!data.skills.some((s) =>
                    data.memberships.some(
                      (m) =>
                        m.athlete_id === chosen.id && m.team_id === s.team_id,
                    ),
                  ) && (
                    <Empty title="Un nuevo camino">
                      El coach publicará aquí las habilidades de su equipo.
                    </Empty>
                  )}
                </section>
                <section className="panel">
                  <PanelTitle
                    title="Bitácora de progreso"
                    subtitle="Comentarios y próximos retos"
                  />
                  {[...data.evaluations]
                    .filter((e) => e.athlete_id === chosen.id)
                    .sort((a, b) => b.created_at.localeCompare(a.created_at))
                    .map((e) => (
                      <article className="timeline-item" key={e.id}>
                        <span className="timeline-dot" />
                        <small>
                          {new Date(e.created_at).toLocaleDateString("es-CO")} ·{" "}
                          {data.skills.find((s) => s.id === e.skill_id)?.name}
                        </small>
                        <p>{e.comment || "Evaluación técnica registrada."}</p>
                        {e.next_goal && (
                          <div className="goal">
                            <Sparkles size={15} />
                            {e.next_goal}
                          </div>
                        )}
                      </article>
                    ))}
                  {!data.evaluations.some(
                    (e) => e.athlete_id === chosen.id,
                  ) && (
                    <Empty title="Su historia empieza aquí">
                      Los avances publicados aparecerán en esta bitácora.
                    </Empty>
                  )}
                </section>
              </div>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    {section === "inicio"
                      ? "CRECEMOS EN EQUIPO"
                      : "MAGIC ALL STARS"}
                  </span>
                  <h1>
                    {section === "inicio"
                      ? `Hola, ${currentName} ${role === "family" ? "♡" : "✦"}`
                      : (sectionNames[section] ?? "Tu espacio Magic")}
                  </h1>
                  <p>
                    {section === "inicio"
                      ? "Un nuevo día para acompañar grandes avances."
                      : section === "momentos"
                        ? "Los pequeños momentos también cuentan nuestra historia."
                        : section === "tareas"
                          ? "Un reto claro, una meta compartida y cada avance con propósito."
                          : section === "pantallas"
                            ? "Toda la magia del equipo, en una sola pantalla."
                            : section === "deportistas"
                              ? "Cada deportista tiene un camino único. Acompáñalo."
                              : section === "metodologia"
                                ? "Define criterios claros antes de empezar a evaluar."
                                : "Todo en su lugar, para concentrarnos en crecer."}
                  </p>
                </div>
                {section === "deportistas" && isAdmin && (
                  <button
                    className="btn primary"
                    onClick={() => setDialog({ type: "athlete" })}
                  >
                    <Plus size={18} />
                    Nueva deportista
                  </button>
                )}
                {section === "momentos" && (
                  <button
                    className="btn primary"
                    onClick={() => setDialog({ type: "upload" })}
                  >
                    <Upload size={18} />
                    {isAdmin ? "Subir fotos oficiales" : "Subir fotos"}
                  </button>
                )}
                {section === "tareas" && (
                  <button
                    className="btn primary"
                    onClick={() =>
                      setDialog({ type: staff ? "task" : "task-submit" })
                    }
                  >
                    {staff ? <Plus size={18} /> : <Upload size={18} />}
                    {staff ? "Nueva tarea" : "Entregar tarea"}
                  </button>
                )}
                {section === "entrenadores" && isAdmin && (
                  <button
                    className="btn primary"
                    onClick={() => setDialog({ type: "invite" })}
                  >
                    <Plus size={18} />
                    Invitar persona
                  </button>
                )}
                {section === "metodologia" && isAdmin && (
                  <button
                    className="btn primary"
                    onClick={() => setDialog({ type: "skill" })}
                  >
                    <Plus size={18} />
                    Nueva habilidad
                  </button>
                )}
                {section === "pantallas" && isAdmin && (
                  <button
                    className="btn primary"
                    onClick={() => {
                      setLink("");
                      setDialog({ type: "tv" });
                    }}
                  >
                    <Plus size={18} />
                    Conectar pantalla
                  </button>
                )}
                {section === "equipos" && isAdmin && (
                  <button
                    className="btn primary"
                    onClick={() => setDialog({ type: "team" })}
                  >
                    <Plus size={18} />
                    Nuevo equipo
                  </button>
                )}
              </div>
              {section === "inicio" && (
                <>
                  <div className="welcome-banner">
                    <div>
                      <span className="tag translucent">
                        <Sparkles size={13} /> CADA AVANCE CUENTA
                      </span>
                      <h2>
                        Pequeños pasos.
                        <br />
                        <em>Grandes historias.</em>
                      </h2>
                      <p>
                        Acompaña el progreso, reconoce el esfuerzo
                        <br className="desktop-only" /> y celebra lo que nos
                        hace Magic.
                      </p>
                      <button
                        className="btn white"
                        onClick={() => router.push(`/${area}/deportistas`)}
                      >
                        {staff ? "Ver deportistas" : "Ver su progreso"}
                        <ArrowRight size={17} />
                      </button>
                    </div>
                    <div className="banner-art" aria-hidden="true">
                      <div className="orbit orbit-one" />
                      <div className="orbit orbit-two" />
                      <div className="art-star">✦</div>
                      <span className="art-small one">✧</span>
                      <span className="art-small two">✦</span>
                      <span className="art-label">
                        <Star size={15} /> El esfuerzo deja huella
                      </span>
                    </div>
                  </div>
                  <div className="stats-grid">
                    <Stat
                      label={staff ? "Deportistas activas" : "Mis deportistas"}
                      value={athletes.filter((a) => a.active).length}
                      note="Historias que acompañamos"
                      icon={<Users />}
                    />
                    <Stat
                      label="Equipos"
                      value={visibleTeams.length}
                      note="Una misma familia Magic"
                      icon={<Heart />}
                    />
                    <Stat
                      label="Habilidades validadas"
                      value={totals}
                      note="Logros en el currículo actual"
                      icon={<Star />}
                    />
                    <Stat
                      label={staff ? "Fotos por revisar" : "Fotos aportadas"}
                      value={
                        staff
                          ? pending.length
                          : data.media.filter(
                              (m) => m.owner_id === me && m.kind === "family",
                            ).length
                      }
                      note={
                        staff
                          ? "Momentos esperando su turno"
                          : "Gracias por compartir"
                      }
                      icon={<ImagePlus />}
                    />
                  </div>
                  <div className="split-grid">
                    <section className="panel">
                      <PanelTitle
                        title={
                          staff
                            ? "Tus equipos, de un vistazo"
                            : "Su camino continúa"
                        }
                        subtitle="Personas que hacen posible la magia"
                        action={
                          <Link
                            href={`/${area}/${staff ? "equipos" : "deportistas"}`}
                          >
                            Ver todos <ArrowUpRight size={14} />
                          </Link>
                        }
                      />
                      {visibleTeams.slice(0, 4).map((t) => (
                        <button
                          className="team-row"
                          key={t.id}
                          onClick={() => {
                            setTeam(t.id);
                            router.push(`/${area}/deportistas`);
                          }}
                        >
                          <span
                            className="team-icon"
                            style={{
                              background: `${t.color}16`,
                              color: t.color,
                            }}
                          >
                            <Star size={21} />
                          </span>
                          <div>
                            <strong>{t.name}</strong>
                            <small>
                              {
                                data.memberships.filter(
                                  (m) =>
                                    m.team_id === t.id &&
                                    data.athletes.some(
                                      (a) => a.id === m.athlete_id && a.active,
                                    ),
                                ).length
                              }{" "}
                              deportistas{t.age_label && ` · ${t.age_label}`}
                            </small>
                          </div>
                          <ChevronRight size={17} />
                        </button>
                      ))}
                      {!visibleTeams.length && (
                        <Empty title="Prepara tu primer equipo">
                          Las asignaciones aparecerán aquí.
                        </Empty>
                      )}
                    </section>
                    <section className="panel">
                      <PanelTitle
                        title="Para seguir avanzando"
                        subtitle="Un paso a la vez"
                      />
                      <button
                        className="action-row"
                        onClick={() => router.push(`/${area}/momentos`)}
                      >
                        <span className="action-symbol pink">
                          <ImagePlus />
                        </span>
                        <div>
                          <strong>
                            {staff
                              ? "Revisa los momentos del equipo"
                              : "Comparte un momento especial"}
                          </strong>
                          <small>
                            {staff
                              ? `${pending.length} fotos pendientes de revisión`
                              : "Sube una foto para la próxima vuelta de Magic TV"}
                          </small>
                        </div>
                        <ArrowRight size={17} />
                      </button>
                      {isAdmin ? (
                        <button
                          className="action-row"
                          onClick={() => router.push(`/${area}/pantallas`)}
                        >
                          <span className="action-symbol violet">
                            <MonitorPlay />
                          </span>
                          <div>
                            <strong>Lleva el progreso a Magic TV</strong>
                            <small>
                              Configura una pantalla desde tu perfil
                            </small>
                          </div>
                          <ArrowRight size={17} />
                        </button>
                      ) : (
                        <button
                          className="action-row"
                          onClick={() => router.push(`/${area}/deportistas`)}
                        >
                          <span className="action-symbol violet">
                            <Sparkles />
                          </span>
                          <div>
                            <strong>
                              {staff
                                ? "Registra un nuevo avance"
                                : "Descubre sus últimos logros"}
                            </strong>
                            <small>Todo comienza con su ficha deportiva</small>
                          </div>
                          <ArrowRight size={17} />
                        </button>
                      )}
                      <div className="quote-card">
                        <span>“</span>
                        <p>
                          No todos los días ganamos una medalla.
                          <br />
                          <strong>Todos los días podemos avanzar.</strong>
                        </p>
                        <small>EL ESPÍRITU MAGIC</small>
                      </div>
                    </section>
                  </div>
                </>
              )}
              {section === "deportistas" && (
                <>
                  <div className="filters">
                    <label className="search">
                      <Search size={18} />
                      <input
                        aria-label="Buscar deportista"
                        placeholder="Buscar por nombre…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    <select
                      aria-label="Filtrar por equipo"
                      value={team}
                      onChange={(e) => setTeam(e.target.value)}
                    >
                      <option value="all">Todos mis equipos</option>
                      {visibleTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <span>{athletes.length} deportistas</span>
                  </div>
                  <div className="athlete-grid">
                    {athletes.map((a) => {
                      const p = athleteProgress(a);
                      return (
                        <button
                          className="athlete-card"
                          key={a.id}
                          onClick={() => setSelected(a.id)}
                        >
                          <div className="card-top">
                            <Avatar
                              name={a.name}
                              id={a.photo_id}
                              size="medium"
                            />
                            <span className={`tag ${a.active ? "green" : ""}`}>
                              {a.active ? "Activa" : "Inactiva"}
                            </span>
                          </div>
                          <h3>{a.name}</h3>
                          <p>{athleteTeam(a.id)}</p>
                          <div className="progress-label">
                            <span>Criterios logrados</span>
                            <strong>
                              {p.percent === null
                                ? "Sin evaluar"
                                : `${p.percent}%`}
                            </strong>
                          </div>
                          <ProgressBar value={p.percent} />
                          <small>Cobertura evaluada: {p.coverage}%</small>
                          <div className="card-footer">
                            <span>
                              <Star size={15} />
                              {p.mastered} habilidades validadas
                            </span>
                            <ArrowUpRight size={18} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {!athletes.length && (
                    <Empty title="No hay deportistas en esta vista">
                      Prueba otro nombre o equipo. Administración puede crear la
                      primera ficha.
                    </Empty>
                  )}
                </>
              )}
              {section === "equipos" && staff && (
                <div className="team-grid">
                  {visibleTeams.map((t) => (
                    <section className="panel team-card" key={t.id}>
                      <span
                        className="team-icon"
                        style={{ background: `${t.color}16`, color: t.color }}
                      >
                        <Star />
                      </span>
                      <h2>{t.name}</h2>
                      <p>
                        {t.age_label || "Rango de edad pendiente de definir"}
                      </p>
                      <div className="coach-chips">
                        {data.assignments
                          .filter((a) => a.team_id === t.id)
                          .map((a) => (
                            <span className="tag" key={a.coach_id}>
                              {data.profiles.find((p) => p.id === a.coach_id)
                                ?.name ?? "Coach asignado"}
                            </span>
                          ))}
                      </div>
                      <p>
                        <strong>
                          {
                            data.memberships.filter((m) => m.team_id === t.id)
                              .length
                          }
                        </strong>{" "}
                        deportistas vinculadas
                      </p>
                      <button
                        className="btn secondary full"
                        onClick={() => {
                          setTeam(t.id);
                          router.push(`/${area}/deportistas`);
                        }}
                      >
                        Ver equipo
                        <ArrowRight size={17} />
                      </button>
                      {isAdmin && (
                        <button
                          className="text-btn"
                          onClick={() =>
                            setDialog({ type: "assign", id: t.id })
                          }
                        >
                          Gestionar coaches
                        </button>
                      )}
                    </section>
                  ))}
                </div>
              )}
              {section === "entrenadores" && isAdmin && (
                <>
                  <div className="notice">
                    <ShieldCheck size={20} />
                    <p>
                      <strong>El acceso se asigna, no se elige.</strong> Invita
                      a coaches y familias, y vincula sus equipos o deportistas
                      después de que acepten la invitación.
                    </p>
                  </div>
                  <section className="panel">
                    <PanelTitle
                      title="Personas vinculadas"
                      subtitle="Las bajas conservan el historial deportivo"
                    />
                    {data.profiles.map((p) => (
                      <div className="person-row" key={p.id}>
                        <Avatar name={p.name} id={p.avatar_id} />
                        <div>
                          <strong>{p.name}</strong>
                          <small>
                            {data.assignments
                              .filter((a) => a.coach_id === p.id)
                              .map((a) => teamName(a.team_id))
                              .join(" · ") || "Sin equipos como coach"}
                          </small>
                        </div>
                        {data.roleAssignments?.some(
                          (r) => r.user_id === p.id && r.role === "coach",
                        ) ||
                        data.assignments.some((a) => a.coach_id === p.id) ? (
                          <div className="media-actions">
                            <button
                              className="btn secondary"
                              onClick={() =>
                                setDialog({
                                  type: "coach-profile-review",
                                  id: p.id,
                                })
                              }
                            >
                              Ver perfil
                            </button>
                            <button
                              className="btn subtle"
                              onClick={() =>
                                setDialog({ type: "remove-coach", id: p.id })
                              }
                            >
                              Retirar como coach
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn secondary"
                            onClick={() =>
                              setDialog({ type: "restore-coach", id: p.id })
                            }
                          >
                            Habilitar como coach
                          </button>
                        )}
                      </div>
                    ))}
                  </section>
                  <section className="panel space-top">
                    <PanelTitle
                      title="Invitaciones"
                      subtitle="El correo debe pertenecer a la persona invitada"
                    />
                    {data.invitations.map((i) => (
                      <div className="person-row" key={i.id}>
                        <span className="action-symbol pink">
                          <UserRound />
                        </span>
                        <div>
                          <strong>{i.name}</strong>
                          <small>
                            {i.email} ·{" "}
                            {i.role === "coach" ? "Coach" : "Familia"}
                          </small>
                        </div>
                        <span className="tag">
                          {i.claimed_at ? "Aceptada" : "Pendiente"}
                        </span>
                      </div>
                    ))}
                    {!data.invitations.length && (
                      <Empty title="Sin invitaciones pendientes">
                        Crea una invitación para sumar a alguien a Magic.
                      </Empty>
                    )}
                  </section>
                </>
              )}
              {section === "metodologia" && isAdmin && (
                <>
                  <div className="notice">
                    <BookOpen size={20} />
                    <p>
                      <strong>La técnica la define Magic.</strong> Cada
                      habilidad requiere criterios concretos. Solo puede
                      validarse cuando se cumplen todos y el entrenador lo
                      confirma.
                    </p>
                  </div>
                  <div className="team-grid">
                    {data.skills
                      .filter((s) => s.active)
                      .map((s) => (
                        <section className="panel" key={s.id}>
                          <span className="tag pink">{s.area}</span>
                          <h3>{s.name}</h3>
                          <p>{teamName(s.team_id)}</p>
                          <ul className="criteria-list">
                            {s.criteria.map((c, i) => (
                              <li key={i}>
                                <CheckCircle2 size={15} />
                                {c}
                              </li>
                            ))}
                          </ul>
                          <button
                            className="text-btn"
                            onClick={() =>
                              setDialog({ type: "archive-skill", id: s.id })
                            }
                          >
                            Archivar habilidad
                          </button>
                        </section>
                      ))}
                  </div>
                  {!data.skills.length && (
                    <Empty title="Define el primer mapa de habilidades">
                      Agrega criterios aprobados por la academia. No se cargarán
                      niveles o porcentajes inventados.
                    </Empty>
                  )}
                </>
              )}
              {section === "tareas" && (
                <>
                  <div className="notice">
                    <ListTodo size={20} />
                    <p>
                      <strong>
                        Metas que se entienden y se pueden celebrar.
                      </strong>{" "}
                      Las entregas en imagen quedan privadas para la familia y
                      el equipo docente.
                    </p>
                  </div>
                  {staff && (
                    <div className="form-actions space-bottom">
                      <button
                        className="btn secondary"
                        onClick={() => setDialog({ type: "monthly-goal" })}
                      >
                        <Sparkles size={17} /> Definir habilidad del mes
                      </button>
                      <button
                        className="btn secondary"
                        onClick={() => setDialog({ type: "task-submit" })}
                      >
                        <Upload size={17} /> Subir evidencia
                      </button>
                    </div>
                  )}
                  <div className="split-grid">
                    <section className="panel">
                      <PanelTitle
                        title="Tareas activas"
                        subtitle="El equipo acompaña cada entrega"
                      />
                      {data.tasks
                        .filter(
                          (t) =>
                            t.active &&
                            visibleTeams.some((team) => team.id === t.team_id),
                        )
                        .map((t) => {
                          const deliveries = data.media.filter(
                            (m) => m.kind === "task" && m.task_id === t.id,
                          );
                          return (
                            <article className="timeline-item" key={t.id}>
                              <span className="timeline-dot" />
                              <small>
                                {teamName(t.team_id)}
                                {t.due_at
                                  ? ` · Entrega: ${new Date(t.due_at).toLocaleDateString("es-CO")}`
                                  : " · Sin fecha límite"}
                              </small>
                              <h3>{t.title}</h3>
                              <p>
                                {t.instructions ||
                                  "Consulta con tu profe los detalles de esta actividad."}
                              </p>
                              {staff ? (
                                <small>
                                  {deliveries.length} evidencia(s) recibida(s)
                                </small>
                              ) : (
                                <span className="tag green">
                                  {deliveries.some(
                                    (m) =>
                                      m.athlete_id &&
                                      data.guardians.some(
                                        (g) =>
                                          g.user_id === me &&
                                          g.athlete_id === m.athlete_id,
                                      ),
                                  )
                                    ? "Evidencia enviada"
                                    : "Pendiente por enviar"}
                                </span>
                              )}
                            </article>
                          );
                        })}
                      {!data.tasks.some(
                        (t) =>
                          t.active &&
                          visibleTeams.some((team) => team.id === t.team_id),
                      ) && (
                        <Empty title="El próximo reto está por llegar">
                          Las profes publicarán aquí tareas claras para cada
                          equipo.
                        </Empty>
                      )}
                    </section>
                    <section className="panel">
                      <PanelTitle
                        title="Habilidades para este mes"
                        subtitle="Un foco común para avanzar en equipo"
                      />
                      {data.monthlyGoals
                        .filter((g) =>
                          visibleTeams.some((t) => t.id === g.team_id),
                        )
                        .sort((a, b) => b.month.localeCompare(a.month))
                        .map((g) => (
                          <div className="skill-row" key={g.id}>
                            <span className="skill-symbol">
                              <Star size={18} />
                            </span>
                            <div>
                              <strong>
                                {data.skills.find((s) => s.id === g.skill_id)
                                  ?.name ?? "Habilidad"}
                              </strong>
                              <small>
                                {teamName(g.team_id)} ·{" "}
                                {new Date(
                                  `${g.month}T12:00:00`,
                                ).toLocaleDateString("es-CO", {
                                  month: "long",
                                  year: "numeric",
                                })}
                              </small>
                              {g.note && <small>{g.note}</small>}
                            </div>
                          </div>
                        ))}
                      {!data.monthlyGoals.some((g) =>
                        visibleTeams.some((t) => t.id === g.team_id),
                      ) && (
                        <Empty title="Meta mensual por definir">
                          El equipo verá aquí la habilidad que guiará su
                          práctica del mes.
                        </Empty>
                      )}
                    </section>
                  </div>
                  {staff && data.media.some((m) => m.kind === "task") && (
                    <section className="panel space-top">
                      <PanelTitle
                        title="Evidencias recibidas"
                        subtitle="Revisa y acompaña cada avance"
                      />
                      <div className="media-grid">
                        {data.media
                          .filter(
                            (m) =>
                              m.kind === "task" &&
                              m.team_ids.some((id) =>
                                visibleTeams.some((t) => t.id === id),
                              ),
                          )
                          .map((m) => (
                            <article className="media-card" key={m.id}>
                              <div className="media-image">
                                {demo ? (
                                  <div className="demo-image">
                                    <Upload size={42} />
                                    <span>Evidencia de tarea</span>
                                  </div>
                                ) : (
                                  <img
                                    src={`/api/media/${m.id}`}
                                    alt={m.title}
                                  />
                                )}
                              </div>
                              <div className="media-body">
                                <h3>{m.title}</h3>
                                <p>
                                  {
                                    data.athletes.find(
                                      (a) => a.id === m.athlete_id,
                                    )?.name
                                  }
                                </p>
                                <span
                                  className={`tag ${m.status === "approved" ? "green" : "pink"}`}
                                >
                                  {statusName(m.status)}
                                </span>
                                <div className="media-actions">
                                  <button
                                    className="btn secondary"
                                    onClick={() =>
                                      setDialog({
                                        type: "task-review",
                                        id: m.id,
                                      })
                                    }
                                  >
                                    Revisar entrega
                                  </button>
                                </div>
                              </div>
                            </article>
                          ))}
                      </div>
                    </section>
                  )}
                </>
              )}
              {section === "momentos" && (
                <>
                  <div className="notice">
                    <ImagePlus size={20} />
                    <p>
                      {isAdmin ? (
                        <>
                          <strong>
                            Fotos oficiales y momentos de las familias.
                          </strong>{" "}
                          Revisa cada foto, elige su destino y acompaña la
                          historia de cada equipo.
                        </>
                      ) : (
                        <>
                          <strong>Comparte algo que merezca recordarse.</strong>{" "}
                          Las fotos familiares pasan por revisión antes de
                          entrar al ciclo de su equipo en Magic TV.
                        </>
                      )}
                    </p>
                  </div>
                  <div className="filters">
                    <span className="tag pink">
                      {staff ? `${pending.length} por revisar` : "Mis equipos"}
                    </span>
                    <select
                      aria-label="Equipo de las fotos"
                      value={team}
                      onChange={(e) => setTeam(e.target.value)}
                    >
                      <option value="all">Todos mis equipos</option>
                      {visibleTeams.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="media-grid">
                    {data.media
                      .filter(
                        (m) =>
                          m.kind !== "avatar" &&
                          m.status !== "uploading" &&
                          (team === "all" || m.team_ids.includes(team)) &&
                          (!demo ||
                            isAdmin ||
                            m.owner_id === me ||
                            m.team_ids.some((t) =>
                              visibleTeams.some((v) => v.id === t),
                            )),
                      )
                      .map((m) => (
                        <article className="media-card" key={m.id}>
                          <div className="media-image">
                            {demo ? (
                              <div className="demo-image">
                                <Sparkles size={48} />
                                <span>Imagen de demostración</span>
                              </div>
                            ) : (
                              <img src={`/api/media/${m.id}`} alt={m.title} />
                            )}
                            <span
                              className={`tag ${m.status === "approved" ? "green" : "pink"}`}
                            >
                              {statusName(m.status)}
                            </span>
                          </div>
                          <div className="media-body">
                            <small>
                              {m.kind === "official"
                                ? "OFICIAL MAGIC"
                                : m.kind === "athlete"
                                  ? "FOTO DEPORTIVA"
                                  : "APORTE FAMILIAR"}
                            </small>
                            <h3>{m.title}</h3>
                            <p>
                              {m.team_ids.map(teamName).join(" · ") ||
                                "Ficha individual"}
                            </p>
                            {m.status === "approved" && (
                              <small>
                                {m.tv
                                  ? "Magic TV · en cola según su equipo"
                                  : "Solo portal privado"}
                              </small>
                            )}
                            {m.reason && (
                              <p className="review-reason">{m.reason}</p>
                            )}
                            <div className="media-actions">
                              {staff && m.status !== "withdrawn" && (
                                <button
                                  className="btn secondary"
                                  onClick={() =>
                                    setDialog({ type: "review", id: m.id })
                                  }
                                >
                                  Revisar foto
                                </button>
                              )}
                              {(staff || m.owner_id === me) &&
                                m.status !== "withdrawn" && (
                                  <button
                                    className="icon-btn"
                                    aria-label={`Retirar ${m.title}`}
                                    onClick={() =>
                                      setDialog({ type: "withdraw", id: m.id })
                                    }
                                  >
                                    <Trash2 size={18} />
                                  </button>
                                )}
                            </div>
                          </div>
                        </article>
                      ))}
                  </div>
                  {!data.media.some(
                    (m) => m.kind !== "avatar" && m.status !== "uploading",
                  ) && (
                    <Empty title="Aquí viven los momentos del equipo">
                      Sube la primera foto. Las aportadas por familias
                      aparecerán en Magic TV después de aceptarlas.
                    </Empty>
                  )}
                </>
              )}
              {section === "pantallas" && isAdmin && (
                <>
                  <div className="tv-promo">
                    <div>
                      <span className="eyebrow">MAGIC EN PANTALLA GRANDE</span>
                      <h2>
                        Su esfuerzo merece
                        <br />
                        ser visto.
                      </h2>
                      <p>
                        Equipos, deportistas y fotos aprobadas.
                        <br />
                        Una misma historia, en un ciclo automático.
                      </p>
                      <Link
                        href="/magic-tv?demo=1"
                        className="btn white"
                        target="_blank"
                      >
                        Ver demostración
                        <ArrowUpRight size={17} />
                      </Link>
                    </div>
                    <div className="tv-mock">
                      <MonitorPlay size={62} />
                      <strong>MAGIC TV</strong>
                      <span>Every skill counts ✦</span>
                    </div>
                  </div>
                  <div className="notice">
                    <Link2 size={20} />
                    <p>
                      Genera el enlace, ábrelo una vez en el televisor y deja
                      que Magic continúe. No requiere verificaciones diarias de
                      los entrenadores.
                    </p>
                  </div>
                  <div className="team-grid">
                    {data.devices.map((d) => (
                      <section className="panel" key={d.id}>
                        <MonitorPlay />
                        <h3>{d.name}</h3>
                        <span className={`tag ${d.active ? "green" : ""}`}>
                          {d.active ? "Autorizada" : "Acceso retirado"}
                        </span>
                        <p>{d.team_ids.map(teamName).join(" · ")}</p>
                        <small>
                          Última conexión:{" "}
                          {d.last_seen_at
                            ? new Date(d.last_seen_at).toLocaleString("es-CO")
                            : "Aún no se ha conectado"}
                        </small>
                        {d.active && (
                          <>
                            <button
                              className="btn secondary full space-top"
                              onClick={() => {
                                setLink("");
                                setDialog({ type: "tv", id: d.id });
                              }}
                            >
                              Ajustar contenido y tiempos
                            </button>
                            <button
                              className="btn secondary full space-top"
                              onClick={() =>
                                setDialog({ type: "revoke-tv", id: d.id })
                              }
                            >
                              Retirar acceso
                            </button>
                          </>
                        )}
                      </section>
                    ))}
                  </div>
                  {!data.devices.length && (
                    <Empty title="Conecta la primera pantalla">
                      El enlace de activación es de un solo uso. El televisor
                      conservará su acceso.
                    </Empty>
                  )}
                </>
              )}
              {section === "perfil" && (
                <section className="panel profile-panel">
                  <Avatar
                    name={data.profile.name}
                    id={data.profile.avatar_id}
                    size="large"
                  />
                  <h2>{demo ? currentName : data.profile.name}</h2>
                  <p>
                    {role === "coach"
                      ? "Tu perfil profesional para acompañar a tus equipos."
                      : "Tu espacio dentro de la familia Magic."}
                  </p>
                  {role === "coach" &&
                    (() => {
                      const coachProfile = data.coachProfiles.find(
                        (profile) => profile.user_id === me,
                      );
                      return (
                        <>
                          {coachProfile?.headline && (
                            <strong>{coachProfile.headline}</strong>
                          )}
                          {coachProfile?.specialty && (
                            <small>{coachProfile.specialty}</small>
                          )}
                          <span
                            className={`tag ${coachProfile?.admin_approved ? "green" : "pink"}`}
                          >
                            {coachProfile?.admin_approved
                              ? "Perfil revisado por administración"
                              : "Perfil pendiente de revisión"}
                          </span>
                          <button
                            className="btn primary"
                            onClick={() => setDialog({ type: "coach-profile" })}
                          >
                            <UserRound size={18} /> Completar mi perfil de coach
                          </button>
                        </>
                      );
                    })()}
                  <button
                    className="btn primary"
                    onClick={() => setDialog({ type: "photo" })}
                  >
                    <ImagePlus size={18} />
                    Cambiar foto de perfil
                  </button>
                  {data.profile.avatar_id && (
                    <button
                      className="text-btn"
                      onClick={() =>
                        command("media_withdraw", {
                          id: data.profile.avatar_id,
                        })
                      }
                    >
                      Quitar foto
                    </button>
                  )}
                  <Link href="/seguridad" className="btn secondary">
                    Contraseña y segundo factor
                  </Link>
                </section>
              )}
            </>
          )}
          <footer className="app-footer">
            <span>
              Magic All Stars <span className="pink-text">✦</span> Cada avance
              cuenta.
            </span>
            <span>Hecho para crecer en equipo</span>
          </footer>
        </main>
      </div>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={20} />
          {toast}
          <button
            className="icon-btn"
            onClick={() => setToast("")}
            aria-label="Cerrar notificación"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {dialog && (
        <Modal
          title={dialogTitle(dialog.type)}
          onClose={() => {
            if (!busy) {
              setDialog(null);
              setError("");
            }
          }}
        >
          <DialogContent
            dialog={dialog}
            data={data}
            teamList={visibleTeams}
            isAdmin={isAdmin}
            currentRole={role}
            me={me!}
            demo={demo}
            busy={busy}
            setBusy={setBusy}
            error={error}
            setError={setError}
            command={command}
            done={async (message) => {
              setDialog(null);
              setToast(message);
              await load();
            }}
            tvLink={link}
            setTvLink={setLink}
            setData={setData}
          />
        </Modal>
      )}
    </div>
  );
}
function statusName(s: string) {
  return (
    (
      {
        pending: "Pendiente de revisión",
        approved: "Aceptada",
        rejected: "Rechazada",
        withdrawn: "Retirada",
      } as Record<string, string>
    )[s] ?? s
  );
}
function Stat({
  label,
  value,
  note,
  icon,
}: {
  label: string;
  value: string | number;
  note: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="stat">
      <div className="stat-top">
        <span>{label}</span>
        <span className="stat-icon">{icon}</span>
      </div>
      <strong
        className={
          typeof value === "string" && value.length > 10 ? "stat-text" : ""
        }
      >
        {value}
      </strong>
      <small>{note}</small>
    </div>
  );
}
function PanelTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="panel-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
function dialogTitle(type: string) {
  return (
    (
      {
        athlete: "Nueva deportista",
        evaluate: "Registrar un avance",
        upload: "Compartir fotos",
        photo: "Foto de perfil",
        review: "Revisar foto",
        invite: "Invitar a Magic",
        assign: "Asignar coaches",
        skill: "Nueva habilidad",
        task: "Nueva tarea",
        "task-submit": "Entregar tarea en imagen",
        "task-review": "Revisar evidencia",
        "monthly-goal": "Habilidad a lograr este mes",
        "coach-profile": "Mi perfil de coach",
        "coach-profile-review": "Perfil del entrenador",
        tv: "Conectar Magic TV",
        team: "Nuevo equipo",
        "athlete-settings": "Gestionar ficha",
        withdraw: "Retirar foto",
        "remove-coach": "Retirar entrenador",
        "restore-coach": "Habilitar acceso de entrenador",
        "archive-skill": "Archivar habilidad",
        "revoke-tv": "Retirar acceso de pantalla",
      } as Record<string, string>
    )[type] ?? "Gestionar"
  );
}

type DialogProps = {
  dialog: DialogState;
  data: Snapshot;
  teamList: Snapshot["teams"];
  isAdmin: boolean;
  currentRole: Role;
  me: string;
  demo: boolean;
  busy: boolean;
  setBusy: (b: boolean) => void;
  error: string;
  setError: (s: string) => void;
  command: (a: string, d: Record<string, unknown>) => Promise<void>;
  done: (s: string) => Promise<void>;
  tvLink: string;
  setTvLink: (s: string) => void;
  setData: React.Dispatch<React.SetStateAction<Snapshot | null>>;
};
function DialogContent(p: DialogProps) {
  const { dialog, data, teamList, busy, command } = p;
  const device = data.devices.find((d) => d.id === dialog.id);
  const [skill, setSkill] = useState(""),
    [scores, setScores] = useState<boolean[]>([]),
    [files, setFiles] = useState<File[]>([]),
    [uploadProgress, setUploadProgress] = useState(""),
    [subform, setSubform] = useState("membership");
  const draft = data.drafts?.find(
    (d) => d.athlete_id === dialog.id && d.skill_id === skill,
  )?.payload;
  const options = teamList.map((t) => (
    <option value={t.id} key={t.id}>
      {t.name}
    </option>
  ));
  const a = data.athletes.find((a) => a.id === dialog.id),
    m = data.media.find((m) => m.id === dialog.id);
  const formError = p.error && (
    <div role="alert" className="alert error">
      {p.error}
    </div>
  );
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const d = Object.fromEntries(f);
    p.setError("");
    if (dialog.type === "athlete")
      return command("athlete_save", { ...d, active: true });
    if (dialog.type === "team") return command("team_save", d);
    if (dialog.type === "invite") return command("invite", d);
    if (dialog.type === "assign")
      return command("coach_assign", {
        ...d,
        team_id: dialog.id,
        remove: d.operation === "remove",
      });
    if (dialog.type === "skill")
      return command("skill_create", {
        ...d,
        criteria: String(d.criteria)
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      });
    if (dialog.type === "task")
      return command("task_create", {
        ...d,
        due_at: d.due_at
          ? new Date(`${d.due_at}T23:59:59-05:00`).toISOString()
          : null,
      });
    if (dialog.type === "monthly-goal") return command("monthly_goal_save", d);
    if (dialog.type === "coach-profile")
      return command("coach_profile_save", d);
    if (dialog.type === "coach-profile-review")
      return command("coach_profile_review", {
        user_id: dialog.id,
        approved: d.approved === "yes",
        admin_note: d.admin_note,
      });
    if (dialog.type === "task-review")
      return command("task_review", {
        id: dialog.id,
        approve: d.decision === "approve",
        reason: d.reason,
      });
    if (dialog.type === "athlete-settings") {
      if (subform === "membership")
        return command("membership", {
          ...d,
          athlete_id: dialog.id,
          remove: d.operation === "remove",
        });
      if (subform === "guardian")
        return command("guardian_link", {
          ...d,
          athlete_id: dialog.id,
          remove: d.operation === "remove",
        });
      if (subform === "consent")
        return command("consent", {
          athlete_id: dialog.id,
          allowed: d.allowed === "yes",
          evidence: d.evidence,
        });
      return command("athlete_save", {
        id: dialog.id,
        name: d.name,
        display_name: d.display_name,
        active: d.active === "yes",
      });
    }
    if (dialog.type === "evaluate") {
      const previous = latestEvaluations(
        data.evaluations.filter((e) => e.athlete_id === dialog.id),
      ).find((e) => e.skill_id === skill);
      const draftOnly =
        (e.nativeEvent as SubmitEvent).submitter?.getAttribute("name") ===
        "save-draft";
      return command(draftOnly ? "draft_save" : "evaluate", {
        id: crypto.randomUUID(),
        athlete_id: dialog.id,
        skill_id: skill,
        scores,
        mastered: d.mastered === "on",
        comment: d.comment,
        next_goal: d.next_goal,
        revision_of: previous?.id ?? null,
      });
    }
    if (dialog.type === "review")
      return command("media_review", {
        id: dialog.id,
        approve: d.decision === "approve",
        consent_verified: d.consent === "on",
        tv: d.tv === "on",
        portal: d.portal === "on",
        reason: d.reason,
        evidence: d.evidence,
        subject_ids: f.getAll("subject_ids"),
        expires_at: d.expires
          ? new Date(`${d.expires}T23:59:59-05:00`).toISOString()
          : null,
      });
    if (dialog.type === "tv") {
      p.setBusy(true);
      try {
        if (p.demo) {
          p.setTvLink(`${location.origin}/magic-tv?demo=1`);
          return;
        }
        const res = await fetch("/api/admin/tv", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...d,
            action: dialog.id ? "update" : "create",
            id: dialog.id,
            team_ids: f.getAll("team_ids"),
            photos_enabled: d.photos_enabled === "on",
          }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error);
        if (dialog.id) await p.done("Configuración de pantalla actualizada.");
        else p.setTvLink(result.url);
      } catch (e) {
        p.setError(
          e instanceof Error ? e.message : "No pudimos crear la pantalla",
        );
      } finally {
        p.setBusy(false);
      }
      return;
    }
    if (["upload", "photo", "task-submit"].includes(dialog.type)) {
      if (!files.length) {
        p.setError("Selecciona al menos una foto");
        return;
      }
      p.setBusy(true);
      const kind =
        dialog.type === "task-submit"
          ? "task"
          : dialog.type === "photo"
            ? dialog.id
              ? "athlete"
              : "avatar"
            : p.isAdmin
              ? "official"
              : "family";
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (
            file.size > 10485760 ||
            !["image/jpeg", "image/png", "image/webp"].includes(file.type)
          )
            throw new Error(
              "Cada foto debe ser JPG, PNG o WebP y pesar máximo 10 MB.",
            );
          setUploadProgress(`Subiendo foto ${i + 1} de ${files.length}…`);
          const info = {
            title: String(d.title || file.name),
            team_ids:
              p.isAdmin && dialog.type === "upload"
                ? f.getAll("team_ids")
                : d.team_id
                  ? [d.team_id]
                  : [],
            kind,
            athlete_id:
              dialog.type === "task-submit"
                ? String(d.athlete_id)
                : (dialog.id ?? null),
            task_id: dialog.type === "task-submit" ? d.task_id : null,
          };
          if (p.demo) {
            p.setData((prev) =>
              prev
                ? {
                    ...prev,
                    media: [
                      ...prev.media,
                      {
                        ...info,
                        id: crypto.randomUUID(),
                        owner_id: p.me,
                        team_ids: info.team_ids as string[],
                        kind: kind as Media["kind"],
                        task_id: info.task_id ? String(info.task_id) : null,
                        status: "pending",
                        portal: false,
                        tv: false,
                        expires_at: null,
                        created_at: new Date().toISOString(),
                        reason: null,
                      },
                    ],
                  }
                : prev,
            );
            continue;
          }
          const start = await fetch("/api/media/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(info),
          });
          const target = await start.json();
          if (!start.ok) throw new Error(target.error);
          const uploaded = await fetch(target.url, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!uploaded.ok)
            throw new Error("No se pudo subir la imagen. Intenta de nuevo.");
          const finish = await fetch("/api/media/finalize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: target.id }),
          });
          const result = await finish.json();
          if (!finish.ok) throw new Error(result.error);
        }
        await p.done(
          p.demo
            ? "Fotos de ejemplo agregadas. No se guardaron archivos."
            : kind === "avatar"
              ? "Tu foto de perfil se actualizó."
              : "Fotos subidas. Ya puedes revisar su estado en Momentos Magic.",
        );
      } catch (e) {
        p.setError(
          e instanceof Error ? e.message : "No pudimos subir las fotos",
        );
      } finally {
        p.setBusy(false);
        setUploadProgress("");
      }
      return;
    }
  }
  if (dialog.type === "restore-coach")
    return (
      <div className="modal-body">
        <p>
          Esta cuenta podrá recibir asignaciones como entrenador. Sus otros
          permisos se conservarán.
        </p>
        {formError}
        <button
          className="btn primary"
          disabled={busy}
          onClick={() => command("coach_restore", { id: dialog.id })}
        >
          Habilitar como coach
        </button>
      </div>
    );
  if (
    ["withdraw", "remove-coach", "archive-skill", "revoke-tv"].includes(
      dialog.type,
    )
  )
    return (
      <div className="modal-body">
        <p>
          Esta acción retira el acceso o la publicación actual. El historial se
          conserva.
        </p>
        {formError}
        <button
          disabled={busy}
          className="btn primary"
          onClick={async () => {
            if (dialog.type === "revoke-tv") {
              if (p.demo) {
                await p.done(
                  "Demostración: no hay pantallas reales conectadas.",
                );
                return;
              }
              p.setBusy(true);
              try {
                const r = await fetch("/api/admin/tv", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "revoke", id: dialog.id }),
                });
                const d = await r.json();
                if (!r.ok) throw new Error(d.error);
                await p.done("Acceso de pantalla retirado.");
              } catch (e) {
                p.setError(
                  e instanceof Error ? e.message : "No se pudo retirar",
                );
              } finally {
                p.setBusy(false);
              }
            } else
              await command(
                dialog.type === "withdraw"
                  ? "media_withdraw"
                  : dialog.type === "remove-coach"
                    ? "coach_remove"
                    : "skill_archive",
                { id: dialog.id },
              );
          }}
        >
          Confirmar retirada
        </button>
      </div>
    );
  return (
    <form className="modal-body" onSubmit={onSubmit}>
      {dialog.type === "athlete" && (
        <>
          <p>Crea su ficha; después podrás vincular equipo y acudiente.</p>
          <Field label="Nombre completo">
            <input
              name="name"
              required
              minLength={2}
              maxLength={120}
              autoFocus
            />
          </Field>
          <Field
            label="Nombre para Magic TV"
            hint="Usa su primer nombre o nombre de exhibición."
          >
            <input name="display_name" required maxLength={60} />
          </Field>
        </>
      )}
      {dialog.type === "team" && (
        <>
          <Field label="Nombre del equipo">
            <input name="name" required maxLength={80} />
          </Field>
          <Field label="Edades (opcional)">
            <input name="age_label" maxLength={80} placeholder="Ej. 4–7 años" />
          </Field>
        </>
      )}
      {dialog.type === "invite" && (
        <>
          <Field label="Nombre">
            <input name="name" required maxLength={120} />
          </Field>
          <Field label="Correo electrónico">
            <input name="email" type="email" required maxLength={254} />
          </Field>
          <Field label="Tipo de acceso">
            <select name="role">
              <option value="family">Padre / madre / acudiente</option>
              <option value="coach">Entrenador</option>
            </select>
          </Field>
          <p className="form-note">
            Recibirá un enlace para configurar su cuenta. Las asignaciones se
            realizan después de aceptar.
          </p>
        </>
      )}
      {dialog.type === "assign" && (
        <>
          <Field label="Persona">
            <select name="coach_id" required>
              <option value="">Selecciona un coach</option>
              {data.profiles
                .filter((u) => u.active)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Acción">
            <select name="operation">
              <option value="add">Asignar al equipo</option>
              <option value="remove">Retirar del equipo</option>
            </select>
          </Field>
          <p className="form-note">
            Solo se aceptarán cuentas que tengan rol de entrenador.
          </p>
        </>
      )}
      {dialog.type === "athlete-settings" && (
        <>
          <Field label="Qué deseas gestionar">
            <select
              value={subform}
              onChange={(e) => setSubform(e.target.value)}
            >
              <option value="membership">Asignación de equipo</option>
              <option value="guardian">Vínculo familiar</option>
              <option value="consent">Permiso para Magic TV</option>
              <option value="identity">Datos y estado de la ficha</option>
            </select>
          </Field>
          {subform === "membership" && (
            <Field label="Equipo">
              <select name="team_id" required>
                {options}
              </select>
            </Field>
          )}
          {subform === "guardian" && (
            <Field label="Cuenta familiar">
              <select name="user_id" required>
                {data.profiles.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {["membership", "guardian"].includes(subform) && (
            <Field label="Acción">
              <select name="operation">
                <option value="add">Vincular</option>
                <option value="remove">Desvincular</option>
              </select>
            </Field>
          )}
          {subform === "consent" && (
            <>
              <p>
                Registra la autorización verificada del responsable. Este
                permiso muestra la tarjeta deportiva; las fotos se revisan
                aparte.
              </p>
              <Field label="Permiso vigente">
                <select
                  name="allowed"
                  defaultValue={a?.tv_consent ? "yes" : "no"}
                >
                  <option value="no">No proyectar</option>
                  <option value="yes">Autorizar tarjeta deportiva</option>
                </select>
              </Field>
            </>
          )}
          {subform === "identity" && (
            <>
              <Field label="Nombre completo">
                <input name="name" defaultValue={a?.name} required />
              </Field>
              <Field label="Nombre de exhibición">
                <input
                  name="display_name"
                  defaultValue={a?.display_name}
                  required
                />
              </Field>
              <Field label="Estado">
                <select name="active" defaultValue={a?.active ? "yes" : "no"}>
                  <option value="yes">Activa</option>
                  <option value="no">Inactiva</option>
                </select>
              </Field>
            </>
          )}
        </>
      )}
      {dialog.type === "skill" && (
        <>
          <Field label="Equipo">
            <select name="team_id" required>
              {options}
            </select>
          </Field>
          <Field label="Nombre de la habilidad">
            <input name="name" required maxLength={100} />
          </Field>
          <Field label="Área">
            <select name="area">
              {[
                "Tumbling",
                "Motions",
                "Saltos",
                "Stunts",
                "Coreografía",
                "Performance",
                "Trabajo en equipo",
              ].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </Field>
          <Field
            label="Criterios obligatorios"
            hint="Uno por línea. Entre 1 y 20 criterios técnicos aprobados por Magic."
          >
            <textarea
              name="criteria"
              rows={5}
              required
              placeholder={
                "Posición inicial\nControl de ejecución\nLlegada segura"
              }
            />
          </Field>
          <p className="form-note">
            Una habilidad publicada no se reescribe: se archiva y se crea una
            nueva versión para preservar evaluaciones.
          </p>
        </>
      )}
      {dialog.type === "task" && (
        <>
          <Field label="Equipo">
            <select name="team_id" required>
              {options}
            </select>
          </Field>
          <Field label="Título de la tarea">
            <input
              name="title"
              required
              minLength={2}
              maxLength={140}
              placeholder="Ej. Practicar High V frente al espejo"
            />
          </Field>
          <Field label="Instrucciones">
            <textarea
              name="instructions"
              rows={4}
              maxLength={2000}
              placeholder="Explica qué practicar y qué debe verse en la imagen de evidencia…"
            />
          </Field>
          <Field label="Fecha límite (opcional)">
            <input name="due_at" type="date" />
          </Field>
          <p className="form-note">
            Las familias verán únicamente las tareas de sus equipos. Las
            evidencias no se publican en Magic TV.
          </p>
        </>
      )}
      {dialog.type === "monthly-goal" && (
        <>
          <Field label="Equipo">
            <select name="team_id" required>
              {options}
            </select>
          </Field>
          <Field label="Habilidad a lograr">
            <select name="skill_id" required>
              {data.skills
                .filter(
                  (s) => s.active && teamList.some((t) => t.id === s.team_id),
                )
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ·{" "}
                    {data.teams.find((t) => t.id === s.team_id)?.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Mes">
            <input
              name="month"
              type="month"
              required
              defaultValue={new Date().toISOString().slice(0, 7)}
            />
          </Field>
          <Field label="Enfoque o mensaje para el equipo">
            <textarea
              name="note"
              rows={3}
              maxLength={500}
              placeholder="Qué queremos conseguir juntas este mes…"
            />
          </Field>
        </>
      )}
      {dialog.type === "coach-profile" && (
        <>
          {(() => {
            const profile = data.coachProfiles.find(
              (item) => item.user_id === p.me,
            );
            return (
              <>
                <p className="form-note">
                  Administración revisará tu perfil antes de marcarlo como
                  completo. No incluyas información sensible de deportistas.
                </p>
                <Field label="Cómo quieres presentarte">
                  <input
                    name="headline"
                    maxLength={120}
                    defaultValue={profile?.headline ?? ""}
                    placeholder="Ej. Coach de tumbling · Magic Power"
                  />
                </Field>
                <Field label="Sobre ti">
                  <textarea
                    name="bio"
                    rows={5}
                    maxLength={1200}
                    defaultValue={profile?.bio ?? ""}
                    placeholder="Comparte brevemente tu experiencia y tu forma de acompañar al equipo."
                  />
                </Field>
                <Field label="Especialidad o enfoque">
                  <input
                    name="specialty"
                    maxLength={160}
                    defaultValue={profile?.specialty ?? ""}
                    placeholder="Ej. Stunts, tumbling, coreografía"
                  />
                </Field>
                <Field label="Teléfono de contacto interno">
                  <input
                    name="phone"
                    type="tel"
                    maxLength={40}
                    defaultValue={profile?.phone ?? ""}
                    placeholder="Solo visible para administración"
                  />
                </Field>
                {profile?.admin_note && (
                  <div className="notice">
                    <ShieldCheck size={18} />
                    <p>
                      <strong>Nota de administración:</strong>{" "}
                      {profile.admin_note}
                    </p>
                  </div>
                )}
              </>
            );
          })()}
        </>
      )}
      {dialog.type === "coach-profile-review" && (
        <>
          {(() => {
            const profile = data.coachProfiles.find(
              (item) => item.user_id === dialog.id,
            );
            const coach = data.profiles.find((item) => item.id === dialog.id);
            return (
              <>
                <h3>{coach?.name ?? "Entrenador"}</h3>
                <p>
                  {profile?.headline || "Aún no ha completado su presentación."}
                </p>
                {profile?.bio && <p>{profile.bio}</p>}
                {profile?.specialty && (
                  <p>
                    <strong>Especialidad:</strong> {profile.specialty}
                  </p>
                )}
                {profile?.phone && (
                  <p>
                    <strong>Contacto interno:</strong> {profile.phone}
                  </p>
                )}
                <Field label="Estado de revisión">
                  <select
                    name="approved"
                    defaultValue={profile?.admin_approved ? "yes" : "no"}
                  >
                    <option value="no">Pendiente o requiere ajustes</option>
                    <option value="yes">Perfil aprobado</option>
                  </select>
                </Field>
                <Field label="Nota interna para el entrenador">
                  <textarea
                    name="admin_note"
                    rows={3}
                    maxLength={500}
                    defaultValue={profile?.admin_note ?? ""}
                    placeholder="Ej. Completa tu especialidad antes de publicarlo."
                  />
                </Field>
              </>
            );
          })()}
        </>
      )}
      {dialog.type === "evaluate" && (
        <>
          <p className="form-note">
            Publicar actualizará la ficha de {a?.display_name}. Las casillas sin
            marcar quedan como criterios en proceso.
          </p>
          <Field label="Habilidad">
            <select
              required
              value={skill}
              onChange={(e) => {
                const id = e.target.value;
                setSkill(id);
                setScores(
                  data.drafts?.find(
                    (d) => d.athlete_id === dialog.id && d.skill_id === id,
                  )?.payload.scores ??
                    data.skills
                      .find((s) => s.id === id)
                      ?.criteria.map(() => false) ??
                    [],
                );
              }}
            >
              <option value="">Selecciona una habilidad</option>
              {data.skills
                .filter(
                  (s) =>
                    s.active &&
                    data.memberships.some(
                      (m) =>
                        m.athlete_id === dialog.id && m.team_id === s.team_id,
                    ),
                )
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ·{" "}
                    {data.teams.find((t) => t.id === s.team_id)?.name}
                  </option>
                ))}
            </select>
          </Field>
          {draft && (
            <span className="tag pink">
              Borrador recuperado · todavía no es visible para la familia
            </span>
          )}
          {data.skills
            .find((s) => s.id === skill)
            ?.criteria.map((c, i) => (
              <label className="check-row" key={i}>
                <input
                  type="checkbox"
                  checked={scores[i] ?? false}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setScores((prev) =>
                      prev.map((v, j) => (j === i ? checked : v)),
                    );
                  }}
                />
                <span>{c}</span>
              </label>
            ))}
          <label className="check-row emphasize">
            <input
              key={`mastery-${skill}-${scores.every(Boolean)}`}
              type="checkbox"
              name="mastered"
              disabled={!scores.length || scores.some((v) => !v)}
            />
            <span>Confirmo que domina esta habilidad</span>
          </label>
          <Field label="Comentario para la familia">
            <textarea
              key={`comment-${skill}`}
              name="comment"
              defaultValue={draft?.comment ?? ""}
              maxLength={1000}
              rows={3}
              placeholder="Reconoce su avance y acompaña su proceso…"
            />
          </Field>
          <Field
            label="Próximo reto positivo"
            hint="Puede aparecer en Magic TV. No incluyas observaciones privadas."
          >
            <input
              key={`goal-${skill}`}
              name="next_goal"
              defaultValue={draft?.next_goal ?? ""}
              maxLength={200}
            />
          </Field>
        </>
      )}
      {dialog.type === "task-submit" && (
        <>
          <Field label="Tarea">
            <select name="task_id" required>
              <option value="">Selecciona una tarea</option>
              {data.tasks
                .filter(
                  (t) =>
                    t.active && teamList.some((team) => team.id === t.team_id),
                )
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ·{" "}
                    {data.teams.find((team) => team.id === t.team_id)?.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Deportista">
            <select name="athlete_id" required>
              {data.athletes
                .filter((athlete) => {
                  const familyAthlete = data.guardians.some(
                    (g) => g.user_id === p.me,
                  );
                  return (
                    p.isAdmin ||
                    (familyAthlete
                      ? data.guardians.some(
                          (g) =>
                            g.user_id === p.me && g.athlete_id === athlete.id,
                        )
                      : teamList.some((team) =>
                          data.memberships.some(
                            (m) =>
                              m.athlete_id === athlete.id &&
                              m.team_id === team.id,
                          ),
                        ))
                  );
                })
                .map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.name}
                  </option>
                ))}
            </select>
          </Field>
          <Field label="Título de la evidencia">
            <input
              name="title"
              required
              maxLength={160}
              defaultValue="Evidencia de práctica"
            />
          </Field>
        </>
      )}
      {dialog.type === "task-review" && m && (
        <>
          {!p.demo && (
            <img
              className="review-image"
              src={`/api/media/${m.id}`}
              alt={m.title}
            />
          )}
          <h3>{m.title}</h3>
          <p className="form-note">
            Evidencia enviada por o para{" "}
            {data.athletes.find((athlete) => athlete.id === m.athlete_id)?.name}
            . Esta imagen permanece privada.
          </p>
          <Field label="Decisión">
            <select name="decision">
              <option value="approve">Validar entrega</option>
              <option value="reject">Solicitar un nuevo intento</option>
            </select>
          </Field>
          <Field label="Mensaje para la familia">
            <textarea
              name="reason"
              maxLength={300}
              rows={3}
              placeholder="Reconoce el esfuerzo y orienta el siguiente paso…"
            />
          </Field>
        </>
      )}
      {["photo", "upload", "task-submit"].includes(dialog.type) && (
        <>
          {dialog.type === "upload" && (
            <>
              {p.isAdmin ? (
                <fieldset>
                  <legend>Equipos destinatarios</legend>
                  {teamList.map((t) => (
                    <label className="check-row" key={t.id}>
                      <input type="checkbox" name="team_ids" value={t.id} />
                      <span>{t.name}</span>
                    </label>
                  ))}
                </fieldset>
              ) : (
                <Field label="Equipo destinatario">
                  <select name="team_id" required>
                    {options}
                  </select>
                </Field>
              )}
              <Field label="Título">
                <input
                  name="title"
                  required
                  maxLength={160}
                  placeholder="Un gran entrenamiento juntos"
                />
              </Field>
            </>
          )}
          <label className="upload-zone">
            <Upload size={32} />
            <strong>
              {files.length
                ? `${files.length} foto(s) seleccionada(s)`
                : "Elige tus fotos"}
            </strong>
            <span>JPG, PNG o WebP · hasta 10 MB por foto</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple={dialog.type === "upload"}
              required
              onChange={(e) => {
                const chosen = Array.from(e.target.files ?? []);
                if (chosen.length > 10) {
                  p.setError("Selecciona máximo 10 fotos");
                  e.target.value = "";
                  setFiles([]);
                } else setFiles(chosen);
              }}
            />
          </label>
          <p className="form-note">
            {dialog.type === "task-submit"
              ? "Esta imagen se envía solo a las profes del equipo para acompañar el proceso. No se publica en la galería ni en Magic TV."
              : p.isAdmin && dialog.type === "upload"
                ? "Se cargarán como fotos oficiales. Después elige dónde publicarlas desde la revisión."
                : "Solo comparte imágenes que tengas permiso de usar. Las fotos para TV requieren revisión."}
          </p>
          {uploadProgress && <p role="status">{uploadProgress}</p>}
        </>
      )}
      {dialog.type === "review" && m && (
        <>
          {!p.demo && (
            <img
              className="review-image"
              src={`/api/media/${m.id}`}
              alt={m.title}
            />
          )}
          <h3>{m.title}</h3>
          <Field label="Decisión">
            <select name="decision">
              <option value="approve">Aceptar para publicar</option>
              <option value="reject">Rechazar</option>
            </select>
          </Field>
          <label className="check-row">
            <input type="checkbox" name="consent" />
            <span>
              Verifiqué la autorización de todas las personas identificables
              para los destinos elegidos.
            </span>
          </label>
          <Field
            label="Referencia de las autorizaciones"
            hint="Ej. formulario o registro interno revisado. Obligatorio al aceptar; no escribas datos sensibles."
          >
            <input
              name="evidence"
              maxLength={500}
              placeholder="Autorizaciones del equipo, registro de octubre"
            />
          </Field>
          {m.kind !== "athlete" && (
            <fieldset>
              <legend>Deportistas identificables en la imagen</legend>
              {data.athletes
                .filter((a) =>
                  data.memberships.some(
                    (tm) =>
                      tm.athlete_id === a.id && m.team_ids.includes(tm.team_id),
                  ),
                )
                .map((a) => (
                  <label className="check-row" key={a.id}>
                    <input type="checkbox" name="subject_ids" value={a.id} />
                    <span>{a.name}</span>
                  </label>
                ))}
            </fieldset>
          )}
          <label className="check-row">
            <input type="checkbox" name="tv" defaultChecked />
            <span>Mostrar en Magic TV, en su equipo</span>
          </label>
          <label className="check-row">
            <input type="checkbox" name="portal" />
            <span>Mostrar también en la galería del equipo</span>
          </label>
          <Field label="Último día de exhibición (opcional)">
            <input type="date" name="expires" />
          </Field>
          <Field label="Nota o motivo de rechazo">
            <textarea name="reason" maxLength={300} rows={2} />
          </Field>
        </>
      )}
      {dialog.type === "tv" && (
        <>
          {p.tvLink ? (
            <div className="activation-result">
              <CheckCircle2 size={38} />
              <h3>Tu enlace está listo</h3>
              <p>
                Ábrelo en el televisor. Vence en 24 horas y solo se utiliza una
                vez.
              </p>
              <textarea
                aria-label="Enlace de activación"
                readOnly
                value={p.tvLink}
              />
              <button
                className="btn primary"
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(p.tvLink);
                    setUploadProgress("Enlace copiado");
                  } catch {
                    setUploadProgress(
                      "Selecciona y copia el enlace del cuadro.",
                    );
                  }
                }}
              >
                <Copy size={16} />
                Copiar enlace
              </button>
              <p role="status">{uploadProgress}</p>
              <button
                className="text-btn"
                type="button"
                onClick={() => p.done("Pantalla preparada.")}
              >
                Terminar
              </button>
            </div>
          ) : (
            <>
              <Field label="Nombre de la pantalla">
                <input
                  name="name"
                  placeholder="Televisor de la academia"
                  defaultValue={device?.name}
                  required
                  maxLength={80}
                />
              </Field>
              <fieldset>
                <legend>Equipos que aparecerán</legend>
                {teamList.map((t) => (
                  <label className="check-row" key={t.id}>
                    <input
                      type="checkbox"
                      name="team_ids"
                      value={t.id}
                      defaultChecked={
                        device ? device.team_ids.includes(t.id) : true
                      }
                    />
                    <span>{t.name}</span>
                  </label>
                ))}
              </fieldset>
              <div className="form-grid">
                <Field label="Segundos por deportista">
                  <input
                    name="athlete_seconds"
                    type="number"
                    defaultValue={device?.athlete_seconds ?? 10}
                    min={5}
                    max={30}
                  />
                </Field>
                <Field label="Segundos por foto">
                  <input
                    name="photo_seconds"
                    type="number"
                    defaultValue={device?.photo_seconds ?? 8}
                    min={5}
                    max={30}
                  />
                </Field>
              </div>
              <label className="check-row">
                <input
                  type="checkbox"
                  name="photos_enabled"
                  defaultChecked={device?.photos_enabled ?? true}
                />
                <span>Incluir fotos aceptadas y oficiales</span>
              </label>
            </>
          )}
        </>
      )}
      {formError}
      {dialog.type === "athlete-settings" && subform === "consent" && (
        <Field label="Referencia de la autorización o retirada">
          <input
            name="evidence"
            minLength={5}
            maxLength={500}
            required
            placeholder="Registro interno y fecha de verificación"
          />
        </Field>
      )}
      {!(dialog.type === "tv" && p.tvLink) && (
        <div className="form-actions">
          {dialog.type === "evaluate" && (
            <button
              className="btn secondary"
              name="save-draft"
              type="submit"
              disabled={busy}
            >
              Guardar borrador
            </button>
          )}
          <Submit busy={busy}>
            {dialog.type === "evaluate"
              ? "Publicar avance"
              : dialog.type === "review" || dialog.type === "task-review"
                ? "Guardar revisión"
                : dialog.type === "tv"
                  ? "Generar enlace"
                  : dialog.type === "invite"
                    ? "Enviar invitación"
                    : dialog.type === "task-submit"
                      ? "Enviar evidencia"
                      : dialog.type === "upload"
                        ? "Subir fotos"
                        : "Guardar"}
          </Submit>
        </div>
      )}
    </form>
  );
}
