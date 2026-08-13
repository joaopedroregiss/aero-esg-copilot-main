"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/copiloto", label: "Copiloto" },
  { href: "/visao-gerencial", label: "Visão Gerencial" },
];

function EvoraLogo() {
  return (
    <svg
      width="150"
      height="46"
      viewBox="0 0 300 92"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="EVORA"
      role="img"
    >
      {/* Símbolo EVORA */}
      <g fill="#F15A24">
        <path d="M28 24L55 4V22L38 35C31 40 27 47 27 55C27 60 29 65 33 69L24 76C17 70 13 61 13 52C13 41 18 32 28 24Z" />
        <path d="M49 35L78 12V31L52 51C45 56 42 62 42 69C42 75 45 80 50 83L39 90C31 84 27 76 27 67C27 55 34 45 49 35Z" />
        <path d="M72 49L94 31V49L76 63C71 67 69 72 69 77C69 81 71 85 75 88L64 92C57 87 54 81 54 74C54 65 60 56 72 49Z" />
      </g>

      {/* EVORA */}
      <g fontFamily="Arial, Helvetica, sans-serif" fontWeight="700">
        <text
          x="112"
          y="63"
          fontSize="52"
          letterSpacing="2"
          fill="#F15A24"
        >
          EVO
        </text>

        <text
          x="218"
          y="63"
          fontSize="52"
          letterSpacing="2"
          fill="#292929"
        >
          RA
        </text>
      </g>
    </svg>
  );
}

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
          <EvoraLogo />
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