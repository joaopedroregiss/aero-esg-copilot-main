"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, CircleDot } from "lucide-react";
import clsx from "clsx";

type ThemeMode = "light" | "dark" | "contrast";

const STORAGE_KEY = "aevo-theme";

const ORDER: ThemeMode[] = ["light", "dark", "contrast"];

const META: Record<ThemeMode, { label: string; next: string; Icon: typeof Sun }> = {
  light: { label: "Tema claro ativo", next: "Mudar para tema escuro", Icon: Sun },
  dark: { label: "Tema escuro ativo", next: "Mudar para alto contraste", Icon: Moon },
  contrast: { label: "Alto contraste ativo", next: "Mudar para tema claro", Icon: CircleDot },
};

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "light") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", mode);
  }
}

export default function AccessibilityToggle() {
  const [mode, setMode] = useState<ThemeMode>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    const initial = stored && ORDER.includes(stored) ? stored : "light";
    setMode(initial);
    setMounted(true);
  }, []);

  function cycle() {
    const currentIndex = ORDER.indexOf(mode);
    const next = ORDER[(currentIndex + 1) % ORDER.length];
    setMode(next);
    applyTheme(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  if (!mounted) return null;

  const { label, next, Icon } = META[mode];

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Acessibilidade. ${label}. ${next}.`}
      title={`Acessibilidade — ${next}`}
      className={clsx(
        "fixed bottom-5 left-4 z-50 flex h-11 w-11 items-center justify-center rounded-full",
        "border border-line-strong bg-canvas-raised text-charcoal shadow-[0_2px_10px_rgba(0,0,0,0.12)]",
        "transition-transform hover:scale-105 hover:border-aevo hover:text-aevo-dark",
        "sm:bottom-6 sm:left-6"
      )}
    >
      <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
      <span className="sr-only">{`Acessibilidade: ${label}. Clique para: ${next}.`}</span>
    </button>
  );
}
