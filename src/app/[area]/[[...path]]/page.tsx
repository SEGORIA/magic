import { notFound } from "next/navigation";
import MagicApp from "@/components/magic-app";
import { configured } from "@/lib/supabase";
export default async function Page({
  params,
}: {
  params: Promise<{ area: string; path?: string[] }>;
}) {
  const { area, path = [] } = await params;
  if (!["admin", "coach", "mi-magic", "demo"].includes(area)) notFound();
  return (
    <MagicApp
      area={area}
      section={path[0] ?? "inicio"}
      configured={configured()}
    />
  );
}
