import { failure, json } from "@/lib/http";
import { tvSession, TV_COOKIE } from "@/lib/tv";
import { latestEvaluations, Evaluation, TvCard } from "@/lib/domain";
import { collectRows } from "@/lib/pagination";
export async function GET(request: Request) {
  try {
    const { db, device, value } = await tvSession();
    const now = new Date().toISOString();
    const round = Math.max(
      0,
      Math.min(
        1000000,
        Number(new URL(request.url).searchParams.get("round")) || 0,
      ),
    );
    const [
      { data: teams, error: te },
      { data: members, error: me },
      { data: athletes, error: ae },
      { data: skills, error: se },
    ] = await Promise.all([
      db
        .from("teams")
        .select("id,name")
        .in("id", device.team_ids)
        .eq("active", true),
      db.from("team_memberships").select("*").in("team_id", device.team_ids),
      db
        .from("athletes")
        .select("id,display_name,photo_id")
        .eq("active", true)
        .eq("tv_consent", true),
      db
        .from("skills")
        .select("id,name,team_id")
        .in("team_id", device.team_ids),
    ]);
    if (te || me || ae || se) throw new Error("Feed unavailable");
    const media = await collectRows<{
      id: string;
      title: string;
      team_ids: string[];
      kind: string;
      athlete_id: string | null;
      expires_at: string | null;
      subject_ids: string[];
    }>((from, to) =>
      db
        .from("media")
        .select("id,title,team_ids,kind,athlete_id,expires_at,subject_ids")
        .eq("status", "approved")
        .eq("tv", true)
        .eq("consent_verified", true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("id")
        .range(from, to),
    );
    const allowedMedia = media.filter((m) =>
      m.subject_ids.every((id) => athletes?.some((a) => a.id === id)),
    );
    const evaluations: Evaluation[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await db
        .from("evaluations")
        .select("*")
        .in("team_id", device.team_ids)
        .order("created_at")
        .range(offset, offset + 499);
      if (error) throw error;
      evaluations.push(...data);
      if (data.length < 500) break;
    }
    const latest = latestEvaluations(evaluations),
      cards: TvCard[] = [];
    for (const t of (teams ?? []).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      cards.push({
        id: `team:${t.id}`,
        type: "team",
        team: t.name,
        title: t.name,
        subtitle: "Cada entrenamiento cuenta. Cada logro nos une.",
        seconds: 18,
      });
      for (const a of (athletes ?? [])
        .filter((a) =>
          members?.some((m) => m.athlete_id === a.id && m.team_id === t.id),
        )
        .sort((a, b) => a.display_name.localeCompare(b.display_name))) {
        const results = latest.filter(
          (e) => e.athlete_id === a.id && e.team_id === t.id,
        );
        const image =
          a.photo_id &&
          allowedMedia.some((m) => m.id === a.photo_id && m.kind === "athlete")
            ? `/api/media/${a.photo_id}?tv=1`
            : undefined;
        cards.push({
          id: `athlete:${t.id}:${a.id}`,
          type: "athlete",
          team: t.name,
          title: a.display_name,
          subtitle: "Mi camino Magic",
          image,
          achievements: results
            .filter((e) => e.mastered)
            .map(
              (e) =>
                skills?.find((s) => s.id === e.skill_id)?.name ??
                "Habilidad validada",
            )
            .slice(0, 5),
          goal: results.find((e) => e.next_goal)?.next_goal,
          seconds: device.athlete_seconds,
        });
      }
      const photos = allowedMedia
        .filter(
          (m) =>
            ["family", "official"].includes(m.kind) &&
            m.team_ids.includes(t.id),
        )
        .sort((a, b) => a.id.localeCompare(b.id));
      const limit = Math.min(5, photos.length);
      if (device.photos_enabled)
        for (let i = 0; i < limit; i++) {
          const m = photos[(Math.floor(round) * 5 + i) % photos.length];
          cards.push({
            id: `photo:${t.id}:${m.id}`,
            type: "photo",
            team: t.name,
            title: m.title,
            subtitle: "Momentos que nos hacen equipo",
            image: `/api/media/${m.id}?tv=1`,
            seconds: device.photo_seconds,
          });
        }
    }
    await db
      .from("tv_devices")
      .update({
        last_seen_at: now,
        session_expires: new Date(Date.now() + 2592000000).toISOString(),
      })
      .eq("id", device.id)
      .eq("active", true);
    const response = json({
      cards,
      validUntil: Date.now() + 60000,
      name: device.name,
    });
    response.cookies.set(TV_COOKIE, value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 2592000,
    });
    return response;
  } catch (e) {
    return failure(e);
  }
}
