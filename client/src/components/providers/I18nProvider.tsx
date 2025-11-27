"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import enMessages from "@/locales/en.json";
import amMessages from "@/locales/am.json";
import { useAppSelector } from "@/store/hooks";
import { useGetContentQuery } from "@/store/api/cmsApi";

type Locale = "en" | "am";
type Dictionary = Record<string, string>;

const staticMessages: Record<Locale, Dictionary> = {
  en: enMessages,
  am: amMessages,
};

type I18nContextValue = {
  locale: Locale;
  t: (key: string, fallback?: string) => string;
  setLocale: (locale: Locale) => void;
  messages: Dictionary;
};

const I18nContext = createContext<I18nContextValue | null>(null);
const STORAGE_KEY = "abel-begena-locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const { user } = useAppSelector((state) => state.auth);
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "am") {
        return stored;
      }
    }
    return "en";
  });

  useEffect(() => {
    if (!user?.languagePreference) {
      return;
    }
    if (user.languagePreference === "en" || user.languagePreference === "am") {
      const frame =
        typeof window !== "undefined"
          ? window.requestAnimationFrame(() => {
              setLocaleState(user.languagePreference);
            })
          : null;
      return () => {
        if (frame !== null && typeof window !== "undefined") {
          window.cancelAnimationFrame(frame);
        }
      };
    }
  }, [user?.languagePreference]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, next);
    }
  }, []);

  const { data: cmsContent } = useGetContentQuery({ lang: locale });

  const cmsDictionary = useMemo(() => {
    if (!cmsContent) {
      return {};
    }
    return cmsContent.reduce((acc, block) => {
      acc[`cms.${block.key}`] = block.value;
      return acc;
    }, {} as Dictionary);
  }, [cmsContent]);

  const dictionary = useMemo(
    () => ({
      ...staticMessages[locale],
      ...cmsDictionary,
    }),
    [cmsDictionary, locale],
  );

  const translate = useCallback(
    (key: string, fallback?: string) => dictionary[key] ?? fallback ?? key,
    [dictionary],
  );

  const value = useMemo(
    () => ({
      locale,
      t: translate,
      setLocale,
      messages: dictionary,
    }),
    [dictionary, locale, setLocale, translate],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}

