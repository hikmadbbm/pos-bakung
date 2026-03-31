import React from "react";
import { formatIDR } from "../../lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Sparkles, CheckCircle, ArrowDownRight, AlertTriangle, Info, Activity } from "lucide-react";
import { cn } from "../../lib/utils";

export default function AiInsights({ insights = [], loading = false, data, compact = false }) {
  // Use insights from API but allow local additions/fallbacks
  const displayInsights = [...insights];
  
  // If we have data but no overhead insight, add it manually
  if (data && data.dailyOverhead > 0 && !displayInsights.some(i => i.title?.includes('overhead'))) {
    displayInsights.push({
      type: 'neutral',
      title: 'Fixed overhead applied',
      message: `Daily overhead allocation is ${formatIDR(data.dailyOverhead)} today.`,
    });
  }

  if (loading) {
    return (
      <div className="glass-card h-48 animate-pulse border-emerald-100 bg-emerald-50/10"></div>
    );
  }

  return (
    <div className={cn("glass-card relative overflow-hidden group shadow-2xl border-emerald-100/50", compact ? "p-4 md:p-6" : "p-6 md:p-8")}>
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/10 transition-colors duration-700" />
      <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-green-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-green-500/10 transition-colors duration-700" />

      <div className="relative z-10">
        <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4", compact ? "mb-4" : "mb-8")}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-800 rounded-2xl shadow-lg shadow-emerald-200/50">
               <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Intelligence Deep-Dive</h3>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">AI-DRIVEN BUSINESS ANALYSIS</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {displayInsights.map((insight, idx) => (
            <div key={idx} className="bg-white/40 backdrop-blur-xl p-5 rounded-2xl border border-slate-100 hover:border-emerald-300 transition-all duration-500 group/item flex gap-4 items-start hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1">
              <div className={`mt-0.5 p-3 rounded-xl shrink-0 shadow-sm ${
                insight.type === 'positive' ? 'bg-emerald-50 text-emerald-600' :
                insight.type === 'negative' ? 'bg-rose-50 text-rose-600' :
                insight.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                'bg-slate-50 text-slate-600'
              }`}>
                {insight.type === 'positive' && <CheckCircle className="w-5 h-5" />}
                {insight.type === 'negative' && <ArrowDownRight className="w-5 h-5" />}
                {insight.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                {insight.type === 'info' && <Info className="w-5 h-5" />}
                {insight.type === 'neutral' && <Activity className="w-5 h-5" />}
                {insight.type === 'action' && <Sparkles className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <h4 className="font-black text-[10px] uppercase tracking-widest text-slate-400 mb-1 group-hover/item:text-emerald-700 transition-colors">
                  {insight.title || "Observation"}
                </h4>
                <p className="text-xs font-bold text-slate-700 leading-relaxed italic">
                  {insight.message}
                </p>
              </div>
            </div>
          ))}
          {displayInsights.length === 0 && (
            <div className="col-span-full py-8 text-center bg-white/30 rounded-2xl border border-dashed border-slate-100 flex items-center justify-center gap-4">
               <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">System active • awaiting transaction flow for deep-dive analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
