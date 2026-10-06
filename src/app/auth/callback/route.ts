import { NextResponse } from "next/server";
import { userDb } from "@/lib/supabase";
export async function GET(request: Request) {
  const url = new URL(request.url),
    db = await userDb();
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  const result = code
    ? await db.auth.exchangeCodeForSession(code)
    : token_hash && ["invite", "recovery", "email"].includes(type ?? "")
      ? await db.auth.verifyOtp({
          token_hash,
          type: type as "invite" | "recovery" | "email",
        })
      : null;
  if (!result || result.error)
    return NextResponse.redirect(
      new URL("/acceso?error=expired", process.env.APP_URL!),
    );
  await db.rpc("activate_profile");
  return NextResponse.redirect(new URL("/seguridad", process.env.APP_URL!));
}
