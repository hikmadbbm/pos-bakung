"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';
import { api } from './api';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('en');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      try {
        const config = await api.get('/settings/config');
        if (config && config.language) {
          setLanguage(config.language);
        }
      } catch (e) {
        if (e?.response?.status !== 401) {
          console.error("Failed to load language config", e);
        }
        // Fallback to local storage if API fails
        const saved = localStorage.getItem('app_language');
        if (saved) setLanguage(saved);
      } finally {
        setIsLoaded(true);
      }
    }
    loadConfig();
  }, []);

  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  const updateLanguage = async (newLang) => {
    setLanguage(newLang);
    localStorage.setItem('app_language', newLang);
    try {
      await api.put('/settings/config', { language: newLang });
      // Refresh the page to ensure all components update
      window.location.reload();
    } catch (e) {
      console.error("Failed to persist language change", e);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: updateLanguage, t, isLoaded }}>
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
