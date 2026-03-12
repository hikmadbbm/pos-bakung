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

  const loadData = useCallback(async (forced = false) => {
    if (forced) setRefreshing(true);
    else setLoading(true);

    try {
      // Use the optimized insights endpoint
      const res = await api.get("/dashboard/insights");
      setData(res.summary);
      setInsights(res.insights);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

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
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex justify-between items-center">
        <div>
           <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Dashboard</h1>
           <p className="text-sm text-gray-500">Business performance and AI-driven insights.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => loadData(true)} 
          disabled={loading || refreshing}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <div className="grid gap-6">
        {/* AI Assistant Section */}
        <Suspense fallback={<div className="h-40 bg-gray-50 rounded-lg animate-pulse"></div>}>
          <AiInsights insights={insights} loading={loading} />
        </Suspense>

        {/* Summary Cards */}
        <Suspense fallback={<div className="grid gap-4 md:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-50 rounded-lg animate-pulse"></div>)}</div>}>
          <DashboardSummary data={data} loading={loading} />
        </Suspense>

        {/* Break-even & Overhead Insights */}
        <Suspense fallback={<div className="grid grid-cols-2 gap-4 h-24 bg-gray-50 animate-pulse"></div>}>
          <BreakEvenInsights data={data} loading={loading} />
        </Suspense>

        {/* Top Performing Menu */}
        <Suspense fallback={<div className="h-64 bg-gray-50 animate-pulse"></div>}>
          <TopMenus menus={data?.topMenus || []} loading={loading} />
        </Suspense>
      </div>
    </div>
  );
}
