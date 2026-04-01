"use client";

import React, { useState, useEffect } from "react";
import { 
  TrendingUp, TrendingDown, AlertCircle, 
  Info, DollarSign, PieChart, RefreshCw,
  Search, Sliders, ArrowRight, BarChart3,
  LayoutGrid, CheckCircle2
} from "lucide-react";
import { 
  ComposedChart, Line, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, Cell 
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function HPPAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ menus: [], materials: [] });
  const [globalIncrease, setGlobalIncrease] = useState(0);
  const [recalculating, setRecalculating] = useState(false);
  const [simulatedData, setSimulatedData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.get("/analytics/hpp");
      setData(res);
      setSimulatedData(res.menus);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (data.menus.length > 0) {
      simulateImpact();
    }
  }, [globalIncrease, data]);

  const simulateImpact = () => {
    setRecalculating(true);
    const simulated = data.menus.map(m => {
      if (!m.recipe) return m;

      // Simulate increase on each item
      const newHpp = m.recipe.items.reduce((acc, item) => {
        const baseCost = item.cost_per_unit * item.quantity;
        const increase = baseCost * (globalIncrease / 100);
        return acc + baseCost + increase;
      }, 0);

      return {
        ...m,
        simulated_hpp: Math.round(newHpp),
        impact: Math.round(newHpp - m.hpp),
        new_margin: m.price > 0 ? ((m.price - newHpp) / m.price) * 100 : 0
      };
    });
    setSimulatedData(simulated);
    setTimeout(() => setRecalculating(false), 300);
  };

  // Threshold alerts: HPP > 40% of Price
  const alerts = simulatedData.filter(m => m.simulated_hpp > m.price * 0.4);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <RefreshCw className="w-10 h-10 text-slate-900 animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Loading Intelligence...</p>
    </div>
  );

  return (
    <div className="p-10 space-y-12 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="space-y-3">
           <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl">
                 <LayoutGrid className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">Dynamic HPP Monitor</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Real-time Marginal Profit Analytics</p>
              </div>
           </div>
        </div>
        
        <div className="flex gap-4">
           <Button variant="outline" onClick={loadData} className="h-14 rounded-2xl border-slate-100 font-bold px-6">
              <RefreshCw className="w-4 h-4 mr-2" /> Sync Data
           </Button>
           <Button className="h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8">
              Generate Report
           </Button>
        </div>
      </div>

      {/* Stats Quick Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
         <Card className="bg-white border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:rotate-12 transition-transform h-full flex items-center">
               <DollarSign className="w-24 h-24" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Avg Food Cost (HPP)</p>
            <h4 className="text-3xl font-black text-slate-900 tracking-tighter italic">
               {formatIDR(data.menus.reduce((acc, m) => acc + m.hpp, 0) / (data.menus.length || 1))}
            </h4>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black border border-emerald-100 uppercase">
               <TrendingDown className="w-3 h-3" /> Healthy Margin
            </div>
         </Card>

         <Card className="bg-white border-slate-100 rounded-[2.5rem] p-8 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:rotate-12 transition-transform h-full flex items-center">
               <AlertCircle className="w-24 h-24" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Threshold Alerts</p>
            <h4 className={cn("text-3xl font-black tracking-tighter italic", alerts.length > 0 ? "text-red-600" : "text-emerald-600")}>
               {alerts.length} Items
            </h4>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-slate-50 text-slate-400 rounded-full text-[10px] font-black border border-slate-100 uppercase">
               Target: &lt; 40% HPP
            </div>
         </Card>

         <Card className="bg-slate-900 border-slate-800 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative md:col-span-2">
            <div className="relative z-10 flex flex-col justify-between h-full">
               <div>
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3">Sensitivity Analysis</p>
                  <h4 className="text-3xl font-black text-white italic tracking-tighter leading-none">Simulate Cost Fluctuations</h4>
               </div>
               
               <div className="mt-8 space-y-4">
                  <div className="flex justify-between items-end">
                     <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Ingredient Price Hike</span>
                     <span className={cn("text-3xl font-black tabular-nums transition-colors tracking-tighter italic", globalIncrease > 0 ? "text-red-500" : "text-emerald-500")}>
                        {globalIncrease > 0 ? "+" : ""}{globalIncrease}%
                     </span>
                  </div>
                  <input 
                     type="range" min="-30" max="100" value={globalIncrease} 
                     onChange={(e) => setGlobalIncrease(parseInt(e.target.value))}
                     className="w-full h-3 bg-slate-800 rounded-full appearance-none cursor-pointer accent-emerald-500"
                  />
               </div>
            </div>
         </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
         {/* Dual-Axis Chart */}
         <div className="lg:col-span-8 bg-white border border-slate-100 rounded-[3rem] p-10 shadow-sm overflow-hidden relative">
            <div className="flex justify-between items-center mb-10">
               <div>
                  <h5 className="text-xl font-black text-slate-900 uppercase italic tracking-tight">HPP vs selling Price Trends</h5>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Comparing Simulated HPP against Market Valuations</p>
               </div>
               <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                     <div className="w-3 h-3 bg-slate-900 rounded-sm" />
                     <span className="text-[9px] font-black text-slate-400 uppercase">Current HPP</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <div className="w-3 h-3 bg-red-400 rounded-sm" />
                     <span className="text-[9px] font-black text-slate-400 uppercase">Simulated Impact</span>
                  </div>
               </div>
            </div>

            <div className="h-[400px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={simulatedData.slice(0, 10)}>
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                     <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 10, fontWeight: 900, fill: '#94A3B8' }} 
                        dy={10}
                     />
                     <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#94A3B8' }} />
                     <Tooltip 
                        cursor={{ fill: 'rgba(0,0,0,0.02)' }}
                        content={({ active, payload }) => {
                           if (active && payload && payload.length) {
                              return (
                                 <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-800 text-xs">
                                    <p className="font-black uppercase tracking-tight mb-2">{payload[0].payload.name}</p>
                                    <div className="space-y-1">
                                       <div className="flex justify-between gap-6">
                                          <span className="text-slate-400 text-[10px] uppercase">Base HPP</span>
                                          <span className="font-bold">{formatIDR(payload[0].payload.hpp)}</span>
                                       </div>
                                       <div className="flex justify-between gap-6">
                                          <span className="text-red-400 text-[10px] uppercase italic">Simulated</span>
                                          <span className="font-bold text-red-100">{formatIDR(payload[0].payload.simulated_hpp)}</span>
                                       </div>
                                    </div>
                                 </div>
                              );
                           }
                           return null;
                        }}
                     />
                     <Bar dataKey="hpp" fill="#0F172A" radius={[8, 8, 0, 0]} barSize={40} />
                     <Bar dataKey="impact" stackId="a" fill="#F87171" radius={[8, 8, 0, 0]} opacity={0.8} barSize={40} />
                     <Line 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#10b981" 
                        strokeWidth={4} 
                        dot={{ r: 4, strokeWidth: 0, fill: '#10b981' }} 
                     />
                  </ComposedChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* Margin High Risk Column */}
         <div className="lg:col-span-4 bg-slate-50 border border-slate-100 rounded-[3rem] p-8 space-y-6">
             <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-widest">High Profitability Risk</h5>
             </div>

             <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {alerts.length === 0 ? (
                   <div className="text-center p-12 bg-white rounded-3xl border border-slate-100">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">All menus are within healthy 40% margin threshold</p>
                   </div>
                ) : (
                   alerts.map((item, idx) => (
                      <div key={idx} className="bg-white p-5 rounded-2xl border border-red-50 hover:border-red-200 transition-all group">
                         <div className="flex justify-between items-start mb-4">
                            <div>
                               <h6 className="font-black text-slate-900 uppercase tracking-tight">{item.name}</h6>
                               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Selling: {formatIDR(item.price)}</p>
                            </div>
                            <div className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[9px] font-bold border border-red-100">
                               {( (item.simulated_hpp / item.price) * 100 ).toFixed(1)}% HPP
                            </div>
                         </div>
                         <div className="space-y-2">
                            <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                               <div 
                                 className="h-full bg-red-500 transition-all duration-500" 
                                 style={{ width: `${Math.min(100, (item.simulated_hpp / item.price) * 100)}%` }} 
                               />
                            </div>
                            <p className="text-[9px] font-black text-red-500 uppercase tracking-tight flex items-center justify-between">
                               <span>Expected Loss Risk</span>
                               <span>Impact: +{formatIDR(item.impact)}</span>
                            </p>
                         </div>
                      </div>
                   ))
                )}
             </div>

             <div className="pt-6 border-t border-slate-200">
                <Button className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-black shadow-xl shadow-slate-200">
                   Analyze Recipe Ingredients <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
             </div>
         </div>
      </div>

      {/* Detail Table / Ingredient Trends */}
      <div className="space-y-8">
         <div className="flex items-center gap-4">
            <Sliders className="w-6 h-6 text-slate-900" />
            <h5 className="text-xl font-black text-slate-900 uppercase italic tracking-tight underline decoration-emerald-500 decoration-4 underline-offset-8">Raw Material Exposure</h5>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {data.materials.map(mat => (
               <div key={mat.id} className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm hover:shadow-2xl transition-all group">
                  <div className="flex justify-between items-center mb-6">
                     <div>
                        <h6 className="font-black text-slate-900 uppercase italic tracking-tighter leading-none">{mat.name}</h6>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{mat.brand || "LOCAL VENDOR"}</p>
                     </div>
                     <div className="text-right">
                        <p className="text-xl font-black text-emerald-600 tracking-tighter tabular-nums">{formatIDR(mat.current_price)}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Current WAC</p>
                     </div>
                  </div>
                  
                  <div className="h-10 w-full mb-4">
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mat.history}>
                           <Line type="monotone" dataKey="price" stroke="#E2E8F0" strokeWidth={2} dot={false} strokeOpacity={0.5} />
                           <Line type="monotone" dataKey="price" stroke="#10b981" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                        </LineChart>
                     </ResponsiveContainer>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                     <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cost Impact (est.)</span>
                     <span className="text-[10px] font-black text-red-500 uppercase">
                        +{formatIDR(mat.current_price * (globalIncrease / 100))} @ {globalIncrease}%
                     </span>
                  </div>
               </div>
            ))}
         </div>
      </div>
    </div>
  );
}
