"use client";
import React, { useEffect, useState, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { api } from "../../../lib/api";
import { RefreshCw, Plus, Filter, Calendar as CalendarIcon } from "lucide-react";
import { Button } from "../../../components/ui/button";

// Existing Components (Reskinned)
const AiInsights = dynamic(() => import("../../../components/dashboard/AiInsights"), { ssr: false });
const DashboardSummary = dynamic(() => import("../../../components/dashboard/DashboardSummary"), { ssr: false });
const BreakEvenInsights = dynamic(() => import("../../../components/dashboard/BreakEvenInsights"), { ssr: false });
const TopMenus = dynamic(() => import("../../../components/dashboard/TopMenus"), { ssr: false });

// New Components
const ProjectProgress = dynamic(() => import("../../../components/dashboard/ProjectProgress"), { ssr: false });
const RemindersPanel = dynamic(() => import("../../../components/dashboard/RemindersPanel"), { ssr: false });
const TimeTracker = dynamic(() => import("../../../components/dashboard/TimeTracker"), { ssr: false });
const GeminiChat = dynamic(() => import("../../../components/dashboard/GeminiChat"), { ssr: false });

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState("today");
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

      const res = await api.get(`/dashboard/insights${qs}`);
      if (res) {
        setData(res.summary || null);
        setInsights(res.insights || []);
      }
    } catch (e) {
      console.error("Dashboard: Error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [range, from, to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="space-y-4 pb-12">
      {/* Header Section */}
      <div className="flex justify-end items-center mb-1">
        <div className="flex items-center gap-2 bg-white/40 backdrop-blur-md px-2 py-1 rounded-xl border border-slate-100 shadow-sm">
           <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
           <select 
             value={range} 
             onChange={(e) => setRange(e.target.value)}
             className="text-[10px] font-black uppercase tracking-widest border-none bg-transparent focus:ring-0 cursor-pointer text-slate-500 pr-8"
           >
             <option value="today">Today</option>
             <option value="yesterday">Yesterday</option>
             <option value="last7">Last 7 Days</option>
             <option value="last30">Last 30 Days</option>
             <option value="thisMonth">This Month</option>
             <option value="custom">Custom</option>
           </select>
        </div>
      </div>

      {/* Metric Cards Row */}
      <Suspense fallback={<div className="h-32 animate-pulse bg-slate-100 rounded-3xl" />}>
        <DashboardSummary data={data} loading={loading} />
      </Suspense>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column - 8/12 - Analytics Focus */}
        <div className="lg:col-span-8 space-y-4">
          <section className="space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-400 tracking-tight flex items-center gap-2">
                   <div className="w-1 h-1 bg-emerald-600 rounded-full" /> Intelligence Deep Dive
                </h3>
             </div>
             <Suspense fallback={<div className="h-64 animate-pulse bg-slate-100 rounded-3xl" />}>
               <AiInsights insights={insights} loading={loading} data={data} compact />
             </Suspense>
          </section>

          <section className="space-y-4">
             <h3 className="text-xs font-semibold text-slate-400 tracking-tight">Production Performance Matrix</h3>
             <Suspense fallback={<div className="h-64 animate-pulse bg-slate-100 rounded-3xl" />}>
                <TopMenus menus={data?.topMenus || []} loading={loading} />
             </Suspense>
          </section>
        </div>

        {/* Right Column - 4/12 - Operational Focus */}
        <div className="lg:col-span-4 space-y-4">
           <section className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-400 tracking-tight">Strategic Reminders</h3>
              <Suspense fallback={<div className="h-64 animate-pulse bg-slate-100 rounded-3xl" />}>
                 <RemindersPanel lowStockItems={data?.lowStockItems || []} />
              </Suspense>
           </section>

           <section className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-400 tracking-tight">Hedged Performance</h3>
              <Suspense fallback={<div className="h-64 animate-pulse bg-slate-100 rounded-3xl" />}>
                 <BreakEvenInsights data={data} loading={loading} />
              </Suspense>
           </section>

           <section className="space-y-4">
              <h3 className="text-xs font-semibold text-slate-400 tracking-tight">Management Cycle</h3>
              <Suspense fallback={<div className="h-64 animate-pulse bg-slate-100 rounded-3xl" />}>
                 <TimeTracker />
              </Suspense>
           </section>
        </div>
      </div>
      <GeminiChat contextData={data} />
    </div>
  );
}
