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
import Portal from "@/components/Portal";

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
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative">
              <button 
                onClick={() => setAdjustModal({ open: false, quantity: "", reason: "", ingredient: null })}
                className="absolute right-4 top-4 p-1 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
              
              <div className="mb-6">
                <h3 className="text-xl font-bold text-slate-800">Adjust Stock</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Adjusting <span className="text-slate-900 font-bold">{adjustModal.ingredient?.item_name}</span>
                </p>
                <div className="mt-2 text-[11px] font-semibold text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded">
                  Current: {Number(adjustModal.ingredient?.stock || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 })} {adjustModal.ingredient?.unit}
                </div>
              </div>

              <form onSubmit={handleAdjustSubmit} className="space-y-4">
                 <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 ml-1">Adjustment Quantity</label>
                    <div className="relative group">
                       <Input 
                         autoFocus
                         type="number" 
                         placeholder="e.g. -10 or 5" 
                         value={adjustModal.quantity}
                         onChange={(e) => setAdjustModal({...adjustModal, quantity: e.target.value })}
                         className="h-11 bg-slate-50 border-slate-100 rounded-xl font-bold text-slate-900 focus:bg-white transition-all shadow-sm"
                       />
                       <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-300 uppercase">{adjustModal.ingredient?.unit}</div>
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 ml-1">Reason / Note</label>
                    <Input 
                      placeholder="e.g. Physical count update" 
                      value={adjustModal.reason}
                      onChange={(e) => setAdjustModal({...adjustModal, reason: e.target.value })}
                      className="h-11 bg-slate-50 border-slate-100 rounded-xl text-sm font-medium text-slate-900 focus:bg-white transition-all shadow-sm"
                    />
                 </div>
                 <div className="pt-2">
                   <Button type="submit" disabled={isRefreshing} className="w-full h-11 rounded-xl bg-slate-900 hover:bg-black font-bold text-white shadow-sm transition-all active:scale-95">
                     {isRefreshing ? "Applying..." : "Save Adjustment"}
                   </Button>
                 </div>
              </form>
            </div>
           </div>
        </Portal>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Inventory Levels</h2>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={cn("h-1.5 w-1.5 rounded-full", isRefreshing ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
            <p className="text-xs text-slate-500 font-medium">
              {isRefreshing ? "Syncing..." : `Current stocks as of ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Link href="/stock/movements" className="flex-1 md:flex-none">
             <Button variant="ghost" className="w-full rounded-xl h-10 px-4 font-semibold text-xs text-slate-500 hover:text-slate-900 border border-slate-100 hover:bg-white transition-all">
                <History className="w-3.5 h-3.5 mr-2" /> History
             </Button>
           </Link>
           <Link href="/purchase" className="flex-1 md:flex-none">
             <Button className="w-full bg-slate-900 hover:bg-black text-white shadow-sm rounded-xl h-10 px-6 font-semibold text-xs transition-all active:scale-95">
                <Plus className="w-3.5 h-3.5 mr-2" /> Add Stock
             </Button>
           </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
        <div className="bg-white p-4 md:p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
           <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-3 md:gap-5">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-50 flex items-center justify-center rounded-xl border border-slate-50">
                <Package className="w-5 h-5 md:w-6 md:h-6 text-slate-700" />
              </div>
              <div>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Items</p>
                 <div className="text-xl md:text-2xl font-bold text-slate-900 tabular-nums">{ingredients.length}</div>
              </div>
           </div>
        </div>
        <div className={cn("p-4 md:p-6 rounded-2xl transition-all duration-300 shadow-sm border", lowStockCount > 0 ? "bg-rose-50 border-rose-100 text-rose-900" : "bg-white border-slate-100")}>
           <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-3 md:gap-5">
              <div className={cn("w-10 h-10 md:w-12 md:h-12 flex items-center justify-center rounded-xl", lowStockCount > 0 ? "bg-white/50 border border-rose-100" : "bg-slate-50 border border-slate-50")}>
                <AlertTriangle className={cn("w-5 h-5 md:w-6 md:h-6", lowStockCount > 0 ? "text-rose-500" : "text-slate-300")} />
              </div>
              <div>
                 <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-0.5", lowStockCount > 0 ? "text-rose-500" : "text-slate-400")}>Low Stock</p>
                 <div className="text-xl md:text-2xl font-bold tabular-nums">{lowStockCount}</div>
              </div>
           </div>
        </div>
        <div className="bg-emerald-900 p-4 md:p-6 rounded-2xl shadow-sm relative overflow-hidden text-white col-span-2 md:col-span-1">
           <div className="relative z-10 flex items-center gap-4 md:gap-5">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 flex items-center justify-center rounded-xl border border-white/10">
                <Activity className="w-5 h-5 md:w-6 md:h-6 text-emerald-400" />
              </div>
              <div>
                 <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-0.5">Inventory Value</p>
                 <div className="text-lg md:text-2xl font-bold text-white tabular-nums tracking-tight">
                    {formatIDR(ingredients.reduce((acc, curr) => acc + (curr.stock * curr.cost_per_unit), 0))}
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Header & Controls */}
      {!adjustModal.open && (
        <div className="bg-white p-2 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <Input 
              placeholder="Search inventory items..." 
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
              className="pl-11 h-11 bg-slate-50/50 border-none rounded-xl text-sm font-medium focus-visible:ring-emerald-500/10 placeholder:text-slate-400 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto no-scrollbar scroll-smooth">
            <select 
              className="h-11 bg-slate-50/50 border-none rounded-xl px-4 text-sm font-medium text-slate-600 outline-none min-w-[140px] focus:ring-2 focus:ring-emerald-500/10 cursor-pointer appearance-none"
              value={filters.category}
              onChange={(e) => setFilters({...filters, category: e.target.value})}
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <button 
              onClick={() => setFilters({...filters, low_stock: !filters.low_stock})}
              className={cn(
                "h-11 flex items-center gap-3 px-5 rounded-xl transition-all border whitespace-nowrap active:scale-95",
                filters.low_stock 
                  ? "bg-rose-50 border-rose-100 text-rose-600 shadow-sm" 
                  : "bg-slate-50/50 border-transparent text-slate-500 hover:border-slate-200"
              )}
            >
              <div className={cn("w-8 h-4 rounded-full relative transition-colors", filters.low_stock ? "bg-rose-500" : "bg-slate-200")}>
                <div className={cn("absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all shadow-sm", filters.low_stock ? "left-4.5" : "left-0.5")}></div>
              </div>
              <span className="text-xs font-bold">Low Stock</span>
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-700">
        <ResponsiveDataView
          loading={loading}
          data={ingredients}
          emptyMessage="No items found"
          columns={[
            {
              header: "Item Details",
              accessor: (ing) => (
                <div className="flex flex-col py-1">
                  <span className="font-bold text-slate-800 leading-tight text-sm">
                    {ing.item_name}
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-bold uppercase">
                      {ing.category}
                    </span>
                    <span className="text-[9px] font-medium text-slate-400 uppercase">{ing.brand || "Generic"}</span>
                  </div>
                </div>
              ),
              className: "pl-8"
            },
            {
              header: "Current Stock",
              accessor: (ing) => {
                const isLow = ing.stock < ing.minimum_stock;
                return (
                  <div className="flex flex-col">
                    <div className={cn(
                      "text-lg font-bold tabular-nums",
                      isLow ? "text-rose-600" : "text-emerald-600"
                    )}>
                      {Number(ing.stock).toLocaleString("id-ID", { maximumFractionDigits: 2 })} <span className="text-[10px] font-medium text-slate-400 ml-0.5 uppercase">{ing.unit}</span>
                    </div>
                    {isLow && (
                      <div className="flex items-center gap-1 text-rose-400 text-[9px] font-bold uppercase mt-0.5">
                         <AlertTriangle className="w-3 h-3" /> Min: {ing.minimum_stock}
                      </div>
                    )}
                  </div>
                );
              },
              align: "right"
            },
            {
              header: "WAC / Unit",
              accessor: (ing) => (
                <div className="flex flex-col items-end">
                   <div className="font-semibold text-slate-500 text-sm tabular-nums">
                      {formatIDR(ing.cost_per_unit)}
                   </div>
                   <div className="text-[9px] text-slate-400 font-medium uppercase mt-0.5">per {ing.unit}</div>
                </div>
              ),
              align: "right"
            },
            {
              header: "Value",
              accessor: (ing) => (
                <div className="font-bold text-slate-800 text-base tabular-nums">
                   {formatIDR(ing.stock * ing.cost_per_unit)}
                </div>
              ),
              align: "right"
            },
            {
              header: "Actions",
              accessor: (ing) => (
                <div className="flex items-center justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    onClick={(e) => { e.stopPropagation(); setAdjustModal({ open: true, ingredient: ing, quantity: "", reason: "" }); }}
                    className="h-9 px-4 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-lg text-xs font-bold"
                  >
                    Adjust
                  </Button>
                  
                  <Link href={`/purchase?ingredient_id=${ing.id}`} onClick={(e) => e.stopPropagation()}>
                    <Button 
                      className="h-9 px-5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95"
                    >
                      Buy More
                    </Button>
                  </Link>
                </div>
              ),
              className: "pr-8",
              align: "right"
            }
          ]}
          renderCard={(ing) => {
            const isLow = ing.stock < ing.minimum_stock;
            return (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                       <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-bold uppercase">{ing.category}</span>
                       <span className="text-[9px] font-medium text-slate-400 uppercase">{ing.brand || "Generic"}</span>
                    </div>
                    <p className="font-bold text-slate-800 text-base">{ing.item_name}</p>
                  </div>
                  {isLow && (
                    <div className="px-2 py-1 bg-rose-50 text-rose-600 rounded-md flex items-center gap-1.5 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-bold uppercase">Low Stock</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Current Stock</p>
                    <div className={cn("text-xl font-bold tabular-nums", isLow ? "text-rose-600" : "text-emerald-600")}>
                      {Number(ing.stock).toLocaleString("id-ID", { maximumFractionDigits: 2 })} <span className="text-[10px] font-medium text-slate-400 ml-0.5 uppercase">{ing.unit}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Asset Value</p>
                    <p className="font-bold text-slate-800 text-lg tabular-nums tracking-tight">{formatIDR(ing.stock * ing.cost_per_unit)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-50">
                   <Button 
                     variant="ghost" 
                     className="flex-1 h-10 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg text-xs font-bold" 
                     onClick={(e) => { e.stopPropagation(); setAdjustModal({ open: true, ingredient: ing, quantity: "", reason: "" }); }}
                   >
                     <Settings2 className="w-3.5 h-3.5 mr-2" /> Adjust
                   </Button>
                   <Link href={`/purchase?ingredient_id=${ing.id}`} className="flex-1" onClick={(e) => e.stopPropagation()}>
                    <Button className="w-full h-10 bg-slate-900 text-white rounded-lg text-xs font-bold">Buy More</Button>
                   </Link>
                </div>
              </div>
            );
          }}
        />
      </div>

      <div className="flex justify-between items-center text-[10px] font-bold text-slate-300 uppercase tracking-widest px-4">
        <p>Bakmi You Tje POS System</p>
        <p className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Operational Ready
        </p>
      </div>
    </div>
  );
}
