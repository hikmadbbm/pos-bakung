"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { TrendingUp, PieChart as PieChartIcon, Lightbulb, Calendar, AlertTriangle, ClipboardList, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useTranslation } from "../../../lib/language-context";

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("intelligence");
  const [intelligenceData, setIntelligenceData] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("thisMonth"); // today, last7, last30, thisMonth, custom
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      let qs = "";
      if (range === "custom") {
        qs = `?from=${from}&to=${to}`;
      } else {
        const today = new Date();
        let f = new Date();
        let t_end = new Date();

        if (range === "today") {
          // f is today
        } else if (range === "last7") {
          f.setDate(today.getDate() - 7);
        } else if (range === "last30") {
          f.setDate(today.getDate() - 30);
        } else if (range === "thisMonth") {
          f.setDate(1);
        }
        
        const fStr = f.toISOString().split('T')[0];
        const tStr = t_end.toISOString().split('T')[0];
        qs = `?from=${fStr}&to=${tStr}`;
      }

      const [intel, forecast] = await Promise.all([
        api.get(`/analytics/menu-intelligence${qs}`),
        api.get("/analytics/demand-forecast") 
      ]);
      setIntelligenceData(intel);
      setForecastData(forecast);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [range, from, to]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      <p className="text-slate-500 font-medium uppercase tracking-widest text-[10px]">{t('pos.syncing')}</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{t('insights.title')}</h2>
          <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2">
            {t('insights.subtitle')}
            <span className="inline-block w-1 h-1 bg-emerald-500 rounded-full" />
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {activeTab === "intelligence" && (
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
              <select 
                value={range} 
                onChange={(e) => setRange(e.target.value)}
                className="text-[10px] font-bold uppercase tracking-wider border-none rounded-lg px-3 py-1.5 bg-slate-50 text-slate-700 focus:ring-0 cursor-pointer"
              >
                <option value="today">{t('orders.filter_today')}</option>
                <option value="last7">{t('orders.filter_weekly')}</option>
                <option value="last30">{t('orders.filter_monthly')}</option>
                <option value="thisMonth">{t('dashboard.this_month')}</option>
                <option value="custom">{t('orders.filter_custom')}</option>
              </select>

              {range === "custom" && (
                <div className="flex items-center gap-2 px-2 border-l border-slate-100 ml-1">
                  <input 
                    type="date" 
                    value={from} 
                    onChange={(e) => setFrom(e.target.value)}
                    className="text-[10px] font-bold border-none bg-transparent p-0 focus:ring-0"
                  />
                  <span className="text-slate-300 text-[10px]">-</span>
                  <input 
                    type="date" 
                    value={to} 
                    onChange={(e) => setTo(e.target.value)}
                    className="text-[10px] font-bold border-none bg-transparent p-0 focus:ring-0"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex bg-slate-100 rounded-xl p-1 border border-slate-200/50 shadow-inner">
            <button
              onClick={() => setActiveTab("intelligence")}
              className={cn(
                "px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2",
                activeTab === "intelligence" ? "bg-white text-emerald-700 shadow-md translate-y-[-1px]" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              {t('insights.intelligence_tab')}
            </button>
            <button
              onClick={() => setActiveTab("forecast")}
              className={cn(
                "px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2",
                activeTab === "forecast" ? "bg-white text-emerald-700 shadow-md translate-y-[-1px]" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              {t('insights.forecast_tab')}
            </button>
          </div>
        </div>
      </div>

      {activeTab === "intelligence" ? (
        <MenuIntelligence data={intelligenceData} t={t} />
      ) : (
        <DemandForecast data={forecastData} t={t} />
      )}
    </div>
  );
}

function MenuIntelligence({ data, t }) {
  const [sortConfig, setSortConfig] = useState({ key: 'net_profit', direction: 'desc' });
  const [aiInsight, setAiInsight] = useState("");
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    if (data && !aiInsight) {
      loadAiInsight();
    }
  }, [data]);

  const loadAiInsight = async () => {
    setInsightLoading(true);
    try {
      const res = await api.post("/analytics/ai-observation", {
        data: data.data,
        thresholds: data.thresholds
      });
      setAiInsight(res.observation);
    } catch (e) {
      console.error(e);
    } finally {
      setInsightLoading(false);
    }
  };

  if (!data) return null;

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = [...data.data].sort((a, b) => {
    let aVal, bVal;
    
    if (sortConfig.key === 'name') {
      aVal = a.name.toLowerCase();
      bVal = b.name.toLowerCase();
    } else if (sortConfig.key === 'margin') {
      aVal = a.total_revenue > 0 ? (a.net_profit / a.total_revenue) : 0;
      bVal = b.total_revenue > 0 ? (b.net_profit / b.total_revenue) : 0;
    } else {
      aVal = a[sortConfig.key] || 0;
      bVal = b[sortConfig.key] || 0;
    }

    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "STAR MENU": return "bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-100/50";
      case "PROFITABLE MENU": return "bg-indigo-50 text-indigo-700 border-indigo-100";
      case "LOW MARGIN MENU": return "bg-amber-50 text-amber-700 border-amber-100";
      case "UNDERPERFORMING MENU": return "bg-rose-50 text-rose-700 border-rose-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  const chartData = [...data.data].map(m => ({
    name: m.name,
    profit: m.net_profit,
    qty: m.total_qty
  })).sort((a, b) => b.profit - a.profit).slice(0, 8);

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <RefreshCw className="w-2.5 h-2.5 opacity-20 ml-1 inline" />;
    return sortConfig.direction === 'asc' ? <TrendingUp className="w-2.5 h-2.5 ml-1 inline" /> : <TrendingUp className="w-2.5 h-2.5 ml-1 inline rotate-180" />;
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top Cards - Polished */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { 
            label: t('insights.top_performer'), 
            value: data.insights.topProfitable[0]?.name || "N/A", 
            icon: TrendingUp, 
            color: "text-emerald-600",
            bg: "bg-emerald-50/50",
            sub: `${t('orders.profit').toUpperCase()}: ${formatIDR(data.insights.topProfitable[0]?.net_profit || 0)}`
          },
          { 
            label: t('insights.performance_index'), 
            value: `${data.thresholds.avgQty.toFixed(1)} ${t('common.item').toUpperCase()}S`, 
            icon: PieChartIcon, 
            color: "text-slate-900",
            bg: "bg-slate-50/50",
            sub: t('insights.avg_sales_per_item')
          },
          { 
            label: t('insights.risk_alerts'), 
            value: `${data.insights.lowMargin.length + data.insights.lowSelling.length} ${t('common.item').toUpperCase()}S`, 
            icon: AlertTriangle, 
            color: "text-rose-600",
            bg: "bg-rose-50/50",
            sub: t('insights.review_recommended')
          },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-6 rounded-[2rem] border-none shadow-[0_20px_40px_-10px_rgba(0,0,0,0.05)] bg-white/70 backdrop-blur-3xl group hover:-translate-y-1 transition-all duration-300">
             <div className="flex items-center justify-between mb-6">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-md group-hover:rotate-6 transition-transform overflow-hidden relative", i === 0 ? "bg-slate-900 shadow-slate-200" : "bg-white border border-slate-100 shadow-slate-100")}>
                   <stat.icon className={cn("w-5 h-5", i === 0 ? "text-white" : stat.color)} />
                </div>
             </div>
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
             <h4 className={cn("text-xl font-black uppercase tracking-tight truncate", stat.color)}>
               {stat.value}
             </h4>
             <p className="text-[8px] font-bold text-slate-400 uppercase mt-2 tracking-widest">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* AI Intelligence Sector - Minimalist Clean Version */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-[0_15px_50px_-20px_rgba(0,0,0,0.05)] overflow-hidden transition-all duration-500">
         <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-50">
             {/* Full Width Insight Section */}
             <div className="flex-1 p-8 md:p-10 space-y-6">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
                      <Sparkles className="w-5 h-5 text-emerald-600" />
                   </div>
                   <div>
                     <h3 className="text-lg font-black tracking-tight text-slate-800 uppercase italic leading-none">{t('insights.ai_observation') || "AI SYSTEM OBSERVATIONS"}</h3>
                     <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">Sistem memberikan satu masukan strategis setiap harinya.</p>
                   </div>
                </div>
                
                {insightLoading ? (
                   <div className="space-y-3 animate-pulse">
                      <div className="h-3 bg-slate-100 rounded-full w-full" />
                      <div className="h-3 bg-slate-100 rounded-full w-[90%]" />
                      <div className="h-3 bg-slate-100 rounded-full w-[80%]" />
                   </div>
                ) : (
                   <div className="p-6 rounded-2xl bg-slate-50/50 border border-slate-100/50 italic">
                      <p className="text-slate-900 font-bold leading-relaxed text-[15px] whitespace-pre-line">
                         {aiInsight || "Sistem sedang mengumpulkan data untuk memberikan observasi neural..."}
                      </p>
                   </div>
                )}
             </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Profitability Chart */}
        <div className="lg:col-span-3 glass-card p-6 rounded-[2rem] border-none shadow-xl bg-white/50 backdrop-blur-xl group">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                <div className="w-8 h-px bg-slate-200" />
                {t('insights.contribution_matrix')}
             </h3>
             <div className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[8px] font-black text-emerald-600 uppercase tracking-widest">
                {t('insights.active_intelligence')}
             </div>
          </div>
          <div style={{ height: 300 }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.03} />
                <XAxis dataKey="name" hide />
                <YAxis tickFormatter={(val) => `Rp${val / 1000}k`} axisLine={false} tickLine={false} className="text-[9px] font-black text-slate-400 uppercase" />
                <Tooltip 
                  cursor={{ fill: 'rgba(5, 150, 105, 0.05)' }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255,255,255,0.95)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid #f1f5f9',
                    borderRadius: '16px',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                    padding: '12px'
                  }}
                  itemStyle={{ fontWeight: '900', color: '#0f172a', fontSize: '11px', textTransform: 'uppercase' }}
                  labelStyle={{ fontWeight: '900', color: '#64748b', fontSize: '9px', marginBottom: '4px', letterSpacing: '0.1em' }}
                  formatter={(val) => formatIDR(val)}
                />
                <Bar dataKey="profit" name={t('orders.profit')} radius={[8, 8, 8, 8]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.profit > data.thresholds.avgProfit ? '#059669' : '#0f172a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="lg:col-span-2 glass-card p-8 rounded-[2rem] border-none shadow-xl bg-white relative overflow-hidden flex flex-col justify-between group">
           <div className="absolute top-0 right-0 w-[20rem] h-[20rem] bg-emerald-500/[0.03] rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/[0.05] transition-all duration-700" />
           <div className="relative z-10">
              <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-8 flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                 </div>
                 {t('insights.observation_engine')}
              </h3>
              
              <div className="space-y-8">
                <div className="space-y-3">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{t('insights.growth_leaders')}</p>
                   {data.insights.topProfitable.slice(0, 2).map((m, idx) => (
                     <div key={idx} className="bg-emerald-50/30 border border-emerald-100/50 p-4 rounded-xl hover:bg-emerald-50 transition-all group">
                        <div className="flex justify-between items-center mb-1">
                           <span className="text-[11px] font-black uppercase tracking-tight text-emerald-700">{m.name}</span>
                           <TrendingUp className="w-3 h-3 text-emerald-500" />
                        </div>
                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{formatIDR(m.net_profit)} {t('insights.profit_contribution')}</p>
                     </div>
                   ))}
                </div>

                <div className="space-y-4">
                   {data.insights.lowMargin.length > 0 && (
                     <div className="space-y-2">
                        <div className="flex items-center gap-2 text-amber-500">
                           <AlertTriangle className="w-3.5 h-3.5" />
                           <h4 className="text-[9px] font-black uppercase tracking-widest">{t('insights.hpp_efficiency_alert') || "LOW MARGIN ALERT"}</h4>
                        </div>
                        <p className="text-[9px] text-slate-400 font-medium leading-relaxed italic">{t('insights.margin_friction_desc') || "These items have high production costs relative to sales."}</p>
                        <div className="flex flex-wrap gap-1.5">
                           {data.insights.lowMargin.map(m => (
                             <span key={m.id} className="px-2 py-1 bg-amber-500/10 text-amber-600 rounded text-[8px] font-black uppercase border border-amber-500/10">
                                {m.name}
                             </span>
                           ))}
                        </div>
                     </div>
                   )}

                   {data.insights.lowSelling.length > 0 && (
                     <div className="space-y-2 pt-4 border-t border-slate-50">
                        <div className="flex items-center gap-2 text-rose-500">
                           <AlertTriangle className="w-3.5 h-3.5" />
                           <h4 className="text-[9px] font-black uppercase tracking-widest">{t('insights.low_velocity_alert') || "LOW VELOCITY ALERT"}</h4>
                        </div>
                        <p className="text-[9px] text-slate-400 font-medium leading-relaxed italic">{t('insights.low_velocity_desc') || "These items are selling below the average performance index."}</p>
                        <div className="flex flex-wrap gap-1.5">
                           {data.insights.lowSelling.map(m => (
                             <span key={m.id} className="px-2 py-1 bg-rose-500/10 text-rose-600 rounded text-[8px] font-black uppercase border border-rose-500/10">
                                {m.name}
                             </span>
                           ))}
                        </div>
                     </div>
                   )}
                </div>
              </div>
           </div>
           
           <div className="relative z-10 mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">{t('insights.active_intelligence')}</p>
              </div>
              <p className="text-[8px] font-bold text-slate-300 uppercase tracking-tighter">V.1.0-NEURAL</p>
           </div>
        </div>
      </div>

      {/* Main Analysis Table */}
      <div className="glass-card rounded-[2rem] border-none shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] bg-white/70 backdrop-blur-3xl overflow-hidden p-0 px-2 mt-4">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white/50">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                 <ClipboardList className="w-4 h-4 text-emerald-600" />
                 {t('insights.intelligence_deep_dive')}
            </h3>
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('insights.neural_matrix_calc')}</span>
            </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
            <TableRow className="border-none">
              <TableHead onClick={() => handleSort('name')} className="text-[9px] font-black uppercase text-slate-400 py-4 px-8 tracking-widest cursor-pointer hover:bg-slate-100 transition-colors">
                {t('insights.menu_item')} <SortIcon column="name" />
              </TableHead>
              <TableHead onClick={() => handleSort('total_qty')} className="text-[9px] font-black uppercase text-slate-400 py-4 text-right tracking-widest cursor-pointer hover:bg-slate-100 transition-colors">
                {t('insights.units_sold')} <SortIcon column="total_qty" />
              </TableHead>
              <TableHead onClick={() => handleSort('total_revenue')} className="text-[9px] font-black uppercase text-slate-900/40 py-4 text-right tracking-widest cursor-pointer hover:bg-slate-100 transition-colors">
                {t('orders.revenue')} <SortIcon column="total_revenue" />
              </TableHead>
              <TableHead onClick={() => handleSort('hpp')} className="text-[9px] font-black uppercase text-rose-600 bg-rose-50/50 py-4 text-right tracking-widest cursor-pointer hover:bg-rose-100 transition-colors">
                {t('insights.production_cost_hpp')} <SortIcon column="hpp" />
              </TableHead>
              <TableHead onClick={() => handleSort('net_profit')} className="text-[9px] font-black uppercase text-emerald-700 py-4 text-right tracking-widest cursor-pointer hover:bg-emerald-50 transition-colors">
                {t('orders.profit')} <SortIcon column="net_profit" />
              </TableHead>
              <TableHead onClick={() => handleSort('margin')} className="text-[9px] font-black uppercase text-emerald-700/60 py-4 text-right tracking-widest cursor-pointer hover:bg-emerald-50 transition-colors">
                {t('insights.margin_percent')} <SortIcon column="margin" />
              </TableHead>
              <TableHead className="text-[9px] font-black uppercase text-slate-400 py-4 text-center px-8 tracking-widest">{t('insights.efficiency_status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((m) => {
              const marginPercent = m.total_revenue > 0 ? ((m.net_profit / m.total_revenue) * 100).toFixed(1) : "0";
              return (
              <TableRow key={m.id} className="hover:bg-white/80 border-slate-50/50 transition-all duration-300 group">
                <TableCell className="px-8 py-5">
                   <p className="font-black text-slate-900 uppercase text-[11px] group-hover:text-emerald-700 transition-colors tracking-tight">{m.name}</p>
                   <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{m.category}</p>
                   </div>
                </TableCell>
                <TableCell className="text-right tabular-nums">
                   <span className="px-2 py-1 bg-slate-100 rounded-md font-black text-slate-900 text-[10px]">
                     {m.total_qty}
                   </span>
                </TableCell>
                <TableCell className="text-right font-bold text-slate-400 text-[10px] tabular-nums">{formatIDR(m.total_revenue || 0)}</TableCell>
                <TableCell className="text-right text-rose-700 text-[10px] font-black tabular-nums bg-rose-50/20">{formatIDR(m.hpp || 0)}</TableCell>
                <TableCell className="text-right font-black text-emerald-700 text-[11px] tabular-nums drop-shadow-sm">{formatIDR(m.net_profit)}</TableCell>
                <TableCell className="text-right font-black text-emerald-700/50 text-[10px] tabular-nums">{marginPercent}%</TableCell>
                <TableCell className="text-center px-8">
                  <span className={cn(
                    "px-3 py-1 rounded-lg text-[7.5px] font-black uppercase tracking-widest border transition-all",
                    getStatusColor(m.status)
                  )}>
                    {t(`insights.${m.status.toLowerCase().replace(/ /g, '_')}`)}
                  </span>
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
        </div>
        <div className="p-8 bg-slate-50/50 flex items-center justify-between">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
             {t('insights.total_analyzed_items')}: {data.data.length}
           </p>
           <div className="flex gap-4">
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 bg-[#0f172a] rounded-sm" />
                 <span className="text-[9px] font-black text-slate-400 uppercase">{t('insights.above_average')}</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 bg-[#94a3b8] rounded-sm opacity-40" />
                 <span className="text-[9px] font-black text-slate-400 uppercase">{t('insights.below_average')}</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function DemandForecast({ data, t }) {
  if (!data || data.length === 0) return <div className="p-20 text-center glass-card rounded-[2.5rem] shadow-2xl uppercase font-black text-slate-300 tracking-widest">{t('forecast.no_data')}</div>;

  const chartData = data.map(m => ({
    name: m.name,
    tomorrow: m.predictedTomorrow,
    avg: m.avgDailySales
  })).sort((a, b) => b.tomorrow - a.tomorrow).slice(0, 10);

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-8 border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-4">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
             {t('forecast.trajectory')}
          </h3>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.05} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} axisLine={false} tickLine={false} className="text-[10px] font-bold text-slate-800 uppercase tracking-tight" />
                <Tooltip 
                   contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #f1f5f9',
                    borderRadius: '12px',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                  }}
                  itemStyle={{ fontWeight: '700', color: '#1e293b', fontSize: '11px' }}
                />
                <Bar dataKey="tomorrow" name={t('forecast.tomorrow')} fill="#0f172a" radius={[0, 4, 4, 0]} barSize={16} />
                <Bar dataKey="avg" name={t('forecast.avg_daily_sales')} fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-1 bg-emerald-900 rounded-2xl p-8 shadow-sm text-white relative overflow-hidden">
          <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-8 flex items-center gap-2">
             <Calendar className="w-4 h-4" /> {t('forecast.prep_recommendations')}
          </h3>
          
          <div className="space-y-6 relative z-10">
            <div className="space-y-4">
              {data.sort((a, b) => b.predictedTomorrow - a.predictedTomorrow).slice(0, 6).map(m => (
                <div key={m.id} className="flex justify-between items-center bg-white/10 p-4 rounded-xl border border-white/5 group transition-all">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-tight leading-none group-hover:text-emerald-400 transition-colors">{m.name}</span>
                    <span className="text-[9px] font-medium text-white/40 uppercase mt-1">{t('forecast.avg_daily_sales')}: {m.avgDailySales}</span>
                  </div>
                  <div className="bg-emerald-400 text-emerald-950 px-4 py-2 rounded-lg font-bold text-xl shadow-lg shadow-emerald-400/10">
                    {m.recommendedPrep}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-0">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                 <Calendar className="w-4 h-4 text-emerald-500" />
                 {t('forecast.matrix_title')}
            </h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="text-[9px] font-bold uppercase text-slate-400 py-3 px-6">{t('insights.menu_item')}</TableHead>
              <TableHead className="text-[9px] font-bold uppercase text-slate-400 py-3 text-right">{t('forecast.normal_7d')}</TableHead>
              <TableHead className="text-[9px] font-bold uppercase text-emerald-600 py-3 text-right">{t('forecast.tomorrow')}</TableHead>
              <TableHead className="text-right text-emerald-600 text-[9px] font-bold uppercase py-3">{t('forecast.suggested')}</TableHead>
              <TableHead className="text-right font-bold text-slate-800 text-[9px] uppercase py-3 px-6">{t('forecast.weekly_total')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((m) => (
              <TableRow key={m.id} className="hover:bg-slate-50/50 border-slate-50 transition-colors group">
                <TableCell className="px-6 py-3 font-bold text-slate-800 uppercase text-xs group-hover:text-emerald-600 transition-colors">{m.name}</TableCell>
                <TableCell className="text-right font-semibold text-slate-400 text-xs">{m.avgDailySales}</TableCell>
                <TableCell className="text-right font-bold text-emerald-600 text-sm">{m.predictedTomorrow}</TableCell>
                <TableCell className="text-right font-bold text-emerald-600 text-sm">{m.recommendedPrep}</TableCell>
                <TableCell className="text-right font-bold text-slate-800 px-6 text-sm tabular-nums">{m.predictedNext7Days}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}
