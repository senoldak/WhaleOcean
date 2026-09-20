'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { Language, Translations } from './types';
import { tr } from './locales/tr';
import { en } from './locales/en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: Translations;
}

const dictionaries: Record<Language, Translations> = {
  tr,
  en,
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'tr',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: tr,
});

const STORAGE_KEY = 'whale_ocean_language';

export function LanguageProvider({
  children,
  initialLanguage,
}: {
  children: ReactNode;
  initialLanguage?: Language;
}) {
  // Default to Turkish or provided initialLanguage
  const [language, setLanguageState] = useState<Language>(initialLanguage || 'tr');

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved === 'tr' || saved === 'en') {
        setLanguageState(saved);
      }
    } catch {
      // Ignore localStorage read errors in restricted contexts
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore localStorage write errors
    }
  };

  const toggleLanguage = () => {
    const next: Language = language === 'tr' ? 'en' : 'tr';
    setLanguage(next);
  };

  const t = useMemo(() => dictionaries[language] || tr, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t,
    }),
    [language, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'tr' as Language,
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: tr,
    };
  }
  return context;
}
