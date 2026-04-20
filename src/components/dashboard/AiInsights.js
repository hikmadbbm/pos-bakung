import React from "react";
import { formatIDR } from "../../lib/format";
import { Sparkles, CheckCircle, ArrowDownRight, AlertTriangle, Info, Activity } from "lucide-react";
import { cn } from "../../lib/utils";
import { useTranslation } from "../../lib/language-context";
import { useDarkMode } from "../../lib/dark-mode-context";

export default function AiInsights({ insights = [], loading = false, data, compact = false }) {
  const { t } = useTranslation();
  const { isDark } = useDarkMode();

  const displayInsights = [...insights];

  if (data && data.dailyOverhead > 0 && !displayInsights.some((i) => i.title?.toLowerCase().includes("overhead"))) {
    displayInsights.push({
      type: "neutral",
      title: t("dashboard.fixed_overhead_applied"),
      message: t("dashboard.daily_overhead_desc").replace("%{amount}", formatIDR(data.dailyOverhead)),
    });
  }

  if (loading) {
    return (
      <div className={cn(
        "h-48 animate-pulse rounded-[1.5rem]",
        isDark ? "bg-[#161d25]" : "bg-emerald-50/10 border border-emerald-100"
      )} />
    );
  }

  return (
    <div className={cn(
      "relative overflow-hidden group rounded-[1.5rem] transition-all duration-500",
      compact ? "p-4 md:p-5" : "p-6 md:p-8",
      isDark
        ? "bg-[#141F18] border border-emerald-900/50 hover:border-emerald-700/60"
        : "bg-white border border-emerald-100/80 shadow-md hover:shadow-xl"
    )}>
      {/* Ambient glows */}
      <div className={cn(
        "absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-opacity duration-700",
        isDark ? "bg-emerald-500/5 group-hover:bg-emerald-500/10" : "bg-emerald-400/5 group-hover:bg-emerald-400/10"
      )} />
      <div className={cn(
        "absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-opacity duration-700",
        isDark ? "bg-green-500/5 group-hover:bg-green-500/10" : "bg-green-400/5 group-hover:bg-green-400/10"
      )} />

      <div className="relative z-10">
        <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4", compact ? "mb-4" : "mb-6")}>
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-3 rounded-2xl shadow-lg",
              isDark ? "bg-emerald-800 shadow-emerald-900/50" : "bg-emerald-800 shadow-emerald-200/50"
            )}>
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h3 className={cn("text-sm font-black tracking-tight uppercase", isDark ? "text-slate-100" : "text-slate-900")}>
                {t("dashboard.intelligence_deep_dive")}
              </h3>
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-0.5">
                {t("dashboard.ai_driven_analysis")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayInsights.map((insight, idx) => (
            <div
              key={idx}
              className={cn(
                "p-4 rounded-2xl border transition-all duration-500 flex gap-3 items-start hover:-translate-y-0.5",
                isDark
                  ? "bg-[#1a2820]/80 border-[rgba(255,255,255,0.05)] hover:border-emerald-700/40 hover:bg-[#1a2820]"
                  : "bg-white/60 border-slate-100 hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/10"
              )}
            >
              <div className={`mt-0.5 p-2.5 rounded-xl shrink-0 ${
                insight.type === "positive"
                  ? isDark ? "bg-emerald-900/60 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                  : insight.type === "negative"
                  ? isDark ? "bg-rose-900/60 text-rose-400" : "bg-rose-50 text-rose-600"
                  : insight.type === "warning"
                  ? isDark ? "bg-amber-900/60 text-amber-400" : "bg-amber-50 text-amber-600"
                  : isDark ? "bg-slate-700/60 text-slate-400" : "bg-slate-50 text-slate-600"
              }`}>
                {insight.type === "positive" && <CheckCircle className="w-4 h-4" />}
                {insight.type === "negative" && <ArrowDownRight className="w-4 h-4" />}
                {insight.type === "warning" && <AlertTriangle className="w-4 h-4" />}
                {insight.type === "info" && <Info className="w-4 h-4" />}
                {(insight.type === "neutral" || !insight.type) && <Activity className="w-4 h-4" />}
                {insight.type === "action" && <Sparkles className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <h4 className={cn(
                  "font-black text-[10px] uppercase tracking-widest mb-1",
                  isDark ? "text-slate-500" : "text-slate-400"
                )}>
                  {insight.title || t("dashboard.observation")}
                </h4>
                <p className={cn("text-xs font-bold leading-relaxed", isDark ? "text-slate-300" : "text-slate-700")}>
                  {insight.message}
                </p>
              </div>
            </div>
          ))}

          {displayInsights.length === 0 && (
            <div className={cn(
              "col-span-full py-8 text-center rounded-2xl border border-dashed flex items-center justify-center gap-3",
              isDark ? "border-slate-700 bg-[#1a2820]/50" : "border-emerald-100 bg-white/30"
            )}>
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <p className={cn("text-[10px] font-black uppercase tracking-[0.2em]", isDark ? "text-slate-500" : "text-slate-400")}>
                {t("dashboard.system_active_awaiting")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
