"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/providers/I18nProvider";
import { LalibelaCross } from "@/components/icons/ethiopian";
import HabeshaThread from "@/components/icons/ethiopian/HabeshaThread";

const footerLinks = [
  {
    labelKey: "footer.links.contact",
    fallback: "Contact",
    href: "#contact",
  },
];

export default function Footer() {
  const pathname = usePathname();
  const { t } = useI18n();
  const isConsoleRoute =
    pathname?.startsWith("/admin") || pathname?.startsWith("/teacher");

  if (isConsoleRoute) {
    return (
      <footer className="relative bg-background text-foreground dark:bg-[#05030a] dark:text-foreground overflow-hidden">
        <div className="relative mx-auto flex max-w-6xl flex-col items-center justify-center gap-1 px-4 py-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-secondary/80">
            {t("footer.console.reference", "Psalm 33:3")}
          </p>
          <p className="text-xs font-serif text-secondary">
            {t(
              "footer.console.text",
              "“Sing to Him a new song; play skillfully with a shout of joy.”",
            )}
          </p>
        </div>
      </footer>
    );
  }

  return (
    <footer className="relative bg-background text-foreground dark:bg-[#05030a] dark:text-foreground overflow-hidden">
      {/* 4-sided HabeshaThread inset border */}
      <div
        className="habesha-thread pointer-events-none absolute left-0 right-0 top-0"
        style={{ opacity: 0.55, height: 14, margin: 0 }}
        aria-hidden="true"
      />
      <div
        className="habesha-thread pointer-events-none absolute bottom-0 left-0 right-0"
        style={{ opacity: 0.55, height: 14, margin: 0 }}
        aria-hidden="true"
      />
      <div
        className="habesha-thread pointer-events-none absolute bottom-0 left-0 top-0"
        style={{ opacity: 0.55, width: 14, height: "auto", margin: 0 }}
        aria-hidden="true"
      />
      <div
        className="habesha-thread pointer-events-none absolute bottom-0 right-0 top-0"
        style={{ opacity: 0.55, width: 14, height: "auto", margin: 0 }}
        aria-hidden="true"
      />

      <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-10 py-12 text-center md:px-14">
        {/* Lalibela Cross at top with radial glow */}
        <div className="relative flex justify-center py-2" aria-hidden="true">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 50%, rgba(212,164,55,0.45) 0%, rgba(212,164,55,0.12) 50%, transparent 75%)",
            }}
          />
          <LalibelaCross
            size={52}
            color="#ffd84d"
            strokeWidth={2}
            style={{ filter: "drop-shadow(0 0 14px rgba(247,201,72,0.85))", position: "relative" }}
          />
        </div>

        <p className="text-sm uppercase tracking-[0.3em] text-secondary">
          {t("footer.verse.reference", "Psalm 150:4")}
        </p>
        <blockquote className="text-2xl font-serif text-secondary">
          {t(
            "footer.verse.text",
            "“Praise Him with stringed instruments and organs.”",
          )}
        </blockquote>
        <div className="flex flex-wrap items-center justify-center gap-6 text-sm uppercase tracking-wide text-foreground/80">
          {footerLinks.map((link) => (
            <Link
              key={link.labelKey}
              href={link.href}
              className="transition hover:text-secondary"
            >
              {t(link.labelKey, link.fallback)}
            </Link>
          ))}
        </div>
        <p className="text-xs text-foreground/70">
          {t(
            "footer.copyright",
            "© 2025 Abel Begena. Preserving the Heritage of Saint Yared.",
          )}
        </p>
      </div>
    </footer>
  );
}
