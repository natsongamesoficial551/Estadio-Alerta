import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Estádio Alerta | Arena CVG",
  description: "Maquete digital 3D de uma arena de futebol. Um projeto sobre tecnologia, infraestrutura e segurança.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
