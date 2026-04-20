"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

const DarkModeContext = createContext({ isDark: false, toggleDark: () => {} });

export function DarkModeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("pos-dark-mode");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial = stored !== null ? stored === "true" : prefersDark;
    setIsDark(initial);
    if (initial) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDark = () => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem("pos-dark-mode", String(next));
      if (next) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return next;
    });
  };

  if (!mounted) return <>{children}</>;

  return (
    <DarkModeContext.Provider value={{ isDark, toggleDark }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  return useContext(DarkModeContext);
}
