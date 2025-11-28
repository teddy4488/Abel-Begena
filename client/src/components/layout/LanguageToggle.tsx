"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";

const languages: Array<{ code: "en" | "am"; label: string }> = [
  { code: "en", label: "En" },
  { code: "am", label: "Am" },
];

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (code: "en" | "am") => {
    if (locale === code) {
      setOpen(false);
      return;
    }
    startTransition(() => {
      setLocale(code);
      setOpen(false);
    });
  };

  return (
    <div className="relative text-xs" ref={containerRef}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="group relative inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 font-semibold uppercase tracking-wide text-foreground/80 transition hover:-translate-y-0.5 hover:text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary after:absolute after:-bottom-1 after:left-1/2 after:h-[2px] after:w-0 after:rounded-full after:bg-secondary after:opacity-0 after:transition-all after:duration-300 group-hover:after:left-0 group-hover:after:w-full group-hover:after:opacity-100 focus-visible:after:left-0 focus-visible:after:w-full focus-visible:after:opacity-100"
        onClick={() => setOpen((prev) => !prev)}
        disabled={isPending}
      >
        {locale === "en" ? "En" : "Am"}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-24 rounded-xl border border-border bg-surface py-1 shadow-xl">
          {languages.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="option"
              aria-selected={locale === lang.code}
              className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs ${
                locale === lang.code
                  ? "text-secondary"
                  : "text-foreground/70 hover:text-secondary"
              }`}
              onClick={() => handleSelect(lang.code)}
            >
              <span>{lang.label}</span>
              <span className="text-[10px] uppercase tracking-wide">
                {t(
                  lang.code === "en" ? "nav.language.en" : "nav.language.am",
                  lang.label,
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

