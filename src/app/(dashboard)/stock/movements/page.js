"use client";

import React, { useState, useEffect } from "react";
import { 
  History, ArrowLeft, Search, Filter, 
  ArrowDownLeft, ArrowUpRight, Settings2,
  Calendar, RefreshCw, Layers
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import Link from "next/link";

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
          label: "Adjustment" 
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
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/stock">
            <Button variant="ghost" size="icon" className="rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">Stock Movements</h2>
            <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-1">Audit Log & Inventory History</p>
          </div>
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
        <CardHeader className="bg-gray-50/50 px-8 py-6 border-b border-gray-100/50">
           <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                 <div className="p-2.5 bg-gray-200 rounded-2xl">
                    <History className="w-5 h-5 text-gray-600" />
                 </div>
                 <div>
                    <CardTitle className="text-lg font-black text-gray-900">Movement History</CardTitle>
                    <CardDescription className="text-xs font-medium">Tracking every change to your stock</CardDescription>
                 </div>
              </div>
              <div className="flex items-center gap-2">
                 <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <Input 
                      placeholder="Filter by ingredient..." 
                      className="pl-9 h-10 w-full md:w-64 bg-white border-gray-200 rounded-xl text-sm"
                    />
                 </div>
                 <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-gray-200 text-gray-500">
                    <Filter className="w-4 h-4" />
                 </Button>
              </div>
           </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin" />
              <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Loading Logs...</p>
            </div>
          ) : movements.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                    <th className="px-8 py-4">Timestamp</th>
                    <th className="px-8 py-4">Type</th>
                    <th className="px-8 py-4">Ingredient</th>
                    <th className="px-8 py-4">Change</th>
                    <th className="px-8 py-4">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {movements.map((m) => {
                    const badge = getBadgeProps(m.movement_type);
                    const TypeIcon = badge.icon;
                    return (
                      <tr key={m.id} className="group hover:bg-gray-50/50 transition-colors">
                        <td className="px-8 py-6">
                           <div className="text-sm font-black text-gray-900">{new Date(m.created_at).toLocaleDateString()}</div>
                           <div className="text-[10px] text-gray-400 font-bold uppercase">{new Date(m.created_at).toLocaleTimeString()}</div>
                        </td>
                        <td className="px-8 py-6">
                           <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-widest", badge.className)}>
                              <TypeIcon className="w-3 h-3" />
                              {badge.label}
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="text-sm font-black text-gray-900">{m.ingredient?.item_name}</div>
                           <div className="text-[10px] text-gray-400 font-bold uppercase">{m.ingredient?.brand}</div>
                        </td>
                        <td className="px-8 py-6">
                           <div className={cn("text-lg font-black tabular-nums", m.movement_type === 'IN' ? "text-green-600" : m.movement_type === 'OUT' ? "text-red-600" : "text-orange-600")}>
                              {m.movement_type === 'IN' ? "+" : ""}{m.quantity} <span className="text-[10px] font-bold text-gray-400 uppercase">{m.unit}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="flex flex-col">
                              <span className="text-xs font-black text-gray-700 uppercase tracking-tighter">{m.reference_type}</span>
                              <span className="text-[10px] text-gray-400 font-medium">#{m.reference_id}</span>
                           </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-32 text-center">
               <div className="w-20 h-20 bg-gray-50 rounded-[40px] flex items-center justify-center mx-auto mb-6">
                  <Layers className="w-8 h-8 text-gray-200" />
               </div>
               <h3 className="text-xl font-black text-gray-900 tracking-tight">No Movements Logged</h3>
               <p className="text-sm text-gray-400 mt-1 max-w-[280px] mx-auto font-bold uppercase tracking-widest">Inventory changes will appear here as they happen</p>
            </div>
          )}
        </CardContent>

        {pagination.totalPages > 1 && (
           <div className="px-8 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Page {pagination.page} of {pagination.totalPages}</p>
              <div className="flex gap-2">
                 <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={pagination.page <= 1}
                  onClick={() => setFilters({...filters, page: pagination.page - 1})}
                  className="h-8 rounded-lg text-[10px] uppercase font-black"
                 >Prev</Button>
                 <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setFilters({...filters, page: pagination.page + 1})}
                  className="h-8 rounded-lg text-[10px] uppercase font-black"
                 >Next</Button>
              </div>
           </div>
        )}
      </Card>
    </div>
  );
}
