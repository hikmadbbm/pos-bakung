"use client";
import React, { createContext, useContext, useState } from "react";

const FocusModeContext = createContext();

export function FocusModeProvider({ children }) {
  const [isFocusMode, setIsFocusMode] = useState(false);

  return (
    <FocusModeContext.Provider value={{ isFocusMode, setIsFocusMode }}>
      {children}
    </FocusModeContext.Provider>
  );
}

export function useFocusMode() {
  const context = useContext(FocusModeContext);
  if (!context) {
    throw new Error("useFocusMode must be used within a FocusModeProvider");
  }
  return context;
}
