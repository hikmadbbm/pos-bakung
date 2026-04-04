"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { TrendingUp, PieChart as PieChartIcon, Lightbulb, Calendar, AlertTriangle, ClipboardList, RefreshCw } from "lucide-react";
import { cn } from "../../../lib/utils";

export default function AnalyticsPage() {
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
        let t = new Date();

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
        const tStr = t.toISOString().split('T')[0];
        qs = `?from=${fStr}&to=${tStr}`;
      }

      const [intel, forecast] = await Promise.all([
        api.get(`/analytics/menu-intelligence${qs}`),
        api.get("/analytics/demand-forecast") // Forecast always uses last 7 days from now
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
      <p className="text-slate-500 font-medium uppercase tracking-widest text-[10px]">Processing Neural Data...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">AI Insights</h2>
          <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2">
            Data-driven intelligence and predictive insights
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
                <option value="today">Today</option>
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="thisMonth">This Month</option>
                <option value="custom">Custom Range</option>
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
              Intelligence
            </button>
            <button
              onClick={() => setActiveTab("forecast")}
              className={cn(
                "px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2",
                activeTab === "forecast" ? "bg-white text-emerald-700 shadow-md translate-y-[-1px]" : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
              )}
            >
              Forecast
            </button>
          </div>
        </div>
      </div>

      {activeTab === "intelligence" ? (
        <MenuIntelligence data={intelligenceData} />
      ) : (
        <DemandForecast data={forecastData} />
      )}
    </div>
  );
}

