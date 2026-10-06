import { readFile } from "node:fs/promises";
import path from "node:path";
export const dynamic = "force-static";
export async function GET() {
  let html = await readFile(path.join(process.cwd(), "index.html"), "utf8");
  html = html.replace(
    "</ul>",
    '<li><a href="/acceso" style="color:#FF5FA8">Mi Magic ↗</a></li></ul>',
  );
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
