"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/providers/I18nProvider";

const footerLinks = [
  {
    labelKey: "footer.links.privacy",
    fallback: "Privacy Policy",
    href: "/privacy",
  },
  {
    labelKey: "footer.links.terms",
    fallback: "Terms of Service",
    href: "/terms",
  },
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
      <footer className="bg-[#1a0b12] text-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-1 px-4 py-3 text-center">
          <p className="text-[10px] uppercase tracking-[0.4em] text-background/70">
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
    <footer className="bg-[#1a0b12] text-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 text-center md:px-10">
        <p className="text-sm uppercase tracking-[0.3em] text-secondary">
          {t("footer.verse.reference", "Psalm 150:4")}
        </p>
        <blockquote className="text-2xl font-serif text-secondary">
          {t(
            "footer.verse.text",
            "“Praise Him with stringed instruments and organs.”",
          )}
        </blockquote>
        <div className="flex flex-wrap items-center justify-center gap-8 text-sm uppercase tracking-wide text-foreground opacity-80">
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
        <p className="text-xs text-foreground opacity-70">
          {t(
            "footer.copyright",
            "© 2025 Abel Begena. Preserving the Heritage of Saint Yared.",
          )}
        </p>
      </div>
    </footer>
  );
}

