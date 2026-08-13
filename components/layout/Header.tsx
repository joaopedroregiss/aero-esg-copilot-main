"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/copiloto", label: "Copiloto" },
  { href: "/visao-gerencial", label: "Visão Gerencial" },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="shrink-0 border-b border-line bg-canvas-raised/90 backdrop-blur supports-[backdrop-filter]:bg-canvas-raised/70 sticky top-0 z-40">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 sm:px-8">
        
        <Link
          href="/copiloto"
          className="group flex items-center"
          aria-label="EVORA — página inicial"
        >
          <img
            src="/evora-logo.svg"
            alt="EVORA"
            className="h-9 w-auto object-contain"
          />
        </Link>

        <nav
          aria-label="Navegação principal"
          className="flex items-center gap-1 sm:gap-2"
        >
          {NAV_ITEMS.map((item) => {
            const active = pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "relative px-3 py-2 text-[13px] sm:text-sm font-medium transition-colors",
                  active
                    ? "text-charcoal"
                    : "text-charcoal-faint hover:text-charcoal"
                )}
              >
                {item.label}

                <span
                  className={clsx(
                    "absolute inset-x-3 -bottom-[1px] h-[2px] bg-aevo transition-opacity",
                    active ? "opacity-100" : "opacity-0"
                  )}
                />
              </Link>
            );
          })}
        </nav>

      </div>
    </header>
  );
}