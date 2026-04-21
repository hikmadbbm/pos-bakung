"use client";
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [language, setLangState] = useState('id');
  const [activeTranslations, setActiveTranslations] = useState({});
  const [fallbackTranslations, setFallbackTranslations] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);

  // Deep merge utility
  const deepMerge = (target, source) => {
    for (const key in source) {
      if (source[key] instanceof Object && key in target) {
        Object.assign(source[key], deepMerge(target[key], source[key]));
      }
    }
    Object.assign(target || {}, source);
    return target;
  };

  const loadTranslations = async (lang) => {
    try {
      const res = await fetch(`/api/locales?lang=${lang}`);
      if (!res.ok) {
        console.error(`[i18n] Failed to load ${lang}: ${res.status}`);
        return {};
      }
      const data = await res.json();
      return data;
    } catch (error) {
      console.error(`[i18n] Error loading ${lang}:`, error);
      return {};
    }
  };

  const init = async () => {
    try {
      const savedLang = localStorage.getItem('app_language');
      const targetLang = savedLang || 'id';
      
      const [active, fallback] = await Promise.all([
        loadTranslations(targetLang),
        targetLang !== 'en' ? loadTranslations('en') : Promise.resolve({})
      ]);

      console.log(`[i18n] Loaded ${targetLang} with ${Object.keys(active).length} namespaces`);
      
      setActiveTranslations(active);
      setFallbackTranslations(targetLang === 'en' ? active : fallback);
      setLangState(targetLang);
      setIsLoaded(true);
    } catch (error) {
      console.error("[i18n] Init failed:", error);
      setIsLoaded(true); // Don't block UI forever
    }
  };

  useEffect(() => {
    init();
  }, []);

  const changeLanguage = async (newLang) => {
    setIsLoaded(false);
    const translations = await loadTranslations(newLang);
    const enFallback = newLang !== 'en' ? await loadTranslations('en') : translations;
    
    setActiveTranslations(translations);
    setFallbackTranslations(enFallback);
    setLangState(newLang);
    localStorage.setItem('app_language', newLang);
    setIsLoaded(true);
  };

  const t = useCallback((keyStr) => {
    if (!keyStr) return '';
    
    // Resolve helper
    const resolve = (obj, path) => {
      const parts = path.split('.');
      let current = obj;
      for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part];
        } else {
          return undefined;
        }
      }
      return typeof current === 'string' ? current : undefined;
    };

    // 1. Try active language (Nested)
    let result = resolve(activeTranslations, keyStr);
    
    // 2. Try active language (Flat search - sometimes keys are at root)
    if (result === undefined) {
      const parts = keyStr.split('.');
      const lastPart = parts[parts.length - 1];
      if (activeTranslations[lastPart] && typeof activeTranslations[lastPart] === 'string') {
        result = activeTranslations[lastPart];
      }
    }

    // 3. Try fallback language (Nested)
    if (result === undefined) {
      result = resolve(fallbackTranslations, keyStr);
    }

    // 4. Try fallback language (Flat search)
    if (result === undefined) {
      const parts = keyStr.split('.');
      const lastPart = parts[parts.length - 1];
      if (fallbackTranslations[lastPart] && typeof fallbackTranslations[lastPart] === 'string') {
        result = fallbackTranslations[lastPart];
      }
    }

    if (result !== undefined) return result;

    // Last resort: human readable
    const parts = keyStr.split('.');
    const rawKey = parts[parts.length - 1];
    const humanReadable = rawKey
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());

    if (process.env.NODE_ENV === 'development' && isLoaded) {
      console.warn(`[i18n] Missing key: ${keyStr} (Fallback: ${humanReadable})`);
    }

    return humanReadable;
  }, [activeTranslations, fallbackTranslations, isLoaded]);

  const setLanguage = changeLanguage;

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, setLanguage, t, isLoaded }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useTranslation must be used within a LanguageProvider');
  return context;
};
