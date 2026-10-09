import type { Metadata } from "next";
import { connection } from "next/server";
import "./globals.css";
export const metadata: Metadata = {
  title: "My Magic · Cada avance cuenta",
  description: "Tu camino, tu progreso, tu Magic.",
  robots: { index: false, follow: false },
  icons: { icon: "/assets/img/favicon-32.png" },
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();
  return (
    <html lang="es-CO">
      <body>{children}</body>
    </html>
  );
}
