"use client";
import { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import { useTranslation } from "../../../lib/language-context";
import { useToast } from "../../../components/ui/use-toast";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Sparkles, Plus, Trash2, ArrowRight, TrendingUp, Zap, Target, Package, Loader2 } from "lucide-react";
import { formatIDR } from "../../../lib/format";
import { cn } from "../../../lib/utils";

export default function PromotionsPage() {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const [menus, setMenus] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConsulting, setIsConsulting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [selectedItems, setSelectedItems] = useState([]);
  const [targetMargin, setTargetMargin] = useState(35);
  const [businessGoal, setBusinessGoal] = useState("VOLUME_BOOSTER");
  const [suggestion, setSuggestion] = useState(null);

  useEffect(() => {
    loadMenus();
  }, []);

  const loadMenus = async () => {
    try {
      const data = await api.get("/menus");
      setMenus(data);
    } catch (e) {
      error("Failed to load menus");
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = (menu) => {
    if (selectedItems.find(i => i.id === menu.id)) return;
    setSelectedItems([...selectedItems, menu]);
  };

  const removeItem = (id) => {
    setSelectedItems(selectedItems.filter(i => i.id !== id));
    setSuggestion(null);
  };

  const handleConsultAI = async () => {
    if (selectedItems.length < 2) {
      error("Select at least 2 items for bundling");
      return;
    }
    setIsConsulting(true);
    try {
      const res = await api.post("/promo/suggest", {
        items: selectedItems,
        business_goal: businessGoal,
        target_margin: targetMargin
      });
      setSuggestion(res);
      success("AI suggestion generated!");
    } catch (e) {
      console.error(e);
      error(e.response?.data?.error || "AI service unavailable");
    } finally {
      setIsConsulting(false);
    }
  };

  const handlePushToPOS = async () => {
    if (!suggestion) return;
    setIsSaving(true);
    try {
      const totalCost = selectedItems.reduce((acc, it) => acc + (it.cost || 0), 0);
      await api.post("/promo", {
        name: suggestion.promo_name,
        price: suggestion.suggested_price,
        cost: totalCost,
        items: selectedItems.map(it => it.id)
      });
      success("Bundle saved to POS Menu!");
      setSuggestion(null);
      setSelectedItems([]);
    } catch (e) {
      error("Failed to save bundle");
    } finally {
      setIsSaving(false);
    }
  };

  const totalOriginalPrice = selectedItems.reduce((acc, it) => acc + it.price, 0);
  const totalHpp = selectedItems.reduce((acc, it) => acc + (it.cost || 0), 0);

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic flex items-center gap-3">
             {t('promotions')} <Sparkles className="w-8 h-8 text-emerald-500" />
          </h3>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">{t('ai_pricing')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Product Selector */}
        <div className="lg:col-span-4 space-y-6">
          <div className="glass-card p-8 rounded-[2.5rem] space-y-6">
            <div>
               <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 block">1. Select Products</Label>
               <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                 {menus.filter(m => m.is_active).map(menu => (
                   <button 
                    key={menu.id}
                    onClick={() => addItem(menu)}
                    className="w-full p-4 rounded-2xl bg-white border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all flex justify-between items-center group"
                   >
                     <div className="text-left">
                       <p className="text-xs font-black uppercase text-slate-700">{menu.name}</p>
                       <p className="text-[9px] font-bold text-slate-400">{formatIDR(menu.price)}</p>
                     </div>
                     <Plus className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                   </button>
                 ))}
               </div>
            </div>
          </div>
        </div>

        {/* Center: Bundle Setup */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-card p-10 rounded-[2.5rem] bg-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
             
             <div className="relative z-10 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                   <div className="space-y-6">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block underline decoration-emerald-500 underline-offset-8">2. Bundle Items</Label>
                      {selectedItems.length === 0 ? (
                        <div className="h-48 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-slate-300 gap-3">
                           <Package className="w-8 h-8 opacity-20" />
                           <p className="text-[10px] font-black uppercase tracking-widest">No items selected</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {selectedItems.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-white">
                               <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm font-black text-xs text-slate-900">{item.name[0]}</div>
                                  <span className="text-[11px] font-black uppercase text-slate-700">{item.name}</span>
                               </div>
                               <button onClick={() => removeItem(item.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          ))}
                        </div>
                      )}
                   </div>

                   <div className="space-y-8">
                      <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block underline decoration-emerald-500 underline-offset-8">3. AI Parameters</Label>
                      
                      <div className="space-y-3">
                         <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Target Margin (%)</Label>
                         <Input 
                          type="number" 
                          value={targetMargin} 
                          onChange={(e) => setTargetMargin(e.target.value)}
                          className="h-14 rounded-2xl bg-slate-50 border-none font-black text-lg focus:ring-2 ring-emerald-500/20" 
                         />
                      </div>

                      <div className="space-y-3">
                         <Label className="text-[9px] font-black uppercase tracking-widest text-slate-500">Business Strategy</Label>
                         <div className="grid grid-cols-3 gap-2">
                            {[
                              { id: "LOSS_LEADER", icon: Zap, label: t('loss_leader') },
                              { id: "VOLUME_BOOSTER", icon: TrendingUp, label: t('volume_boost') },
                              { id: "PROFIT_MAXIMIZER", icon: Target, label: t('profit_max') }
                            ].map(strat => (
                              <button
                                key={strat.id}
                                onClick={() => setBusinessGoal(strat.id)}
                                className={cn(
                                  "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
                                  businessGoal === strat.id 
                                    ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-105" 
                                    : "bg-white border-slate-100 text-slate-400 hover:border-slate-300"
                                )}
                              >
                                <strat.icon className="w-5 h-5" />
                                <span className="text-[8px] font-black uppercase tracking-tighter text-center">{strat.label}</span>
                              </button>
                            ))}
                         </div>
                      </div>

                      <Button 
                        disabled={selectedItems.length < 2 || isConsulting}
                        onClick={handleConsultAI}
                        className="w-full h-16 rounded-[2rem] bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all group"
                      >
                         {isConsulting ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                           <>
                             {t('consult_ai')} <Sparkles className="w-5 h-5 ml-2 group-hover:rotate-12 transition-transform" />
                           </>
                         )}
                      </Button>
                   </div>
                </div>

                {/* AI Result Card */}
                {suggestion && (
                  <div className="mt-10 p-10 bg-slate-900 rounded-[3rem] text-white space-y-8 animate-in slide-in-from-bottom-6 fade-in duration-700 shadow-3xl">
                     <div className="flex justify-between items-start">
                        <div className="space-y-2">
                           <div className="flex items-center gap-3">
                              <div className="px-3 py-1 bg-emerald-500 rounded-full text-[8px] font-black uppercase tracking-widest">{suggestion.strategy}</div>
                              {suggestion.is_fallback && <div className="px-3 py-1 bg-amber-500 rounded-full text-[8px] font-black uppercase tracking-widest">Fallback Mode</div>}
                           </div>
                           <h4 className="text-3xl font-black uppercase italic tracking-tight text-emerald-400">{suggestion.promo_name}</h4>
                           <p className="text-slate-400 italic text-sm">"{suggestion.hook}"</p>
                        </div>
                        <Sparkles className="w-12 h-12 text-emerald-500 opacity-50" />
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                           <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Normal Bundle Price</p>
                           <p className="text-xl font-black line-through text-slate-600">{formatIDR(totalOriginalPrice)}</p>
                        </div>
                        <div className="p-6 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 backdrop-blur-sm relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-2"><Sparkles className="w-4 h-4 text-emerald-500" /></div>
                           <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">{t('suggested_price')}</p>
                           <p className="text-3xl font-black text-white">{formatIDR(suggestion.suggested_price)}</p>
                        </div>
                        <div className="p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm">
                           <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{t('est_profit')}</p>
                           <p className="text-2xl font-black text-emerald-400">+{formatIDR(suggestion.estimated_profit)}</p>
                        </div>
                     </div>

                     <div className="flex flex-col md:flex-row gap-6 pt-4 items-center justify-between border-t border-white/10">
                        <div className="flex gap-10 whitespace-nowrap overflow-x-auto pb-2 scrollbar-hide max-w-full">
                           <div className="flex flex-col">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Total HPP</span>
                              <span className="font-bold text-sm">{formatIDR(totalHpp)}</span>
                           </div>
                           <div className="flex flex-col">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Target Margin</span>
                              <span className="font-bold text-sm">{targetMargin}%</span>
                           </div>
                           <div className="flex flex-col">
                              <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Savings to Customer</span>
                              <span className="font-bold text-sm text-rose-400">{formatIDR(totalOriginalPrice - suggestion.suggested_price)}</span>
                           </div>
                        </div>
                        <Button 
                          onClick={handlePushToPOS}
                          disabled={isSaving}
                          className="h-16 px-12 rounded-[2rem] bg-white text-slate-900 hover:bg-emerald-50 font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-3 transition-all active:scale-95"
                        >
                           {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                             <>
                              {t('push_to_pos')} <ArrowRight className="w-5 h-5" />
                             </>
                           )}
                        </Button>
                     </div>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
