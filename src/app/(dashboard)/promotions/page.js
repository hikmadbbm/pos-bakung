"use client";
import { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import { useTranslation } from "../../../lib/language-context";
import { useToast } from "../../../components/ui/use-toast";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Sparkles, Plus, Trash2, ArrowRight, TrendingUp, Zap, Target, Package, Loader2, Check, Info } from "lucide-react";
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
  
  // New States for Enrichment & Stepper
  const [activeStep, setActiveStep] = useState(1);
  const [competitorPrice, setCompetitorPrice] = useState("");
  const [marketMoment, setMarketMoment] = useState("NORMAL");
  const [inventoryStatus, setInventoryStatus] = useState("STABLE");

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
        target_margin: targetMargin,
        competitor_price: competitorPrice,
        market_moment: marketMoment,
        inventory_status: inventoryStatus
      });
      setSuggestion(res);
      setActiveStep(3);
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

        {/* Stepper Navigation */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
           {[
             { id: 1, label: "1. Select" },
             { id: 2, label: "2. Strategy" },
             { id: 3, label: "3. Results" }
           ].map(s => (
             <button
               key={s.id}
               onClick={() => (s.id <= activeStep || selectedItems.length >= 2) && setActiveStep(s.id)}
               className={cn(
                 "px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                 activeStep === s.id ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" : "text-slate-400 hover:text-slate-600"
               )}
             >
               {s.label}
             </button>
           ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Step 1: Selection */}
        {activeStep === 1 && (
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-6 animate-in fade-in duration-500">
            <div className="md:col-span-5 lg:col-span-3 space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                 <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-4 block">Pick items</Label>
                 <div className="space-y-2 max-h-[450px] overflow-y-auto pr-2 scrollbar-hide">
                    {menus.filter(m => m.is_active).map(menu => {
                      const isSelected = !!selectedItems.find(i => i.id === menu.id);
                      return (
                        <button 
                          key={menu.id}
                          onClick={() => isSelected ? removeItem(menu.id) : addItem(menu)}
                          className={cn(
                            "w-full p-3.5 rounded-xl border transition-all",
                            isSelected 
                              ? "bg-slate-900 border-slate-900 text-white shadow-lg shadow-slate-950/10" 
                              : "bg-white border-slate-100 hover:border-emerald-200"
                          )}
                        >
                           <div className="flex justify-between items-center">
                              <div className="text-left">
                                 <p className={cn("text-[11px] font-black uppercase", isSelected ? "text-emerald-400" : "text-slate-700")}>{menu.name}</p>
                                 <div className="flex items-center gap-2 mt-0.5">
                                    <span className={cn("text-[8px] font-bold", isSelected ? "text-white/60" : "text-slate-400")}>{formatIDR(menu.price)}</span>
                                    {menu.cost > 0 && (
                                       <span className={cn("text-[8px] font-black uppercase", isSelected ? "text-emerald-400/80" : "text-emerald-600")}>• Modal: {formatIDR(menu.cost)}</span>
                                    )}
                                 </div>
                              </div>
                              {isSelected ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Plus className="w-3.5 h-3.5 text-slate-200" />}
                           </div>
                        </button>
                      );
                    })}
                 </div>
              </div>
            </div>

            <div className="md:col-span-7 lg:col-span-9 flex flex-col justify-between">
               <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden flex-1">
                  <div className="relative z-10 space-y-8">
                     <div className="flex items-center justify-between">
                        <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-3">
                           Items In Bundle
                        </Label>
                        {selectedItems.length > 0 && (
                           <div className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest italic leading-none">
                              {selectedItems.length} Menus
                           </div>
                        )}
                     </div>

                     {selectedItems.length === 0 ? (
                       <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
                          <Package className="w-8 h-8 text-slate-100" />
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-loose">Buckle up! Add at least 2 items</p>
                       </div>
                     ) : (
                       <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {selectedItems.map(item => (
                             <div key={item.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl group relative hover:bg-slate-100 transition-all">
                                <button onClick={() => removeItem(item.id)} className="absolute top-2 right-2 p-1.5 bg-white shadow-sm rounded-lg text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-3 h-3" /></button>
                                <div className="space-y-3">
                                   <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-emerald-400 font-bold text-[10px] shadow-sm uppercase">{item.name[0]}</div>
                                   <div>
                                      <p className="text-[10px] font-black text-slate-900 uppercase truncate mb-0.5">{item.name}</p>
                                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{formatIDR(item.price)}</p>
                                   </div>
                                </div>
                             </div>
                          ))}
                       </div>
                     )}
                  </div>
               </div>

               {selectedItems.length >= 2 && (
                  <div className="mt-8 flex justify-end">
                     <Button 
                       onClick={() => setActiveStep(2)}
                       className="h-14 px-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/10 active:scale-95 transition-all"
                     >
                        NEXT: STRATEGY <ArrowRight className="w-4 h-4 ml-1" />
                     </Button>
                  </div>
               )}
            </div>
          </div>
        )}

        {/* Step 2: Optimization Parameters */}
        {activeStep === 2 && (
          <div className="lg:col-span-12 max-w-4xl mx-auto w-full animate-in slide-in-from-right-4 duration-500 pb-10">
             <div className="bg-white p-8 md:p-10 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   <div className="space-y-8">
                      <div className="space-y-2">
                         <h3 className="text-xl font-black text-slate-900 uppercase italic">Market Context</h3>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adjust context as you need</p>
                      </div>

                      <div className="space-y-6">
                         <div className="space-y-3">
                            <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Event Type</Label>
                            <div className="grid grid-cols-2 gap-2">
                               {['NORMAL', 'WEEKEND', 'PAYDAY', 'PROMO 12.12'].map(m => (
                                 <button
                                   key={m}
                                   onClick={() => setMarketMoment(m)}
                                   className={cn(
                                     "py-2.5 rounded-xl border text-[9px] font-black uppercase transition-all tracking-widest",
                                     marketMoment === m ? "bg-slate-900 text-white border-slate-900 shadow-md scale-[1.02]" : "bg-white text-slate-400 border-slate-50 hover:border-slate-200"
                                   )}
                                 >
                                    {m}
                                 </button>
                               ))}
                            </div>
                         </div>

                         <div className="space-y-3">
                            <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Inventory</Label>
                            <div className="flex gap-2">
                               {['STABLE', 'OVERSTOCK', 'NEAR EXPIRY'].map(s => (
                                 <button
                                   key={s}
                                   onClick={() => setInventoryStatus(s)}
                                   className={cn(
                                     "flex-1 py-2.5 rounded-xl border text-[9px] font-black uppercase transition-all tracking-widest",
                                     inventoryStatus === s ? "bg-emerald-500 text-white border-emerald-500 shadow-md scale-[1.02]" : "bg-white text-slate-400 border-slate-50 hover:border-slate-200"
                                   )}
                                 >
                                    {s}
                                 </button>
                               ))}
                            </div>
                         </div>

                         <div className="space-y-3">
                            <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Benchmark Price</Label>
                            <div className="relative">
                               <Input type="number" placeholder="25000" value={competitorPrice} onChange={(e) => setCompetitorPrice(e.target.value)} className="h-12 pl-4 rounded-xl bg-slate-50 border-none font-black text-slate-900" />
                               <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 uppercase tracking-widest">Optional</span>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-8">
                      <div className="space-y-2">
                         <h3 className="text-xl font-black text-slate-900 uppercase italic">Focus Strategy</h3>
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Define your core objective</p>
                      </div>

                      <div className="space-y-4">
                         {[
                           { id: "LOSS_LEADER", icon: Zap, label: t('loss_leader'), desc: "Drive traffic rapidly" },
                           { id: "VOLUME_BOOSTER", icon: TrendingUp, label: t('volume_boost'), desc: "Max transactions" },
                           { id: "PROFIT_MAXIMIZER", icon: Target, label: t('profit_max'), desc: "Max net margin" }
                         ].map(strat => (
                           <button
                             key={strat.id}
                             onClick={() => setBusinessGoal(strat.id)}
                             className={cn(
                               "flex items-center gap-4 p-4 rounded-2xl border transition-all",
                               businessGoal === strat.id 
                                 ? "bg-slate-900 border-slate-900 text-white shadow-xl scale-[1.02]" 
                                 : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                             )}
                           >
                             <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", businessGoal === strat.id ? "bg-emerald-500" : "bg-slate-50")}>
                                <strat.icon className={cn("w-5 h-5", businessGoal === strat.id ? "text-white" : "text-slate-400")} />
                             </div>
                             <div className="text-left flex-1">
                                <span className="text-[10px] font-black uppercase tracking-widest block leading-none">{strat.label}</span>
                                <span className={cn("text-[8px] font-bold uppercase block mt-1", businessGoal === strat.id ? "text-slate-400" : "text-slate-300")}>{strat.desc}</span>
                             </div>
                           </button>
                         ))}
                         
                         <div className="space-y-3 pt-2">
                            <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Target Margin (%)</Label>
                            <Input type="number" value={targetMargin} onChange={(e) => setTargetMargin(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none font-black text-slate-900" />
                         </div>
                      </div>
                   </div>
                </div>

                <div className="mt-12 flex flex-col md:flex-row gap-4">
                   <Button onClick={() => setActiveStep(1)} variant="ghost" className="h-14 px-10 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400">Back</Button>
                   <Button disabled={isConsulting} onClick={handleConsultAI} className="flex-1 h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/10 active:scale-95 transition-all">
                      {isConsulting ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : "GENERATE INTELLIGENCE"}
                   </Button>
                </div>
             </div>
          </div>
        )}

        {/* Step 3: Result Analysis */}
        {activeStep === 3 && suggestion && (
           <div className="lg:col-span-12 max-w-4xl mx-auto w-full animate-in zoom-in-95 duration-500 pb-10">
              <div className="p-10 bg-slate-900 rounded-[2.5rem] text-white space-y-10 shadow-2xl relative overflow-hidden group">
                 <div className="flex flex-col md:flex-row justify-between items-start gap-8 relative z-10">
                    <div className="space-y-4 flex-1">
                       <div className="flex items-center gap-2">
                          <div className="px-3 py-1 bg-emerald-500 text-slate-900 rounded text-[9px] font-black uppercase tracking-widest">{suggestion.strategy}</div>
                          {suggestion.is_fallback && <div className="px-3 py-1 bg-amber-500 rounded text-[9px] font-black uppercase tracking-widest">LOCAL FALLBACK</div>}
                       </div>
                       <div className="space-y-1">
                          <h4 className="text-3xl font-black uppercase italic tracking-tighter text-emerald-400">{suggestion.promo_name}</h4>
                          <p className="text-slate-400 italic text-base leading-snug max-w-lg">"{suggestion.hook}"</p>
                       </div>
                    </div>
                    
                    <div className="md:w-72 p-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                       <p className="text-[9px] font-black text-emerald-500/60 uppercase tracking-widest mb-3">AI REASONING</p>
                       <p className="text-[10px] font-medium text-slate-300 leading-relaxed italic">{suggestion.reasoning}</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative z-10">
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Standard Prices</p>
                       <p className="text-xl font-black text-slate-400 tabular-nums">{formatIDR(totalOriginalPrice)}</p>
                    </div>
                    <div className="p-8 bg-emerald-500 rounded-[2rem] shadow-xl shadow-emerald-500/10">
                       <p className="text-[9px] font-black text-emerald-950/60 uppercase tracking-widest mb-1">BUNDLE PRICE</p>
                       <p className="text-4xl font-black text-slate-950 tracking-tighter tabular-nums">{formatIDR(suggestion.suggested_price)}</p>
                    </div>
                    <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
                       <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">NET PROFIT</p>
                       <p className="text-2xl font-black text-emerald-400 tabular-nums">+{formatIDR(suggestion.estimated_profit)}</p>
                    </div>
                 </div>

                 <div className="pt-8 border-t border-white/10 flex flex-col lg:flex-row gap-8 justify-between items-center relative z-10">
                    <div className="flex gap-12 overflow-x-auto pb-2 scrollbar-hide max-w-full">
                       <div>
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">TOTAL COGS</span>
                          <span className="font-bold text-lg">{formatIDR(totalHpp)}</span>
                       </div>
                       <div>
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">SAVINGS</span>
                          <span className="font-bold text-lg text-rose-400">-{formatIDR(totalOriginalPrice - suggestion.suggested_price)}</span>
                       </div>
                       <div>
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block mb-0.5">STRATEGY</span>
                          <span className="font-bold text-lg uppercase text-emerald-600 tracking-tight">{businessGoal}</span>
                       </div>
                    </div>

                    <div className="flex gap-3 w-full lg:w-auto">
                       <Button onClick={() => setActiveStep(2)} variant="ghost" className="h-14 px-6 rounded-xl text-slate-500 hover:text-white font-black uppercase text-[9px]">Back</Button>
                       <Button onClick={handlePushToPOS} disabled={isSaving} className="flex-1 lg:flex-none h-16 px-10 rounded-2xl bg-white text-slate-900 hover:bg-emerald-50 font-black uppercase text-xs tracking-widest transition-all">
                          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : "PUBLISH BUNDLE"}
                       </Button>
                    </div>
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
