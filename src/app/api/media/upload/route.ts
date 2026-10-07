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
    const a = await account();
    const d = await body(request);
    const task = d.kind === "task";
    const { data, error } = await a.db.rpc(
      task ? "magic_task_command" : "magic_command",
      {
        action: task ? "task_media_create" : "media_create",
        d,
      },
    );
    if (error) throw new HttpError(400, error.message);
    const path = `quarantine/${a.user.id}/${data.id}`;
    const { data: upload, error: uploadError } = await serviceDb()
      .storage.from("magic-private")
      .createSignedUploadUrl(path, { upsert: false });
    if (uploadError || !upload)
      throw new HttpError(503, "No fue posible preparar la subida");
    return json({ id: data.id, url: upload.signedUrl });
  } catch (e) {
    return failure(e);
  }
}
