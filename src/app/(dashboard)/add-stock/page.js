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
import Portal from "@/components/Portal";
import { useTranslation } from "@/lib/language-context";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from "@/components/ui/dropdown-menu";

export default function PurchasePage() {
  const { t } = useTranslation();
  const [purchases, setPurchases] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteData, setDeleteData] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filters, setFilters] = useState({
    ingredient_id: "",
    page: 1,
    limit: 10
  });

  const handleLimitChange = (newLimit) => {
    setFilters(prev => ({ ...prev, page: 1, limit: newLimit }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

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
      error(t('purchase.load_fail'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteData) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/purchases/${deleteData.id}`);
      success(t('purchase.cancel_success'));
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
        <Portal>
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-[800px] max-h-[85vh] overflow-y-auto shadow-[0_32px_128px_-12px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-300 relative border border-slate-100 flex flex-col">
              <div className="sticky top-0 z-[200] bg-white border-b border-slate-50 p-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                   <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg">
                      <Plus className="w-5 h-5 text-white" />
                   </div>
                   <div>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">
                        {editData ? t('purchase.edit_purchase') : t('purchase.new_purchase')}
                      </h2>
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                        {editData ? t('purchase.update_details') : t('purchase.record_acquisition')}
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
                  className="h-12 w-12 rounded-full hover:bg-slate-50 transition-all"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </Button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar">
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
        </Portal>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteData && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 rounded-[1.25rem] flex items-center justify-center mb-6">
              <Trash2 className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight mb-2">{t('purchase.cancel_title')}</h3>
            <p className="text-sm font-medium text-slate-600 mb-8">
              {t('purchase.cancel_confirm')} <span className="font-black text-slate-900">{deleteData.ingredient?.item_name}</span>? 
              {t('purchase.revert_warning')}
            </p>
            <div className="flex gap-4 w-full">
              <Button 
                variant="outline" 
                onClick={() => setDeleteData(null)}
                className="flex-1 h-14 rounded-xl border-slate-300 font-black uppercase text-xs tracking-widest text-slate-600 hover:bg-slate-50"
              >
                {t('purchase.keep_it')}
              </Button>
              <Button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 h-14 rounded-xl bg-red-600 hover:bg-red-700 font-black uppercase text-xs tracking-widest text-white border-none"
              >
                {isDeleting ? "Cancelling..." : t('purchase.cancel_it')}
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{t('purchase.title')}</h2>
          <p className="text-sm text-slate-600 font-medium mt-1 flex items-center gap-2">
            {t('purchase.subtitle')}
            <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full" />
          </p>
        </div>
        <Button 
          onClick={() => setShowForm(true)} 
          className="w-full md:w-auto bg-slate-900 hover:bg-black text-white shadow-sm rounded-xl h-11 px-6 font-bold text-xs transition-all active:scale-95"
        >
          <Plus className="w-4 h-4 mr-2" /> {t('purchase.new_purchase')}
        </Button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-700">
        <div className="p-5 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-5 h-5 text-slate-700" />
               </div>
               <div>
                  <h3 className="text-sm font-bold text-slate-800">{t('purchase.purchase_log')}</h3>
                  <p className="text-xs font-medium text-slate-600 mt-0.5">{t('purchase.view_logs')}</p>
               </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
               <div className="relative group flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                  <Input 
                    placeholder={t('purchase.search_records')} 
                    className="pl-9 pr-6 h-10 w-full md:w-64 bg-slate-50 border-none rounded-xl text-sm font-semibold focus-visible:ring-emerald-500/10 transition-all"
                  />
               </div>
               <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl border border-slate-100 hover:bg-slate-50">
                  <Filter className="w-4 h-4 text-slate-500" />
               </Button>
            </div>
        </div>

        <ResponsiveDataView
          loading={loading}
          data={purchases}
          emptyMessage={t('purchase.load_fail')}
          columns={[
            {
              header: t('common.date'),
              accessor: (p) => (
                <div className="py-1">
                  <div className="text-[11px] font-bold text-slate-700">{new Date(p.purchase_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  <div className="text-[9px] text-slate-400 font-medium mt-0.5">{new Date(p.purchase_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              ),
              className: "pl-8"
            },
            {
              header: t('purchase.material'),
              accessor: (p) => (
                <div>
                  <div className="text-sm font-bold text-slate-800 leading-none">{p.ingredient?.item_name}</div>
                  <div className="text-xs text-slate-500 font-medium uppercase tracking-tight mt-1">{p.ingredient?.brand || "Generic"}</div>
                </div>
              )
            },
            {
              header: t('common.qty'),
              accessor: (p) => (
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg text-xs font-bold text-slate-600 border border-slate-100">
                  {p.quantity} 
                </div>
              )
            },
            {
              header: t('purchase.price_unit'),
              accessor: (p) => (
                <span className="text-xs font-semibold text-slate-500 tabular-nums">{formatIDR(p.unit_price)}</span>
              )
            },
            {
              header: t('common.total'),
              accessor: (p) => (
                <span className="text-base font-bold text-slate-800 tabular-nums">{formatIDR(p.total_price)}</span>
              )
            },
            {
              header: t('purchase.supplier'),
              accessor: (p) => (
                <span className="text-xs font-semibold text-slate-600 uppercase">{p.supplier || "-"}</span>
              )
            },
            {
              header: t('common.actions'),
              accessor: (p) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-slate-50">
                             <MoreHorizontal className="w-4 h-4 text-slate-400" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[160px] bg-white border-slate-100 shadow-xl p-1 rounded-xl">
                        <DropdownMenuItem 
                            onClick={() => setEditData(p)}
                            className="text-slate-700 hover:bg-slate-50 font-semibold text-xs px-3 py-2 rounded-lg gap-2 cursor-pointer"
                        >
                            <FileText className="w-3.5 h-3.5 text-slate-400" /> {t('purchase.edit_record')}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                            onClick={() => setDeleteData(p)}
                            className="text-rose-700 hover:bg-rose-50 font-semibold text-xs px-3 py-2 rounded-lg gap-2 cursor-pointer"
                        >
                            <Trash2 className="w-3.5 h-3.5" /> {t('purchase.cancel_entry')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              ),
              align: "right",
              className: "pr-8"
            }
          ]}
          renderCard={(p) => (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 mb-1">
                    {new Date(p.purchase_date).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="font-bold text-slate-800 text-base leading-tight">{p.ingredient?.item_name}</p>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight mt-0.5">{p.ingredient?.brand || "Generic"}</p>
                </div>
                <div className="text-right">
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{t('common.total')}</p>
                   <p className="font-bold text-slate-800 text-lg tabular-nums tracking-tight">{formatIDR(p.total_price)}</p>
                </div>
              </div>

              <div className="flex justify-between items-center bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                <div className="flex flex-col">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t('common.qty')}</p>
                  <p className="font-bold text-slate-700 text-sm tabular-nums">{p.quantity}</p>
                </div>
                <div className="h-6 w-px bg-slate-100" />
                <div className="flex flex-col">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t('purchase.rate')}</p>
                  <p className="font-bold text-slate-700 text-sm tabular-nums">{formatIDR(p.unit_price)}</p>
                </div>
                <div className="h-6 w-px bg-slate-100" />
                <div className="text-right">
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t('purchase.supplier')}</p>
                   <p className="font-bold text-slate-700 text-[10px] uppercase">{p.supplier || "-"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button 
                  variant="ghost" 
                  onClick={() => setEditData(p)}
                  className="flex-1 h-9 rounded-lg text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100"
                >
                  {t('common.edit')}
                </Button>
                <Button 
                  variant="ghost"
                  onClick={() => setDeleteData(p)}
                  className="flex-1 h-9 rounded-lg text-xs font-bold text-rose-500 hover:bg-rose-50"
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          )}
        />
        
        {pagination.totalPages > 1 && (
          <div className="px-6 md:px-10 py-6 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-8 lg:gap-12">
               <div className="flex flex-col">
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{t('common.showing')}</p>
                  <p className="text-xs font-black text-slate-900 uppercase tracking-tight tabular-nums">
                    {((pagination.page - 1) * filters.limit) + 1} - {Math.min(pagination.page * filters.limit, pagination.total)} {t('common.of')} {pagination.total} {t('purchase.purchase_log')}
                  </p>
               </div>
               <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200/50 shadow-sm">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('common.per_page')}</span>
                  <select 
                    value={filters.limit} 
                    onChange={(e) => handleLimitChange(Number(e.target.value))}
                    className="bg-transparent text-xs font-black text-slate-900 uppercase outline-none cursor-pointer"
                  >
                    {[10, 20, 50, 100].map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
               </div>
            </div>

            <div className="flex items-center gap-2">
               <Button 
                variant="ghost" 
                size="sm" 
                disabled={pagination.page <= 1}
                onClick={() => handlePageChange(pagination.page - 1)}
                className="h-10 px-4 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 transition-all disabled:opacity-30"
               >
                 <ArrowLeft className="w-3.5 h-3.5 mr-2" /> {t('common.previous')}
               </Button>
               
               <div className="hidden md:flex items-center gap-1.5">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={cn(
                          "w-10 h-10 rounded-xl text-[10px] font-black transition-all",
                          pagination.page === pageNum 
                            ? "bg-slate-900 text-white shadow-lg scale-105" 
                            : "text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  {pagination.totalPages > 5 && <span className="text-slate-300 px-1">...</span>}
               </div>

               <Button 
                variant="ghost" 
                size="sm" 
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => handlePageChange(pagination.page + 1)}
                className="h-10 px-4 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-slate-900 transition-all disabled:opacity-30"
               >
                 {t('common.next')} <ChevronRight className="w-4 h-4 ml-2" />
               </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
