"use client";

import React, { useState, useEffect } from "react";
import { 
  ShoppingCart, Plus, Search, Filter, 
  Calendar, FileText, Package, User,
  ChevronRight, ArrowLeft, RefreshCw,
  TrendingUp, Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { formatIDR } from "@/lib/format";
import PurchaseForm from "@/components/PurchaseForm";
import { cn } from "@/lib/utils";

export default function PurchasePage() {
  const [purchases, setPurchases] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({
    ingredient_id: "",
    page: 1
  });

  const { success, error } = useToast();

  useEffect(() => {
    loadPurchases();
  }, [filters]);

  const loadPurchases = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(filters).toString();
      const result = await api.get(`/purchases?${query}`);
      setPurchases(result.data);
      setPagination(result.pagination);
    } catch (e) {
      console.error(e);
      error("Failed to load purchase history");
    } finally {
      setLoading(false);
    }
  };

  if (showForm) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Record New Purchase</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Master Ingredient Integration</p>
          </div>
        </div>
        <div className="animate-in slide-in-from-bottom-4 duration-500">
          <PurchaseForm 
            onClose={() => setShowForm(false)} 
            onSuccess={() => {
              setShowForm(false);
              loadPurchases();
            }} 
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Purchase History</h2>
          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-1">Logs & Transaction Records</p>
        </div>
        <Button 
          onClick={() => setShowForm(true)} 
          className="bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-100 rounded-2xl h-12 px-6 font-black text-[11px] uppercase tracking-widest"
        >
          <Plus className="w-4 h-4 mr-2" /> New Purchase
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="border-none shadow-sm rounded-[32px] overflow-hidden bg-white">
          <CardHeader className="bg-gray-50/50 px-8 py-6 border-b border-gray-100/50">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                   <div className="p-2.5 bg-emerald-100 rounded-2xl">
                      <Clock className="w-5 h-5 text-emerald-600" />
                   </div>
                   <div>
                      <CardTitle className="text-lg font-black text-gray-900">Recent Transactions</CardTitle>
                      <CardDescription className="text-xs font-medium">All logged ingredient restocks</CardDescription>
                   </div>
                </div>
                <div className="flex items-center gap-2">
                   <div className="relative group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <Input 
                        placeholder="Search records..." 
                        className="pl-9 h-10 w-full md:w-64 bg-white border-gray-200 rounded-xl text-sm focus:ring-emerald-500"
                      />
                   </div>
                   <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-gray-200">
                      <Filter className="w-4 h-4 text-gray-500" />
                   </Button>
                </div>
             </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin" />
                <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Fetching data...</p>
              </div>
            ) : purchases.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 text-[10px] font-black uppercase text-gray-400 tracking-widest">
                      <th className="px-8 py-4">Date</th>
                      <th className="px-8 py-4">Ingredient</th>
                      <th className="px-8 py-4">Qty</th>
                      <th className="px-8 py-4">Unit Price</th>
                      <th className="px-8 py-4">Total</th>
                      <th className="px-8 py-4">Supplier</th>
                      <th className="px-8 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {purchases.map((p) => (
                      <tr key={p.id} className="group hover:bg-emerald-50/30 transition-colors">
                        <td className="px-8 py-6">
                          <div className="text-sm font-black text-gray-900">{new Date(p.purchase_date).toLocaleDateString()}</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase">{new Date(p.purchase_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-sm font-black text-gray-900">{p.ingredient?.item_name}</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase">{p.ingredient?.brand || "No Brand"}</div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-black text-gray-700">
                              {p.quantity} <span className="text-[9px] text-gray-400 uppercase">{p.unit}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6 text-sm font-bold text-gray-600">{formatIDR(p.unit_price)}</td>
                        <td className="px-8 py-6">
                           <div className="text-sm font-black text-emerald-600">{formatIDR(p.total_price)}</div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="text-xs font-bold text-gray-500">{p.supplier || "-"}</div>
                        </td>
                        <td className="px-8 py-6 text-right">
                           <Button variant="ghost" size="icon" className="rounded-full hover:bg-white hover:shadow-sm">
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                           </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-32 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-[40px] flex items-center justify-center mx-auto mb-6">
                   <ShoppingCart className="w-8 h-8 text-gray-200" />
                </div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">No Purchases Found</h3>
                <p className="text-sm text-gray-400 mt-1 max-w-[280px] mx-auto font-bold uppercase tracking-widest">Record your first inventory restock to see history here</p>
                <Button 
                  onClick={() => setShowForm(true)} 
                  variant="outline" 
                  className="mt-8 rounded-2xl border-2 border-emerald-100 text-emerald-600 font-black text-[11px] uppercase tracking-widest px-8"
                >
                  Start First Entry
                </Button>
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
    </div>
  );
}
