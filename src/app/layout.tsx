import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "My Magic · Cada avance cuenta",
  description: "Tu camino, tu progreso, tu Magic.",
  robots: { index: false, follow: false },
  icons: { icon: "/assets/img/favicon-32.png" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO">
      <body>{children}</body>
    </html>
  );
}
