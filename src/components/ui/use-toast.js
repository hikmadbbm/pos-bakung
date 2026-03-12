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
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
  };

  const borderColors = {
    success: "border-emerald-100 bg-white shadow-emerald-100/50",
    error: "border-rose-100 bg-white shadow-rose-100/50",
    info: "border-blue-100 bg-white shadow-blue-100/50",
  };

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-3 p-4 rounded-xl border-2 shadow-xl transition-all duration-500 transform",
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0",
        borderColors[toast.type]
      )}
    >
      <div className="mt-0.5 shrink-0 bg-gray-50 p-1.5 rounded-full">{icons[toast.type]}</div>
      <div className="flex-1 pt-1.5">
        <div className="text-sm font-bold text-gray-900 leading-none mb-1">
          {toast.type.charAt(0).toUpperCase() + toast.type.slice(1)}
        </div>
        <div className="text-xs text-gray-600 font-medium">{toast.message}</div>
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => removeToast(toast.id), 300);
        }}
        className="shrink-0 mt-1 p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-all"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
