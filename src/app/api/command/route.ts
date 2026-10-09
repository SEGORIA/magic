import {
  account,
  body,
  failure,
  HttpError,
  json,
  sameOrigin,
} from "@/lib/http";
import { serviceDb } from "@/lib/supabase";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { db, roles } = await account();
    const d = await body(request);
    if (typeof d.action !== "string" || !d.data || typeof d.data !== "object")
      throw new HttpError(400, "Solicitud inválida");
    const taskActions = new Set([
      "task_create",
      "task_close",
      "monthly_goal_save",
      "task_review",
    ]);
    const coachProfileActions = new Set([
      "coach_profile_save",
      "coach_profile_review",
      "coach_profile_admin_update",
    ]);
    const { data, error } = await db.rpc(
      taskActions.has(d.action)
        ? "magic_task_command"
        : coachProfileActions.has(d.action)
          ? "magic_coach_command"
          : "magic_command",
      {
        action: d.action,
        d: d.data,
      },
    );
    if (error) {
      if (error.code === "23505")
        throw new HttpError(
          409,
          "Este registro ya existe o fue actualizado. Recarga para revisar.",
        );
      throw new HttpError(
        400,
        error.message.startsWith("new row")
          ? "Revisa los campos del formulario"
          : error.message,
      );
    }
    if (d.action === "invite" && roles.includes("admin")) {
      const { error: inviteError } =
        await serviceDb().auth.admin.inviteUserByEmail(d.data.email, {
          redirectTo: `${process.env.APP_URL}/auth/callback`,
        });
      if (inviteError)
        return json({
          ...data,
          warning:
            "Invitación registrada. No se pudo enviar el correo; revisa el servicio de correo y vuelve a invitar.",
        });
    }
    return json(data);
  } catch (e) {
    return failure(e);
  }
}
