import React, { createContext, useContext, useState, useEffect } from 'react';
import { storage } from '../services/storage';
import {
  LanguageCode,
  LanguageInfo,
  SUPPORTED_LANGUAGES,
  translations,
} from '../i18n/translations';

interface LanguageContextType {
  currentLanguage: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  t: (key: string, defaultText?: string) => string;
  langInfo: LanguageInfo;
  languages: LanguageInfo[];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguage, setCurrentLanguageState] = useState<LanguageCode>(() => {
    const saved = storage.getLanguage() as LanguageCode;
    const exists = SUPPORTED_LANGUAGES.some((l) => l.code === saved);
    return exists ? saved : 'en';
  });

  const setLanguage = (code: LanguageCode) => {
    setCurrentLanguageState(code);
    storage.setLanguage(code);
  };

  const langInfo =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  const t = (key: string, defaultText?: string): string => {
    const langDict = translations[currentLanguage];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fallback to English
    const fallbackDict = translations['en'];
    if (fallbackDict && fallbackDict[key]) {
      return fallbackDict[key];
    }
    return defaultText || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        t,
        langInfo,
        languages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
