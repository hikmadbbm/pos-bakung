"use client";
import React, { createContext, useContext, useState, useEffect } from "react";
import { CheckCircle, AlertCircle, X, Info, HelpCircle } from "lucide-react";
import { cn } from "../../lib/utils";

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, onConfirm, onCancel, resolve }

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

  const confirm = ({ title, message, confirmText = "OK", cancelText = "Cancel", variant = "default" }) => {
    return new Promise((resolve) => {
      setConfirmDialog({
        title,
        message,
        confirmText,
        cancelText,
        variant,
        resolve: (val) => {
          setConfirmDialog(null);
          resolve(val);
        }
      });
    });
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, info, confirm }}>
      {children}
      <Toaster toasts={toasts} removeToast={removeToast} />
      {confirmDialog && (
        <ConfirmDialog 
          {...confirmDialog} 
          onConfirm={() => confirmDialog.resolve(true)}
          onCancel={() => confirmDialog.resolve(false)}
        />
      )}
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
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} removeToast={removeToast} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, removeToast }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => removeToast(toast.id), 400);
    }, toast.duration);
    return () => clearTimeout(timer);
  }, [toast, removeToast]);

  const icons = {
    success: <CheckCircle className="w-6 h-6 text-emerald-500" />,
    error: <AlertCircle className="w-6 h-6 text-rose-500" />,
    info: <Info className="w-6 h-6 text-emerald-500" />,
  };

  const themes = {
    success: "border-emerald-500/20 bg-emerald-50/90 text-emerald-900 shadow-emerald-500/10",
    error: "border-rose-500/20 bg-rose-50/90 text-rose-900 shadow-rose-500/10",
    info: "border-emerald-500/20 bg-emerald-50/90 text-emerald-900 shadow-emerald-500/10",
  };

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-4 p-4 rounded-2xl border-2 backdrop-blur-md shadow-2xl transition-all duration-500 transform",
        isVisible ? "translate-x-0 opacity-100 scale-100" : "translate-x-12 opacity-0 scale-95",
        themes[toast.type]
      )}
    >
      <div className="shrink-0 bg-white/80 p-1.5 rounded-xl shadow-inner">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold tracking-tight mb-0.5 opacity-90">
          {toast.type}
        </div>
        <div className="text-sm font-medium leading-tight">{toast.message}</div>
      </div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(() => removeToast(toast.id), 400);
        }}
        className="shrink-0 p-1 hover:bg-black/5 rounded-lg text-current/40 hover:text-current transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

const ConfirmDialog = ({ title, message, confirmText, cancelText, variant, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="absolute inset-0" 
        onClick={onCancel}
      />
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
            <HelpCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">{title}</h2>
          <p className="text-sm text-gray-500 font-medium leading-relaxed">{message}</p>
        </div>
        <div className="flex p-4 gap-3 bg-gray-50/50 border-t border-gray-100">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-sm font-bold text-gray-500 hover:bg-white hover:text-gray-900 rounded-2xl transition-all border border-transparent hover:border-gray-200"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              "flex-1 px-4 py-3 text-sm font-semibold text-white rounded-2xl transition-all shadow-lg active:scale-95",
              variant === "destructive" 
                ? "bg-rose-500 hover:bg-rose-600 shadow-rose-200" 
                : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200"
            )}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
