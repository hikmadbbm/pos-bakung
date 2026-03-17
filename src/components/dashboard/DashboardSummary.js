"use client";
import React from "react";
import { formatIDR } from "../../lib/format";
import { DollarSign, Activity, CreditCard, TrendingUp } from "lucide-react";
import { cn } from "../../lib/utils";

export default function DashboardSummary({ data, loading = false }) {
  if (loading || !data) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="glass-card h-32 animate-pulse bg-slate-100/50 border-slate-100"></div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Gross Revenue",
      value: data.grossRevenue || data.revenue || 0,
      desc: "TOTAL SALES REVENUE",
      icon: DollarSign,
      color: "text-emerald-800",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-100"
    },
    {
      title: "Net Revenue",
      value: data.netRevenue || data.revenue || 0,
      desc: "AFTER PLATFORM FEES",
      icon: CreditCard,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-100"
    },
    {
      title: "Operating Costs",
      value: (data.cogs || 0) + (data.expenses || 0),
      desc: "COGS + DAILY OPEX",
      icon: Activity,
      color: "text-slate-600",
      bgColor: "bg-slate-50",
      borderColor: "border-slate-100"
    },
    {
      title: "Pure Income",
      value: data.netProfit || 0,
      desc: "ACTUAL TAKE-HOME PROFIT",
      icon: TrendingUp,
      color: data.netProfit >= 0 ? "text-emerald-900" : "text-rose-600",
      bgColor: data.netProfit >= 0 ? "bg-emerald-100/50" : "bg-rose-50",
      borderColor: data.netProfit >= 0 ? "border-emerald-200" : "border-rose-100"
    }
  ];

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, idx) => (
        <div key={idx} className={cn("glass-card p-6 group hover:-translate-y-2 transition-all duration-500 shadow-xl hover:shadow-2xl relative overflow-hidden border", card.borderColor)}>
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className={cn("p-2.5 rounded-xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 shadow-sm", card.bgColor)}>
              <card.icon className={cn("w-5 h-5", card.color)} />
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{card.title}</p>
              <div className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">{card.desc}</div>
            </div>
          </div>
          <div className={cn("text-2xl font-black tracking-tight truncate group-hover:scale-105 origin-left transition-transform relative z-10", card.color.includes('rose') ? "text-rose-600" : "text-slate-900")}>
            {formatIDR(card.value)}
          </div>
        </div>
      ))}
    </div>
  );
}
