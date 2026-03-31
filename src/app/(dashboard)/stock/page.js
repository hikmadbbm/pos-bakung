"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Layers, Search, Filter, AlertTriangle, 
  Package, RefreshCw, History, Plus, Minus,
  Activity, Tag, MoreHorizontal, ArrowRight,
  Calculator, Clock, DollarSign, Settings2, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ResponsiveDataView } from "@/components/ResponsiveDataView";

export default function StockPage() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [adjustModal, setAdjustModal] = useState({ open: false, ingredient: null, quantity: "", reason: "" });
  const [filters, setFilters] = useState({
    category: "",
    search: "",
    low_stock: false
  });

  const { success, error } = useToast();

  const loadStock = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setIsRefreshing(true);
    
    try {
      const query = new URLSearchParams({
        ...filters,
        low_stock: filters.low_stock.toString()
      }).toString();
      const data = await api.get(`/stock?${query}`);
      setIngredients(data);
    } catch (e) {
      console.error(e);
      error("Failed to load inventory levels");
    } finally {
      if (isInitial) setLoading(false);
      else setIsRefreshing(false);
    }
  }, [filters, error]);

  useEffect(() => {
    loadStock(ingredients.length === 0);
  }, [filters, loadStock, ingredients.length]);

  const categories = [...new Set(ingredients.map(i => i.category))];
  const lowStockCount = ingredients.filter(i => i.stock < i.minimum_stock).length;

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustModal.quantity || isNaN(adjustModal.quantity)) {
      error("Please enter a valid quantity amount");
      return;
    }
    
    setIsRefreshing(true);
    try {
      await api.post(`/stock/adjust`, { 
        ingredient_id: adjustModal.ingredient.id, 
        quantity: Number(adjustModal.quantity),
        notes: adjustModal.reason || "Manual adjustment"
      });
      success("Stock adjusted successfully");
      loadStock(false);
      setAdjustModal({ open: false, ingredient: null, quantity: "", reason: "" });
    } catch (e) {
      error("Failed to adjust stock");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20 px-4 md:px-0">
      {/* Adjust Stock Modal */}
      {adjustModal.open && (
         <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200 relative">
            <Button variant="ghost" size="icon" className="absolute right-4 top-4 rounded-full" onClick={() => setAdjustModal({ open: false, quantity: "", reason: "", ingredient: null })}>
              <X className="w-5 h-5 text-slate-400" />
            </Button>
            <div className="w-16 h-16 bg-slate-50 rounded-[1.25rem] flex items-center justify-center mb-6">
              <Settings2 className="w-8 h-8 text-slate-900" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight mb-2">Adjust Stock</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">
              Current <span className="text-slate-900">{adjustModal.ingredient?.item_name}</span> stock: <span className="text-emerald-600">{Number(adjustModal.ingredient?.stock || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 })} {adjustModal.ingredient?.unit}</span>
            </p>
            <form onSubmit={handleAdjustSubmit} className="space-y-6">
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adjustment Delta (Positive or Negative)</label>
                  <div className="relative group">
                     <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase tracking-widest">{adjustModal.ingredient?.unit}</div>
                     <Input 
                       autoFocus
                       type="number" 
                       placeholder="e.g. -500 or 10" 
                       value={adjustModal.quantity}
                       onChange={(e) => setAdjustModal({...adjustModal, quantity: e.target.value })}
                       className="pl-16 h-14 bg-slate-50 border-slate-100 rounded-2xl font-black text-slate-900 font-mono shadow-inner focus:bg-white transition-all"
                     />
                  </div>
               </div>
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Reason / Notes</label>
                  <Input 
                    placeholder="e.g. Spilled, Expired, Physical Count" 
                    value={adjustModal.reason}
                    onChange={(e) => setAdjustModal({...adjustModal, reason: e.target.value })}
                    className="h-14 bg-slate-50 border-slate-100 rounded-2xl font-black text-slate-900 text-xs shadow-inner focus:bg-white transition-all"
                  />
               </div>
               <div className="pt-2">
                 <Button type="submit" disabled={isRefreshing} className="w-full h-14 rounded-xl bg-slate-900 hover:bg-black font-black uppercase text-[10px] tracking-widest text-white border-none shadow-xl shadow-slate-200 transition-all active:scale-95">
                   {isRefreshing ? "Applying..." : "Apply Adjustment"}
                 </Button>
               </div>
            </form>
          </div>
         </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Stock Inventory</h2>
          <div className="flex items-center gap-2.5 mt-2">
            <span className={cn("flex h-2 w-2 rounded-full", isRefreshing ? "bg-amber-500 animate-pulse" : "bg-emerald-500 animate-pulse")}></span>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
              {isRefreshing ? "Syncing..." : `Updated: ${new Date().toLocaleTimeString()}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
           <Link href="/stock/movements" className="flex-1 md:flex-none">
             <Button variant="ghost" className="w-full rounded-2xl h-14 px-8 font-black text-[10px] uppercase tracking-widest text-slate-500 hover:text-slate-900 border border-transparent hover:border-slate-100 hover:bg-white transition-all">
                <History className="w-4 h-4 mr-3" /> History
             </Button>
           </Link>
           <Link href="/purchase" className="flex-1 md:flex-none">
             <Button className="w-full bg-slate-900 hover:bg-black text-white shadow-2xl shadow-slate-200 rounded-2xl h-14 px-10 font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all">
                <Plus className="w-4 h-4 mr-3" /> Add Stock
             </Button>
           </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
             <Package className="w-24 h-24 text-slate-900" />
           </div>
           <div className="relative z-10 flex items-center gap-6">
              <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-[1.5rem] border border-slate-100 shadow-inner">
                <Package className="w-8 h-8 text-slate-900" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Items</p>
                 <div className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">{ingredients.length}</div>
              </div>
           </div>
        </div>
        <div className={cn("p-8 rounded-[2.5rem] relative overflow-hidden group transition-all duration-500", lowStockCount > 0 ? "bg-rose-900 text-white shadow-2xl shadow-rose-200" : "bg-white border border-slate-100 shadow-xl shadow-slate-200/50")}>
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
             <AlertTriangle className="w-24 h-24 text-white" />
           </div>
           <div className="relative z-10 flex items-center gap-6">
              <div className={cn("w-16 h-16 flex items-center justify-center rounded-[1.5rem] shadow-inner", lowStockCount > 0 ? "bg-white/10 border border-white/10" : "bg-slate-50 border border-slate-100")}>
                <AlertTriangle className={cn("w-8 h-8", lowStockCount > 0 ? "text-rose-400" : "text-slate-300")} />
              </div>
              <div>
                 <p className={cn("text-[10px] font-black uppercase tracking-[0.3em] mb-2", lowStockCount > 0 ? "text-rose-300" : "text-slate-400")}>Low Stock Items</p>
                 <div className="text-4xl font-black tracking-tighter tabular-nums">{lowStockCount}</div>
              </div>
           </div>
        </div>
        <div className="bg-emerald-900 p-8 rounded-[2.5rem] shadow-2xl shadow-emerald-200 relative overflow-hidden group text-white">
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
             <Activity className="w-24 h-24 text-white" />
           </div>
           <div className="relative z-10 flex items-center gap-6">
              <div className="w-16 h-16 bg-white/10 flex items-center justify-center rounded-[1.5rem] border border-white/10 shadow-inner">
                <Activity className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                 <p className="text-[10px] font-black text-emerald-300 uppercase tracking-[0.3em] mb-2">Total Value</p>
                 <div className="text-4xl font-black text-white tracking-tighter tabular-nums text-2xl md:text-4xl">
                    {formatIDR(ingredients.reduce((acc, curr) => acc + (curr.stock * curr.cost_per_unit), 0))}
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Modern Controls Section */}
      <div className="glass-card p-4 rounded-[2rem] border-none shadow-2xl bg-white/50 backdrop-blur-xl flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
          <Input 
            placeholder="Search items..." 
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="pl-14 h-14 bg-white/80 border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest focus-visible:ring-emerald-500 focus-visible:bg-white transition-all shadow-sm"
          />
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar pb-2 md:pb-0">
          <select 
            className="h-14 bg-white/80 border border-slate-100 rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none min-w-[150px] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all cursor-pointer shadow-sm"
            value={filters.category}
            onChange={(e) => setFilters({...filters, category: e.target.value})}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button 
            onClick={() => setFilters({...filters, low_stock: !filters.low_stock})}
            className={cn(
              "h-14 flex items-center gap-4 px-8 rounded-2xl transition-all border whitespace-nowrap active:scale-95",
              filters.low_stock 
                ? "bg-rose-900 border-rose-900 text-white shadow-2xl shadow-rose-200" 
                : "bg-white border-slate-100 text-slate-500 hover:border-emerald-200 hover:text-emerald-600 shadow-sm"
            )}
          >
            <div className={cn("w-10 h-5 rounded-full relative transition-colors", filters.low_stock ? "bg-rose-500" : "bg-slate-100")}>
              <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all shadow-sm", filters.low_stock ? "left-6" : "left-1")}></div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Low Stock</span>
          </button>
        </div>
      </div>

      <div className="glass-card rounded-[2.5rem] shadow-2xl border-none p-0 overflow-hidden relative animate-in fade-in duration-700">
        <ResponsiveDataView
          loading={loading}
          data={ingredients}
          emptyMessage="No items found"
          columns={[
            {
              header: "Item Name",
              accessor: (ing) => (
                <div className="flex flex-col py-2">
                  <span className="font-black text-slate-900 leading-tight group-hover:text-emerald-600 transition-colors uppercase tracking-tight text-base truncate max-w-[200px]">
                    {ing.item_name}
                  </span>
                  <span className="mt-2 inline-flex w-fit items-center px-3 py-1 rounded-full text-[9px] font-black bg-slate-100 text-slate-500 uppercase tracking-widest border border-slate-200/50">
                    {ing.category}
                  </span>
                </div>
              ),
              className: "pl-10"
            },
            {
              header: "Brand",
              accessor: (ing) => (
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  {ing.brand || "GENERIC"}
                </span>
              )
            },
            {
              header: "Stock",
              accessor: (ing) => {
                const isLow = ing.stock < ing.minimum_stock;
                return (
                  <div className="flex flex-col">
                    <div className={cn(
                      "text-2xl font-black tracking-tighter tabular-nums",
                      isLow ? "text-rose-600" : "text-emerald-700"
                    )}>
                      {Number(ing.stock).toLocaleString("id-ID", { maximumFractionDigits: 2 })} <span className="text-xs font-black uppercase text-slate-300 ml-1">{ing.unit}</span>
                    </div>
                    {isLow && (
                      <div className="flex items-center gap-2 text-rose-400 mt-1.5 animate-pulse">
                         <AlertTriangle className="w-3.5 h-3.5" />
                         <span className="text-[9px] font-black uppercase tracking-widest">Low: {ing.minimum_stock}</span>
                      </div>
                    )}
                  </div>
                );
              }
            },
            {
              header: "Price/Unit",
              accessor: (ing) => (
                <div className="flex flex-col">
                   <div className="font-bold text-slate-500 text-sm tabular-nums flex items-center gap-1">
                      {formatIDR(ing.cost_per_unit)}
                      <span className="text-[9px] text-slate-300 font-black uppercase ml-1 opacity-60">/{ing.unit}</span>
                   </div>
                </div>
              )
            },
            {
              header: "Value",
              accessor: (ing) => (
                <div className="font-black text-slate-900 text-xl tracking-tighter tabular-nums">
                   {formatIDR(ing.stock * ing.cost_per_unit)}
                </div>
              )
            },
            {
              header: "Actions",
              accessor: (ing) => (
                <div className="flex items-center justify-center gap-4">
                  <Button 
                    variant="ghost" 
                    onClick={(e) => { e.stopPropagation(); setAdjustModal({ open: true, ingredient: ing, quantity: "", reason: "" }); }}
                    className="h-12 px-6 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest border border-slate-200/50 transition-all shadow-sm whitespace-nowrap"
                  >
                    <Settings2 className="w-4 h-4 mr-2 opacity-50" /> Adjust
                  </Button>
                  
                  <Link href={`/purchase?ingredient_id=${ing.id}`} onClick={(e) => e.stopPropagation()}>
                    <Button 
                      className="h-12 px-8 bg-slate-900 hover:bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-slate-200 transition-all active:scale-95 whitespace-nowrap"
                    >
                      Buy More
                    </Button>
                  </Link>
                </div>
              ),
              className: "pr-10"
            }
          ]}
          renderCard={(ing) => {
            const isLow = ing.stock < ing.minimum_stock;
            return (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-black text-slate-900 leading-tight uppercase tracking-tight text-lg">{ing.item_name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{ing.category} • {ing.brand || "Generic"}</p>
                  </div>
                  {isLow && (
                    <div className="p-2 bg-rose-50 text-rose-600 rounded-xl animate-pulse">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-end border-t border-slate-50 pt-4">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Stock Level</p>
                    <div className={cn("text-2xl font-black tracking-tighter tabular-nums", isLow ? "text-rose-600" : "text-emerald-700")}>
                      {Number(ing.stock).toLocaleString("id-ID", { maximumFractionDigits: 2 })} <span className="text-[9px] font-black uppercase text-slate-300 ml-1">{ing.unit}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Value</p>
                    <p className="font-black text-slate-900 text-lg tabular-nums tracking-tighter">{formatIDR(ing.stock * ing.cost_per_unit)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-50">
                   <Button 
                     variant="ghost" 
                     className="flex-[2] h-12 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase border font-slate-200 shadow-sm" 
                     onClick={(e) => { e.stopPropagation(); setAdjustModal({ open: true, ingredient: ing, quantity: "", reason: "" }); }}
                   >
                     <Settings2 className="w-4 h-4 mr-2" /> Adjust
                   </Button>
                   <Link href={`/purchase?ingredient_id=${ing.id}`} className="flex-1" onClick={(e) => e.stopPropagation()}>
                    <Button className="w-full h-12 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase">Buy More</Button>
                   </Link>
                </div>
              </div>
            );
          }}
        />
      </div>

      <div className="flex justify-between items-center text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] px-4">
        <p>Bakmi You Tje POS</p>
        <p className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500" /> High Performance View
        </p>
      </div>
    </div>
  );
}
