"use client";
import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import { api } from "../../lib/api";
import { Clock } from "lucide-react";
import { useTranslation } from "../../lib/language-context";
import { useDarkMode } from "../../lib/dark-mode-context";

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900 border border-emerald-800/40 rounded-xl px-4 py-3 shadow-xl backdrop-blur-md">
        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-sm font-black text-white">{payload[0].value} Orders</p>
      </div>
    );
  }
  return null;
}

export default function PeakHourChart() {
  const { t } = useTranslation();
  const { isDark } = useDarkMode();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch peak hours for the last 30 days to get a solid average, or just use this month
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const firstOfMonthStr = `${year}-${month}-01`;
        const todayStr = `${year}-${month}-${String(today.getDate()).padStart(2, '0')}`;

        const results = await api.get(`/dashboard/peak-hours?from=${firstOfMonthStr}&to=${todayStr}`);
        setData(results);
      } catch (e) {
        console.error("PeakHourChart: Error", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Find max value to highlight peak
  const maxVolume = data.length > 0 ? Math.max(...data.map(d => d.orders)) : 0;

  return (
    <div className={`rounded-[1.5rem] p-5 lg:p-6 relative overflow-hidden h-full ${
      isDark
        ? "bg-[#141F18] border border-emerald-900/50"
        : "bg-white border border-emerald-100/80 shadow-md"
    }`}>
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-widest ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {t("dashboard.peak_hours") || "Analitik Jam Ramai"}
          </p>
          <p className={`text-[9px] font-bold mt-0.5 ${isDark ? "text-slate-600" : "text-slate-400"}`}>
            {t("common.this_month") || "Bulan Ini"}
          </p>
        </div>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
          isDark ? "bg-emerald-900/30 text-emerald-400" : "bg-emerald-50 text-emerald-600"
        }`}>
          <Clock className="w-4 h-4" />
        </div>
      </div>

      {loading ? (
        <div className={`h-48 rounded-xl animate-pulse ${isDark ? "bg-emerald-900/20" : "bg-slate-100"}`} />
      ) : (
        <div className="w-full relative z-10 transition-all duration-500 mt-2" style={{ height: 192 }}>
          <ResponsiveContainer width="99%" height={192}>
            <BarChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"}
                vertical={false}
              />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 9, fill: isDark ? "#4B5563" : "#94A3B8", fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 9, fill: isDark ? "#4B5563" : "#94A3B8", fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)" }} />
              <Bar 
                dataKey="orders" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={40}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.orders === maxVolume && entry.orders > 0 ? "#10b981" : (isDark ? "#065f46" : "#a7f3d0")} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
