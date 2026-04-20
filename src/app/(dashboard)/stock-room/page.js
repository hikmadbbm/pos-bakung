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
import { useTranslation } from "@/lib/language-context";

export default function StockPage() {
  const { t } = useTranslation();
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [adjustModal, setAdjustModal] = useState({ open: false, ingredient: null, quantity: "", reason: "" });
  const [filters, setFilters] = useState({
    category: "",
    search: "",
    low_stock: false
  });
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
      error(t('stock_room.load_fail'));
    } finally {
      if (isInitial) setLoading(false);
      else setIsRefreshing(false);
    }
  }, [filters, error, t]);

  useEffect(() => {
    loadStock(ingredients.length === 0);
  }, [filters, loadStock, ingredients.length]);

  const categories = [...new Set(ingredients.map(i => i.category))];
  const lowStockCount = ingredients.filter(i => i.stock < i.minimum_stock).length;

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustModal.quantity || isNaN(adjustModal.quantity)) {
      error(t('stock_room.invalid_qty'));
      return;
    }
    
    setIsRefreshing(true);
    try {
      await api.post(`/stock/adjust`, { 
        ingredient_id: adjustModal.ingredient.id, 
        quantity: Number(adjustModal.quantity),
        notes: adjustModal.reason || "Manual adjustment"
      });
      success(t('stock_room.adjust_success'));
      loadStock(false);
      setAdjustModal({ open: false, ingredient: null, quantity: "", reason: "" });
    } catch (e) {
      error(t('stock_room.adjust_fail'));
    } finally {
      setIsRefreshing(false);
    }
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  const totalPages = Math.ceil(ingredients.length / pageSize);
  const paginatedData = ingredients.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
                <h3 className="text-xl font-bold text-slate-800">{t('stock_room.adjust_stock')}</h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {t('stock_room.adjusting')} <span className="text-slate-900 font-bold">{adjustModal.ingredient?.item_name}</span>
                </p>
                <div className="mt-2 text-[11px] font-semibold text-emerald-600 bg-emerald-50 w-fit px-2 py-0.5 rounded">
                  {t('stock_room.current')}: {Number(adjustModal.ingredient?.stock || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 })} {adjustModal.ingredient?.unit}
                </div>
              </div>

              <form onSubmit={handleAdjustSubmit} className="space-y-4">
                 <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-600 ml-1">{t('stock_room.adjustment_qty')}</label>
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
                    <label className="text-xs font-semibold text-slate-600 ml-1">{t('stock_room.reason_note')}</label>
                    <Input 
                      placeholder={t('stock_room.reason_placeholder')}
                      value={adjustModal.reason}
                      onChange={(e) => setAdjustModal({...adjustModal, reason: e.target.value })}
                      className="h-11 bg-slate-50 border-slate-100 rounded-xl text-sm font-medium text-slate-900 focus:bg-white transition-all shadow-sm"
                    />
                 </div>
                 <div className="pt-2">
                   <Button type="submit" disabled={isRefreshing} className="w-full h-11 rounded-xl bg-slate-900 hover:bg-black font-bold text-white shadow-sm transition-all active:scale-95">
                     {isRefreshing ? t('stock_room.applying') : t('stock_room.save_adjustment')}
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
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{t('stock_room.title')}</h2>
          <div className="flex items-center gap-1.5 mt-1">
            <span className={cn("h-1.5 w-1.5 rounded-full", isRefreshing ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
            <p className="text-xs text-slate-500 font-medium">
              {isRefreshing ? t('stock_room.syncing') : `${t('common.captured')} ${t('common.as_of')} ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Link href="/stock-room/movements" className="flex-1 md:flex-none">
             <Button variant="ghost" className="w-full rounded-xl h-10 px-4 font-semibold text-xs text-slate-500 hover:text-slate-900 border border-slate-100 hover:bg-white transition-all">
                <History className="w-3.5 h-3.5 mr-2" /> {t('stock_room.history')}
             </Button>
           </Link>
           <Link href="/add-stock" className="flex-1 md:flex-none">
             <Button className="w-full bg-slate-900 hover:bg-black text-white shadow-sm rounded-xl h-10 px-6 font-semibold text-xs transition-all active:scale-95">
                <Plus className="w-3.5 h-3.5 mr-2" /> {t('stock_room.add_stock')}
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
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('stock_room.total_items')}</p>
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
                 <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-0.5", lowStockCount > 0 ? "text-rose-500" : "text-slate-400")}>{t('stock_room.low_stock')}</p>
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
                 <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider mb-0.5">{t('stock_room.inventory_value')}</p>
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
              placeholder={t('stock_room.search_placeholder')} 
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
              <option value="">{t('stock_room.all_categories')}</option>
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
              <span className="text-xs font-bold">{t('stock_room.low_stock')}</span>
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-700">
        <ResponsiveDataView
          loading={loading}
          data={paginatedData.map(ing => ({ ...ing, asset_value: ing.stock * ing.cost_per_unit }))}
          emptyMessage={t('stock_room.no_items')}
          columns={[
            {
              header: t('stock_room.item_details'),
              accessor: (ing) => (
                <div className="flex flex-col py-1">
                  <span className="font-bold text-slate-800 leading-tight text-sm">
                    {ing.item_name}
                  </span>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <span className="w-fit px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-bold uppercase">
                      {ing.category}
                    </span>
                    <span className="text-[9px] font-medium text-slate-400 uppercase pl-0.5">{ing.brand || "Generic"}</span>
                  </div>
                </div>
              ),
              sortKey: "item_name",
              className: "pl-8"
            },
            {
              header: t('stock_room.current_stock'),
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
                         <AlertTriangle className="w-3 h-3" /> {t('stock_room.min')}: {ing.minimum_stock}
                      </div>
                    )}
                  </div>
                );
              },
              sortKey: "stock",
              align: "right"
            },
            {
              header: t('stock_room.wac_unit'),
              accessor: (ing) => (
                <div className="flex flex-col items-end">
                   <div className="font-semibold text-slate-500 text-sm tabular-nums">
                      {formatIDR(ing.cost_per_unit)}
                   </div>
                   <div className="text-[9px] text-slate-400 font-medium uppercase mt-0.5">{t('common.per')} {ing.unit}</div>
                </div>
              ),
              sortKey: "cost_per_unit",
              align: "right"
            },
            {
              header: t('stock_room.asset_value'),
              accessor: (ing) => (
                <div className="font-bold text-slate-800 text-base tabular-nums">
                   {formatIDR(ing.asset_value)}
                </div>
              ),
              sortKey: "asset_value",
              align: "right"
            },
            {
              header: t('common.actions'),
              sortable: false,
              accessor: (ing) => (
                <div className="flex items-center justify-end gap-2">
                  <Button 
                    variant="ghost" 
                    onClick={(e) => { e.stopPropagation(); setAdjustModal({ open: true, ingredient: ing, quantity: "", reason: "" }); }}
                    className="h-9 px-4 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-800 rounded-lg text-xs font-bold"
                  >
                    {t('stock_room.adjust')}
                  </Button>
                  
                  <Link href={`/add-stock?ingredient_id=${ing.id}`} onClick={(e) => e.stopPropagation()}>
                    <Button 
                      className="h-9 px-5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95"
                    >
                      {t('stock_room.buy_more')}
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
                    <div className="mb-1.5">
                       <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-bold uppercase inline-block mb-1">{ing.category}</span>
                       <p className="font-bold text-slate-800 text-base leading-tight">{ing.item_name}</p>
                       <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 ml-0.5">{ing.brand || "Generic"}</p>
                    </div>
                  </div>
                  {isLow && (
                    <div className="px-2 py-1 bg-rose-50 text-rose-600 rounded-md flex items-center gap-1.5 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span className="text-[9px] font-bold uppercase">{t('stock_room.low_stock')}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t('stock_room.current_stock')}</p>
                    <div className={cn("text-xl font-bold tabular-nums", isLow ? "text-rose-600" : "text-emerald-600")}>
                      {Number(ing.stock).toLocaleString("id-ID", { maximumFractionDigits: 2 })} <span className="text-[10px] font-medium text-slate-400 ml-0.5 uppercase">{ing.unit}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t('stock_room.asset_value')}</p>
                    <p className="font-bold text-slate-800 text-lg tabular-nums tracking-tight">{formatIDR(ing.stock * ing.cost_per_unit)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-50">
                   <Button 
                     variant="ghost" 
                     className="flex-1 h-10 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-lg text-xs font-bold" 
                     onClick={(e) => { e.stopPropagation(); setAdjustModal({ open: true, ingredient: ing, quantity: "", reason: "" }); }}
                   >
                     <Settings2 className="w-3.5 h-3.5 mr-2" /> {t('stock_room.adjust')}
                   </Button>
                   <Link href={`/add-stock?ingredient_id=${ing.id}`} className="flex-1" onClick={(e) => e.stopPropagation()}>
                    <Button className="w-full h-10 bg-slate-900 text-white rounded-lg text-xs font-bold">{t('stock_room.buy_more')}</Button>
                   </Link>
                </div>
              </div>
            );
          }}
        />

        {/* Pagination Controls */}
        {ingredients.length > 0 && (
          <div className="p-6 md:p-8 bg-slate-50/30 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
               <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                 {t('common.page')} <span className="text-slate-900">{currentPage}</span> {t('common.of')} <span className="text-slate-900">{totalPages || 1}</span>
                 <span className="mx-3 text-slate-200">|</span> 
                 {t('common.showing')}
               </div>
               <select 
                 className="bg-slate-100 md:bg-transparent border-none text-[10px] font-black uppercase text-slate-600 focus:ring-0 outline-none cursor-pointer py-1.5 px-3 rounded-lg"
                 value={pageSize}
                 onChange={(e) => {
                   setPageSize(Number(e.target.value));
                   setCurrentPage(1);
                 }}
               >
                 <option value={10}>10 {t('common.items')}</option>
                 <option value={50}>50 {t('common.items')}</option>
                 <option value={100}>100 {t('common.items')}</option>
               </select>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-end">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 px-4 rounded-xl border-slate-100 font-black text-[9px] uppercase tracking-widest disabled:opacity-30"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  {t('common.previous')}
                </Button>
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                       pageNum = Math.min(currentPage - 2 + i, totalPages - 4 + i);
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          "w-9 h-9 rounded-xl text-[10px] font-black transition-all",
                          currentPage === pageNum ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:bg-slate-50"
                        )}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-9 px-4 rounded-xl border-slate-100 font-black text-[9px] uppercase tracking-widest disabled:opacity-30"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  {t('common.next')}
                </Button>
              </div>
            )}
          </div>
        )}
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
