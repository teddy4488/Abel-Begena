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
      className="group relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-(--color-secondary-soft) text-foreground transition hover:-translate-y-0.5 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary after:absolute after:-bottom-1 after:left-1/2 after:h-[2px] after:w-0 after:rounded-full after:bg-secondary after:opacity-0 after:transition-all after:duration-300 group-hover:after:left-2 group-hover:after:w-6 group-hover:after:opacity-100 focus-visible:after:left-2 focus-visible:after:w-6 focus-visible:after:opacity-100"
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

