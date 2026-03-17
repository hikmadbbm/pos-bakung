"use client";

import React, { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, ExternalLink, RefreshCw, Layers } from "lucide-react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./ui/table";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { api } from "../lib/api";
import { formatIDR } from "../lib/format";
import { cn } from "../lib/utils";

export default function IngredientManager({ isStandalone = false }) {
  const [ingredients, setIngredients] = useState([]);
  const [suggestions, setSuggestions] = useState({ categories: [], itemNames: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("category"); // category, price
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [form, setForm] = useState({
    category: "",
    item_name: "",
    brand: "",
    volume: "",
    unit: "",
    price: "",
    purchase_location: "",
    purchase_link: "",
    notes: ""
  });
  const { success, error } = useToast();

  useEffect(() => {
    loadIngredients();
    loadSuggestions();
  }, []);

  const loadIngredients = async () => {
    try {
      const data = await api.get("/ingredients");
      setIngredients(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestions = async () => {
    try {
      const data = await api.get("/ingredients/suggestions");
      setSuggestions(data);
    } catch (e) {
      console.error("Failed to load suggestions:", e);
    }
  };

  const handleSave = async () => {
    if (saving) return; 
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/ingredients/${editing.id}`, form);
        success("Ingredient updated");
      } else {
        await api.post("/ingredients", form);
        success("Ingredient added");
      }
      setEditing(null);
      setIsAdding(false);
      loadIngredients();
      loadSuggestions();
    } catch (e) {
      error("Error saving: " + (e.response?.data?.details || e.response?.data?.error || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setConfirmDeleteId(null);
    try {
      await api.delete(`/ingredients/${id}`);
      loadIngredients();
      success("Ingredient deleted");
    } catch (e) {
      error("Could not delete. Ingredient might be in use.");
    }
  };

  const filtered = ingredients
    .filter(i => 
      (i.item_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.brand || "").toLowerCase().includes(search.toLowerCase()) ||
      (i.category || "").toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "category") return (a.category || "").localeCompare(b.category || "");
      if (sortBy === "price") return a.price - b.price;
      return 0;
    });

  const openEdit = (i) => {
    setEditing(i);
    setForm({
      category: i.category,
      item_name: i.item_name,
      brand: i.brand,
      volume: i.volume,
      unit: i.unit,
      price: i.price,
      purchase_location: i.purchase_location || "",
      purchase_link: i.purchase_link || "",
      notes: i.notes || ""
    });
    setIsAdding(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      <p className="text-slate-500 font-medium uppercase tracking-widest text-[10px]">Accessing Vault...</p>
    </div>
  );

  return (
    <div className="space-y-10">
      {isStandalone && (
         <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Ingredient Vault</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium text-slate-500 uppercase tracking-widest text-[10px]">Master Material Index</span>
                <span className="w-1 h-1 bg-emerald-600 rounded-full" />
              </div>
            </div>
         </div>
      )}

      {/* Header & Controls */}
      {!isAdding && !editing && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          <div className="md:col-span-8 relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-hover:text-emerald-500 transition-colors" />
            <input 
              placeholder="Search by name, brand, or category..." 
              className="w-full bg-white backdrop-blur-md border border-slate-200 rounded-3xl h-16 pl-14 pr-8 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-semibold text-[11px] text-slate-900 placeholder:text-slate-400 shadow-xl shadow-slate-100"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="md:col-span-4 flex gap-4 h-16">
            <select 
              className="flex-1 bg-white border border-slate-200 rounded-3xl px-6 font-semibold text-[11px] outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all appearance-none cursor-pointer shadow-xl shadow-slate-100"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="category">Category Index</option>
              <option value="price">Valuation</option>
            </select>
            <button 
              onClick={() => { setIsAdding(true); setEditing(null); setForm({ category: "", item_name: "", brand: "", volume: "", unit: "", price: "", purchase_location: "", purchase_link: "", notes: "" }); }} 
              className="flex items-center gap-3 bg-slate-900 hover:bg-black text-white px-10 rounded-3xl font-semibold text-[11px] transition-all active:scale-95 shadow-xl shadow-slate-200"
            >
              <Plus className="w-5 h-5" /> Add Item
            </button>
          </div>
        </div>
      )}

      {/* Form Card */}
      {(isAdding || editing) && (
        <div className="glass-card rounded-[2.5rem] shadow-2xl border-none overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-10 bg-slate-900 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
             <div className="flex items-center justify-between relative z-10">
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold tracking-tight">{editing ? "Refine Material" : "Register Material"}</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Master Ledger Input</p>
                  </div>
                </div>
                <button onClick={() => { setEditing(null); setIsAdding(false); }} className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-rose-500 hover:border-rose-500 transition-all group">
                  <Trash2 className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                </button>
             </div>
          </div>
          
          <div className="p-12 space-y-12 bg-white/50 backdrop-blur-xl">
            {/* Section 1: Basic */}
            <div className="space-y-8">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-4">
                <Layers className="w-4 h-4" /> Entity Definitions
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Classification</label>
                  <input 
                    placeholder="e.g. Protein, Spices" 
                    className="w-full bg-white border border-slate-100 rounded-[1.25rem] h-16 px-8 font-semibold text-[13px] text-slate-900 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm" 
                    value={form.category} 
                    onChange={(e) => setForm({...form, category: e.target.value})}
                    list="category-suggestions"
                  />
                  <datalist id="category-suggestions">
                    {suggestions.categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Universal Name</label>
                  <input 
                    placeholder="e.g. Garlic Powder" 
                    className="w-full bg-white border border-slate-100 rounded-[1.25rem] h-16 px-8 font-semibold text-[13px] text-slate-900 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm" 
                    value={form.item_name} 
                    onChange={(e) => setForm({...form, item_name: e.target.value})}
                    list="item-name-suggestions"
                  />
                  <datalist id="item-name-suggestions">
                    {suggestions.itemNames.map(n => <option key={n} value={n} />)}
                  </datalist>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">OEM / Brand</label>
                  <input 
                    placeholder="e.g. Indofood" 
                    className="w-full bg-white border border-slate-100 rounded-[1.25rem] h-16 px-8 font-semibold text-[13px] text-slate-900 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm" 
                    value={form.brand} 
                    onChange={(e) => setForm({...form, brand: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Financials */}
            <div className="space-y-8">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center gap-4">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Financial Metrics
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Net Volume</label>
                  <input type="number" placeholder="0.00" className="w-full bg-white border border-slate-100 rounded-[1.25rem] h-16 px-8 font-black text-slate-900 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm" value={form.volume} onChange={(e) => setForm({...form, volume: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Metric Unit</label>
                  <input placeholder="e.g. KG, LT, G" className="w-full bg-white border border-slate-100 rounded-[1.25rem] h-16 px-8 font-black uppercase text-[11px] tracking-widest text-slate-900 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm" value={form.unit} onChange={(e) => setForm({...form, unit: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Gross Purchase Price</label>
                  <input type="number" placeholder="Rp" className="w-full bg-emerald-50/50 border border-emerald-100 rounded-[1.25rem] h-16 px-8 font-black text-emerald-600 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all text-2xl shadow-inner shadow-emerald-100/20" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="pt-10 flex justify-end items-center gap-8 border-t border-slate-100">
              <button 
                onClick={() => { setEditing(null); setIsAdding(false); }} 
                className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-400 hover:text-rose-500 transition-all"
              >
                Cancel Registration
              </button>
              <button 
                onClick={handleSave} 
                className="px-16 py-6 bg-slate-900 hover:bg-black text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] transition-all active:scale-95 flex items-center gap-4"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Committing...
                  </>
                ) : (
                  "Commit to Ledger"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List Table */}
      {!isAdding && !editing && (
        <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl border-none p-0 animate-in fade-in duration-700">
          <div className="p-10 border-b border-slate-100 bg-white shadow-sm flex justify-between items-center">
              <div className="flex items-center gap-5">
                 <div className="w-14 h-14 rounded-[1.25rem] bg-slate-900 flex items-center justify-center shadow-xl shadow-slate-200">
                   <Layers className="w-6 h-6 text-white" />
                 </div>
                 <div>
                   <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Material Allocation</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Strategic Strategic Inventory Management</p>
                 </div>
              </div>
              <div className="px-5 py-2 rounded-full bg-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-widest">
                {filtered.length} Items Indexed
              </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500 py-8 pl-10 pr-0">Classification</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500 py-8">Entity Details</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-500 py-8 text-right">Unit Metric</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-8">Valuation</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase text-slate-900 py-8">Unit Cost</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-8 pr-10">Command</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(i => (
                  <TableRow key={i.id} className="hover:bg-slate-50/80 transition-all border-slate-100 border-b last:border-0 group">
                    <TableCell className="pl-10 pr-0 py-8">
                      <span className="px-4 py-1.5 rounded-full bg-emerald-50/50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100/50">{i.category}</span>
                    </TableCell>
                    <TableCell>
                      <p className="font-black text-slate-900 uppercase tracking-tight leading-tight text-base group-hover:text-emerald-600 transition-colors uppercase truncate max-w-[200px]">{i.item_name}</p>
                      <p className="text-[9px] font-black text-slate-300 uppercase mt-1.5 tracking-[0.2em]">{i.brand || "UNBRANDED"}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-black text-slate-900 text-[11px] uppercase tracking-widest">{i.volume} {i.unit}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="font-bold text-slate-400 text-sm tabular-nums">{formatIDR(i.price)}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="font-black text-slate-900 text-lg tabular-nums">{formatIDR(i.cost_per_unit)}</p>
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic group-hover:text-emerald-400 transition-colors uppercase">PER {i.unit}</p>
                    </TableCell>
                    <TableCell className="text-right pr-10">
                      <div className="flex justify-end items-center gap-3">
                        {confirmDeleteId === i.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 p-1.5 rounded-2xl border border-rose-100 animate-in fade-in zoom-in slide-in-from-right-3">
                             <Button variant="destructive" size="sm" className="h-9 px-5 text-[10px] font-black rounded-xl" onClick={() => handleDelete(i.id)}>DELETE</Button>
                             <Button variant="ghost" size="sm" className="h-9 px-5 text-[10px] font-black rounded-xl" onClick={() => setConfirmDeleteId(null)}>ESC</Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                             {i.purchase_link && (
                               <a 
                                 href={i.purchase_link} 
                                 target="_blank" 
                                 rel="noopener noreferrer" 
                                 className="w-12 h-12 rounded-2xl bg-white shadow-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all transform active:scale-95 border border-slate-100"
                               >
                                 <ExternalLink className="w-5 h-5" />
                               </a>
                             )}
                            <button onClick={() => openEdit(i)} className="w-12 h-12 rounded-2xl bg-white shadow-lg flex items-center justify-center text-slate-600 hover:bg-slate-900 hover:text-white transition-all transform active:scale-95 border border-slate-100">
                              <Edit2 className="w-5 h-5" />
                            </button>
                            <button onClick={() => setConfirmDeleteId(i.id)} className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 shadow-lg flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all transform active:scale-95 border border-slate-100">
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          {filtered.length === 0 && (
            <div className="text-center py-40">
              <Layers className="w-20 h-20 text-slate-100 mx-auto mb-8" />
              <h3 className="text-2xl font-black text-slate-900 uppercase">Vault is Empty</h3>
              <p className="text-[10px] text-slate-400 mt-4 max-w-[320px] mx-auto uppercase tracking-widest font-black leading-relaxed">Begin populating your master ledger by adding your first ingredient above</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
