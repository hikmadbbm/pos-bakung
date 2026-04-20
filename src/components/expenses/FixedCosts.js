"use client";
import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { api } from "../../lib/api";
import { formatIDR } from "../../lib/format";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Plus, Trash2, Edit2, Info, Calculator, Sparkles, Calendar } from "lucide-react";
import { useToast } from "../ui/use-toast";
import { ResponsiveDataView } from "../ResponsiveDataView";
import { useTranslation } from "../../lib/language-context";

const frequencyOptions = (t) => [
  { value: "DAILY", label: t('common.timeline') + " " + t('shift.starting') }, // Or just Daily
  { value: "WEEKLY", label: t('orders.filter_weekly') },
  { value: "MONTHLY", label: t('orders.filter_monthly') },
];

const FixedCosts = forwardRef((props, ref) => {
  const { t } = useTranslation();
  const options = frequencyOptions(t);
  const { success, error } = useToast();
  const [fixedCosts, setFixedCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", amount: "", frequency: "MONTHLY" });
  const [isEditing, setIsEditing] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    loadFixedCosts();
  }, []);

  useImperativeHandle(ref, () => ({
    openAdd: () => openCreate()
  }));

  const loadFixedCosts = async () => {
    try {
      const res = await api.get("/fixed-costs");
      setFixedCosts(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        const updated = await api.put(`/fixed-costs/${isEditing}`, formData);
        setFixedCosts(prev => prev.map(ex => ex.id === isEditing ? { ...ex, ...updated } : ex));
        success(t('common.update_success'));
      } else {
        const created = await api.post("/fixed-costs", formData);
        setFixedCosts(prev => [created, ...prev]);
        success(t('common.save_success'));
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (e) {
      console.error(e);
      error(t('common.save_fail'));
    }
  };

  const handleDelete = async (id) => {
    const previous = fixedCosts;
    setConfirmDeleteId(null);
    setFixedCosts(prev => prev.filter(fc => fc.id !== id));
    try {
      await api.delete(`/fixed-costs/${id}`);
      success(t('common.delete_success'));
    } catch (e) {
      console.error(e);
      setFixedCosts(previous);
      error(t('common.delete_fail'));
    }
  };

  const openEdit = (fc) => {
    setFormData({ name: fc.name, amount: fc.amount.toString(), frequency: fc.frequency });
    setIsEditing(fc.id);
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: "", amount: "", frequency: "MONTHLY" });
    setIsEditing(null);
  };

  const calculateDailyTotal = () => {
    return fixedCosts.reduce((acc, fc) => {
      if (fc.frequency === "DAILY") return acc + fc.amount;
      if (fc.frequency === "WEEKLY") return acc + fc.amount / 7;
      if (fc.frequency === "MONTHLY") return acc + fc.amount / 30;
      return acc;
    }, 0);
  };

  const calculateMonthlyTotal = () => {
    return calculateDailyTotal() * 30;
  };

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-emerald-50/50 p-8 rounded-[2.5rem] border border-emerald-100/50 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
             <Calculator className="w-24 h-24 text-emerald-900" />
           </div>
           <div className="relative z-10">
             <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-3">{t('stock.cost_per_unit')} / {t('common.date')}</p>
             <div className="text-4xl md:text-5xl font-black text-emerald-900 tracking-tighter tabular-nums">{formatIDR(calculateDailyTotal())}</div>
             <p className="text-[10px] font-bold text-emerald-700/60 mt-4 flex items-center gap-2 italic uppercase">
               <Info className="w-3.5 h-3.5" /> {t('expenses.avg_daily_cost')}
             </p>
           </div>
        </div>
        <div className="bg-slate-900 p-8 rounded-[2.5rem] relative overflow-hidden group text-white">
           <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-500">
             <Sparkles className="w-24 h-24 text-white" />
           </div>
           <div className="relative z-10">
             <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-3">{t('orders.filter_monthly')} {t('common.total')}</p>
             <div className="text-4xl md:text-5xl font-black text-white tracking-tighter tabular-nums">{formatIDR(calculateMonthlyTotal())}</div>
             <p className="text-[10px] font-bold text-slate-400 mt-4 flex items-center gap-2 italic uppercase">
               <Info className="w-3.5 h-3.5" /> {t('expenses.total_fixed_monthly')}
             </p>
           </div>
        </div>
      </div>

      <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl border-none p-0">
        <ResponsiveDataView
          loading={loading}
          data={fixedCosts}
          emptyMessage={t('expenses.not_found')}
          columns={[
            {
              header: t('common.name'),
              accessor: (fc) => (
                <p className="font-black text-slate-900 uppercase tracking-tight text-base group-hover:text-emerald-600 transition-colors">{fc.name}</p>
              ),
              sortKey: "name",
              className: "pl-10"
            },
            {
              header: t('common.timeline'),
              accessor: (fc) => (
                <span className="px-3 py-1 rounded-full text-[9px] font-black bg-slate-100 text-slate-600 uppercase tracking-widest border border-slate-200 shadow-sm">
                  {fc.frequency}
                </span>
              ),
              sortKey: "frequency"
            },
            {
              header: t('common.total'),
              accessor: (fc) => (
                <span className="font-bold text-slate-400 tabular-nums">{formatIDR(fc.amount)}</span>
              ),
              sortKey: "amount",
              align: "right"
            },
            {
              header: t('stock.cost_per_unit'),
              accessor: (fc) => {
                let daily = 0;
                if (fc.frequency === "DAILY") daily = fc.amount;
                else if (fc.frequency === "WEEKLY") daily = fc.amount / 7;
                else if (fc.frequency === "MONTHLY") daily = fc.amount / 30;
                return (
                  <span className="font-black text-emerald-600 text-lg tabular-nums tracking-tighter">{formatIDR(daily)}</span>
                );
              },
              sortable: false,
              align: "right"
            },
            {
              header: t('common.actions'),
              sortable: false,
              accessor: (fc) => (
                confirmDeleteId === fc.id ? (
                  <div className="flex justify-end items-center gap-1 bg-rose-50 p-1 rounded-2xl border border-rose-100">
                    <Button variant="destructive" size="sm" className="h-8 px-4 rounded-xl text-[10px] font-black uppercase" onClick={() => handleDelete(fc.id)}>{t('common.delete')}</Button>
                    <Button variant="ghost" size="sm" className="h-8 px-4 rounded-xl text-[10px] font-black uppercase text-slate-400" onClick={() => setConfirmDeleteId(null)}>{t('common.no')}</Button>
                  </div>
                ) : (
                  <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:bg-slate-100 hover:text-slate-900 rounded-xl" onClick={() => openEdit(fc)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-300 hover:bg-rose-50 hover:text-rose-600 rounded-xl" onClick={() => setConfirmDeleteId(fc.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )
              ),
              align: "right",
              className: "pr-10"
            }
          ]}
          renderCard={(fc) => {
            let daily = 0;
            if (fc.frequency === "DAILY") daily = fc.amount;
            else if (fc.frequency === "WEEKLY") daily = fc.amount / 7;
            else if (fc.frequency === "MONTHLY") daily = fc.amount / 30;
            return (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-black text-slate-900 uppercase tracking-tight text-lg">{fc.name}</p>
                    <span className="inline-block mt-2 px-3 py-1 rounded-full text-[9px] font-black bg-slate-50 text-slate-600 uppercase tracking-widest border border-slate-100 shadow-sm">
                      {fc.frequency}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('expenses.daily_cost')}</p>
                    <p className="font-black text-emerald-600 text-xl tracking-tighter tabular-nums">{formatIDR(daily)}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                   <div className="text-[10px] font-bold text-slate-400 uppercase">
                      {t('common.total')}: {formatIDR(fc.amount)}
                   </div>
                   <div className="flex gap-2">
                      {confirmDeleteId === fc.id ? (
                        <>
                          <Button variant="destructive" className="h-10 px-4 rounded-xl text-[10px] font-black uppercase" onClick={() => handleDelete(fc.id)}>{t('common.delete')}</Button>
                          <Button variant="outline" className="h-10 px-4 rounded-xl text-[10px] font-black uppercase" onClick={() => setConfirmDeleteId(null)}>{t('common.no')}</Button>
                        </>
                      ) : (
                        <>
                          <Button variant="outline" className="h-10 px-4 rounded-xl text-[10px] font-black uppercase" onClick={() => openEdit(fc)}>{t('common.edit')}</Button>
                          <Button variant="ghost" className="h-10 w-10 rounded-xl text-rose-500 hover:bg-rose-50" onClick={() => setConfirmDeleteId(fc.id)}><Trash2 className="w-4 h-4" /></Button>
                        </>
                      )}
                   </div>
                </div>
              </div>
            );
          }}
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white flex flex-col max-h-[90dvh]">
          <div className="bg-slate-900 p-10 text-center relative overflow-hidden shrink-0">
             <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-600 rounded-full -translate-y-1/2 translate-x-1/2 opacity-20 blur-3xl" />
             <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/20 shadow-2xl relative z-10">
                <Calendar className="w-8 h-8 text-white" />
             </div>
             <DialogTitle className="text-3xl font-black text-white uppercase tracking-tight relative z-10">
               {isEditing ? t('expenses.edit_expense') : t('expenses.add_expense')}
             </DialogTitle>
             <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mt-3 relative z-10">{t('expenses.expense_details')}</p>
          </div>

          <form onSubmit={handleSubmit} className="p-10 space-y-8 flex-1 overflow-y-auto min-h-0 scrollbar-hide">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('common.name')}</Label>
              <Input
                className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-base"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g. Shop Rent"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('common.timeline')}</Label>
                <select
                  className="w-full h-14 rounded-2xl bg-slate-50 border border-slate-100 font-black text-[11px] uppercase tracking-widest px-6 appearance-none cursor-pointer"
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                >
                  {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('expenses.amount_idr')}</Label>
                <Input
                  type="number"
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-xl text-emerald-600"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-6 pt-6 border-t border-slate-50">
              <Button type="button" variant="ghost" className="h-14 px-10 rounded-2xl font-black text-[10px] uppercase text-slate-400" onClick={() => setIsDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" className="h-14 px-12 rounded-2xl font-black bg-slate-900 text-white">{t('common.save')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default FixedCosts;
