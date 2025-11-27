"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const footerLinks = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Contact", href: "#contact" },
];

export default function Footer() {
  const pathname = usePathname();
  const isConsoleRoute =
    pathname?.startsWith("/admin") || pathname?.startsWith("/teacher");

  if (isConsoleRoute) {
    return (
      <footer className="bg-[#1a0b12] text-background">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-2 text-[10px] uppercase tracking-[0.4em] text-background/70">
          Console Mode
        </div>
      </footer>
    );
  }

  return (
    <footer className="bg-[#1a0b12] text-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 text-center md:px-10">
        <p className="text-sm uppercase tracking-[0.3em] text-secondary">
          Psalm 150:4
        </p>
        <blockquote className="text-2xl font-serif text-secondary">
          “Praise Him with stringed
          instruments and organs.”
        </blockquote>
        <div className="flex flex-wrap items-center justify-center gap-8 text-sm uppercase tracking-wide text-foreground opacity-80">
          {footerLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="transition hover:text-secondary"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <p className="text-xs text-foreground opacity-70">
          © 2025 Abel Begena. Preserving the Heritage of Saint Yared.
        </p>
      </div>
    </footer>
  );
}

