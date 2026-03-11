"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { CheckCircle, AlertCircle, X, Info } from "lucide-react";
import { cn } from "../../lib/utils";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "info", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const success = (msg, duration) => addToast(msg, "success", duration);
  const error = (msg, duration) => addToast(msg, "error", duration);
  const info = (msg, duration) => addToast(msg, "info", duration);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, info }}>
      {children}
      <Toaster toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

const Toaster = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} removeToast={removeToast} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, removeToast }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Slight delay for enter animation
    requestAnimationFrame(() => setIsVisible(true));

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => removeToast(toast.id), 300); // Wait for exit animation
    }, toast.duration);

    return () => clearTimeout(timer);
  }, [toast, removeToast]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const borderColors = {
    success: "border-green-200/70 bg-green-50/80",
    error: "border-red-200/70 bg-red-50/80",
    info: "border-blue-200/70 bg-blue-50/80",
  };

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-3 p-4 rounded-lg border shadow-lg transition-all duration-300 transform",
        "bg-white/95 text-gray-900 backdrop-blur supports-[backdrop-filter]:bg-white/80",
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
        borderColors[toast.type]
      )}
    >
      <div className="mt-0.5 shrink-0">{icons[toast.type]}</div>
      <div className="flex-1 text-sm font-medium">{toast.message}</div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => removeToast(toast.id), 300);
        }}
        className="shrink-0 text-gray-500 hover:text-gray-900 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
