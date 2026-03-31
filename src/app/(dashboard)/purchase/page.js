"use client";

import React, { useState, useEffect } from "react";
import { 
  ShoppingCart, Plus, Search, Filter, 
  Calendar, FileText, Package, User,
  ChevronRight, ArrowLeft, RefreshCw,
  TrendingUp, Clock, X, MoreHorizontal, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { formatIDR } from "@/lib/format";
import PurchaseForm from "@/components/PurchaseForm";
import { cn } from "@/lib/utils";
import { ResponsiveDataView } from "@/components/ResponsiveDataView";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from "@/components/ui/dropdown-menu";

export default function PurchasePage() {
  const [purchases, setPurchases] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteData, setDeleteData] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleDelete = async () => {
    if (!deleteData) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/purchases/${deleteData.id}`);
      success("Purchase cancelled and stock reverted");
      loadPurchases();
      setDeleteData(null);
    } catch (e) {
      console.error(e);
      error(e.response?.data?.error || "Failed to cancel purchase");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20 px-4 md:px-0 relative">
      {/* New/Edit Purchase Modal Overlay */}
      {(showForm || editData) && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 md:p-10 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-50 rounded-[3rem] w-full max-w-6xl max-h-[90dvh] overflow-y-auto shadow-2xl shadow-black/20 animate-in zoom-in-95 duration-300 relative">
            <div className="sticky top-0 z-[160] bg-white border-b border-slate-100 p-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <div className="w-14 h-14 bg-slate-900 rounded-[1.25rem] flex items-center justify-center shadow-xl">
                    <Plus className="w-6 h-6 text-white" />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">
                      {editData ? "Edit Purchase" : "New Purchase"}
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      {editData ? "Update stock acquisition details" : "Record stock acquisition"}
                    </p>
                 </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => {
                  setShowForm(false);
                  setEditData(null);
                }} 
                className="h-14 w-14 rounded-full hover:bg-slate-50 transition-all"
              >
                <X className="w-6 h-6 text-slate-400" />
              </Button>
            </div>
            
            <div className="p-10">
              <PurchaseForm 
                initialData={editData}
                onClose={() => {
                  setShowForm(false);
                  setEditData(null);
                }} 
                onSuccess={() => {
                  setShowForm(false);
                  setEditData(null);
                  loadPurchases();
                }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteData && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-[1.25rem] flex items-center justify-center mb-6">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight mb-2">Cancel Purchase</h3>
            <p className="text-sm font-medium text-slate-500 mb-8">
              Are you sure you want to cancel the purchase of <span className="font-black text-slate-900">{deleteData.ingredient?.item_name}</span>? 
              This action will revert the stock added by this purchase.
            </p>
            <div className="flex gap-4 w-full">
              <Button 
                variant="outline" 
                onClick={() => setDeleteData(null)}
                className="flex-1 h-14 rounded-xl border-slate-200 font-black uppercase text-[10px] tracking-widest text-slate-500 hover:bg-slate-50"
              >
                No, Keep it
              </Button>
              <Button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 h-14 rounded-xl bg-red-500 hover:bg-red-600 font-black uppercase text-[10px] tracking-widest text-white border-none"
              >
                {isDeleting ? "Cancelling..." : "Yes, Cancel It"}
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 print:hidden">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Purchase History</h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
            Manage your stock purchases
            <span className="inline-block w-1.5 h-1.5 bg-emerald-600 rounded-full animate-pulse" />
          </p>
        </div>
        <Button 
          onClick={() => setShowForm(true)} 
          className="w-full md:w-auto bg-slate-900 hover:bg-black text-white shadow-2xl shadow-slate-200 rounded-[1.25rem] h-14 px-10 font-black text-[11px] uppercase tracking-[0.2em] active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5 mr-3" /> New Purchase
        </Button>
      </div>

      <div className="glass-card rounded-[2.5rem] overflow-visible relative shadow-2xl border-none p-0 animate-in fade-in duration-700">
        <div className="p-6 md:p-10 border-b border-slate-100 bg-white/50 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-8 rounded-t-[2.5rem]">
            <div className="flex items-center gap-5">
               <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center shadow-xl shadow-slate-200">
                  <Clock className="w-8 h-8 text-white" />
               </div>
               <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Purchase Log</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">View all stock acquisitions</p>
               </div>
            </div>
            <div className="flex items-center gap-4 w-full md:w-auto">
               <div className="relative group flex-1">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                  <Input 
                    placeholder="Search records..." 
                    className="pl-14 pr-8 h-14 w-full md:w-80 bg-white border border-slate-200 rounded-[1.25rem] text-[11px] font-black uppercase tracking-widest focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm"
                  />
               </div>
               <Button variant="outline" size="icon" className="h-14 w-14 rounded-[1.25rem] border-slate-200 hover:bg-slate-50 transition-all shrink-0">
                  <Filter className="w-5 h-5 text-slate-500" />
               </Button>
            </div>
        </div>

        <ResponsiveDataView
          loading={loading}
          data={purchases}
          emptyMessage="No purchases found"
          columns={[
            {
              header: "Date",
              accessor: (p) => (
                <div>
                  <div className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{new Date(p.purchase_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1.5">{new Date(p.purchase_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ),
              className: "pl-10"
            },
            {
              header: "Material",
              accessor: (p) => (
                <div>
                  <div className="text-base font-black text-slate-900 uppercase tracking-tight group-hover:text-emerald-600 transition-colors uppercase truncate max-w-[220px]">{p.ingredient?.item_name}</div>
                  <div className="text-[9px] text-slate-300 font-black uppercase tracking-[0.2em] mt-2 group-hover:text-emerald-400 transition-colors">{p.ingredient?.brand || "Generic"}</div>
                </div>
              )
            },
            {
              header: "Qty",
              accessor: (p) => (
                <div className="inline-flex items-center gap-3 px-6 py-2 bg-slate-50 rounded-[1rem] text-sm font-black text-slate-700 border border-slate-200/50 min-w-16 justify-center">
                  {p.quantity} 
                </div>
              )
            },
            {
              header: "Price/Unit",
              accessor: (p) => (
                <span className="text-sm font-bold text-slate-400 tabular-nums">{formatIDR(p.unit_price)}</span>
              )
            },
            {
              header: "Total",
              accessor: (p) => (
                <span className="text-xl font-black text-slate-900 tracking-tighter tabular-nums">{formatIDR(p.total_price)}</span>
              )
            },
            {
              header: "Supplier",
              accessor: (p) => (
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{p.supplier || "-"}</span>
              )
            },
            {
              header: "Action",
              accessor: (p) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl hover:bg-slate-50 transition-all">
                             <MoreHorizontal className="w-5 h-5 text-slate-400 group-hover:text-emerald-600 transition-all" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-[180px] bg-white border-slate-100 shadow-2xl p-2 rounded-2xl">
                        <DropdownMenuItem 
                            onClick={() => setEditData(p)}
                            className="text-slate-700 hover:bg-slate-50 font-black uppercase text-[10px] tracking-widest px-4 py-3 rounded-xl gap-3 mb-1"
                        >
                            <FileText className="w-4 h-4 text-slate-400" /> Edit Purchase
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={() => setDeleteData(p)}
                            className="bg-red-50 text-red-600 hover:bg-red-100 font-black uppercase text-[10px] tracking-widest px-4 py-3 rounded-xl gap-3"
                        >
                            <Trash2 className="w-4 h-4" /> Cancel Purchase
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              ),
              align: "right",
              className: "pr-10"
            }
          ]}
          renderCard={(p) => (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                    {new Date(p.purchase_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short' })}
                  </p>
                  <p className="font-black text-slate-900 uppercase tracking-tight text-lg leading-tight">{p.ingredient?.item_name}</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{p.ingredient?.brand || "Generic"}</p>
                </div>
                <div className="text-right">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
                   <p className="font-black text-slate-900 text-xl tracking-tighter tabular-nums">{formatIDR(p.total_price)}</p>
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <div className="flex flex-col">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Qty</p>
                  <p className="font-black text-slate-700 text-sm">{p.quantity}</p>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div className="flex flex-col">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Price/Unit</p>
                  <p className="font-black text-slate-700 text-sm">{formatIDR(p.unit_price)}</p>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Action</p>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setEditData(p)}
                      className="h-8 px-3 rounded-lg text-[9px] font-black text-slate-500 uppercase hover:bg-slate-100"
                    >
                      Edit
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setDeleteData(p)}
                      className="h-8 px-3 rounded-lg text-[9px] font-black text-red-500 uppercase hover:bg-red-50"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        />
        
        {pagination.totalPages > 1 && (
           <div className="px-6 md:px-10 py-8 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 rounded-b-[2.5rem]">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Page {pagination.page} of {pagination.totalPages}</p>
              <div className="flex gap-4 w-full md:w-auto">
                 <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={pagination.page <= 1}
                  onClick={() => setFilters({...filters, page: pagination.page - 1})}
                  className="flex-1 h-11 px-8 rounded-xl text-[10px] uppercase font-black tracking-widest border-slate-200 hover:bg-white transition-all"
                 >Previous</Button>
                 <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setFilters({...filters, page: pagination.page + 1})}
                  className="flex-1 h-11 px-8 rounded-xl text-[10px] uppercase font-black tracking-widest border-slate-200 hover:bg-white transition-all"
                 >Next</Button>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}
