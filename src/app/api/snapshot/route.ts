import { account, failure, json } from "@/lib/http";
import { serviceDb } from "@/lib/supabase";
export async function GET() {
  try {
    const { db, profile, roles } = await account();
    const tables = {
      teams: "teams",
      profiles: "profiles",
      athletes: "athletes",
      memberships: "team_memberships",
      assignments: "coach_assignments",
      guardians: "guardian_athletes",
      skills: "skills",
      evaluations: "evaluations",
      drafts: "evaluation_drafts",
      roleAssignments: "user_roles",
      media: "media",
      tasks: "tasks",
      monthlyGoals: "monthly_skill_goals",
      invitations: "invitations",
    };
    const out: Record<string, unknown> = { profile, roles };
    await Promise.all(
      Object.entries(tables).map(async ([key, table]) => {
        const rows: unknown[] = [];
        for (let offset = 0; ; offset += 500) {
          let q = db
            .from(table)
            .select(
              table === "media"
                ? "id,owner_id,athlete_id,team_ids,kind,title,status,portal,tv,expires_at,reason,created_at"
                : "*",
            )
            .range(offset, offset + 499);
          const { data, error } = await q;
          if (error) throw error;
          rows.push(...data);
          if (data.length < 500) break;
        }
        out[key] = rows;
      }),
    );
    out.devices = [];
    if (roles.includes("admin")) {
      const { data, error } = await serviceDb()
        .from("tv_devices")
        .select(
          "id,name,team_ids,active,last_seen_at,athlete_seconds,photo_seconds,photos_enabled",
        );
      if (error) throw error;
      out.devices = data;
    }
    return json(out);
  } catch (e) {
    return failure(e);
  }
}
