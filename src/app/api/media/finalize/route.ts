import sharp from "sharp";
import {
  account,
  body,
  failure,
  HttpError,
  json,
  sameOrigin,
} from "@/lib/http";
import { serviceDb } from "@/lib/supabase";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const a = await account();
    const d = await body(request);
    const { data: media } = await a.db
      .from("media")
      .select("*")
      .eq("id", d.id)
      .eq("owner_id", a.user.id)
      .eq("status", "uploading")
      .maybeSingle();
    if (!media) throw new HttpError(404, "Carga no disponible");
    const db = serviceDb(),
      path = `quarantine/${a.user.id}/${media.id}`;
    const { data: file, error } = await db.storage
      .from("magic-private")
      .download(path);
    if (error || !file)
      throw new HttpError(400, "No encontramos la imagen subida");
    if (file.size > 10485760) throw new HttpError(400, "El máximo es 10 MB");
    const buffer = Buffer.from(await file.arrayBuffer());
    let output: Buffer;
    try {
      const image = sharp(buffer, {
        limitInputPixels: 25000000,
        animated: false,
      });
      const meta = await image.metadata();
      if (
        !["jpeg", "png", "webp"].includes(meta.format ?? "") ||
        (meta.pages ?? 1) > 1
      )
        throw new Error("format");
      output = await image
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      await db.storage.from("magic-private").remove([path]);
      await db
        .from("media")
        .update({ status: "rejected", reason: "Archivo inválido" })
        .eq("id", media.id);
      throw new HttpError(
        400,
        "Usa una imagen JPG, PNG o WebP válida de hasta 25 megapíxeles",
      );
    }
    const objectPath = `processed/${media.id}.webp`;
    const { error: saveError } = await db.storage
      .from("magic-private")
      .upload(objectPath, output, { contentType: "image/webp", upsert: false });
    if (saveError) throw saveError;
    const { error: updateError } = await db.rpc("finalize_media", {
      mid: media.id,
      actor: a.user.id,
    });
    if (updateError) {
      await db.storage.from("magic-private").remove([objectPath]);
      throw new HttpError(
        403,
        "El permiso cambió durante la carga. Vuelve a intentarlo.",
      );
    }
    await db.storage.from("magic-private").remove([path]);
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
