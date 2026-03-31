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
    <div className="space-y-10 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">AI Analytics</h2>
          <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
            Data-driven intelligence and predictive insights
            <span className="inline-block w-1 h-1 bg-emerald-600 rounded-full" />
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-6">
          {activeTab === "intelligence" && (
            <div className="flex items-center gap-3 bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/50 shadow-sm">
              <select 
                value={range} 
                onChange={(e) => setRange(e.target.value)}
                className="text-[10px] font-black uppercase tracking-widest border-none rounded-xl px-4 py-2 bg-slate-900 text-white shadow-lg focus:ring-0 cursor-pointer"
              >
                <option value="today">Today</option>
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="thisMonth">This Month</option>
                <option value="custom">Custom Range</option>
              </select>

              {range === "custom" && (
                <div className="flex items-center gap-3 px-4 animate-in slide-in-from-right-4 duration-300">
                  <input 
                    type="date" 
                    value={from} 
                    onChange={(e) => setFrom(e.target.value)}
                    className="text-xs font-bold border-none bg-transparent p-0 focus:ring-0"
                  />
                  <div className="w-1 h-1 bg-slate-300 rounded-full" />
                  <input 
                    type="date" 
                    value={to} 
                    onChange={(e) => setTo(e.target.value)}
                    className="text-xs font-bold border-none bg-transparent p-0 focus:ring-0"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex bg-slate-100/50 backdrop-blur-sm rounded-[1.25rem] p-1.5 border border-slate-200/50 shadow-inner">
            <button
              onClick={() => setActiveTab("intelligence")}
              className={cn(
                "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
                activeTab === "intelligence" ? "bg-white text-slate-900 shadow-xl shadow-slate-200/50" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <PieChartIcon className="w-3.5 h-3.5" /> Intelligence
            </button>
            <button
              onClick={() => setActiveTab("forecast")}
              className={cn(
                "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
                activeTab === "forecast" ? "bg-white text-slate-900 shadow-xl shadow-slate-200/50" : "text-slate-400 hover:text-slate-600"
              )}
            >
              <TrendingUp className="w-3.5 h-3.5" /> Forecast
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
      case "STAR MENU": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "PROFITABLE MENU": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "LOW MARGIN MENU": return "bg-orange-100 text-orange-800 border-orange-200";
      case "UNDERPERFORMING MENU": return "bg-rose-100 text-rose-800 border-rose-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const chartData = data.data.map(m => ({
    name: m.name,
    profit: m.net_profit,
    qty: m.total_qty
  })).sort((a, b) => b.profit - a.profit);

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="glass-card rounded-[2.5rem] p-8 shadow-2xl border-none relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
          <div className="flex items-center justify-between mb-4">
             <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
             </div>
             <span className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest">Highest Profit</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight uppercase truncate">{data.insights.topProfitable[0]?.name}</div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
            Net Monthly: <span className="text-emerald-600 font-black">{formatIDR(data.insights.topProfitable[0]?.net_profit)}</span>
          </p>
        </div>

        <div className="glass-card rounded-[2.5rem] p-8 shadow-2xl border-none relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
          <div className="flex items-center justify-between mb-4">
             <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                <PieChartIcon className="w-6 h-6 text-emerald-600" />
             </div>
             <span className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest">Benchmarking</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight uppercase">{data.thresholds.avgQty.toFixed(1)} Portions</div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Average Sales Per Item</p>
        </div>

        <div className="glass-card rounded-[2.5rem] p-8 shadow-2xl border-none relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-700" />
          <div className="flex items-center justify-between mb-4">
             <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-rose-600" />
             </div>
             <span className="text-[10px] font-black text-rose-600/60 uppercase tracking-widest">Risk Alerts</span>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight uppercase">{data.insights.lowMargin.length + data.insights.lowSelling.length} items</div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Operational Review Required</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profitability Chart */}
        <div className="glass-card rounded-[2.5rem] p-8 shadow-2xl border-none">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-2">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
             Profitability Sensitivity Analysis
          </h3>
          <div className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                <XAxis dataKey="name" hide />
                <YAxis tickFormatter={(val) => `Rp${val / 1000}k`} axisLine={false} tickLine={false} className="text-[10px] font-black text-slate-400" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                    backdropFilter: 'blur(8px)',
                    border: 'none',
                    borderRadius: '16px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                  }}
                  itemStyle={{ fontWeight: '900', color: '#0f172a', fontSize: '12px' }}
                  formatter={(val) => formatIDR(val)}
                />
                <Bar dataKey="profit" name="Net Profit" radius={[10, 10, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.profit > data.thresholds.avgProfit ? '#0f172a' : '#cbd5e1'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Insights Panel */}
        <div className="glass-card rounded-[2.5rem] p-10 shadow-2xl border-none bg-slate-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-8 flex items-center gap-3">
             <Lightbulb className="w-4 h-4" /> Smart Recommendations
          </h3>
          
          <div className="space-y-10 relative z-10">
            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-500">Star Performers</h4>
              <div className="grid grid-cols-1 gap-3">
                {data.insights.topProfitable.map(m => (
                  <div key={m.id} className="flex justify-between items-center bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 group hover:bg-white/10 transition-all cursor-default">
                    <span className="text-sm font-black uppercase tracking-tight">{m.name}</span>
                    <span className="text-xs font-black text-emerald-400">{formatIDR(m.net_profit)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {data.insights.lowMargin.length > 0 && (
                 <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-2">
                       <div className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                       Margin Optimization
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-widest">High volume but compressed margins. Review COGS immediately.</p>
                    <div className="flex flex-wrap gap-2">
                      {data.insights.lowMargin.map(m => (
                        <span key={m.id} className="px-3 py-1 bg-amber-400/10 text-amber-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-amber-400/20">
                          {m.name}
                        </span>
                      ))}
                    </div>
                 </div>
               )}

               {data.insights.lowSelling.length > 0 && (
                 <div className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-400 flex items-center gap-2">
                       <div className="w-1.5 h-1.5 bg-rose-400 rounded-full" />
                       Efficiency Risk
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed uppercase tracking-widest">Dead inventory candidates. Consider menu consolidation.</p>
                    <div className="flex flex-wrap gap-2">
                      {data.insights.lowSelling.map(m => (
                        <span key={m.id} className="px-3 py-1 bg-rose-400/10 text-rose-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-rose-400/20">
                          {m.name}
                        </span>
                      ))}
                    </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl border-none p-0">
        <div className="p-10 border-b border-slate-100 bg-white shadow-sm flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-5">
               <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center shadow-xl shadow-slate-200">
                 <ClipboardList className="w-7 h-7 text-white" />
               </div>
               Intelligence Deep-Dive
            </h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="text-[10px] font-black uppercase text-slate-500 py-8 px-10">Menu Item</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-500 py-8 text-right">Qty</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-500 py-8 text-right">Net Profit</TableHead>
              <TableHead className="text-right text-rose-400 text-[10px] font-black uppercase py-8">Overhead</TableHead>
              <TableHead className="text-right font-black text-slate-900 text-[10px] uppercase py-8">True Profit</TableHead>
              <TableHead className="text-center text-[10px] font-black uppercase py-8 px-10">Classification</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((m) => (
              <TableRow key={m.id} className="hover:bg-slate-50/50 border-slate-100 transition-colors group">
                <TableCell className="px-10 py-8">
                   <p className="font-black text-slate-900 uppercase tracking-tight leading-none text-base group-hover:text-emerald-600 transition-colors">{m.name}</p>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">{m.category}</p>
                </TableCell>
                <TableCell className="text-right font-black text-slate-400">{m.total_qty}</TableCell>
                <TableCell className="text-right font-black text-emerald-600">{formatIDR(m.net_profit)}</TableCell>
                <TableCell className="text-right text-rose-400 text-sm font-black italic">{formatIDR(m.allocatedOverhead)}</TableCell>
                <TableCell className="text-right font-black text-slate-900 text-lg">{formatIDR(m.profitAfterOverhead)}</TableCell>
                <TableCell className="text-center px-10">
                  <span className={cn(
                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                    getStatusColor(m.status)
                  )}>
                    {m.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
    <div className="space-y-10 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-card rounded-[2.5rem] p-10 shadow-2xl border-none">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-10 flex items-center gap-4">
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
             Dynamic Demand Trajectory (Next 24 Hours)
          </h3>
          <div className="h-[450px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.1} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={140} axisLine={false} tickLine={false} className="text-[10px] font-black text-slate-900 uppercase tracking-tight" />
                <Tooltip 
                   contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                    backdropFilter: 'blur(8px)',
                    border: 'none',
                    borderRadius: '24px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
                  }}
                  itemStyle={{ fontWeight: '900', color: '#0f172a', fontSize: '12px' }}
                />
                <Bar dataKey="tomorrow" name="Predicted Demand" fill="#0f172a" radius={[0, 12, 12, 0]} barSize={20} />
                <Bar dataKey="avg" name="7D Historical Avg" fill="#cbd5e1" radius={[0, 12, 12, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-1 glass-card rounded-[2.5rem] p-12 shadow-2xl border-none bg-emerald-900 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
          <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-10 flex items-center gap-4">
             <Calendar className="w-5 h-5" /> Production Strategy Advice
          </h3>
          
          <div className="space-y-10 relative z-10">
            <p className="text-[10px] text-emerald-100/40 font-black leading-relaxed uppercase tracking-[0.2em]">Calculated with 10% operational safety buffer based on neural trajectory.</p>
            <div className="space-y-5">
              {data.sort((a, b) => b.predictedTomorrow - a.predictedTomorrow).slice(0, 8).map(m => (
                <div key={m.id} className="flex justify-between items-center bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/10 group hover:bg-white/10 transition-all">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-black uppercase tracking-tight leading-none group-hover:text-emerald-400 transition-colors">{m.name}</span>
                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">7D Avg: {m.avgDailySales}</span>
                  </div>
                  <div className="bg-emerald-400 text-emerald-950 px-6 py-3 rounded-2xl font-black text-2xl shadow-xl shadow-emerald-400/20">
                    {m.recommendedPrep}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-10 p-6 bg-black/20 rounded-3xl border border-white/5 backdrop-blur-sm">
                <h5 className="text-[10px] font-black text-emerald-300 uppercase tracking-[0.3em] mb-3 flex items-center gap-3">
                  <Lightbulb className="w-4 h-4" /> Predictive Logic
                </h5>
                <p className="text-[10px] text-emerald-100/40 leading-relaxed font-black uppercase tracking-widest">
                  Neural Moving Average + Volatility Buffer (1.1x Sigma)
                </p>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl border-none p-0">
        <div className="p-10 border-b border-slate-100 bg-white shadow-sm flex items-center justify-between">
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-5">
               <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center shadow-xl shadow-emerald-100/50">
                 <Calendar className="w-7 h-7 text-emerald-600" />
               </div>
               Forecast Matrix (Next 7 Cycles)
            </h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="text-[10px] font-black uppercase text-slate-500 py-8 px-10">Menu Item</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-500 py-8 text-right">7D Avg Index</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-emerald-600 py-8 text-right">Tomorrow Pred.</TableHead>
              <TableHead className="text-right text-emerald-600 text-[10px] font-black uppercase py-8">Target Prep Vol.</TableHead>
              <TableHead className="text-right font-black text-slate-900 text-[10px] uppercase py-8 px-10">Weekly Cumulative</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((m) => (
              <TableRow key={m.id} className="hover:bg-slate-50/50 border-slate-100 transition-colors group">
                <TableCell className="px-10 py-8 font-black text-slate-900 uppercase tracking-tight leading-none text-base group-hover:text-emerald-600 transition-colors">{m.name}</TableCell>
                <TableCell className="text-right font-black text-slate-400">{m.avgDailySales}</TableCell>
                <TableCell className="text-right font-black text-emerald-600 text-lg">{m.predictedTomorrow}</TableCell>
                <TableCell className="text-right font-black text-emerald-600 text-lg">{m.recommendedPrep}</TableCell>
                <TableCell className="text-right font-black text-slate-900 px-10 text-lg">{m.predictedNext7Days}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>
    </div>
  );
}

