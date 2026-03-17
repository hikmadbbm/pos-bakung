"use client";
import React from "react";
import { Activity } from "lucide-react";
import { formatIDR } from "../../lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export default function BreakEvenInsights({ data, loading = false }) {
  if (loading || !data) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-28 glass-card animate-pulse bg-slate-50/10 border-slate-100"></div>
        <div className="h-28 glass-card animate-pulse bg-slate-50/10 border-slate-100"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      <div className="glass-card p-6 border-l-4 border-l-emerald-600 group hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
        <div className="flex justify-between items-start mb-3">
          <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Safe Haven Matrix</p>
          <Activity className="w-4 h-4 text-emerald-200 group-hover:text-emerald-600 transition-colors" />
        </div>
        <div className="text-2xl font-black text-slate-900 group-hover:text-emerald-800 transition-colors">
          {formatIDR((data.expenses || 0) + (data.cogs || 0))}
        </div>
        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tight">
          BREAK-EVEN TARGET FOR CURRENT CYCLE
        </p>
      </div>

      <div className="glass-card p-6 border-l-4 border-l-green-400 group hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
        <div className="flex justify-between items-start mb-3">
          <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Fixed Operational Drain</p>
          <Activity className="w-4 h-4 text-green-200 group-hover:text-green-600 transition-colors" />
        </div>
        <div className="text-2xl font-black text-slate-900 group-hover:text-green-700 transition-colors">
          {formatIDR(data.dailyOverhead || 0)}
        </div>
        <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-tight">
          ALLOCATED FIXED OVERHEAD (RENT/SALARY)
        </p>
      </div>
    </div>
  );
}
