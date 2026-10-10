import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { body, failure, HttpError, sameOrigin } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    sameOrigin(request);
    const d = await body(request);
    if (
      typeof d.token_hash !== "string" ||
      !/^[a-f0-9]{32,256}$/i.test(d.token_hash) ||
      typeof d.type !== "string" ||
      !["signup", "invite", "recovery", "email", "magiclink"].includes(
        d.type,
      )
    )
      throw new HttpError(400, "El enlace de activación no es válido.");
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    )
      throw new HttpError(503, "Falta configurar el acceso de Magic.");

    const response = NextResponse.json(
      { ok: true, next: "/seguridad" },
      { headers: { "Cache-Control": "private, no-store" } },
    );
    const db = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (values) =>
            values.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, {
                ...options,
                httpOnly: true,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
              }),
            ),
        },
      },
    );
    const { error } = await db.auth.verifyOtp({
      token_hash: d.token_hash,
      type: d.type === "magiclink" ? "email" : d.type,
    });
    if (error) throw new HttpError(400, "El enlace venció o ya fue utilizado.");
    const { error: profileError } = await db.rpc("activate_profile");
    if (profileError) throw new HttpError(400, "No fue posible activar el perfil.");
    return response;
  } catch (e) {
    return failure(e);
  }
}
