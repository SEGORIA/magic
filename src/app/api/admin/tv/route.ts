import {
  account,
  body,
  failure,
  HttpError,
  json,
  sameOrigin,
} from "@/lib/http";
import { serviceDb } from "@/lib/supabase";
import { hash, secret } from "@/lib/tv";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const a = await account();
    if (!a.roles.includes("admin"))
      throw new HttpError(403, "Solo administración");
    const d = await body(request),
      db = serviceDb();
    if (d.action === "revoke") {
      const { error } = await db
        .from("tv_devices")
        .update({ active: false, session_hash: null, activation_hash: null })
        .eq("id", d.id);
      if (error) throw error;
      await db
        .from("audit_events")
        .insert({ actor_id: a.user.id, action: "tv_revoke", entity_id: d.id });
      return json({ ok: true });
    }
    if (
      typeof d.name !== "string" ||
      !d.name.trim() ||
      d.name.length > 80 ||
      !Array.isArray(d.team_ids) ||
      !d.team_ids.length ||
      d.team_ids.length > 20
    )
      throw new HttpError(400, "Selecciona un nombre y al menos un equipo");
    const { data: teams } = await a.db
      .from("teams")
      .select("id")
      .in("id", d.team_ids);
    if (teams?.length !== new Set(d.team_ids).size)
      throw new HttpError(400, "Equipos inválidos");
    const token = secret();
    if (d.action === "update") {
      const { error } = await db
        .from("tv_devices")
        .update({
          name: d.name,
          team_ids: d.team_ids,
          athlete_seconds: Number(d.athlete_seconds) || 10,
          photo_seconds: Number(d.photo_seconds) || 8,
          photos_enabled: d.photos_enabled !== false,
        })
        .eq("id", d.id)
        .eq("active", true);
      if (error) throw error;
      await db
        .from("audit_events")
        .insert({ actor_id: a.user.id, action: "tv_update", entity_id: d.id });
      return json({ ok: true });
    }
    const { data, error } = await db
      .from("tv_devices")
      .insert({
        name: d.name,
        team_ids: d.team_ids,
        activation_hash: hash(token),
        activation_expires: new Date(Date.now() + 86400000).toISOString(),
        athlete_seconds: Number(d.athlete_seconds) || 10,
        photo_seconds: Number(d.photo_seconds) || 8,
        photos_enabled: d.photos_enabled !== false,
      })
      .select("id")
      .single();
    if (error) throw error;
    await db
      .from("audit_events")
      .insert({ actor_id: a.user.id, action: "tv_create", entity_id: data.id });
    return json({
      id: data.id,
      url: `${process.env.APP_URL}/magic-tv#activate=${token}`,
    });
  } catch (e) {
    return failure(e);
  }
}
