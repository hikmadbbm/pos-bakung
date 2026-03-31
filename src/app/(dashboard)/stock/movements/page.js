"use client";

import React, { useState, useEffect } from "react";
import { 
  History, ArrowLeft, Search, Filter, 
  ArrowDownLeft, ArrowUpRight, Settings2,
  Calendar, RefreshCw, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ResponsiveDataView } from "@/components/ResponsiveDataView";

export default function StockMovementsPage() {
  const [movements, setMovements] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    ingredient_id: "",
    page: 1
  });

  const { error } = useToast();

  useEffect(() => {
    loadMovements();
  }, [filters]);

  const loadMovements = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(filters).toString();
      const result = await api.get(`/stock-movements?${query}`);
      setMovements(result.data);
      setPagination(result.pagination);
    } catch (e) {
      console.error(e);
      error("Failed to load movement logs");
    } finally {
      setLoading(false);
    }
  };

  const getBadgeProps = (type) => {
    switch (type) {
      case 'IN':
        return { 
          icon: ArrowDownLeft, 
          className: "bg-green-100 text-green-700 border-green-200", 
          label: "Stock In" 
        };
      case 'OUT':
        return { 
          icon: ArrowUpRight, 
          className: "bg-red-100 text-red-700 border-red-200", 
          label: "Stock Out" 
        };
      case 'ADJUSTMENT':
        return { 
          icon: Settings2, 
          className: "bg-orange-100 text-orange-700 border-orange-200", 
          label: "Adjust" 
        };
      default:
        return { 
          icon: History, 
          className: "bg-gray-100 text-gray-700 border-gray-200", 
          label: type 
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20 px-4 md:px-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/stock">
            <Button variant="ghost" size="icon" className="h-14 w-14 rounded-2xl hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-slate-100">
              <ArrowLeft className="w-6 h-6 text-slate-400" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Stock History</h2>
            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Track stock in and out</p>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl border-none p-0 animate-in fade-in duration-700">
        <div className="p-8 md:p-10 border-b border-slate-100 bg-white/50 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="flex items-center gap-5">
               <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-slate-200">
                  <History className="w-8 h-8 text-white" />
               </div>
               <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Stock Log</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">View all stock changes</p>
               </div>
            </div>
            <div className="flex items-center gap-4">
               <div className="relative group flex-1 md:flex-none">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  <Input 
                    placeholder="Search item..." 
                    className="pl-14 pr-8 h-14 w-full md:w-80 bg-white border border-slate-200 rounded-[1.25rem] text-[11px] font-black uppercase tracking-widest focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm"
                  />
               </div>
               <Button variant="outline" size="icon" className="h-14 w-14 rounded-[1.25rem] border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all">
                  <Filter className="w-5 h-5 text-slate-500" />
               </Button>
            </div>
        </div>

        <ResponsiveDataView
          loading={loading}
          data={movements}
          emptyMessage="No stock movements found"
          columns={[
            {
              header: "Date",
              accessor: (m) => (
                <div className="py-2">
                  <div className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{new Date(m.created_at).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1.5">{new Date(m.created_at).toLocaleTimeString()}</div>
                </div>
              ),
              className: "pl-10"
            },
            {
              header: "Type",
              accessor: (m) => {
                const badge = getBadgeProps(m.movement_type);
                const TypeIcon = badge.icon;
                return (
                  <div className={cn("inline-flex items-center gap-3 px-4 py-2 rounded-full border text-[9px] font-black uppercase tracking-widest shadow-sm", badge.className)}>
                    <TypeIcon className="w-3.5 h-3.5" />
                    {badge.label}
                  </div>
                );
              }
            },
            {
              header: "Item",
              accessor: (m) => (
                <div>
                  <div className="text-base font-black text-slate-900 uppercase tracking-tight group-hover:text-emerald-600 transition-colors">{m.ingredient?.item_name}</div>
                  <div className="text-[9px] text-slate-300 font-black uppercase tracking-widest mt-1.5">{m.ingredient?.brand || "No Brand"}</div>
                </div>
              )
            },
            {
              header: "Change",
              accessor: (m) => (
                <div className={cn("text-xl font-black tabular-nums tracking-tighter", m.movement_type === 'IN' ? "text-emerald-600" : m.movement_type === 'OUT' ? "text-rose-600" : "text-orange-600")}>
                  {m.movement_type === 'IN' ? "+" : ""}{m.quantity} <span className="text-[10px] font-black text-slate-300 uppercase ml-1">{m.unit}</span>
                </div>
              )
            },
            {
              header: "Reference",
              accessor: (m) => (
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{m.reference_type}</span>
                  <span className="text-[9px] text-slate-400 font-black mt-1.5 opacity-60">ID: #{m.reference_id}</span>
                </div>
              ),
              className: "pr-12"
            }
          ]}
          renderCard={(m) => {
            const badge = getBadgeProps(m.movement_type);
            const TypeIcon = badge.icon;
            return (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-base font-black text-slate-900 uppercase tracking-tight">{m.ingredient?.item_name}</p>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">{new Date(m.created_at).toLocaleString()}</p>
                  </div>
                  <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[8px] font-black uppercase tracking-widest", badge.className)}>
                    <TypeIcon className="w-3 h-3" />
                    {badge.label}
                  </div>
                </div>
                
                <div className="flex justify-between items-end border-t border-slate-50 pt-4 mt-4">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Reference</p>
                    <p className="text-[10px] font-black text-slate-900 uppercase">{m.reference_type}</p>
                    <p className="text-[8px] text-slate-400 font-black mt-0.5">#{m.reference_id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Quantity</p>
                    <div className={cn("text-2xl font-black tabular-nums tracking-tighter", m.movement_type === 'IN' ? "text-emerald-600" : m.movement_type === 'OUT' ? "text-rose-600" : "text-orange-600")}>
                      {m.movement_type === 'IN' ? "+" : ""}{m.quantity} <span className="text-[10px] font-black text-slate-300 uppercase ml-1">{m.unit}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }}
        />

        {pagination.totalPages > 1 && (
           <div className="px-10 py-8 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Page {pagination.page} of {pagination.totalPages}</p>
              <div className="flex gap-4">
                 <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={pagination.page <= 1}
                  onClick={() => setFilters({...filters, page: pagination.page - 1})}
                  className="h-11 px-8 rounded-xl text-[10px] uppercase font-black tracking-widest border-slate-200 hover:bg-white transition-all disabled:opacity-30"
                 >Prev</Button>
                 <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setFilters({...filters, page: pagination.page + 1})}
                  className="h-11 px-8 rounded-xl text-[10px] uppercase font-black tracking-widest border-slate-200 hover:bg-white transition-all disabled:opacity-30"
                 >Next</Button>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
