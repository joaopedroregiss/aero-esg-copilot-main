import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import AccessibilityToggle from "@/components/layout/AccessibilityToggle";

export const metadata: Metadata = {
  title: "AEVO — Copiloto ESG",
  description:
    "AEVO é um copiloto de IA que transforma ideias de colaboradores em oportunidades ESG estruturadas.",
};

// Aplica o tema salvo (claro / escuro / alto contraste) antes da primeira
// pintura da página, evitando o "flash" do tema errado.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var mode = window.localStorage.getItem("aevo-theme");
    if (mode === "dark" || mode === "contrast") {
      document.documentElement.setAttribute("data-theme", mode);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased bg-canvas text-charcoal font-body">
        <div className="flex min-h-dvh flex-col">
          <Header />
          <main className="flex-1 flex flex-col min-h-0">{children}</main>
        </div>
        <AccessibilityToggle />
      </body>
    </html>
  );
}
