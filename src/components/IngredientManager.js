"use client";

import React, { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, ExternalLink, RefreshCw, Layers, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { api } from "../lib/api";
import { formatIDR } from "../lib/format";
import { cn } from "../lib/utils";
import { ResponsiveDataView } from "./ResponsiveDataView";

export default function IngredientManager({ isStandalone = false }) {
  const [ingredients, setIngredients] = useState([]);
  const [suggestions, setSuggestions] = useState({ categories: [], itemNames: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("category"); 
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
        success("Material updated");
      } else {
        await api.post("/ingredients", form);
        success("Material added");
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
      success("Material deleted");
    } catch (e) {
      error("Could not delete. Material might be in use.");
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
      <p className="text-slate-500 font-medium uppercase tracking-widest text-[10px]">Loading...</p>
    </div>
  );

  return (
    <div className="space-y-12 animate-fade-in relative px-4 md:px-0">
      {isStandalone && (
         <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="w-full md:w-auto">
              <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">Raw Materials</h2>
              <div className="flex items-center gap-2.5 mt-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Manage your raw components</p>
              </div>
            </div>
            {!isAdding && !editing && (
              <button 
                onClick={() => { setIsAdding(true); setEditing(null); setForm({ category: "", item_name: "", brand: "", volume: "", unit: "", price: "", purchase_location: "", purchase_link: "", notes: "" }); }} 
                className="w-full md:w-auto flex items-center justify-center gap-4 bg-slate-900 hover:bg-black text-white px-10 h-16 rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all active:scale-95 shadow-2xl shadow-slate-200"
              >
                <Plus className="w-5 h-5" /> Add Material
              </button>
            )}
         </div>
      )}

      {/* Header & Controls */}
      {!isAdding && !editing && (
        <div className="glass-card p-4 rounded-[2rem] border-none shadow-2xl bg-white/50 backdrop-blur-xl flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              placeholder="Search materials..." 
              className="w-full bg-white/80 border-slate-100 rounded-2xl h-14 pl-14 pr-8 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-black text-[10px] uppercase tracking-widest text-slate-900 placeholder:text-slate-400 shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select 
              className="h-14 bg-white/80 border border-slate-100 rounded-2xl px-8 text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none min-w-[150px] md:min-w-[200px] focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all cursor-pointer shadow-sm appearance-none"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="category">Category</option>
              <option value="price">Price</option>
            </select>
            
            <div className="h-14 flex items-center bg-slate-100/50 rounded-2xl px-4 border border-slate-100 whitespace-nowrap">
               <Layers className="w-4 h-4 text-slate-400" />
               <span className="ml-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">{filtered.length} Items</span>
            </div>
          </div>
        </div>
      )}

      {/* Form Card */}
      {(isAdding || editing) && (
        <div className="glass-card rounded-[3rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border-none overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="p-8 md:p-12 bg-slate-900 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-emerald-600/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
             <div className="flex items-center justify-between relative z-10">
                <div className="space-y-3">
                  <h3 className="text-2xl md:text-4xl font-black tracking-tighter uppercase">{editing ? "Edit Material" : "Add Material"}</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Material Details</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setEditing(null); setIsAdding(false); }} 
                  className="w-12 h-12 md:w-16 md:h-16 rounded-[1.25rem] md:rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center hover:bg-rose-600 transition-all group shadow-2xl"
                >
                  <Trash2 className="w-5 h-5 md:w-6 md:h-6 text-white group-hover:scale-110 transition-transform" />
                </button>
             </div>
          </div>
          
          <div className="p-8 md:p-14 space-y-12 md:space-y-16 bg-white/40 backdrop-blur-2xl">
            {/* Section 1: Basic */}
            <div className="space-y-8 md:space-y-10">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] flex items-center gap-5">
                <div className="w-8 h-px bg-slate-200" /> Basic Info
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Category</label>
                  <input 
                    placeholder="e.g. PROTEIN" 
                    className="w-full bg-white border border-slate-100 rounded-2xl h-14 md:h-18 px-6 md:px-8 font-black text-sm text-slate-900 outline-none focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all shadow-sm uppercase placeholder:text-slate-200" 
                    value={form.category} 
                    onChange={(e) => setForm({...form, category: e.target.value})}
                    list="category-suggestions"
                  />
                  <datalist id="category-suggestions">
                    {suggestions.categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Material Name</label>
                  <input 
                    placeholder="e.g. GARLIC" 
                    className="w-full bg-white border border-slate-100 rounded-2xl h-14 md:h-18 px-6 md:px-8 font-black text-sm text-slate-900 outline-none focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all shadow-sm uppercase placeholder:text-slate-200" 
                    value={form.item_name} 
                    onChange={(e) => setForm({...form, item_name: e.target.value})}
                    list="item-name-suggestions"
                  />
                  <datalist id="item-name-suggestions">
                    {suggestions.itemNames.map(n => <option key={n} value={n} />)}
                  </datalist>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Brand</label>
                  <input 
                    placeholder="e.g. INDOFOOD" 
                    className="w-full bg-white border border-slate-100 rounded-2xl h-14 md:h-18 px-6 md:px-8 font-black text-sm text-slate-900 outline-none focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all shadow-sm uppercase placeholder:text-slate-200" 
                    value={form.brand} 
                    onChange={(e) => setForm({...form, brand: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Financials */}
            <div className="space-y-8 md:space-y-10">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] flex items-center gap-5">
                <div className="w-8 h-px bg-slate-200" /> Pricing & Unit
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Buy Qty</label>
                  <input type="number" placeholder="0.00" className="w-full bg-white border border-slate-100 rounded-2xl h-14 md:h-18 px-6 md:px-8 font-black text-lg text-slate-900 outline-none focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all shadow-sm" value={form.volume} onChange={(e) => setForm({...form, volume: e.target.value})} />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Unit</label>
                  <input placeholder="e.g. KG, LT, G" className="w-full bg-white border border-slate-100 rounded-2xl h-14 md:h-18 px-6 md:px-8 font-black uppercase text-xs tracking-widest text-slate-900 outline-none focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all shadow-sm" value={form.unit} onChange={(e) => setForm({...form, unit: e.target.value})} />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Buy Price</label>
                  <div className="relative group">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-600/40">IDR</span>
                    <input type="number" placeholder="0" className="w-full bg-emerald-50/30 border border-emerald-100/50 rounded-2xl h-14 md:h-18 pl-16 pr-8 font-black text-emerald-700 outline-none focus:ring-8 focus:ring-emerald-500/5 transition-all text-xl md:text-2xl shadow-inner" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-10 md:pt-14 flex flex-col md:flex-row justify-end items-center gap-6 md:gap-10 border-t border-slate-100/50">
              <button 
                onClick={() => { setEditing(null); setIsAdding(false); }} 
                className="font-black text-[10px] uppercase tracking-[0.4em] text-slate-300 hover:text-rose-600 transition-all order-2 md:order-1"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave} 
                className="w-full md:w-auto px-12 md:px-20 h-16 md:h-18 bg-slate-900 hover:bg-black text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-5 order-1 md:order-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save Material <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List Table */}
      {!isAdding && !editing && (
        <div className="glass-card rounded-[3rem] overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] border-none p-0 animate-in fade-in duration-1000">
          <ResponsiveDataView
            loading={loading}
            data={filtered}
            emptyMessage="No materials found"
            columns={[
              {
                header: "Category",
                accessor: (i) => (
                  <span className="inline-flex w-fit whitespace-nowrap px-4 py-1.5 rounded-xl bg-slate-900 text-white text-[9px] font-black uppercase tracking-widest border border-slate-900 shadow-lg shadow-slate-900/10">
                    {i.category}
                  </span>
                ),
                className: "pl-12"
              },
              {
                header: "Name",
                accessor: (i) => (
                  <div>
                    <p className="font-black text-slate-900 uppercase tracking-tight leading-tight text-lg group-hover:text-emerald-600 transition-colors truncate max-w-[220px]">{i.item_name}</p>
                    <p className="text-[10px] font-black text-slate-300 uppercase mt-2">{i.brand || "UNBRANDED"}</p>
                  </div>
                )
              },
              {
                header: "Buy Qty",
                accessor: (i) => (
                  <span className="font-black text-slate-900 text-sm">{i.volume} <span className="text-[10px] text-slate-300 uppercase tracking-widest ml-1">{i.unit}</span></span>
                ),
                align: "right"
              },
              {
                header: "Buy Price",
                accessor: (i) => (
                  <p className="font-bold text-slate-400 text-sm tabular-nums">{formatIDR(i.price)}</p>
                ),
                align: "right"
              },
              {
                header: "Cost/Unit",
                accessor: (i) => (
                  <div className="flex flex-col items-end">
                    <p className="font-black text-slate-900 text-xl tracking-tighter tabular-nums">{formatIDR(i.cost_per_unit)}</p>
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em] mt-1">/{i.unit}</p>
                  </div>
                ),
                align: "right"
              },
              {
                header: "Actions",
                accessor: (i) => (
                  confirmDeleteId === i.id ? (
                    <div className="flex items-center justify-end gap-1 bg-rose-50 p-2 rounded-2xl border border-rose-100">
                       <Button variant="destructive" size="sm" className="h-10 px-6 text-[10px] font-black rounded-xl uppercase tracking-widest shadow-lg shadow-rose-200" onClick={() => handleDelete(i.id)}>Delete</Button>
                       <Button variant="ghost" size="sm" className="h-10 px-6 text-[10px] font-black rounded-xl uppercase tracking-widest text-slate-400" onClick={() => setConfirmDeleteId(null)}>No</Button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 pr-2">
                       {i.purchase_link && (
                         <a 
                           href={i.purchase_link} 
                           target="_blank" 
                           rel="noopener noreferrer" 
                           className="w-12 h-12 rounded-2xl bg-white shadow-xl flex items-center justify-center text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all transform active:scale-95 border border-slate-100"
                           title="Buy Link"
                         >
                           <ExternalLink className="w-5 h-5" />
                         </a>
                       )}
                      <button onClick={() => openEdit(i)} className="w-12 h-12 rounded-2xl bg-white shadow-xl flex items-center justify-center text-slate-600 hover:bg-slate-900 hover:text-white transition-all transform active:scale-95 border border-slate-100" title="Edit">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button onClick={() => setConfirmDeleteId(i.id)} className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 shadow-xl flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all transform active:scale-95 border border-slate-100" title="Delete">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )
                ),
                align: "right",
                className: "pr-12"
              }
            ]}
            renderCard={(i) => (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-black text-slate-900 uppercase tracking-tight text-lg">{i.item_name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{i.category} • {i.brand || "Generic"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(i)} className="p-2 bg-slate-100 rounded-xl text-slate-400"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => setConfirmDeleteId(i.id)} className="p-2 bg-rose-50 rounded-xl text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="flex justify-between items-end border-t border-slate-50 pt-4 mt-4">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Buy Package</p>
                    <p className="font-black text-slate-900 text-sm uppercase">{i.volume} {i.unit} @ {formatIDR(i.price)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Cost/Unit</p>
                    <p className="font-black text-emerald-600 text-xl tracking-tighter tabular-nums">{formatIDR(i.cost_per_unit)}<span className="text-[8px] ml-0.5 opacity-60">/{i.unit}</span></p>
                  </div>
                </div>
                
                {confirmDeleteId === i.id && (
                   <div className="flex gap-2 pt-4 border-t border-slate-100">
                      <Button variant="destructive" className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase" onClick={() => handleDelete(i.id)}>Confirm Delete</Button>
                      <Button variant="ghost" className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                   </div>
                )}
              </div>
            )}
          />
        </div>
      )}
    </div>
  );
}
