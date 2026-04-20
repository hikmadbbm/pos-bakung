"use client";
import { useState, useEffect, useRef } from "react";
import DailyExpenses from "../../../components/expenses/DailyExpenses";
import FixedCosts from "../../../components/expenses/FixedCosts";
import { cn } from "../../../lib/utils";
import { useTranslation } from "../../../lib/language-context";
import { Plus, Settings2 } from "lucide-react";
import { Button } from "../../../components/ui/button";

export default function ExpensesPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("daily");
  const dailyRef = useRef();
  const fixedRef = useRef();

  useEffect(() => {
    const saved = localStorage.getItem("pos_expenses_active_tab");
    if (saved) setActiveTab(saved);
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    localStorage.setItem("pos_expenses_active_tab", tabId);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20">
      <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 bg-white/40 backdrop-blur-xl p-4 sm:p-6 rounded-[2.5rem] border border-white/20 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-2xl">
            <Settings2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 uppercase italic leading-none">{t('expenses.title')}</h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
              {t('expenses.subtitle')}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
          <div className="flex bg-slate-100/80 backdrop-blur-md rounded-2xl p-1.5 border border-slate-200/50 shadow-inner w-full md:w-auto">
            <button
              onClick={() => handleTabChange("daily")}
              className={cn(
                "flex-1 md:flex-none px-6 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all",
                activeTab === "daily" ? "bg-white text-slate-900 shadow-xl" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {t('expenses.daily_tab')}
            </button>
            <button
              onClick={() => handleTabChange("fixed")}
              className={cn(
                "flex-1 md:flex-none px-6 py-2.5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all",
                activeTab === "fixed" ? "bg-white text-slate-900 shadow-xl" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {t('expenses.fixed_tab')}
            </button>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {activeTab === "daily" && (
              <Button 
                variant="outline" 
                onClick={() => dailyRef.current?.openCategories()} 
                className="flex-1 md:flex-none h-11 px-5 rounded-xl font-black text-[9px] uppercase tracking-widest text-slate-400 hover:text-slate-900 border-slate-200 bg-white"
              >
                {t('expenses.manage_categories')}
              </Button>
            )}
            <Button 
              onClick={() => activeTab === "daily" ? dailyRef.current?.openAdd() : fixedRef.current?.openAdd()} 
              className="flex-1 md:flex-none h-11 px-6 rounded-xl font-black text-[9px] uppercase tracking-widest bg-slate-900 text-white hover:bg-black shadow-lg transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 mr-2" /> {t('expenses.add_expense')}
            </Button>
          </div>
        </div>
      </div>

      <div className="animate-in fade-in duration-500">
        {activeTab === "daily" ? <DailyExpenses ref={dailyRef} /> : <FixedCosts ref={fixedRef} />}
      </div>
    </div>
  );
}