function MenuIntelligence({ data }) {
  if (!data) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case "STAR MENU": return "bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-100/50";
      case "PROFITABLE MENU": return "bg-indigo-50 text-indigo-700 border-indigo-100";
      case "LOW MARGIN MENU": return "bg-amber-50 text-amber-700 border-amber-100";
      case "UNDERPERFORMING MENU": return "bg-rose-50 text-rose-700 border-rose-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  const chartData = data.data.map(m => ({
    name: m.name,
    profit: m.net_profit,
    qty: m.total_qty
  })).sort((a, b) => b.profit - a.profit).slice(0, 8);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top Cards - Polished */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { 
            label: "Top Performer", 
            value: data.insights.topProfitable[0]?.name || "N/A", 
            icon: TrendingUp, 
            color: "text-emerald-600",
            bg: "bg-emerald-50/50",
            sub: `NET PROFIT: ${formatIDR(data.insights.topProfitable[0]?.net_profit || 0)}`
          },
          { 
            label: "Performance Index", 
            value: `${data.thresholds.avgQty.toFixed(1)} UNITS`, 
            icon: PieChartIcon, 
            color: "text-slate-900",
            bg: "bg-slate-50/50",
            sub: "AVG SALES PER ITEM"
          },
          { 
            label: "Risk Alerts", 
            value: `${data.insights.lowMargin.length + data.insights.lowSelling.length} ITEMS`, 
            icon: AlertTriangle, 
            color: "text-rose-600",
            bg: "bg-rose-50/50",
            sub: "REVIEW RECOMMENDED"
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

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Profitability Chart */}
        <div className="lg:col-span-3 glass-card p-6 rounded-[2rem] border-none shadow-xl bg-white/50 backdrop-blur-xl group">
          <div className="flex items-center justify-between mb-8">
             <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                <div className="w-8 h-px bg-slate-200" />
                Contribution Matrix
             </h3>
             <div className="px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[8px] font-black text-emerald-600 uppercase tracking-widest">
                Active Intelligence
             </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
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
                <Bar dataKey="profit" name="Net Profit" radius={[8, 8, 8, 8]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.profit > data.thresholds.avgProfit ? '#059669' : '#0f172a'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="lg:col-span-2 glass-card p-8 rounded-[2rem] border-none shadow-2xl bg-slate-900 text-white relative overflow-hidden flex flex-col justify-between">
           <div className="absolute top-0 right-0 w-[20rem] h-[20rem] bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
           <div className="relative z-10">
              <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-8 flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                 </div>
                 AI Observation Engine
              </h3>
              
              <div className="space-y-8">
                <div className="space-y-3">
                   <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Growth Leaders</p>
                   {data.insights.topProfitable.slice(0, 2).map((m, idx) => (
                     <div key={idx} className="bg-white/5 border border-white/5 p-4 rounded-xl hover:bg-white/10 transition-all group">
                        <div className="flex justify-between items-center mb-1">
                           <span className="text-[11px] font-black uppercase tracking-tight group-hover:text-emerald-400 transition-colors">{m.name}</span>
                           <TrendingUp className="w-3 h-3 text-emerald-500" />
                        </div>
                        <p className="text-[8px] font-medium text-white/40 uppercase tracking-widest">{formatIDR(m.net_profit)} Profit Contribution</p>
                     </div>
                   ))}
                </div>

                <div className="space-y-4">
                   {data.insights.lowMargin.length > 0 && (
                     <div className="space-y-2">
                        <div className="flex items-center gap-2 text-amber-400">
                           <AlertTriangle className="w-3.5 h-3.5" />
                           <h4 className="text-[9px] font-black uppercase tracking-widest">HPP Efficiency Alert</h4>
                        </div>
                        <p className="text-[9px] text-white/30 font-medium leading-relaxed italic">High volume but margin friction detected:</p>
                        <div className="flex flex-wrap gap-1.5">
                           {data.insights.lowMargin.map(m => (
                             <span key={m.id} className="px-2 py-1 bg-amber-500/10 text-amber-500 rounded text-[8px] font-black uppercase border border-amber-500/10">
                                {m.name}
                             </span>
                           ))}
                        </div>
                     </div>
                   )}
                </div>
              </div>
           </div>
           
           <div className="relative z-10 mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Active Intelligence</p>
              </div>
              <p className="text-[8px] font-bold text-white/20 uppercase tracking-tighter">V.1.0-NEURAL</p>
           </div>
        </div>
      </div>

      {/* Main Analysis Table */}
      <div className="glass-card rounded-[2rem] border-none shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] bg-white/70 backdrop-blur-3xl overflow-hidden p-0 px-2 mt-4">
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white/50">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                 <ClipboardList className="w-4 h-4 text-emerald-600" />
                 Intelligence Deep-Dive
            </h3>
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Neural Matrix Calculation</span>
            </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/50">
            <TableRow className="border-none">
              <TableHead className="text-[9px] font-black uppercase text-slate-400 py-4 px-8 tracking-widest">Menu Item</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-slate-400 py-4 text-right tracking-widest">Units Sold</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-slate-900/40 py-4 text-right tracking-widest">Revenue</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-rose-600 bg-rose-50/50 py-4 text-right tracking-widest">Production Cost (HPP)</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-emerald-700 py-4 text-right tracking-widest">Net Profit</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-emerald-700/60 py-4 text-right tracking-widest">Margin %</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-slate-400 py-4 text-center px-8 tracking-widest">Efficiency Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((m) => {
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
                    {m.status}
                  </span>
                </TableCell>
              </TableRow>
            )})}
          </TableBody>
        </Table>
        </div>
        <div className="p-8 bg-slate-50/50 flex items-center justify-between">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
             Total analyzed items: {data.data.length}
           </p>
           <div className="flex gap-4">
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 bg-[#0f172a] rounded-sm" />
                 <span className="text-[9px] font-black text-slate-400 uppercase">Above Average</span>
              </div>
              <div className="flex items-center gap-2">
                 <div className="w-3 h-3 bg-[#94a3b8] rounded-sm opacity-40" />
                 <span className="text-[9px] font-black text-slate-400 uppercase">Below Average</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function DemandForecast({ data }) {
  if (!data || data.length === 0) return <div className="p-20 text-center glass-card rounded-[2.5rem] shadow-2xl uppercase font-black text-slate-300 tracking-widest">No historical data for neural forecasting yet.</div>;

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
             Demand Trajectory (Next 24 Hours)
          </h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
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
                <Bar dataKey="tomorrow" name="Predicted" fill="#0f172a" radius={[0, 4, 4, 0]} barSize={16} />
                <Bar dataKey="avg" name="7D Avg" fill="#e2e8f0" radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-1 bg-emerald-900 rounded-2xl p-8 shadow-sm text-white relative overflow-hidden">
          <h3 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-8 flex items-center gap-2">
             <Calendar className="w-4 h-4" /> Prep Recommendations
          </h3>
          
          <div className="space-y-6 relative z-10">
            <div className="space-y-4">
              {data.sort((a, b) => b.predictedTomorrow - a.predictedTomorrow).slice(0, 6).map(m => (
                <div key={m.id} className="flex justify-between items-center bg-white/10 p-4 rounded-xl border border-white/5 group transition-all">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-tight leading-none group-hover:text-emerald-400 transition-colors">{m.name}</span>
                    <span className="text-[9px] font-medium text-white/40 uppercase mt-1">7D Avg: {m.avgDailySales}</span>
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
                 Forecast Matrix (7-Cycle)
            </h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="text-[9px] font-bold uppercase text-slate-400 py-3 px-6">Menu Item</TableHead>
              <TableHead className="text-[9px] font-bold uppercase text-slate-400 py-3 text-right">7D Normal</TableHead>
              <TableHead className="text-[9px] font-bold uppercase text-emerald-600 py-3 text-right">Tomorrow</TableHead>
              <TableHead className="text-right text-emerald-600 text-[9px] font-bold uppercase py-3">Suggested</TableHead>
              <TableHead className="text-right font-bold text-slate-800 text-[9px] uppercase py-3 px-6">Weekly Total</TableHead>
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

