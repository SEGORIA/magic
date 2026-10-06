import { userDb } from "@/lib/supabase";
import {
  account,
  body,
  failure,
  HttpError,
  json,
  sameOrigin,
} from "@/lib/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const d = await body(request);
    const db = await userDb();
    if (d.action === "login") {
      if (
        typeof d.email !== "string" ||
        typeof d.password !== "string" ||
        d.email.length > 254 ||
        d.password.length > 200
      )
        throw new HttpError(400, "Revisa tus datos");
      const { error } = await db.auth.signInWithPassword({
        email: d.email,
        password: d.password,
      });
      if (error)
        throw new HttpError(
          400,
          "No pudimos iniciar sesión. Revisa tu correo y contraseña.",
        );
      await db.rpc("activate_profile");
      return json({ ok: true });
    }
    if (d.action === "recovery") {
      if (typeof d.email !== "string" || d.email.length > 254)
        throw new HttpError(400, "Correo inválido");
      await db.auth.resetPasswordForEmail(d.email, {
        redirectTo: `${process.env.APP_URL}/auth/callback?next=/seguridad`,
      });
      return json({
        ok: true,
        message:
          "Si el correo está registrado, recibirás instrucciones para recuperar el acceso.",
      });
    }
    if (d.action === "logout") {
      await db.auth.signOut();
      return json({ ok: true });
    }
    const a = await account(false);
    if (d.action === "password") {
      if (
        typeof d.password !== "string" ||
        d.password.length < 12 ||
        d.password.length > 128
      )
        throw new HttpError(400, "Usa entre 12 y 128 caracteres");
      const { error } = await a.db.auth.updateUser({ password: d.password });
      if (error)
        throw new HttpError(400, "No fue posible cambiar la contraseña");
      return json({ ok: true });
    }
    if (d.action === "mfa-status") {
      const { data } = await a.db.auth.mfa.listFactors();
      const { data: level } =
        await a.db.auth.mfa.getAuthenticatorAssuranceLevel();
      return json({
        factors: data?.totp
          .filter((f) => f.status === "verified")
          .map((f) => ({ id: f.id, name: f.friendly_name })),
        level: level?.currentLevel,
      });
    }
    if (d.action === "mfa-enroll") {
      const { data: factors } = await a.db.auth.mfa.listFactors();
      for (const f of factors?.all ?? [])
        if (f.status === "unverified")
          await a.db.auth.mfa.unenroll({ factorId: f.id });
      const { data, error } = await a.db.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Magic Admin",
      });
      if (error || !data)
        throw new HttpError(400, "No fue posible configurar el segundo factor");
      return json({
        id: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
      });
    }
    if (d.action === "mfa-verify") {
      if (!/^\d{6}$/.test(d.code ?? ""))
        throw new HttpError(400, "Ingresa el código de seis dígitos");
      const { error } = await a.db.auth.mfa.challengeAndVerify({
        factorId: d.id,
        code: d.code,
      });
      if (error) throw new HttpError(400, "Código inválido o vencido");
      return json({ ok: true });
    }
    throw new HttpError(400, "Operación inválida");
  } catch (e) {
    return failure(e);
  }
}
