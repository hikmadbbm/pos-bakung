"use client";
import React, { useEffect, useState, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { api } from "../../../lib/api";
import { RefreshCw } from "lucide-react";
import { Button } from "../../../components/ui/button";

// Dynamic imports for "lazy" behavior
const AiInsights = dynamic(() => import("../../../components/dashboard/AiInsights"), { 
  ssr: false,
  loading: () => <div className="h-40 bg-gray-50 rounded-lg animate-pulse"></div>
});
const DashboardSummary = dynamic(() => import("../../../components/dashboard/DashboardSummary"), {
  ssr: false,
  loading: () => <div className="grid gap-4 md:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-50 rounded-lg animate-pulse"></div>)}</div>
});
const BreakEvenInsights = dynamic(() => import("../../../components/dashboard/BreakEvenInsights"), {
  ssr: false
});
const TopMenus = dynamic(() => import("../../../components/dashboard/TopMenus"), {
  ssr: false
});

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState("today"); // today, yesterday, last7, last30, custom
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const loadData = useCallback(async (forced = false) => {
    if (forced) setRefreshing(true);
    else setLoading(true);

    try {
      let qs = "";
      if (range === "custom") {
        qs = `?from=${from}&to=${to}`;
      } else {
        // Handle predefined ranges
        const today = new Date();
        let f = new Date();
        let t = new Date();

        if (range === "yesterday") {
          f.setDate(today.getDate() - 1);
          t.setDate(today.getDate() - 1);
        } else if (range === "last7") {
          f.setDate(today.getDate() - 7);
        } else if (range === "last30") {
          f.setDate(today.getDate() - 30);
        } else if (range === "thisMonth") {
          f.setDate(1);
        }

        const fStr = f.toISOString().split('T')[0];
        const tStr = t.toISOString().split('T')[0];
        qs = `?from=${fStr}&to=${tStr}`;
      }

      // Use the optimized insights endpoint
      const res = await api.get(`/dashboard/insights${qs}`);
      setData(res.summary);
      setInsights(res.insights);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range, from, to]);

  useEffect(() => {
    loadData();
    
    // Auto-refresh every 5 minutes if tab is active
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadData();
      }
    }, 300000);

    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <div className="space-y-10 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">
            Business Insights
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
            Performance overview and AI-driven growth metrics
            <span className="inline-block w-1 h-1 bg-blue-600 rounded-full" />
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/60 shadow-sm">
            <select 
              value={range} 
              onChange={(e) => setRange(e.target.value)}
              className="text-xs font-bold border-none bg-transparent focus:ring-0 px-3 cursor-pointer text-slate-700"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="custom">Custom Range</option>
            </select>

            {range === "custom" && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 px-2 border-l border-slate-200">
                <input 
                  type="date" 
                  value={from} 
                  onChange={(e) => setFrom(e.target.value)}
                  className="text-[10px] font-bold border-none bg-transparent focus:ring-0 p-0 h-6 w-24 text-slate-600"
                />
                <span className="text-slate-300">/</span>
                <input 
                  type="date" 
                  value={to} 
                  onChange={(e) => setTo(e.target.value)}
                  className="text-[10px] font-bold border-none bg-transparent focus:ring-0 p-0 h-6 w-24 text-slate-600"
                />
              </div>
            )}
          </div>

          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => loadData(true)} 
            disabled={loading || refreshing}
            className="rounded-xl font-bold text-xs bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-700 h-10 px-4 transition-all active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${refreshing ? "animate-spin text-blue-600" : "text-slate-400"}`} />
            {refreshing ? "Updating..." : "REFRESH"}
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-10">
        {/* AI Assistant Section */}
        <div className="relative group">
           <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000 group-hover:duration-200" />
           <Suspense fallback={<div className="h-48 glass-card rounded-3xl animate-pulse"></div>}>
             <AiInsights insights={insights} loading={loading} data={data} />
           </Suspense>
        </div>

        {/* Summary Cards */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">SNAPSHOT metrics</span>
          </div>
          <Suspense fallback={<div className="grid gap-4 md:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-32 glass-card rounded-3xl animate-pulse"></div>)}</div>}>
            <DashboardSummary data={data} loading={loading} />
          </Suspense>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
           {/* Break-even & Overhead Insights */}
           <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">EFFICIENCY analysis</span>
              </div>
              <Suspense fallback={<div className="h-64 glass-card rounded-3xl animate-pulse"></div>}>
                <BreakEvenInsights data={data} loading={loading} />
              </Suspense>
           </section>

           {/* Top Performing Menu */}
           <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">PRODUCT popularity</span>
              </div>
              <Suspense fallback={<div className="h-64 glass-card rounded-3xl animate-pulse"></div>}>
                <TopMenus menus={data?.topMenus || []} loading={loading} />
              </Suspense>
           </section>
        </div>
      </div>
    </div>
  );
}
