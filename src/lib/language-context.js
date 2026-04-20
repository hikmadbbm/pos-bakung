"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from './api';
import { TranslationGuard } from '../components/ui/translation-guard';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const [isLoaded, setIsLoaded] = useState(false);
  const [activeTranslations, setActiveTranslations] = useState({});
  const [fallbackTranslations, setFallbackTranslations] = useState({});

  const loadTranslations = async (lang) => {
    try {
      const res = await fetch(`/api/locales/${lang}`);
      if (!res.ok) return {};
      return await res.json();
    } catch (e) {
      console.error(`Failed to load ${lang} translations`, e);
      return {};
    }
  };

  useEffect(() => {
    async function init() {
      setIsLoaded(false);
      let targetLang = 'en';
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      if (token) {
        try {
          const config = await api.get('/settings/config');
          if (config && config.language) {
            targetLang = config.language;
          }
        } catch (e) {
          if (e?.response?.status !== 401) {
            console.error("Failed to load language config", e);
          }
          const saved = localStorage.getItem('app_language');
          if (saved) targetLang = saved;
        }
      } else {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('app_language') : null;
        if (saved) targetLang = saved;
      }
      
      const [active, fallback] = await Promise.all([
        loadTranslations(targetLang),
        targetLang !== 'en' ? loadTranslations('en') : Promise.resolve({})
      ]);

      setActiveTranslations(active);
      setFallbackTranslations(targetLang === 'en' ? active : fallback);
      setLanguage(targetLang);
      setIsLoaded(true);
    }
    init();
  }, []);

  const updateLanguage = async (newLang) => {
    setIsLoaded(false);
    const data = await loadTranslations(newLang);
    setActiveTranslations(data);
    if (newLang === 'en') setFallbackTranslations(data);
    setLanguage(newLang);
    localStorage.setItem('app_language', newLang);
    try {
      await api.put('/settings/config', { language: newLang });
    } catch (e) {
      console.error("Failed to persist language change", e);
    } finally {
      setIsLoaded(true);
    }
  };

  const t = React.useCallback((keyStr) => {
    if (!keyStr) return "";
    
    const parts = keyStr.split('.');
    let value = activeTranslations;
    
    // 1. Try resolving in active language
    for (const k of parts) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        value = undefined;
        break;
      }
    }

    if (value !== undefined && typeof value === 'string') return value;

    // 2. Try resolving in English (Fallback)
    if (language !== 'en') {
      let enValue = fallbackTranslations;
      for (const k of parts) {
        if (enValue && typeof enValue === 'object' && k in enValue) {
          enValue = enValue[k];
        } else {
          enValue = undefined;
          break;
        }
      }
      if (enValue !== undefined && typeof enValue === 'string') return enValue;
    }

    // 3. Fallback logic: Format key as human readable string
    const finalKeyName = parts[parts.length - 1];
    const humanReadable = finalKeyName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
      
    // 4. Developer debugging UI wrap
    if (process.env.NODE_ENV === 'development' && isLoaded) {
      console.warn(`[i18n] Missing key: ${keyStr}`);
    }

    return humanReadable;
  }, [activeTranslations, fallbackTranslations, language, isLoaded]);

  const contextValue = React.useMemo(() => ({
    language,
    setLanguage: updateLanguage,
    t,
    isLoaded
  }), [language, updateLanguage, t, isLoaded]);

  const [shouldShowGuard, setShouldShowGuard] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      setShouldShowGuard(false);
      return;
    }

    // Optimization: Don't show the sync screen for public pages or if no token exists
    // especially during the initial app load/redirect to login.
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const isPublic = typeof window !== 'undefined' && (window.location.pathname === '/login' || window.location.pathname === '/');
    
    if (!token || isPublic) {
      setShouldShowGuard(false);
      return;
    }

    // Delay the visibility of the guard to prevent flickering on fast connections
    const timer = setTimeout(() => {
      setShouldShowGuard(true);
    }, 600);

    return () => clearTimeout(timer);
  }, [isLoaded]);

  return (
    <LanguageContext.Provider value={contextValue}>
      {shouldShowGuard && <TranslationGuard />}
      {children}
    </LanguageContext.Provider>
  );
}

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
