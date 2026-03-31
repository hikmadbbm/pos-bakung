"use client";
import { useState } from "react";
import DailyExpenses from "../../../components/expenses/DailyExpenses";
import FixedCosts from "../../../components/expenses/FixedCosts";
import { cn } from "../../../lib/utils";

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState("daily");

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Financial Outflow</h2>
          <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
            Expense Tracking & Overhead Allocation
            <span className="inline-block w-1 h-1 bg-emerald-600 rounded-full" />
          </p>
        </div>
        
        <div className="flex bg-slate-100/50 backdrop-blur-sm rounded-[1.25rem] p-1.5 border border-slate-200/50 shadow-inner">
          <button
            onClick={() => setActiveTab("daily")}
            className={cn(
              "px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
              activeTab === "daily" ? "bg-white text-slate-900 shadow-xl shadow-slate-200/50" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Daily Log
          </button>
          <button
            onClick={() => setActiveTab("fixed")}
            className={cn(
              "px-8 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
              activeTab === "fixed" ? "bg-white text-slate-900 shadow-xl shadow-slate-200/50" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Fixed Burden
          </button>
        </div>
      </div>

      <div className="animate-in fade-in duration-500">
        {activeTab === "daily" ? <DailyExpenses /> : <FixedCosts />}
      </div>
    </div>
  );
}
