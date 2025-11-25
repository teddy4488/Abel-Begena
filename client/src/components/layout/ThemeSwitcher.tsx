"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function ThemeSwitcher() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    
    return () => clearTimeout(timer);
  }, []);

  const currentTheme = theme === "system" ? resolvedTheme : theme;
  const isDark = currentTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-foreground transition hover:-translate-y-0.5 hover:border-secondary"
      aria-label="Toggle theme"
    >
      {mounted ? (
        isDark ? (
          <Sun className="h-5 w-5 text-secondary" />
        ) : (
          <Moon className="h-5 w-5 text-secondary" />
        )
      ) : (
        <Sun className="h-5 w-5 text-secondary" />
      )}
    </button>
  );
}

