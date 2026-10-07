export type Role = "admin" | "coach" | "family";
export type Team = {
  id: string;
  name: string;
  age_label: string;
  color: string;
  active: boolean;
};
export type Profile = {
  id: string;
  name: string;
  active: boolean;
  avatar_id?: string | null;
};
export type Athlete = {
  id: string;
  name: string;
  display_name: string;
  active: boolean;
  tv_consent: boolean;
  photo_id: string | null;
};
export type Skill = {
  id: string;
  team_id: string;
  name: string;
  area: string;
  criteria: string[];
  active: boolean;
};
export type Evaluation = {
  id: string;
  athlete_id: string;
  team_id: string;
  skill_id: string;
  author_id: string;
  scores: boolean[];
  mastered: boolean;
  comment: string;
  next_goal: string;
  created_at: string;
  revision_of: string | null;
};
export type Media = {
  id: string;
  owner_id: string;
  team_ids: string[];
  kind: "family" | "official" | "avatar" | "athlete" | "task";
  athlete_id: string | null;
  task_id?: string | null;
  title: string;
  status: string;
  portal: boolean;
  tv: boolean;
  expires_at: string | null;
  created_at: string;
  reason: string | null;
};
export type Task = {
  id: string;
  team_id: string;
  title: string;
  instructions: string;
  due_at: string | null;
  active: boolean;
  created_by: string;
  created_at: string;
};
export type MonthlySkillGoal = {
  id: string;
  team_id: string;
  skill_id: string;
  month: string;
  note: string;
};
export type Snapshot = {
  profile: Profile;
  roles: Role[];
  teams: Team[];
  profiles: Profile[];
  athletes: Athlete[];
  memberships: { athlete_id: string; team_id: string }[];
  assignments: { coach_id: string; team_id: string }[];
  guardians: { user_id: string; athlete_id: string }[];
  skills: Skill[];
  evaluations: Evaluation[];
  media: Media[];
  tasks: Task[];
  monthlyGoals: MonthlySkillGoal[];
  devices: {
    id: string;
    name: string;
    team_ids: string[];
    active: boolean;
    last_seen_at: string | null;
    athlete_seconds: number;
    photo_seconds: number;
    photos_enabled: boolean;
  }[];
  invitations: {
    id: string;
    email: string;
    name: string;
    role: Role;
    claimed_at: string | null;
  }[];
  drafts?: {
    id: string;
    athlete_id: string;
    skill_id: string;
    payload: Partial<Evaluation>;
  }[];
  roleAssignments?: { user_id: string; role: Role }[];
};
export function latestEvaluations(evaluations: Evaluation[]) {
  const map = new Map<string, Evaluation>();
  for (const e of [...evaluations].sort(
    (a, b) =>
      b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id),
  )) {
    const key = `${e.athlete_id}:${e.team_id}:${e.skill_id}`;
    if (!map.has(key)) map.set(key, e);
  }
  return [...map.values()];
}
export function progress(skills: Skill[], evaluations: Evaluation[]) {
  const valid = latestEvaluations(evaluations).filter((e) =>
    skills.some((s) => s.id === e.skill_id),
  );
  const applicable = skills.reduce((n, s) => n + s.criteria.length, 0);
  const evaluated = valid.reduce((n, e) => n + e.scores.length, 0);
  const achieved = valid.reduce(
    (n, e) => n + e.scores.filter(Boolean).length,
    0,
  );
  return {
    percent: evaluated ? Math.round((achieved / evaluated) * 100) : null,
    coverage: applicable ? Math.round((evaluated / applicable) * 100) : 0,
    mastered: valid.filter((e) => e.mastered).length,
    total: skills.length,
  };
}
export type TvCard = {
  id: string;
  type: "team" | "athlete" | "photo";
  team: string;
  title: string;
  subtitle: string;
  image?: string;
  achievements?: string[];
  goal?: string;
  seconds: number;
};
export function nextCardIndex(cards: TvCard[], currentId: string | null) {
  if (!cards.length) return 0;
  const i = cards.findIndex((c) => c.id === currentId);
  return i < 0 ? 0 : (i + 1) % cards.length;
}
export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}
