"use client";
import React from "react";
import { Activity } from "lucide-react";
import { formatIDR } from "../../lib/format";
import { useTranslation } from "../../lib/language-context";
import { useDarkMode } from "../../lib/dark-mode-context";
import { cn } from "../../lib/utils";

export default function BreakEvenInsights({ data, loading = false }) {
  const { t } = useTranslation();
  const { isDark } = useDarkMode();

  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className={cn("h-28 rounded-[1.5rem] animate-pulse", isDark ? "bg-[#161d25]" : "bg-slate-100/50")} />
        <div className={cn("h-28 rounded-[1.5rem] animate-pulse", isDark ? "bg-[#161d25]" : "bg-slate-100/50")} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className={cn(
        "p-4 rounded-[1.5rem] border-l-4 border-l-emerald-500 group transition-all duration-500 hover:-translate-y-0.5",
        isDark
          ? "bg-[#161d25] border border-[rgba(255,255,255,0.06)] hover:border-emerald-800/50 hover:shadow-lg hover:shadow-emerald-900/30"
          : "bg-white border border-slate-100 shadow-md hover:shadow-xl"
      )}>
        <div className="flex justify-between items-start mb-2">
          <p className={cn("text-[10px] font-black uppercase tracking-widest", isDark ? "text-emerald-400" : "text-emerald-800")}>
            {t("dashboard.safe_haven")}
          </p>
          <Activity className={cn("w-4 h-4 transition-colors", isDark ? "text-emerald-700 group-hover:text-emerald-400" : "text-emerald-200 group-hover:text-emerald-600")} />
        </div>
        <div className={cn("text-xl font-black transition-colors", isDark ? "text-slate-100 group-hover:text-emerald-400" : "text-slate-900 group-hover:text-emerald-800")}>
          {formatIDR((data.expenses || 0) + (data.cogs || 0))}
        </div>
        <p className={cn("text-[10px] font-bold mt-1 uppercase tracking-tight", isDark ? "text-slate-600" : "text-slate-400")}>
          {t("dashboard.break_even_target")}
        </p>
      </div>

      <div className={cn(
        "p-4 rounded-[1.5rem] border-l-4 border-l-green-400 group transition-all duration-500 hover:-translate-y-0.5",
        isDark
          ? "bg-[#161d25] border border-[rgba(255,255,255,0.06)] hover:border-green-800/50 hover:shadow-lg hover:shadow-green-900/30"
          : "bg-white border border-slate-100 shadow-md hover:shadow-xl"
      )}>
        <div className="flex justify-between items-start mb-2">
          <p className={cn("text-[10px] font-black uppercase tracking-widest", isDark ? "text-green-400" : "text-green-700")}>
            {t("dashboard.operational_drain")}
          </p>
          <Activity className={cn("w-4 h-4 transition-colors", isDark ? "text-green-700 group-hover:text-green-400" : "text-green-200 group-hover:text-green-600")} />
        </div>
        <div className={cn("text-xl font-black transition-colors", isDark ? "text-slate-100 group-hover:text-green-400" : "text-slate-900 group-hover:text-green-700")}>
          {formatIDR(data.dailyOverhead || 0)}
        </div>
        <p className={cn("text-[10px] font-bold mt-1 uppercase tracking-tight", isDark ? "text-slate-600" : "text-slate-400")}>
          {t("dashboard.fixed_overhead_rent")}
        </p>
      </div>
    </div>
  );
}
