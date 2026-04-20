"use client";

import React, { useState, useEffect } from "react";
import { Circle, AlertCircle, Clock, ShieldAlert } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/language-context";
import { useDarkMode } from "@/lib/dark-mode-context";
import { motion, AnimatePresence } from "framer-motion";

export default function StoreStatusBadge() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const { isDark } = useDarkMode();

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await api.get("/settings/status");
      setStatus(res.current);
    } catch (e) {
      console.warn("Failed to fetch store status");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !status) {
    return (
      <div className={cn(
        "w-24 h-9 animate-pulse rounded-full",
        isDark ? "bg-slate-800" : "bg-slate-100"
      )} />
    );
  }

  const isOpen = status.isOpen;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={isOpen ? "open" : "closed"}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className={cn(
          "flex items-center gap-2 px-2.5 py-1.5 rounded-full border shadow-sm transition-all duration-500 select-none",
          isOpen
            ? isDark
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              : "bg-emerald-50 border-emerald-100 text-emerald-700"
            : isDark
              ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
              : "bg-rose-50 border-rose-100 text-rose-700"
        )}
      >
        {/* LED Indicator */}
        <div className="relative flex items-center justify-center">
          <div className={cn(
            "w-2 h-2 rounded-full",
            isOpen ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]"
          )} />
          <motion.div
            animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={cn(
              "absolute inset-0 rounded-full blur-[2px]",
              isOpen ? "bg-emerald-400" : "bg-rose-400"
            )}
          />
        </div>

        {/* Text Area */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[8px] font-black uppercase tracking-[0.1em] leading-none whitespace-nowrap">
              {isOpen ? t('common.open') || "Store Open" : t('common.closed') || "Store Closed"}
            </span>
          </div>
          {status.reason && (
            <p className={cn(
              "text-[6px] font-bold uppercase tracking-wider truncate max-w-[70px] lg:max-w-[100px] mt-0.5",
              isDark ? "text-slate-500" : "text-slate-400"
            )}>
              {status.reason}
            </p>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
