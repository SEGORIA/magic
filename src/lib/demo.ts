import type { Snapshot, Evaluation } from "./domain";
const ids = Array.from(
  { length: 7 },
  (_, i) => `00000000-0000-4000-8000-00000000000${i + 1}`,
);
export function demoSnapshot(): Snapshot {
  const teams = [
    "Beautiful",
    "Power",
    "Energy",
    "Infinity",
    "Love",
    "Joy",
    "Stronger",
  ].map((n, i) => ({
    id: ids[i],
    name: `Magic ${n}`,
    age_label: i === 0 ? "4–7 años" : "",
    color: [
      "#e6127d",
      "#8b5cf6",
      "#e9a22a",
      "#38a3cf",
      "#eb6480",
      "#24a98a",
      "#6868d9",
    ][i],
    active: true,
  }));
  const profiles = [
    { id: "admin-demo", name: "Administración Magic", active: true },
    ...[
      "Angela",
      "Laura",
      "Angie",
      "AH · provisional",
      "Isabella",
      "Milton",
    ].map((name, i) => ({ id: `coach-${i}`, name, active: true })),
    { id: "family-demo", name: "Familia de ejemplo", active: true },
  ];
  const athletes = [
    "Sofía Martínez",
    "Valentina López",
    "Emma Rodríguez",
    "Isabella Torres",
    "Luciana Pérez",
    "Mariana Gómez",
  ].map((name, i) => ({
    id: `athlete-${i}`,
    name,
    display_name: name.split(" ")[0],
    active: true,
    tv_consent: i !== 5,
    photo_id: null,
  }));
  const skills = teams.flatMap((t) => [
    {
      id: `${t.id}-1`,
      team_id: t.id,
      name: "Rueda lateral",
      area: "Tumbling",
      criteria: [
        "Posición inicial",
        "Apoyo y alineación",
        "Control de la llegada",
      ],
      active: true,
    },
    {
      id: `${t.id}-2`,
      team_id: t.id,
      name: "High V",
      area: "Motions",
      criteria: ["Posición de brazos", "Tensión y postura", "Precisión"],
      active: true,
    },
    {
      id: `${t.id}-3`,
      team_id: t.id,
      name: "Salto agrupado",
      area: "Saltos",
      criteria: ["Preparación", "Control del vuelo", "Aterrizaje"],
      active: true,
    },
  ]);
  const memberships = athletes.map((a, i) => ({
    athlete_id: a.id,
    team_id: ids[i < 3 ? 4 : i === 3 ? 0 : i === 4 ? 1 : 3],
  }));
  const evaluations: Evaluation[] = athletes.slice(0, 5).flatMap((a, i) =>
    skills
      .filter((s) => s.team_id === memberships[i].team_id)
      .slice(0, i % 2 ? 2 : 3)
      .map((s, j) => ({
        id: `eval-${i}-${j}`,
        athlete_id: a.id,
        team_id: s.team_id,
        skill_id: s.id,
        author_id: "coach-5",
        scores: j === 0 ? [true, true, true] : [true, true, false],
        mastered: j === 0,
        comment: "Cada vez tienes más confianza y control. ¡Sigue así!",
        next_goal: j === 1 ? "Mantener la postura en toda la secuencia." : "",
        created_at: `2026-10-0${j + 1}T16:00:00Z`,
        revision_of: null,
      })),
  );
  return {
    profile: profiles[0],
    roles: ["admin"],
    teams,
    profiles,
    athletes,
    memberships,
    assignments: [
      { coach_id: "coach-0", team_id: ids[0] },
      { coach_id: "coach-1", team_id: ids[0] },
      { coach_id: "coach-2", team_id: ids[1] },
      { coach_id: "coach-3", team_id: ids[2] },
      { coach_id: "coach-4", team_id: ids[3] },
      ...[4, 5, 6].map((i) => ({ coach_id: "coach-5", team_id: ids[i] })),
    ],
    guardians: [
      { user_id: "family-demo", athlete_id: "athlete-0" },
      { user_id: "family-demo", athlete_id: "athlete-1" },
    ],
    skills,
    evaluations,
    media: [],
    tasks: [
      {
        id: "task-demo-1",
        team_id: ids[4],
        title: "Práctica de High V en casa",
        instructions:
          "Envía una foto mostrando la posición de brazos y una postura firme.",
        due_at: "2026-10-15T23:59:59-05:00",
        active: true,
        created_by: "coach-5",
        created_at: "2026-10-07T12:00:00Z",
      },
    ],
    monthlyGoals: [
      {
        id: "goal-demo-1",
        team_id: ids[4],
        skill_id: `${ids[4]}-2`,
        month: "2026-10-01",
        note: "Postura, tensión y precisión en cada repetición.",
      },
    ],
    devices: [],
    invitations: [],
  };
}
