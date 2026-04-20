"use client";
import React from "react";
import { Bell, Video, ArrowRight, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils";
import { useTranslation } from "../../lib/language-context";
import { useDarkMode } from "../../lib/dark-mode-context";

export default function RemindersPanel({ lowStockItems = [] }) {
  const { t } = useTranslation();
  const { isDark } = useDarkMode();
  const hasLowStock = lowStockItems.length > 0;

  return (
    <div className={cn(
      "p-5 lg:p-6 flex flex-col h-full rounded-[1.5rem] border-dashed min-h-[300px]",
      isDark
        ? "bg-[#141F18]/50 border-emerald-900/50"
        : "bg-slate-50/30 border-emerald-100/50"
    )}>
      <div className="flex justify-between items-center mb-4">
        <h3 className={cn("text-[10px] font-black uppercase tracking-widest", isDark ? "text-slate-500" : "text-slate-400")}>
          {t("dashboard.reminders")}
        </h3>
        <Bell className={cn("w-4 h-4", hasLowStock ? (isDark ? "text-rose-400 animate-bounce" : "text-rose-500 animate-bounce") : (isDark ? "text-emerald-800" : "text-emerald-300"))} />
      </div>

      <div className="space-y-6 flex-1">
        {hasLowStock ? (
          <div className="space-y-4">
            <h4 className={cn("text-xl font-black tracking-tight leading-tight", isDark ? "text-slate-100" : "text-slate-900")}>
              {t("dashboard.low_stock_alerts")}
            </h4>
            <div className="space-y-3">
              {lowStockItems.map((item, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl border shadow-sm",
                    isDark ? "bg-[#1a2820] border-[rgba(255,255,255,0.05)]" : "bg-white border-slate-100"
                  )}
                >
                  <div className="min-w-0">
                    <p className={cn("text-xs font-black truncate uppercase tracking-tight", isDark ? "text-slate-200" : "text-slate-700")}>
                      {item.item_name}
                    </p>
                    <p className={cn("text-[9px] font-bold uppercase tracking-widest mt-0.5", isDark ? "text-rose-400" : "text-rose-500")}>
                      {t("stock.current_stock")}: {item.stock} {item.unit}
                    </p>
                  </div>
                  <AlertTriangle className={cn("w-3.5 h-3.5 shrink-0", isDark ? "text-rose-400" : "text-rose-400")} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h4 className={cn("text-xl font-black tracking-tight leading-tight", isDark ? "text-slate-100" : "text-slate-900")}>
                {t("dashboard.all_clear")}
              </h4>
              <p className={cn("text-[10px] font-bold mt-1 uppercase tracking-widest", isDark ? "text-emerald-500" : "text-emerald-600")}>
                {t("dashboard.inventory_optimal")}
              </p>
            </div>
            <p className={cn("text-xs font-medium leading-relaxed italic", isDark ? "text-slate-500" : "text-slate-500")}>
              "{t("dashboard.no_alerts")}"
            </p>
          </div>
        )}
      </div>

      <button className={cn(
        "mt-4 rounded-xl py-3 px-6 flex items-center justify-center gap-3 transition-all active:scale-95 group",
        isDark
          ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/50"
          : "bg-emerald-800 hover:bg-emerald-900 text-white shadow-lg shadow-emerald-200"
      )}>
        <Video className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-black uppercase tracking-widest">{t("dashboard.sync_team")}</span>
        <ArrowRight className="w-3 h-3 ml-auto opacity-40" />
      </button>
    </div>
  );
}
