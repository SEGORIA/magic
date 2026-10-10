import { NextResponse } from "next/server";
import { userDb } from "@/lib/supabase";
export async function GET(request: Request) {
  const url = new URL(request.url),
    db = await userDb();
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  if (
    token_hash &&
    ["signup", "invite", "recovery", "email", "magiclink"].includes(type ?? "")
  ) {
    const activation = new URL("/activar", process.env.APP_URL!);
    activation.searchParams.set("token_hash", token_hash);
    activation.searchParams.set("type", type!);
    return NextResponse.redirect(activation);
  }
  const result = code
    ? await db.auth.exchangeCodeForSession(code)
    : null;
  if (!result || result.error)
    return NextResponse.redirect(
      new URL("/acceso?error=expired", process.env.APP_URL!),
    );
  await db.rpc("activate_profile");
  return NextResponse.redirect(new URL("/seguridad", process.env.APP_URL!));
}
