"use client";
import React from "react";
import { formatIDR } from "../../lib/format";
import { DollarSign, Activity, CreditCard, TrendingUp, TrendingDown, ShoppingBag } from "lucide-react";
import { cn } from "../../lib/utils";
import { useTranslation } from "../../lib/language-context";
import { useDarkMode } from "../../lib/dark-mode-context";

export default function DashboardSummary({ todayData, monthData, loading = false }) {
  const { t } = useTranslation();
  const { isDark } = useDarkMode();

  if (loading || !todayData || !monthData) {
    return (
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={cn(
              "h-32 rounded-[1.5rem] animate-pulse",
              isDark ? "bg-[#161d25]" : "bg-slate-100/50"
            )}
          />
        ))}
      </div>
    );
  }

  // Calculate approximate % changes (compare to yesterday/last month - simulate with small variance for now)
  // In a real scenario you'd compare todayData vs yesterday's data from API
  const revenueChange = todayData.grossRevenue > 0 ? 18 : 0; // placeholder; replace with real delta
  const grossProfitChange = todayData.grossProfit > 0 ? 24 : 0;
  const netProfitChange = todayData.netProfit > 0 ? 12 : 0;
  const txCount = todayData.transactionCount || todayData.orderCount || todayData.totalOrders || 0;
  const txChange = txCount > 0 ? 9 : 0;

  const cards = [
    {
      id: "omzet",
      label: t("dashboard.today_revenue") || "Omzet Hari Ini",
      value: formatIDR(todayData.grossRevenue || 0),
      change: revenueChange,
      icon: DollarSign,
      accentColor: isDark ? "#10b981" : "#059669",
      iconBg: isDark ? "bg-emerald-900/60" : "bg-emerald-50",
      iconColor: isDark ? "text-emerald-400" : "text-emerald-600",
      valueColor: isDark ? "text-white" : "text-slate-900",
    },
    {
      id: "gross_profit",
      label: t("dashboard.today_profit") || "Gross Profit",
      value: formatIDR(todayData.grossProfit || 0),
      change: grossProfitChange,
      icon: Activity,
      accentColor: isDark ? "#10b981" : "#059669",
      iconBg: isDark ? "bg-emerald-900/60" : "bg-emerald-50",
      iconColor: isDark ? "text-emerald-400" : "text-emerald-700",
      valueColor: (todayData.grossProfit || 0) >= 0
        ? isDark ? "text-emerald-400" : "text-emerald-800"
        : "text-rose-500",
    },
    {
      id: "net_profit",
      label: t("dashboard.net_profit") || "Net Profit (Final)",
      value: formatIDR(todayData.netProfit || 0),
      change: netProfitChange,
      icon: Activity,
      accentColor: isDark ? "#8b5cf6" : "#7c3aed",
      iconBg: isDark ? "bg-violet-900/60" : "bg-violet-50",
      iconColor: isDark ? "text-violet-400" : "text-violet-700",
      valueColor: (todayData.netProfit || 0) >= 0
        ? isDark ? "text-violet-400" : "text-violet-800"
        : "text-rose-500",
    },
    {
      id: "consignment_outstanding",
      label: t("dashboard.consignment_outstanding") || "Consignment Outstanding",
      value: formatIDR(todayData.consignmentOutstanding || 0),
      change: todayData.consignmentOutstanding > 0 ? -10 : 0, // negative trend if outstanding increases
      icon: CreditCard,
      accentColor: "#f43f5e",
      iconBg: isDark ? "bg-rose-900/60" : "bg-rose-50",
      iconColor: isDark ? "text-rose-400" : "text-rose-600",
      valueColor: isDark ? "text-rose-400" : "text-rose-700",
    },
    {
      id: "transaksi",
      label: t("dashboard.transactions") || "Transaksi",
      value: String(txCount),
      change: txChange,
      icon: ShoppingBag,
      accentColor: isDark ? "#94a3b8" : "#64748b",
      iconBg: isDark ? "bg-slate-700/60" : "bg-slate-100",
      iconColor: isDark ? "text-slate-300" : "text-slate-600",
      valueColor: isDark ? "text-white" : "text-slate-900",
    },
  ];

  return (
    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        const isPositive = card.change >= 0;
        return (
          <div
            key={card.id}
            className={cn(
              "rounded-[1.5rem] p-5 lg:p-6 relative overflow-hidden group transition-all duration-300",
              isDark
                ? "bg-[#161d25] border border-[rgba(255,255,255,0.06)] hover:border-emerald-800/50 hover:shadow-[0_8px_32px_rgba(16,185,129,0.12)]"
                : "bg-white border border-slate-200/50 shadow-md hover:-translate-y-1 hover:shadow-xl"
            )}
          >
            {/* Subtle corner glow */}
            <div
              className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity"
              style={{ background: card.accentColor }}
            />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2.5 rounded-2xl transition-all", card.iconBg)}>
                  <Icon className={cn("w-5 h-5", card.iconColor)} />
                </div>
                {/* % Badge */}
                <div className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-black",
                  isPositive
                    ? isDark ? "bg-emerald-900/50 text-emerald-400" : "bg-emerald-50 text-emerald-700"
                    : isDark ? "bg-rose-900/50 text-rose-400" : "bg-rose-50 text-rose-600"
                )}>
                  {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {isPositive ? "+" : ""}{card.change}%
                </div>
              </div>

              <p className={cn("text-[10px] font-black uppercase tracking-widest mb-2", isDark ? "text-slate-500" : "text-slate-400")}>
                {card.label}
              </p>
              <div className={cn("text-2xl font-black tracking-tighter", card.valueColor)}>
                {card.value}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
