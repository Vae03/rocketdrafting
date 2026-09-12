"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { LANGUAGES, readLanguage, translations, writeLanguage, type LanguageCode, type TranslationKey } from "@/lib/i18n";

type Ctx = { language: LanguageCode; setLanguage: (code: LanguageCode) => void; t: (key: TranslationKey) => string };

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // AppShell's nav (and this provider) render during SSR, where localStorage doesn't exist -- so
  // the initial state must be the same deterministic default on both server and client to avoid a
  // hydration mismatch. Read the saved language, if any, right after mount instead (a one-time,
  // unavoidable sync from an external store, not state derivable from a lazy initializer).
  const [language, setLanguageState] = useState<LanguageCode>("en");

  useEffect(() => {
    // Genuine one-time sync from localStorage; a lazy useState initializer isn't viable here since
    // it would run during SSR (this provider, unlike the ssr:false mode components, renders on the
    // server) and produce a hydration mismatch against the deterministic "en" default above.
    const saved = readLanguage();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved !== "en") setLanguageState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  function setLanguage(code: LanguageCode) {
    setLanguageState(code);
    writeLanguage(code);
  }

  function t(key: TranslationKey) {
    return translations[language][key];
  }

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useTranslation must be used within a LanguageProvider");
  return ctx;
}

export { LANGUAGES };
