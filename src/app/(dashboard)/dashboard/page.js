"use client";
import React, { useEffect, useState, useCallback, Suspense } from "react";
import dynamic from "next/dynamic";
import { api } from "../../../lib/api";
import { RefreshCw, AlertCircle } from "lucide-react";
import { useTranslation } from "../../../lib/language-context";
import { useDarkMode } from "../../../lib/dark-mode-context";
import { cn } from "../../../lib/utils";

const AiInsights = dynamic(() => import("../../../components/dashboard/AiInsights"), { ssr: false });
const DashboardSummary = dynamic(() => import("../../../components/dashboard/DashboardSummary"), { ssr: false });
const BreakEvenInsights = dynamic(() => import("../../../components/dashboard/BreakEvenInsights"), { ssr: false });
const TopMenus = dynamic(() => import("../../../components/dashboard/TopMenus"), { ssr: false });
const SalesTrendChart = dynamic(() => import("../../../components/dashboard/SalesTrendChart"), { ssr: false });
const PeakHourChart = dynamic(() => import("../../../components/dashboard/PeakHourChart"), { ssr: false });
const RemindersPanel = dynamic(() => import("../../../components/dashboard/RemindersPanel"), { ssr: false });
const TimeTracker = dynamic(() => import("../../../components/dashboard/TimeTracker"), { ssr: false });

export default function DashboardPage() {
  const { t } = useTranslation();
  const { isDark } = useDarkMode();
  const [todayData, setTodayData] = useState(null);
  const [monthData, setMonthData] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isStoreOpen, setIsStoreOpen] = useState(true);

  const loadData = useCallback(async (forced = false) => {
    if (forced) setRefreshing(true);
    else setLoading(true);

    try {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      const firstOfMonthStr = `${year}-${month}-01`;

      const [todayRes, monthRes, statusRes] = await Promise.all([
        api.get(`/dashboard/insights?from=${todayStr}&to=${todayStr}`),
        api.get(`/dashboard/insights?from=${firstOfMonthStr}&to=${todayStr}`),
        api.get('/settings/status').catch(() => ({ current: { isOpen: true } }))
      ]);

      if (statusRes) {
        setIsStoreOpen(statusRes.current?.isOpen ?? true);
      }

      if (todayRes) {
        setTodayData(todayRes.summary || null);
        setInsights(todayRes.insights || []);
      }
      if (monthRes) {
        setMonthData(monthRes.summary || null);
      }
    } catch (e) {
      console.error("Dashboard: Error", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sectionLabel = (text) => (
    <div className="flex items-center gap-2">
      <div className="w-1 h-1 bg-emerald-500 rounded-full" />
      <h3 className={cn("text-[10px] font-black uppercase tracking-widest", isDark ? "text-slate-500" : "text-slate-400")}>
        {text}
      </h3>
    </div>
  );

  return (
    <div className="max-w-[1700px] mx-auto space-y-5 pb-12 px-4 md:px-8">
      {/* Low Stock Alert */}
      {!loading && todayData?.lowStockItems?.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-rose-600 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-rose-800">Critical Stock Alert</h3>
            <p className="text-xs text-rose-600 mt-1">
              You have {todayData.lowStockItems.length} item(s) running low on stock. Please restock immediately or update minimum levels.
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              {todayData.lowStockItems.map((item, idx) => (
                <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-100 text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                  {item.item_name}: <span className="text-rose-900">{parseFloat(item.stock).toFixed(2)} {item.unit}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <Suspense fallback={<div className="h-32 animate-pulse bg-slate-100 rounded-[1.5rem]" />}>
        <DashboardSummary todayData={todayData} monthData={monthData} loading={loading} />
      </Suspense>

      {/* Sales Trend Chart - Matches the screenshot */}
      <Suspense fallback={<div className="h-64 animate-pulse bg-slate-100 rounded-[1.5rem]" />}>
        <SalesTrendChart />
      </Suspense>

      <Suspense fallback={<div className="h-64 animate-pulse bg-slate-100 rounded-[1.5rem]" />}>
        <PeakHourChart />
      </Suspense>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column - Analytics */}
        <div className="lg:col-span-8 space-y-4">
          <section className="space-y-3">
            {sectionLabel(t("dashboard.intelligence_deep_dive"))}
            <Suspense fallback={<div className="h-64 animate-pulse bg-slate-100 rounded-[1.5rem]" />}>
              <AiInsights insights={insights} loading={loading} data={todayData} compact />
            </Suspense>
          </section>

          <section className="space-y-3">
            {sectionLabel(t("dashboard.performance_matrix"))}
            <Suspense fallback={<div className="h-64 animate-pulse bg-slate-100 rounded-[1.5rem]" />}>
              <TopMenus menus={todayData?.topMenus || []} loading={loading} />
            </Suspense>
          </section>
        </div>

        {/* Right Column - Operational */}
        <div className="lg:col-span-4 space-y-4">
          <section className="space-y-3">
            {sectionLabel(t("dashboard.reminders"))}
            <Suspense fallback={<div className="h-64 animate-pulse bg-slate-100 rounded-[1.5rem]" />}>
              <RemindersPanel lowStockItems={todayData?.lowStockItems || []} />
            </Suspense>
          </section>

          <section className="space-y-3">
            {sectionLabel(t("dashboard.safe_haven"))}
            <Suspense fallback={<div className="h-28 animate-pulse bg-slate-100 rounded-[1.5rem]" />}>
              <BreakEvenInsights data={todayData} loading={loading} />
            </Suspense>
          </section>

          {isStoreOpen && (
            <section className="space-y-3">
              {sectionLabel(t("dashboard.management_cycle"))}
              <Suspense fallback={<div className="h-64 animate-pulse bg-slate-100 rounded-[1.5rem]" />}>
                <TimeTracker />
              </Suspense>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
