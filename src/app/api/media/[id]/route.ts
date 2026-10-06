import { account, failure, HttpError } from "@/lib/http";
import { serviceDb } from "@/lib/supabase";
import { tvSession } from "@/lib/tv";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    let path: string | null = null;
    if (new URL(request.url).searchParams.get("tv") === "1") {
      const { db, device } = await tvSession();
      const { data: m } = await db
        .from("media")
        .select("*")
        .eq("id", id)
        .eq("status", "approved")
        .eq("tv", true)
        .eq("consent_verified", true)
        .maybeSingle();
      if (!m || (m.expires_at && Date.parse(m.expires_at) <= Date.now()))
        throw new HttpError(404, "Imagen no disponible");
      if (m.subject_ids?.length) {
        const { data: subjects } = await db
          .from("athletes")
          .select("id")
          .in("id", m.subject_ids)
          .eq("active", true)
          .eq("tv_consent", true);
        if (subjects?.length !== new Set(m.subject_ids).size)
          throw new HttpError(404, "Imagen no disponible");
      }
      if (m.kind === "athlete") {
        const { data: a } = await db
          .from("athletes")
          .select("id")
          .eq("id", m.athlete_id)
          .eq("photo_id", id)
          .eq("active", true)
          .eq("tv_consent", true)
          .maybeSingle();
        const { data: membership } = await db
          .from("team_memberships")
          .select("team_id")
          .eq("athlete_id", m.athlete_id)
          .in("team_id", device.team_ids)
          .limit(1);
        if (!a || !membership?.length)
          throw new HttpError(404, "Imagen no disponible");
      } else if (
        !device.photos_enabled ||
        !["family", "official"].includes(m.kind) ||
        !m.team_ids.some((t: string) => device.team_ids.includes(t))
      )
        throw new HttpError(404, "Imagen no disponible");
      path = m.object_path;
    } else {
      const a = await account();
      const { data: m } = await a.db
        .from("media")
        .select("object_path,status")
        .eq("id", id)
        .maybeSingle();
      if (!m || ["uploading", "withdrawn"].includes(m.status))
        throw new HttpError(404, "Imagen no disponible");
      path = m.object_path;
    }
    if (!path) throw new HttpError(404, "Imagen no disponible");
    const { data, error } = await serviceDb()
      .storage.from("magic-private")
      .download(path);
    if (error || !data) throw new HttpError(404, "Imagen no disponible");
    return new Response(data, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
