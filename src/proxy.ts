import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const policy = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' https://*.supabase.co; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`;
  const headers = new Headers(request.headers);
  headers.set("Content-Security-Policy", policy);
  headers.set("x-nonce", nonce);
  let response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    if (request.nextUrl.pathname === "/activar")
      response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }
  const db = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (values) => {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          headers.set("cookie", request.cookies.toString());
          response = NextResponse.next({ request: { headers } });
          response.headers.set("Content-Security-Policy", policy);
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              httpOnly: true,
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            }),
          );
        },
      },
    },
  );
  await db.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");
  if (request.nextUrl.pathname === "/activar")
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}
export const config = {
  matcher: [
    "/admin/:path*",
    "/coach/:path*",
    "/mi-magic/:path*",
    "/demo/:path*",
    "/magic-tv",
    "/api/:path*",
    "/acceso",
    "/activar",
    "/seguridad",
    "/auth/:path*",
  ],
};
