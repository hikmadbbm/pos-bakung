"use client";

import React from "react";
import { 
  TrendingUp, TrendingDown, Minus, 
  AlertTriangle, CheckCircle2, X 
} from "lucide-react";
import { 
  LineChart, Line, ResponsiveContainer, 
  YAxis, Tooltip 
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import Portal from "./Portal";

export default function PriceChangeAlert({ 
  isOpen, 
  onClose, 
  ingredient, 
  newPrice, 
  history = [] 
}) {
  if (!isOpen || !ingredient) return null;

  const currentWac = ingredient.cost_per_unit || 0;
  const newCpu = newPrice / (ingredient.volume || 1);
  const diff = currentWac > 0 ? ((newCpu - currentWac) / currentWac) * 100 : 0;
  
  const isUp = diff > 0.5; // > 0.5% considered up
  const isDown = diff < -0.5;
  const isLargeIncrease = diff > 5;
  
  const badgeColor = isLargeIncrease 
    ? "bg-red-100 text-red-600 border-red-200" 
    : isUp 
      ? "bg-amber-100 text-amber-600 border-amber-200" 
      : isDown 
        ? "bg-emerald-100 text-emerald-600 border-emerald-200" 
        : "bg-slate-100 text-slate-600 border-slate-200";

  const chartData = history.slice(0, 7).reverse().map(h => ({
    date: new Date(h.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
    price: h.cost_per_unit || h.price / (h.volume || 1)
  }));

  // Add the draft price to the chart preview
  chartData.push({
    date: "TODAY",
    price: newCpu
  });

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-6 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-[0_32px_128px_-12px_rgba(0,0,0,0.3)] border border-slate-100"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center bg-white">
                <div className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", 
                    isLargeIncrease ? "bg-red-500 shadow-red-100" : isUp ? "bg-amber-500 shadow-amber-100" : "bg-emerald-500 shadow-emerald-100",
                    "shadow-lg text-white"
                  )}>
                    {isLargeIncrease ? <AlertTriangle className="w-5 h-5" /> : isDown ? <TrendingDown className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 uppercase tracking-tight text-lg leading-none">Price Intelligence</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Anomaly Detection Node</p>
                  </div>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center transition-colors">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                 <div className="space-y-4">
                    <div className="flex justify-between items-end">
                       <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Current WAC</p>
                          <p className="text-lg font-bold text-slate-500 tabular-nums">{formatIDR(currentWac)}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">New Batch Rate</p>
                          <p className="text-2xl font-extrabold text-slate-900 tabular-nums leading-none tracking-tighter">{formatIDR(newCpu)}</p>
                       </div>
                    </div>

                    <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase tracking-widest", badgeColor)}>
                       {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : isDown ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                       {isUp ? "Price Hike" : isDown ? "Price Saving" : "Stable Rate"}
                       <span className="opacity-30">|</span>
                       {diff === 0 ? "0%" : `${Math.abs(diff).toFixed(1)}% Change`}
                    </div>
                 </div>

                 {/* Chart */}
                 <div className="space-y-3">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                       <TrendingUp className="w-3 h-3" /> 7-Day Efficiency Curve
                    </p>
                    <div className="h-28 w-full bg-slate-50/50 rounded-2xl p-3 border border-slate-100">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                               <Line 
                                 type="monotone" 
                                 dataKey="price" 
                                 stroke={isLargeIncrease ? "#ef4444" : isUp ? "#f59e0b" : "#10b981"} 
                                 strokeWidth={3} 
                                 dot={{ r: 3, fill: "white", strokeWidth: 2, stroke: isUp ? "#f59e0b" : "#10b981" }} 
                                 activeDot={{ r: 5, strokeWidth: 0, fill: "black" }}
                               />
                               <YAxis hide domain={['dataMin - 100', 'dataMax + 100']} />
                               <Tooltip 
                                  content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                      return (
                                        <div className="bg-slate-900 text-white p-1.5 rounded-lg text-[9px] font-bold uppercase shadow-xl tracking-tighter">
                                           {formatIDR(payload[0].value)}
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                               />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                 </div>

                 <div className="pt-2 flex gap-3">
                    <Button 
                       onClick={onClose}
                       className="flex-1 h-12 rounded-xl bg-slate-900 hover:bg-black text-white font-bold uppercase tracking-widest text-[10px] shadow-lg shadow-slate-100"
                    >
                       <CheckCircle2 className="w-4 h-4 mr-2" /> Proceed to Intake
                    </Button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
