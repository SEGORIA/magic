import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { serviceDb } from "./supabase";
import { HttpError } from "./http";
export const hash = (text: string) =>
  createHash("sha256").update(text).digest("hex");
export const secret = () => randomBytes(32).toString("base64url");
export const TV_COOKIE = "magic_tv";
export async function tvSession() {
  const value = (await cookies()).get(TV_COOKIE)?.value;
  if (!value || value.length > 100)
    throw new HttpError(401, "Activa esta pantalla desde administración");
  const db = serviceDb();
  const { data, error } = await db
    .from("tv_devices")
    .select("*")
    .eq("session_hash", hash(value))
    .eq("active", true)
    .gt("session_expires", new Date().toISOString())
    .maybeSingle();
  if (error || !data)
    throw new HttpError(401, "Esta pantalla no tiene acceso activo");
  return { db, device: data, value };
}
export async function rateLimit(key: string, max: number, window: number) {
  const { data, error } = await serviceDb().rpc("take_rate_limit", {
    k: key,
    max_hits: max,
    window_seconds: window,
  });
  if (error) throw new HttpError(503, "No pudimos validar la solicitud");
  if (!data)
    throw new HttpError(
      429,
      "Demasiados intentos. Espera antes de intentar de nuevo.",
    );
}
