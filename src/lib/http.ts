import "server-only";
import { NextResponse } from "next/server";
import { userDb } from "./supabase";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}
export function failure(e: unknown) {
  if (e instanceof HttpError) return json({ error: e.message }, e.status);
  if (e instanceof Error && e.message === "CONFIGURATION_REQUIRED")
    return json(
      {
        error:
          "Falta conectar los servicios de Magic. Contacta a administración.",
      },
      503,
    );
  console.error(
    "magic_request_failed",
    e instanceof Error ? e.name : "unknown",
  );
  return json(
    { error: "No pudimos completar la solicitud. Intenta de nuevo." },
    500,
  );
}
export function sameOrigin(request: Request) {
  const allowed = process.env.APP_URL;
  if (!allowed || request.headers.get("origin") !== new URL(allowed).origin)
    throw new HttpError(403, "Origen no autorizado");
}
export async function body(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 40000)
    throw new HttpError(413, "Solicitud demasiado grande");
  const reader = request.body?.getReader();
  let text = "";
  let size = 0;
  if (reader) {
    const decoder = new TextDecoder();
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 40000) {
        await reader.cancel();
        throw new HttpError(413, "Solicitud demasiado grande");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Formato no válido");
  }
}
export async function account(mfa = true) {
  const db = await userDb();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) throw new HttpError(401, "Inicia sesión para continuar");
  const { data: profile } = await db
    .from("profiles")
    .select("id,name,active,avatar_id")
    .eq("id", user.id)
    .single();
  if (!profile?.active)
    throw new HttpError(
      403,
      "Tu cuenta no tiene acceso activo. Contacta a administración.",
    );
  const { data: rows, error: roleError } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (roleError) throw new HttpError(503, "No pudimos verificar tus permisos");
  const roles = (rows ?? []).map((r) => r.role as string);
  if (!roles.length) throw new HttpError(403, "No tienes un rol activo");
  if (mfa && roles.includes("admin")) {
    const { data } = await db.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.currentLevel !== "aal2")
      throw new HttpError(428, "Verifica tu segundo factor en Seguridad");
  }
  return { db, user, profile, roles };
}
