"use client";
import React from "react";
import { Bell, Calendar, Video, ArrowRight, AlertTriangle } from "lucide-react";
import { cn } from "../../lib/utils";

export default function RemindersPanel({ lowStockItems = [] }) {
  const hasLowStock = lowStockItems.length > 0;

  return (
    <div className="glass-card p-5 lg:p-6 flex flex-col h-full bg-slate-50/30 border-dashed border-emerald-100/50 min-h-[300px]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Strategic Reminders</h3>
        <Bell className={cn("w-4 h-4", hasLowStock ? "text-rose-500 animate-bounce" : "text-emerald-300")} />
      </div>

      <div className="space-y-6 flex-1">
        {hasLowStock ? (
          <div className="space-y-4">
            <h4 className="text-xl font-black text-slate-900 tracking-tight leading-tight">Low Stock Alerts</h4>
            <div className="space-y-3">
              {lowStockItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-700 truncate uppercase tracking-tight">{item.item_name}</p>
                    <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest mt-0.5">Stock: {item.stock} {item.unit}</p>
                  </div>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h4 className="text-xl font-black text-slate-900 tracking-tight leading-tight">All clear</h4>
              <p className="text-[10px] font-bold text-emerald-600 mt-1 uppercase tracking-widest">Inventory Health: Optimal</p>
            </div>
            <p className="text-xs font-medium text-slate-500 leading-relaxed italic">
              "No critical stock alerts at this moment. Business operations are in focus."
            </p>
          </div>
        )}
      </div>

      <button className="mt-4 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl py-3 px-6 flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-emerald-200 group">
        <Video className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
        <span className="text-[10px] font-black uppercase tracking-widest">Sync with Team</span>
        <ArrowRight className="w-3 h-3 ml-auto opacity-40" />
      </button>
    </div>
  );
}
