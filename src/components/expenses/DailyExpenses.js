"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { formatIDR } from "../../lib/format";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select } from "../ui/select";
import { Plus, Trash2, Edit2, Wallet } from "lucide-react";
import { useToast } from "../ui/use-toast";
import { ResponsiveDataView } from "../ResponsiveDataView";

const categoryOptions = [
  { value: "RAW_MATERIAL", label: "Raw Material" },
  { value: "OPERATIONAL", label: "Operational" },
  { value: "PACKAGING", label: "Packaging" },
  { value: "OTHERS", label: "Others" },
];

const emptyForm = { 
  item: "", 
  category: "RAW_MATERIAL", 
  amount: "", 
  date: new Date().toISOString().split('T')[0]
};

export default function DailyExpenses() {
  const { success, error } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const res = await api.get("/expenses");
      setExpenses(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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
        success("Expense updated");
      } else {
        const created = await api.post("/expenses", formData);
        setExpenses(prev => [created, ...prev]);
        success("Expense added");
      }
      closeDialog();
    } catch (e) {
      console.error(e);
      error("Failed to save expense");
    }
  };

  const handleDelete = async (id) => {
    const previous = expenses;
    setConfirmDeleteId(null);
    setExpenses(prev => prev.filter(ex => ex.id !== id));
    try {
      await api.delete(`/expenses/${id}`);
      success("Expense deleted");
    } catch (e) {
      console.error(e);
      setExpenses(previous);
      error("Failed to delete expense");
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
        <div>
          <h3 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">Daily Expenses</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Track your daily spending</p>
        </div>
        <Button onClick={openAdd} className="w-full md:w-auto h-12 px-8 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] bg-slate-900 text-white hover:bg-black shadow-xl active:scale-95 transition-all">
          <Plus className="w-4 h-4 mr-2" /> Add Expense
        </Button>
      </div>

      <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl border-none p-0">
        <ResponsiveDataView
          loading={loading}
          data={expenses}
          emptyMessage="No expenses found"
          columns={[
            {
              header: "Date",
              accessor: (ex) => (
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {new Date(ex.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                </span>
              ),
              className: "pl-10"
            },
            {
              header: "Description",
              accessor: (ex) => (
                <p className="font-black text-slate-900 uppercase tracking-tight text-base group-hover:text-emerald-600 transition-colors">
                  {ex.item}
                </p>
              )
            },
            {
              header: "Category",
              accessor: (ex) => (
                <span className="px-3 py-1 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-600 uppercase tracking-widest border border-emerald-100/50 shadow-sm">
                  {categoryOptions.find(c => c.value === ex.category)?.label || ex.category}
                </span>
              )
            },
            {
              header: "Amount",
              accessor: (ex) => (
                <span className="font-black text-slate-900 text-lg tabular-nums tracking-tighter">
                  {formatIDR(ex.amount)}
                </span>
              ),
              align: "right"
            },
            {
              header: "Actions",
              accessor: (ex) => (
                confirmDeleteId === ex.id ? (
                  <div className="flex justify-end items-center gap-1 bg-rose-50 p-1 rounded-2xl border border-rose-100">
                    <Button variant="destructive" size="sm" className="h-8 px-4 rounded-xl text-[10px] font-black uppercase" onClick={() => handleDelete(ex.id)}>Delete</Button>
                    <Button variant="ghost" size="sm" className="h-8 px-4 rounded-xl text-[10px] font-black uppercase text-slate-400" onClick={() => setConfirmDeleteId(null)}>No</Button>
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
                      {categoryOptions.find(c => c.value === ex.category)?.label || ex.category}
                   </span>
                </div>
                <div className="text-right">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Amount</p>
                   <p className="font-black text-slate-900 text-xl tracking-tighter tabular-nums">{formatIDR(ex.amount)}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-50">
                <Button variant="outline" className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase" onClick={() => openEdit(ex)}>Edit</Button>
                <Button variant="ghost" className="h-12 w-12 rounded-xl text-rose-500 hover:bg-rose-50" onClick={() => setConfirmDeleteId(ex.id)}><Trash2 className="w-4.5 h-4.5" /></Button>
              </div>
            </div>
          )}
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white flex flex-col max-h-[90dvh]">
          <div className="bg-slate-900 p-10 text-center relative overflow-hidden shrink-0">
             <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-600 rounded-full -translate-y-1/2 translate-x-1/2 opacity-20 blur-3xl" />
             <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/20 shadow-2xl relative z-10">
                <Wallet className="w-8 h-8 text-white" />
             </div>
             <DialogTitle className="text-3xl font-black text-white uppercase tracking-tight relative z-10">
               {editingId ? "Edit Expense" : "New Expense"}
             </DialogTitle>
             <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mt-3 relative z-10">Expense Details</p>
          </div>

          <form onSubmit={handleSubmit} className="p-10 space-y-8 flex-1 overflow-y-auto min-h-0 scrollbar-hide">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</Label>
                <Input
                  type="date"
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-base"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</Label>
                <select
                  className="w-full h-14 rounded-2xl bg-slate-50 border border-slate-100 font-black text-[11px] uppercase tracking-widest px-6 appearance-none cursor-pointer"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Description</Label>
              <Input
                className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-base"
                value={formData.item}
                onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                required
                placeholder="e.g. 5KG Sugar"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Amount (IDR)</Label>
              <Input
                type="number"
                className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-2xl text-emerald-600"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                placeholder="0"
              />
            </div>

            <div className="flex items-center justify-between gap-6 pt-6 border-t border-slate-50">
              <Button type="button" variant="ghost" className="h-14 px-10 rounded-2xl font-black text-[10px] uppercase text-slate-400" onClick={closeDialog}>Cancel</Button>
              <Button type="submit" className="h-14 px-12 rounded-2xl font-black bg-slate-900 text-white">Save Expense</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
