import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import FontScaleInitializer from "@/components/font-scale-initializer";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
export const metadata: Metadata = { title: "Aviation Content Studio", description: "Pesquisa editorial e produção de conteúdo aeronáutico com fontes verificáveis." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" className={`${geist.variable} ${mono.variable} h-full antialiased`}><body className="min-h-full"><FontScaleInitializer />{children}</body></html>;
}
