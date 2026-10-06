import { body, failure, HttpError, json, sameOrigin } from "@/lib/http";
import { serviceDb } from "@/lib/supabase";
import { hash, rateLimit, secret, TV_COOKIE } from "@/lib/tv";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const d = await body(request);
    if (typeof d.token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(d.token))
      throw new HttpError(400, "Enlace inválido");
    await rateLimit(`tv:${hash(d.token)}`, 10, 300);
    const session = secret();
    const { data, error } = await serviceDb().rpc("consume_tv_activation", {
      h: hash(d.token),
      s: hash(session),
    });
    if (error) throw error;
    if (!data)
      throw new HttpError(
        401,
        "El enlace venció o ya fue utilizado. Solicita otro a administración.",
      );
    const response = json({ ok: true });
    response.cookies.set(TV_COOKIE, session, {
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
