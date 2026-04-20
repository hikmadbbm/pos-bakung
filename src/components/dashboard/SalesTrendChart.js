"use client";
import React, { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { api } from "../../lib/api";
import { formatIDR } from "../../lib/format";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useTranslation } from "../../lib/language-context";
import { useDarkMode } from "../../lib/dark-mode-context";

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-emerald-800/40 rounded-xl px-4 py-3 shadow-xl backdrop-blur-md">
        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-sm font-black text-white">{formatIDR(payload[0].value)}</p>
      </div>
    );
  }
  return null;
}

export default function SalesTrendChart() {
  const { t } = useTranslation();
  const { isDark } = useDarkMode();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState(null); // % change

  useEffect(() => {
    const loadTrend = async () => {
      try {
        // Get last 14 days
        const today = new Date();
        const days = [];
        for (let i = 13; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const dayStr = String(d.getDate()).padStart(2, '0');
          days.push(`${year}-${month}-${dayStr}`);
        }

        const results = await Promise.all(
          days.map(async (day) => {
            try {
              const res = await api.get(`/dashboard/insights?from=${day}&to=${day}`);
              return {
                date: day,
                label: new Date(day).toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
                revenue: res?.summary?.grossRevenue || 0,
              };
            } catch {
              return { date: day, label: new Date(day).toLocaleDateString("id-ID", { day: "numeric", month: "short" }), revenue: 0 };
            }
          })
        );

        setData(results);

        // Calculate week-over-week trend
        const thisWeek = results.slice(7).reduce((s, r) => s + r.revenue, 0);
        const lastWeek = results.slice(0, 7).reduce((s, r) => s + r.revenue, 0);
        if (lastWeek > 0) {
          setTrend(((thisWeek - lastWeek) / lastWeek) * 100);
        }
      } catch (e) {
        console.error("SalesTrendChart: Error", e);
      } finally {
        setLoading(false);
      }
    };
    loadTrend();
  }, []);

  const isPositive = trend === null || trend >= 0;

  return (
    <div className={`rounded-[1.5rem] p-5 lg:p-6 relative overflow-hidden ${
      isDark
        ? "bg-[#141F18] border border-emerald-900/50"
        : "bg-white border border-emerald-100/80 shadow-md"
    }`}>
      {/* Ambient glow */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-emerald-950/30 to-transparent pointer-events-none rounded-b-[1.5rem]" />

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {t("dashboard.sales_trend") || "Trend Penjualan"}
          </p>
          <p className={`text-[9px] font-bold mt-0.5 ${isDark ? "text-slate-600" : "text-slate-400"}`}>
            14 {t("common.days") || "hari terakhir"}
          </p>
        </div>
        {trend !== null && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black ${
            isPositive
              ? isDark ? "bg-emerald-900/50 text-emerald-400" : "bg-emerald-50 text-emerald-700"
              : isDark ? "bg-rose-900/50 text-rose-400" : "bg-rose-50 text-rose-600"
          }`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isPositive ? "+" : ""}{trend.toFixed(1)}%
          </div>
        )}
      </div>

      {loading ? (
        <div className={`h-48 rounded-xl animate-pulse ${isDark ? "bg-emerald-900/20" : "bg-slate-100"}`} />
      ) : (
        <div className="w-full relative z-10 transition-all duration-500" style={{ height: 192 }}>
          <ResponsiveContainer width="99%" height={192}>
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={isDark ? 0.4 : 0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: isDark ? "#4B5563" : "#94A3B8", fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
                interval={2}
              />
              <YAxis
                tick={{ fontSize: 9, fill: isDark ? "#4B5563" : "#94A3B8", fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : v}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#revGradient)"
                dot={false}
                activeDot={{ r: 5, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
