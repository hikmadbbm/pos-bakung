"use client";
import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { api } from "../../lib/api";
import { formatIDR } from "../../lib/format";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select } from "../ui/select";
import { Plus, Trash2, Edit2, Wallet, Calendar, TrendingDown, RefreshCcw, FileText, LayoutDashboard, Search } from "lucide-react";
import { useToast } from "../ui/use-toast";
import { ResponsiveDataView } from "../ResponsiveDataView";
import { useTranslation } from "../../lib/language-context";
import { cn } from "../../lib/utils";

const emptyForm = { 
  item: "", 
  category: "OTHERS",
  category_id: null,
  funding_source: "Kasir / Tunai",
  is_cash: true,
  amount: "", 
  date: new Date().toISOString().split('T')[0]
};

const DailyExpenses = forwardRef((props, ref) => {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [stats, setStats] = useState({ total_amount: 0 });
  const [loading, setLoading] = useState(true);

  // Filter States
  const getLocalDate = () => new Date().toLocaleDateString('en-CA');
  const [activeFilter, setActiveFilter] = useState("today");
  const [startDate, setStartDate] = useState(getLocalDate());
  const [endDate, setEndDate] = useState(getLocalDate());

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const [categories, setCategories] = useState([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: "", color: "#0f172a" });

  const [fundingSources, setFundingSources] = useState([]);
  const [isFundingModalOpen, setIsFundingModalOpen] = useState(false);
  const [editingFunding, setEditingFunding] = useState(null);
  const [fundingForm, setFundingForm] = useState({ name: "", color: "#10b981", is_cash: true });

  useEffect(() => {
    loadExpenses(1);
    loadCategories();
    loadFundingSources();
  }, [activeFilter, startDate, endDate]);

  useImperativeHandle(ref, () => ({
    openAdd: () => openAdd(),
    openCategories: () => setIsCategoryModalOpen(true),
    openFundingSources: () => setIsFundingModalOpen(true)
  }));

  const loadCategories = async () => {
    try {
      const res = await api.get("/expense-categories");
      setCategories(res);
      if (!editingId && res.length > 0) {
        setFormData(prev => ({ ...prev, category_id: res[0].id, category: res[0].name }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadFundingSources = async () => {
    try {
      const res = await api.get("/funding-sources");
      setFundingSources(res);
      if (!editingId && res.length > 0 && formData.funding_source === "Kasir / Tunai") {
        setFormData(prev => ({ ...prev, funding_source: res[0].name, is_cash: res[0].is_cash }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadExpenses = async (page = 1, limit = pagination.limit) => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page,
        limit,
        range: activeFilter === "all" ? "" : (activeFilter === "today" ? "today" : ""),
        startDate: activeFilter !== "all" && activeFilter !== "today" ? startDate : "",
        endDate: activeFilter !== "all" && activeFilter !== "today" ? endDate : "",
      }).toString();
      const res = await api.get(`/expenses?${q}`);
      setExpenses(res.expenses);
      setPagination(res.pagination);
      setStats(res.stats);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toLocalYYYYMMDD = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (filter === "weekly") {
      start.setDate(now.getDate() - 7);
    } else if (filter === "monthly") {
      start.setMonth(now.getMonth() - 1);
    }
    
    if (filter !== "custom" && filter !== "all") {
      setStartDate(toLocalYYYYMMDD(start));
      setEndDate(toLocalYYYYMMDD(end));
    }
  };

  const handlePageChange = (page) => {
    loadExpenses(page);
  };

  const handleLimitChange = (newLimit) => {
    setPagination(prev => ({ ...prev, limit: newLimit }));
    loadExpenses(1, newLimit);
  };

  const openAdd = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const openEdit = (ex) => {
    setEditingId(ex.id);
    setFormData({ 
      item: ex.item, 
      category: ex.category,
      category_id: ex.category_id,
      funding_source: ex.funding_source || "Kasir / Tunai",
      is_cash: ex.is_cash !== undefined ? ex.is_cash : true,
      amount: String(ex.amount),
      date: new Date(ex.date).toISOString().split('T')[0]
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const updated = await api.put(`/expenses/${editingId}`, formData);
        setExpenses(prev => prev.map(ex => ex.id === editingId ? { ...ex, ...updated } : ex));
        success(t('expenses.success_update'));
      } else {
        const created = await api.post("/expenses", formData);
        success(t('expenses.success_add'));
      }
      closeDialog();
      loadExpenses(pagination.page);
    } catch (e) {
      console.error(e);
      error(t('expenses.fail_save'));
    }
  };

  const handleDelete = async (id) => {
    const previous = expenses;
    setConfirmDeleteId(null);
    setExpenses(prev => prev.filter(ex => ex.id !== id));
    try {
      await api.delete(`/expenses/${id}`);
      success(t('expenses.success_delete'));
      loadExpenses(pagination.page);
    } catch (e) {
      console.error(e);
      setExpenses(previous);
      error(t('expenses.fail_delete'));
    }
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await api.put(`/expense-categories/${editingCategory.id}`, categoryForm);
        success("Category updated");
      } else {
        await api.post("/expense-categories", categoryForm);
        success("Category created");
      }
      setEditingCategory(null);
      setCategoryForm({ name: "", color: "#0f172a" });
      loadCategories();
      loadExpenses(pagination.page);
    } catch (e) {
      error("Failed to save category");
    }
  };

  const deleteCategory = async (id) => {
    try {
      await api.delete(`/expense-categories/${id}`);
      success("Category deleted");
      loadCategories();
    } catch (e) {
      error(e.response?.data?.error || "Failed to delete category");
    }
  };

  const handleFundingSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingFunding) {
        await api.put(`/funding-sources/${editingFunding.id}`, fundingForm);
        success("Funding Source updated");
      } else {
        await api.post("/funding-sources", fundingForm);
        success("Funding Source created");
      }
      setEditingFunding(null);
      setFundingForm({ name: "", color: "#10b981", is_cash: true });
      loadFundingSources();
    } catch (e) {
      error("Failed to save funding source");
    }
  };

  const deleteFundingSource = async (id) => {
    try {
      await api.delete(`/funding-sources/${id}`);
      success("Funding Source deleted");
      loadFundingSources();
    } catch (e) {
      error("Failed to delete funding source");
    }
  };

  return (
    <div className="space-y-10">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="glass-card p-6 rounded-[2rem] border-none shadow-xl bg-white group hover:scale-[1.02] transition-all duration-500">
            <div className="flex items-center gap-6">
               <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center shadow-xl group-hover:rotate-6 transition-transform">
                  <LayoutDashboard className="w-6 h-6 text-white" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('common.total')}</p>
                  <h4 className="text-2xl font-black text-slate-900 tabular-nums uppercase italic">
                     {pagination.total} <span className="text-xs text-slate-400 not-italic ml-1">{t('common.items')}</span>
                  </h4>
               </div>
            </div>
         </div>
         <div className="glass-card p-6 rounded-[2rem] border-none shadow-xl !bg-slate-900 group hover:scale-[1.02] transition-all duration-500 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="flex items-center gap-6 relative z-10">
               <div className="w-14 h-14 rounded-2xl bg-rose-500/20 flex items-center justify-center shadow-xl group-hover:-rotate-6 transition-transform border border-rose-500/20">
                  <TrendingDown className="w-6 h-6 text-rose-500" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">{t('expenses.amount_idr')}</p>
                  <h4 className="text-2xl font-black text-white tabular-nums tracking-tighter italic">
                     {formatIDR(stats.total_amount)}
                  </h4>
               </div>
            </div>
         </div>
         <div className="glass-card p-6 rounded-[2rem] border-none shadow-xl bg-white group hover:scale-[1.02] transition-all duration-500">
            <div className="flex items-center gap-6">
               <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center shadow-xl group-hover:rotate-6 transition-transform border border-emerald-100/50">
                  <FileText className="w-6 h-6 text-emerald-500" />
               </div>
               <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('common.status')}</p>
                  <h4 className="text-sm font-black text-emerald-600 uppercase tracking-widest italic flex items-center gap-2">
                     <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                     {t('common.connected')}
                  </h4>
               </div>
            </div>
         </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-card p-4 rounded-[2.5rem] border-none shadow-2xl bg-white/40 backdrop-blur-2xl flex flex-col lg:flex-row items-center gap-8">
        <div className="flex p-2 bg-slate-100/50 rounded-[1.5rem] w-full lg:w-fit border border-slate-200/50 overflow-x-auto no-scrollbar">
          {[
            { id: "today", label: t('orders.filter_today') },
            { id: "weekly", label: t('orders.filter_weekly') },
            { id: "monthly", label: t('orders.filter_monthly') },
            { id: "custom", label: t('orders.filter_custom') },
            { id: "all", label: t('orders.filter_all') }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleFilterChange(tab.id)}
              className={cn(
                "flex-1 lg:flex-none px-8 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 whitespace-nowrap",
                activeFilter === tab.id 
                  ? "bg-white text-slate-900 shadow-xl scale-105" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full lg:w-auto">
          <div className={cn(
               "flex flex-1 items-center justify-between gap-2 sm:gap-6 bg-white/80 backdrop-blur-md px-4 sm:px-8 h-12 w-full rounded-2xl border border-slate-100 shadow-inner transition-all duration-700",
               (activeFilter === "today" || activeFilter === "all") ? "opacity-30 grayscale pointer-events-none" : "opacity-100"
            )}>
              <Calendar className="w-4 h-4 text-slate-400 hidden sm:block shrink-0" />
              <input type="date" className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest text-slate-900 w-full text-center" value={startDate} onChange={e => { setStartDate(e.target.value); setActiveFilter("custom"); }} />
              <div className="w-px h-6 bg-slate-200 hidden sm:block shrink-0" />
              <input type="date" className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest text-slate-900 w-full text-center" value={endDate} onChange={e => { setEndDate(e.target.value); setActiveFilter("custom"); }} />
          </div>
          <button onClick={() => loadExpenses(1)} className="h-12 w-full sm:w-12 shrink-0 rounded-2xl bg-slate-900 flex items-center justify-center text-white hover:bg-black transition-all active:scale-95 shadow-2xl group">
             <RefreshCcw className={cn("w-5 h-5 transition-transform duration-1000", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl border-none p-0">
        <ResponsiveDataView
          loading={loading}
          data={expenses}
          emptyMessage={t('expenses.not_found')}
          columns={[
            {
              header: t('common.date'),
              accessor: (ex) => (
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {new Date(ex.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              ),
              sortKey: "date",
              className: "pl-10"
            },
            {
              header: t('common.description'),
              accessor: (ex) => (
                <p className="font-black text-slate-900 uppercase tracking-tight text-base group-hover:text-emerald-600 transition-colors">
                  {ex.item}
                </p>
              ),
              sortKey: "item"
            },
            {
              header: t('common.category'),
              accessor: (ex) => (
                <span className="px-3 py-1 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-600 uppercase tracking-widest border border-emerald-100/50 shadow-sm">
                  {ex.expenseCategory?.name || ex.category}
                </span>
              ),
              sortKey: "expenseCategory.name"
            },
            {
              header: t('common.amount'),
              accessor: (ex) => (
                <span className="font-black text-slate-900 text-lg tabular-nums tracking-tighter">
                  {formatIDR(ex.amount)}
                </span>
              ),
              sortKey: "amount",
              align: "right"
            },
            {
              header: t('expenses.staff'),
              accessor: (ex) => (
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-4 pr-10 border-l border-slate-100 italic">
                  {ex.user?.name || t('common.system_admin')}
                </span>
              ),
              sortKey: "user.name",
              align: "right"
            },
            {
              header: t('common.actions'),
              sortable: false,
              accessor: (ex) => (
                confirmDeleteId === ex.id ? (
                  <div className="flex justify-end items-center gap-1 bg-rose-50 p-1 rounded-2xl border border-rose-100">
                    <Button variant="destructive" size="sm" className="h-8 px-4 rounded-xl text-[10px] font-black uppercase" onClick={() => handleDelete(ex.id)}>{t('common.delete')}</Button>
                    <Button variant="ghost" size="sm" className="h-8 px-4 rounded-xl text-[10px] font-black uppercase text-slate-400" onClick={() => setConfirmDeleteId(null)}>{t('common.no')}</Button>
                  </div>
                ) : (
                  <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-xl" onClick={() => openEdit(ex)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 hover:bg-rose-50 hover:text-rose-600 rounded-xl" onClick={() => setConfirmDeleteId(ex.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )
              ),
              align: "right",
              className: "pr-10"
            }
          ]}
          renderCard={(ex) => (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      {new Date(ex.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                   </p>
                   <p className="font-black text-slate-900 uppercase tracking-tight text-lg">{ex.item}</p>
                   <span className="inline-block mt-2 px-3 py-1 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-600 uppercase tracking-widest border border-emerald-100/50 shadow-sm">
                      {ex.expenseCategory?.name || ex.category}
                   </span>
                </div>
                <div className="text-right">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('common.amount')}</p>
                   <p className="font-black text-slate-900 text-xl tracking-tighter tabular-nums">{formatIDR(ex.amount)}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-50">
                {confirmDeleteId === ex.id ? (
                  <>
                    <Button variant="destructive" className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase" onClick={() => handleDelete(ex.id)}>{t('common.delete')}</Button>
                    <Button variant="outline" className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase" onClick={() => setConfirmDeleteId(null)}>{t('common.no')}</Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase" onClick={() => openEdit(ex)}>{t('common.edit')}</Button>
                    <Button variant="ghost" className="h-12 w-12 rounded-xl text-rose-500 hover:bg-rose-50" onClick={() => setConfirmDeleteId(ex.id)}><Trash2 className="w-4.5 h-4.5" /></Button>
                  </>
                )}
              </div>
            </div>
          )}
        />
      </div>

      {pagination.totalPages > 1 && (
        <div className="p-8 sm:p-10 bg-slate-50/50 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6 overflow-x-auto no-scrollbar rounded-b-[2rem]">
          <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
              {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} {t('common.of')} {pagination.total} {t('expenses.log_title')}
            </p>
            <div className="flex items-center gap-3">
              <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{t('common.per_page')}</span>
              <select 
                value={pagination.limit} 
                onChange={(e) => handleLimitChange(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-slate-600 hover:border-slate-400 transition-all shadow-sm"
              >
                {[10, 20, 50, 100].map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <Button variant="ghost" className="h-10 sm:h-12 rounded-xl font-black text-[10px] uppercase tracking-widest px-4 sm:px-6 hover:bg-slate-900 hover:text-white transition-all active:scale-95 shadow-sm border border-slate-100 bg-white" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}>{t('common.previous')}</Button>
            <div className="flex items-center gap-2">
               {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => i + 1).map(p => (
                 <button key={p} onClick={() => handlePageChange(p)} className={cn("w-10 h-10 sm:w-12 sm:h-12 rounded-xl font-black text-[10px] transition-all border", p === pagination.page ? "bg-slate-900 text-white shadow-xl scale-110 border-slate-900" : "bg-white text-slate-400 hover:text-slate-900 border-slate-100 hover:border-slate-300")}>{p}</button>
               ))}
               {pagination.totalPages > 5 && <span className="text-slate-300 px-1 font-black">...</span>}
            </div>
            <Button variant="ghost" className="h-10 sm:h-12 rounded-xl font-black text-[10px] uppercase tracking-widest px-4 sm:px-6 hover:bg-slate-900 hover:text-white transition-all active:scale-95 shadow-sm border border-slate-100 bg-white" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>{t('common.next')}</Button>
          </div>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white flex flex-col max-h-[90dvh]">
          <div className="bg-slate-900 p-10 text-center relative overflow-hidden shrink-0">
             <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-600 rounded-full -translate-y-1/2 translate-x-1/2 opacity-20 blur-3xl" />
             <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/20 shadow-2xl relative z-10">
                <Wallet className="w-8 h-8 text-white" />
             </div>
             <DialogTitle className="text-3xl font-black text-white uppercase tracking-tight relative z-10">
               {editingId ? t('expenses.edit_expense') : t('expenses.add_expense')}
             </DialogTitle>
             <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mt-3 relative z-10">{t('expenses.expense_details')}</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-10 space-y-6 flex-1 overflow-y-auto min-h-0 scrollbar-hide">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('common.date')}</Label>
                <Input
                  type="date"
                  className="h-12 rounded-xl bg-slate-50 border-slate-100 font-black text-sm px-5"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('common.category')}</Label>
                <div className="flex gap-2">
                  <select
                    className="w-full h-12 rounded-xl bg-slate-50 border border-slate-100 font-black text-[11px] uppercase tracking-widest px-4 cursor-pointer"
                    value={formData.category_id || ""}
                    onChange={(e) => {
                      const cat = categories.find(c => c.id === parseInt(e.target.value));
                      setFormData({ ...formData, category_id: cat.id, category: cat.name });
                    }}
                    required
                  >
                    <option value="" disabled>{t('common.select_category')}</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <Button type="button" variant="outline" size="icon" className="h-12 w-12 shrink-0 rounded-xl border border-slate-100 bg-slate-50 text-slate-400" onClick={() => setIsCategoryModalOpen(true)}><Plus className="w-4 h-4"/></Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Sumber Dana</Label>
                <div className="flex gap-2">
                  <select
                    className="w-full h-12 rounded-xl bg-slate-50 border border-slate-100 font-black text-[11px] uppercase tracking-widest px-4 cursor-pointer"
                    value={formData.funding_source || ""}
                    onChange={(e) => {
                      const src = fundingSources.find(c => c.name === e.target.value);
                      setFormData({ ...formData, funding_source: src?.name || e.target.value, is_cash: src?.is_cash ?? true });
                    }}
                    required
                  >
                    <option value="" disabled>Pilih Sumber</option>
                    {fundingSources.map(c => <option key={c.id} value={c.name}>{c.name} {c.is_cash ? "(K)" : "(B)"}</option>)}
                  </select>
                  <Button type="button" variant="outline" size="icon" className="h-12 w-12 shrink-0 rounded-xl border border-slate-100 bg-slate-50 text-slate-400" onClick={() => setIsFundingModalOpen(true)}><Plus className="w-4 h-4"/></Button>
                </div>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('common.description')}</Label>
                <Input
                  className="h-12 rounded-xl bg-slate-50 border-slate-100 font-black text-sm px-5"
                  value={formData.item}
                  onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                  required
                  placeholder="e.g. 5KG Sugar"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('expenses.amount_idr')}</Label>
                <Input
                  type="number"
                  className="h-12 rounded-xl bg-slate-50 border-slate-100 font-black text-xl text-emerald-600 px-5"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-50">
              <Button type="button" variant="ghost" className="h-12 px-8 rounded-xl font-black text-[10px] uppercase text-slate-400" onClick={closeDialog}>{t('common.cancel')}</Button>
              <Button type="submit" className="h-12 px-10 rounded-xl font-black bg-slate-900 text-white shadow-lg active:scale-95">{t('common.save')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Category Management Modal */}
      <Dialog open={isCategoryModalOpen} onOpenChange={() => setIsCategoryModalOpen(false)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white flex flex-col max-h-[90dvh]">
          <div className="bg-slate-900 p-8 text-center shrink-0">
             <DialogTitle className="text-xl font-black text-white uppercase tracking-tight">
               {t('expenses.manage_categories')}
             </DialogTitle>
          </div>
          
          <div className="p-8 flex-1 overflow-y-auto scrollbar-hide">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* List Categories */}
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">{t('expenses.categories')}</h4>
                   <div className="space-y-2">
                      {categories.map(cat => (
                        <div key={cat.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                           <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                              <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{cat.name}</span>
                           </div>
                           <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => { setEditingCategory(cat); setCategoryForm({ name: cat.name, color: cat.color || "#0f172a" }); }}>
                                 <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-300 hover:text-rose-600" onClick={() => deleteCategory(cat.id)}>
                                 <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                           </div>
                        </div>
                      ))}
                      {categories.length === 0 && <p className="text-center py-8 text-slate-300 font-bold uppercase text-[9px] tracking-widest">No Categories Found</p>}
                   </div>
                </div>

                {/* Form Add/Edit */}
                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                   <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-6">{editingCategory ? t('expenses.edit_category') : t('expenses.new_category')}</h4>
                   <form onSubmit={handleCategorySubmit} className="space-y-6">
                      <div className="space-y-2">
                         <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('common.name')}</Label>
                         <Input 
                            value={categoryForm.name}
                            onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                            className="h-12 rounded-xl bg-white border-slate-100 font-black text-xs uppercase"
                            placeholder="e.g. MAINTENANCE"
                            required
                         />
                      </div>
                      <div className="space-y-2">
                         <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('products.theme_color')}</Label>
                         <div className="flex items-center gap-4">
                            <input 
                               type="color" 
                               value={categoryForm.color}
                               onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                               className="w-12 h-12 rounded-xl border-none p-0 overflow-hidden cursor-pointer bg-white"
                            />
                            <Input 
                               value={categoryForm.color}
                               onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                               className="h-12 flex-1 rounded-xl bg-white border-slate-100 font-mono text-xs"
                            />
                         </div>
                      </div>
                      <div className="flex gap-2 pt-4">
                         <Button type="submit" className="flex-1 h-12 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest">
                            {editingCategory ? t('common.save') : t('common.add')}
                         </Button>
                         {editingCategory && (
                           <Button type="button" variant="ghost" className="h-12 px-6 rounded-xl text-[10px] font-black uppercase" onClick={() => { setEditingCategory(null); setCategoryForm({ name: "", color: "#0f172a" }); }}>
                              {t('common.cancel')}
                           </Button>
                         )}
                      </div>
                   </form>
                </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Funding Source Management Modal */}
      <Dialog open={isFundingModalOpen} onOpenChange={() => setIsFundingModalOpen(false)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white flex flex-col max-h-[90dvh]">
          <div className="bg-slate-900 p-8 text-center shrink-0">
             <DialogTitle className="text-xl font-black text-white uppercase tracking-tight">
               Manage Sumber Dana
             </DialogTitle>
          </div>
          
          <div className="p-8 flex-1 overflow-y-auto scrollbar-hide">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* List Funding Sources */}
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">SUMBER DANA AKTIF</h4>
                   <div className="space-y-2">
                      {fundingSources.map(src => (
                        <div key={src.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                           <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: src.color }} />
                              <div>
                                <span className="text-sm font-black text-slate-900 uppercase tracking-tight block">{src.name}</span>
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{src.is_cash ? "Kasir/Tunai" : "Non-Tunai"}</span>
                              </div>
                           </div>
                           <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400" onClick={() => { setEditingFunding(src); setFundingForm({ name: src.name, color: src.color || "#10b981", is_cash: !!src.is_cash }); }}>
                                 <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-300 hover:text-rose-600" onClick={() => deleteFundingSource(src.id)}>
                                 <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                           </div>
                        </div>
                      ))}
                      {fundingSources.length === 0 && <p className="text-center py-8 text-slate-300 font-bold uppercase text-[9px] tracking-widest">No Sources Found</p>}
                   </div>
                </div>

                {/* Form Add/Edit */}
                <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
                   <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-6">{editingFunding ? "Edit Sumber Dana" : "Sumber Dana Baru"}</h4>
                   <form onSubmit={handleFundingSubmit} className="space-y-6">
                      <div className="space-y-2">
                         <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('common.name')}</Label>
                         <Input 
                            value={fundingForm.name}
                            onChange={(e) => setFundingForm({ ...fundingForm, name: e.target.value })}
                            className="h-12 rounded-xl bg-white border-slate-100 font-black text-xs uppercase"
                            placeholder="e.g. KASIR HARIAN"
                            required
                         />
                      </div>
                      <div className="space-y-2">
                         <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Jenis Sumber</Label>
                         <div className="flex gap-2">
                           <button type="button" onClick={() => setFundingForm({ ...fundingForm, is_cash: true })} className={cn("flex-1 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all", fundingForm.is_cash ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-white text-slate-400 border-slate-100")}>Kas Laci/Tunai</button>
                           <button type="button" onClick={() => setFundingForm({ ...fundingForm, is_cash: false })} className={cn("flex-1 h-10 rounded-xl font-black text-[10px] uppercase tracking-widest border transition-all", !fundingForm.is_cash ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-white text-slate-400 border-slate-100")}>Rekening/Lainnya</button>
                         </div>
                      </div>
                      <div className="space-y-2">
                         <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('products.theme_color')}</Label>
                         <div className="flex items-center gap-4">
                            <input 
                               type="color" 
                               value={fundingForm.color}
                               onChange={(e) => setFundingForm({ ...fundingForm, color: e.target.value })}
                               className="w-12 h-12 rounded-xl border-none p-0 overflow-hidden cursor-pointer bg-white"
                            />
                            <Input 
                               value={fundingForm.color}
                               onChange={(e) => setFundingForm({ ...fundingForm, color: e.target.value })}
                               className="h-12 flex-1 rounded-xl bg-white border-slate-100 font-mono text-xs"
                            />
                         </div>
                      </div>
                      <div className="flex gap-2 pt-4">
                         <Button type="submit" className="flex-1 h-12 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest">
                            {editingFunding ? t('common.save') : t('common.add')}
                         </Button>
                         {editingFunding && (
                           <Button type="button" variant="ghost" className="h-12 px-6 rounded-xl text-[10px] font-black uppercase" onClick={() => { setEditingFunding(null); setFundingForm({ name: "", color: "#10b981", is_cash: true }); }}>
                              {t('common.cancel')}
                           </Button>
                         )}
                      </div>
                   </form>
                </div>
             </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default DailyExpenses;
