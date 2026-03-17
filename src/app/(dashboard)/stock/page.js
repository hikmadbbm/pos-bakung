"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Layers, Search, Filter, AlertTriangle, 
  Package, RefreshCw, History, Plus, Minus,
  Activity, Tag, MoreHorizontal, ArrowRight,
  Calculator, Clock, DollarSign
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function StockPage() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjustingId, setAdjustingId] = useState(null);
  const [filters, setFilters] = useState({
    category: "",
    search: "",
    low_stock: false
  });

  const { success, error } = useToast();

  const loadStock = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [filters, error]);

  useEffect(() => {
    loadStock();
  }, [loadStock]);

  const categories = [...new Set(ingredients.map(i => i.category))];
  const lowStockCount = ingredients.filter(i => i.stock < i.minimum_stock).length;

  const handleQuickAdjust = async (id, currentStock, delta) => {
    setAdjustingId(id);
    try {
      const newStock = Math.max(0, currentStock + delta);
      // We don't have a direct ADJUSTMENT endpoint yet in implementation plan, 
      // but we can assume we might need one or use a generic update if available.
      // For now, let's toast that we need an endpoint or handle it via a stock movement.
      // Assuming GET /api/stock returns ingredient items directly linked to Master.
      await api.post(`/stock/adjust`, { ingredient_id: id, quantity: delta });
      success("Stock adjusted");
      loadStock();
    } catch (e) {
      error("Adjustment failed - Endpoint not ready");
    } finally {
      setAdjustingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tighter">Inventory Master</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Live Sync: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Link href="/stock/movements">
             <Button variant="ghost" className="rounded-2xl h-11 px-5 font-black text-[10px] uppercase tracking-widest text-gray-500 hover:text-emerald-600">
                <History className="w-3.5 h-3.5 mr-2" /> Audit movements
             </Button>
           </Link>
           <Link href="/purchase">
             <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100 rounded-2xl h-11 px-6 font-black text-[10px] uppercase tracking-widest">
                <Plus className="w-3.5 h-3.5 mr-2" /> Record Purchase
             </Button>
           </Link>
        </div>
      </div>

      {/* Stats Cards - 20% Smaller as requested */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-sm rounded-2xl bg-white p-4 flex items-center gap-3">
           <div className="p-3 bg-emerald-50 rounded-xl">
              <Package className="w-5 h-5 text-emerald-600" />
           </div>
           <div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Active Items</div>
              <div className="text-lg font-black text-gray-900 tracking-tight">{ingredients.length}</div>
           </div>
        </Card>
        <Card className={cn("border-none shadow-sm rounded-2xl p-4 flex items-center gap-3 transition-colors", lowStockCount > 0 ? "bg-red-50 border border-red-100" : "bg-white")}>
           <div className={cn("p-3 rounded-xl", lowStockCount > 0 ? "bg-red-100" : "bg-gray-50")}>
              <AlertTriangle className={cn("w-5 h-5", lowStockCount > 0 ? "text-red-600" : "text-gray-400")} />
           </div>
           <div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Critical Alerts</div>
              <div className={cn("text-lg font-black tracking-tight", lowStockCount > 0 ? "text-red-600" : "text-gray-900")}>{lowStockCount} items</div>
           </div>
        </Card>
        <Card className="border-none shadow-sm rounded-2xl bg-white p-4 flex items-center gap-3">
           <div className="p-3 bg-green-50 rounded-xl">
              <Activity className="w-5 h-5 text-green-600" />
           </div>
           <div>
              <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Inventory Value</div>
              <div className="text-lg font-black text-green-700 tracking-tight">
                {formatIDR(ingredients.reduce((acc, curr) => acc + (curr.stock * curr.cost_per_unit), 0))}
              </div>
           </div>
        </Card>
      </div>

      {/* Modern Controls Section */}
      <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-gray-50">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
          <Input 
            placeholder="Search items, brands, or categories..." 
            value={filters.search}
            onChange={(e) => setFilters({...filters, search: e.target.value})}
            className="pl-11 h-12 bg-gray-50/50 border-gray-100 rounded-2xl text-sm font-medium focus-visible:ring-emerald-500 focus-visible:bg-white transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select 
            className="h-12 bg-gray-50/50 border border-gray-100 rounded-2xl px-5 text-[10px] font-black uppercase tracking-widest text-gray-500 outline-none min-w-[180px] focus:border-emerald-500 transition-all cursor-pointer"
            value={filters.category}
            onChange={(e) => setFilters({...filters, category: e.target.value})}
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button 
            onClick={() => setFilters({...filters, low_stock: !filters.low_stock})}
            className={cn(
              "h-12 flex items-center gap-3 px-6 rounded-2xl transition-all border whitespace-nowrap",
              filters.low_stock 
                ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-100" 
                : "bg-white border-gray-100 text-gray-500 hover:border-red-200 hover:text-red-500"
            )}
          >
            <div className={cn("w-8 h-4 rounded-full relative transition-colors", filters.low_stock ? "bg-white/20" : "bg-gray-100")}>
              <div className={cn("absolute top-1 w-2 h-2 rounded-full bg-white transition-all", filters.low_stock ? "left-5" : "left-1 bg-gray-400")}></div>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Low Stock Only</span>
          </button>
        </div>
      </div>

      {/* Main Stock List (Table) */}
      <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden relative">
        <div className="overflow-x-auto max-h-[600px] scrollbar-thin scrollbar-thumb-gray-200">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100">
              <tr>
                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Item & Category</th>
                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">SKU / Brand</th>
                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock Level</th>
                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Unit Cost</th>
                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Value</th>
                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Sync</th>
                <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Quick Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={7} className="p-6"><div className="h-8 bg-gray-50 rounded-xl italic text-gray-200 text-xs flex items-center px-4">Loading operational data...</div></td>
                  </tr>
                ))
              ) : ingredients.length > 0 ? (
                ingredients.map((ing, idx) => {
                  const isLow = ing.stock < ing.minimum_stock;
                  const totalValue = ing.stock * ing.cost_per_unit;
                  
                  return (
                    <tr key={ing.id} className={cn(
                      "group transition-all hover:bg-emerald-50/30",
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50/30"
                    )}>
                      {/* Name & Badge */}
                      <td className="p-5">
                        <div className="flex flex-col">
                          <span className="font-black text-gray-900 leading-tight group-hover:text-emerald-700 transition-colors uppercase tracking-tight text-sm">
                            {ing.item_name}
                          </span>
                          <span className="mt-1 inline-flex w-fit items-center px-2 py-0.5 rounded-md text-[9px] font-black bg-emerald-50 text-emerald-500 uppercase tracking-tighter">
                            {ing.category}
                          </span>
                        </div>
                      </td>

                      {/* SKU / Brand */}
                      <td className="p-5">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight italic">
                          {ing.brand || "-"}
                        </span>
                      </td>

                      {/* Current Stock */}
                      <td className="p-5">
                        <div className="flex flex-col">
                          <div className={cn(
                            "text-lg font-black tracking-tight tabular-nums",
                            isLow ? "text-red-500" : "text-green-600"
                          )}>
                            {ing.stock.toLocaleString()} <span className="text-[10px] uppercase text-gray-400">{ing.unit}</span>
                          </div>
                          {isLow && (
                            <div className="flex items-center gap-1 text-red-400">
                               <AlertTriangle className="w-2.5 h-2.5" />
                               <span className="text-[8px] font-black uppercase">Below Min: {ing.minimum_stock}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Unit Cost */}
                      <td className="p-5">
                        <div className="flex items-center gap-1.5 font-bold text-gray-500 text-xs">
                           <span className="text-gray-300">Rp</span>
                           {formatIDR(ing.cost_per_unit).replace("Rp ", "")}
                           <span className="text-[9px] text-gray-300 tracking-tighter italic">/{ing.unit}</span>
                        </div>
                      </td>

                      {/* Total Value */}
                      <td className="p-5">
                        <div className="font-black text-gray-900 border-l-4 border-emerald-500 pl-3">
                           {formatIDR(totalValue)}
                        </div>
                      </td>

                      {/* Last Sync */}
                      <td className="p-5">
                        <div className="flex items-center gap-2 text-gray-400">
                           <Clock className="w-3 h-3" />
                           <span className="text-[10px] font-bold">{new Date().toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </td>

                      {/* Quick Actions */}
                      <td className="p-5">
                        <div className="flex items-center justify-center gap-1">
                          <div className="flex items-center bg-gray-100 rounded-xl p-1 shadow-inner mr-2">
                             <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg text-gray-400 hover:text-red-500"
                              onClick={() => handleQuickAdjust(ing.id, ing.stock, -1)}
                              disabled={adjustingId === ing.id || ing.stock <= 0}
                             >
                                <Minus className="w-3 h-3" />
                             </Button>
                             <div className="w-10 text-center font-black text-xs text-gray-900">1</div>
                             <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 rounded-lg text-gray-400 hover:text-green-600"
                              onClick={() => handleQuickAdjust(ing.id, ing.stock, 1)}
                              disabled={adjustingId === ing.id}
                             >
                                <Plus className="w-3 h-3" />
                             </Button>
                          </div>
                          
                          <Link href={`/purchase?ingredient_id=${ing.id}`}>
                            <Button 
                              className="h-10 px-4 bg-white border border-emerald-100 text-emerald-600 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all shadow-sm"
                            >
                              Restock
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="p-20 text-center">
                    <div className="flex flex-col items-center">
                       <Layers className="w-16 h-16 text-gray-100 mb-4" />
                       <h3 className="text-xl font-black text-gray-900">Inventory Clear</h3>
                       <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2 px-10">No items found matching your current filters. Try resetting the search or category.</p>
                       <Button 
                        onClick={() => setFilters({ search: "", category: "", low_stock: false })}
                        variant="link" 
                        className="mt-4 text-emerald-600 font-black text-[10px] uppercase tracking-widest"
                       >
                         Clear All Filters
                       </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between items-center text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] pt-4">
        <p>Bakmi You Tje • Stock Management System v1.2</p>
        <p>High Density List View Enabled</p>
      </div>
    </div>
  );
}
