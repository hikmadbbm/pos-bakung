"use client";

import React, { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, ExternalLink, RefreshCw, Layers, ArrowRight, X, TrendingUp, Calendar } from "lucide-react";
import { Button } from "./ui/button";
import { useToast } from "./ui/use-toast";
import { api } from "../lib/api";
import { formatIDR } from "../lib/format";
import { cn } from "../lib/utils";
import { ResponsiveDataView } from "./ResponsiveDataView";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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
  const [historyItem, setHistoryItem] = useState(null);
  const [historyRange, setHistoryRange] = useState("30"); // 7, 30, 90
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
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

  const loadHistory = async (ingredient) => {
    setHistoryItem(ingredient);
    setHistoryLoading(true);
    try {
      const data = await api.get(`/ingredients/${ingredient.id}`);
      setHistoryData(data.price_history || []);
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
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
         <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="w-full md:w-auto">
              <h2 className="text-2xl font-bold tracking-tight text-slate-800">Raw Materials</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <p className="text-xs text-slate-500 font-medium">Manage your raw components</p>
              </div>
            </div>
            {!isAdding && !editing && (
              <button 
                onClick={() => { setIsAdding(true); setEditing(null); setForm({ category: "", item_name: "", brand: "", volume: "", unit: "", price: "", purchase_location: "", purchase_link: "", notes: "" }); }} 
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white px-6 h-12 rounded-xl font-semibold text-sm transition-all active:scale-95 shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Material
              </button>
            )}
         </div>
      )}

      {/* Header & Controls */}
      {!isAdding && !editing && (
        <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <div className="relative flex-1 group w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              placeholder="Search materials..." 
              className="w-full bg-slate-50/50 border-none rounded-xl h-11 pl-11 pr-4 outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all font-medium text-sm text-slate-900 placeholder:text-slate-400"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <select 
              className="h-11 bg-slate-50/50 border-none rounded-xl px-4 text-sm font-medium text-slate-600 outline-none min-w-[140px] focus:ring-2 focus:ring-emerald-500/10 cursor-pointer appearance-none"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="category">Category</option>
              <option value="price">Price</option>
            </select>
            
            <div className="h-11 flex items-center bg-emerald-50/50 rounded-xl px-4 border border-emerald-100/20 whitespace-nowrap">
               <Layers className="w-3.5 h-3.5 text-emerald-600" />
               <span className="ml-2 text-xs font-semibold text-emerald-700">{filtered.length} Items</span>
            </div>
          </div>
        </div>
      )}

      {/* Form Card */}
      {(isAdding || editing) && (
        <div className="bg-white border border-slate-100 rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="p-6 md:p-8 bg-slate-900 text-white flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg md:text-xl font-bold">{editing ? "Edit Material" : "Add New Material"}</h3>
              <p className="text-xs text-slate-400 font-medium tracking-wide">Enter the details for your raw component</p>
            </div>
            <button 
              onClick={() => { setEditing(null); setIsAdding(false); }} 
              className="hover:bg-white/10 p-2 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          
          <div className="p-6 md:p-8 space-y-8">
            {/* Section 1: Basic */}
            <div className="space-y-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-3">
                Basic Information
                <div className="flex-1 h-px bg-slate-100" />
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 ml-1">Category</label>
                  <input 
                    placeholder="e.g. PROTEIN" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl h-11 px-4 font-medium text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all uppercase placeholder:text-slate-300" 
                    value={form.category} 
                    onChange={(e) => setForm({...form, category: e.target.value})}
                    list="category-suggestions"
                  />
                  <datalist id="category-suggestions">
                    {suggestions.categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 ml-1">Material Name</label>
                  <input 
                    placeholder="e.g. GARLIC" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl h-11 px-4 font-medium text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all uppercase placeholder:text-slate-300" 
                    value={form.item_name} 
                    onChange={(e) => setForm({...form, item_name: e.target.value})}
                    list="item-name-suggestions"
                  />
                  <datalist id="item-name-suggestions">
                    {suggestions.itemNames.map(n => <option key={n} value={n} />)}
                  </datalist>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 ml-1">Brand</label>
                  <input 
                    placeholder="e.g. INDOFOOD" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl h-11 px-4 font-medium text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all uppercase placeholder:text-slate-300" 
                    value={form.brand} 
                    onChange={(e) => setForm({...form, brand: e.target.value})} 
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Financials */}
            <div className="space-y-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-3">
                Pricing & Units
                <div className="flex-1 h-px bg-slate-100" />
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 ml-1">Buy Quantity</label>
                  <input type="number" placeholder="0.00" className="w-full bg-slate-50 border border-slate-100 rounded-xl h-11 px-4 font-medium text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all" value={form.volume} onChange={(e) => setForm({...form, volume: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 ml-1">Unit</label>
                  <input placeholder="e.g. KG, LT, G" className="w-full bg-slate-50 border border-slate-100 rounded-xl h-11 px-4 font-medium text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all uppercase" value={form.unit} onChange={(e) => setForm({...form, unit: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 ml-1">Purchase Price</label>
                  <div className="relative group">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">IDR</span>
                    <input type="number" placeholder="0" className="w-full bg-slate-50 border border-slate-100 rounded-xl h-11 pl-12 pr-4 font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all text-base" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 flex flex-col md:flex-row justify-end items-center gap-3 border-t border-slate-50">
              <button 
                onClick={() => { setEditing(null); setIsAdding(false); }} 
                className="w-full md:w-auto px-6 h-11 font-semibold text-sm text-slate-400 hover:text-rose-500 transition-colors order-2 md:order-1"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave} 
                className="w-full md:w-auto px-8 h-11 bg-slate-900 hover:bg-black text-white rounded-xl font-semibold text-sm transition-all active:scale-95 flex items-center justify-center gap-2 order-1 md:order-2 shadow-sm"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save Changes <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List Table */}
      {!isAdding && !editing && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-700">
          <ResponsiveDataView
            loading={loading}
            data={filtered}
            emptyMessage="No materials found"
            columns={[
              {
                header: "Category",
                accessor: (i) => (
                  <span className="inline-flex px-3 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                    {i.category}
                  </span>
                ),
                className: "pl-8"
              },
              {
                header: "Material Details",
                accessor: (i) => (
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{i.item_name}</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">{i.brand || "GENERIC"}</p>
                  </div>
                )
              },
              {
                header: "Buy Info",
                accessor: (i) => (
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-700 text-sm">{i.volume} <span className="text-[10px] text-slate-400 uppercase ml-0.5">{i.unit}</span></span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{formatIDR(i.price)}</span>
                  </div>
                ),
                align: "right"
              },
              {
                header: "Cost/Unit",
                accessor: (i) => (
                  <div className="flex flex-col items-end">
                    <p className="font-bold text-emerald-600 text-base tabular-nums">{formatIDR(i.cost_per_unit)}</p>
                    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-tight">per {i.unit}</p>
                  </div>
                ),
                align: "right"
              },
              {
                header: "Actions",
                accessor: (i) => (
                  confirmDeleteId === i.id ? (
                    <div className="flex items-center justify-end gap-1">
                       <Button variant="destructive" size="sm" className="h-8 px-4 text-[10px] font-bold rounded-lg uppercase" onClick={() => handleDelete(i.id)}>Delete</Button>
                       <Button variant="ghost" size="sm" className="h-8 px-4 text-[10px] font-bold rounded-lg uppercase text-slate-400" onClick={() => setConfirmDeleteId(null)}>No</Button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all pr-2">
                       {i.purchase_link && (
                         <a 
                           href={i.purchase_link} 
                           target="_blank" 
                           rel="noopener noreferrer" 
                           className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                           title="Buy Link"
                         >
                           <ExternalLink className="w-4 h-4" />
                         </a>
                       )}
                       <button onClick={() => loadHistory(i)} className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 hover:text-emerald-900 transition-all" title="Price History">
                         <TrendingUp className="w-4 h-4" />
                       </button>
                       <button onClick={() => openEdit(i)} className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all" title="Edit">
                         <Edit2 className="w-4 h-4" />
                       </button>
                      <button onClick={() => setConfirmDeleteId(i.id)} className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                ),
                align: "right",
                className: "pr-8"
              }
            ]}
            renderCard={(i) => (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[9px] font-bold uppercase">{i.category}</span>
                      <span className="text-[9px] font-medium text-slate-400 uppercase">{i.brand || "Generic"}</span>
                    </div>
                    <p className="font-bold text-slate-800 text-base">{i.item_name}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => loadHistory(i)} className="p-2 bg-emerald-50 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-all" title="Price History"><TrendingUp className="w-4 h-4" /></button>
                    <button onClick={() => openEdit(i)} className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition-all font-bold uppercase"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => setConfirmDeleteId(i.id)} className="p-2 bg-rose-50 rounded-lg text-rose-400 hover:text-rose-600 transition-all font-bold uppercase"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-50 pt-4 mt-2">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Package Info</p>
                    <p className="font-bold text-slate-700 text-sm">{i.volume} {i.unit} @ {formatIDR(i.price)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Unit Cost</p>
                    <p className="font-bold text-emerald-600 text-lg tabular-nums">{formatIDR(i.cost_per_unit)}<span className="text-[9px] font-medium text-slate-400 ml-0.5 uppercase">/{i.unit}</span></p>
                  </div>
                </div>
                
                {confirmDeleteId === i.id && (
                   <div className="flex gap-2 pt-4 border-t border-slate-100">
                      <Button variant="destructive" className="flex-1 h-10 rounded-lg text-xs font-bold uppercase" onClick={() => handleDelete(i.id)}>Delete</Button>
                      <Button variant="ghost" className="flex-1 h-10 rounded-lg text-xs font-bold uppercase" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                   </div>
                )}
              </div>
            )}
          />
        </div>
      )}
      {/* Price History Modal */}
      {historyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setHistoryItem(null)} />
           <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                       <TrendingUp className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div>
                       <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">{historyItem.item_name}</h3>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{historyItem.category} • HPP TREND ANALYSIS</p>
                    </div>
                 </div>
                 <button onClick={() => setHistoryItem(null)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10">
                 {/* Filters */}
                 <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-4">
                       <div className="w-10 h-px bg-slate-200" />
                       Data Visualization
                    </h4>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                       {[
                         { id: "7", label: "7D" },
                         { id: "30", label: "30D" },
                         { id: "90", label: "90D" }
                       ].map(r => (
                         <button
                           key={r.id}
                           onClick={() => setHistoryRange(r.id)}
                           className={cn(
                             "px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all",
                             historyRange === r.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                           )}
                         >
                           {r.label}
                         </button>
                       ))}
                    </div>
                 </div>

                 {/* Chart Card */}
                 <div className="glass-card p-8 rounded-[2rem] border-none shadow-xl bg-slate-50/50 relative">
                    {historyLoading ? (
                       <div className="h-[300px] flex items-center justify-center">
                          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
                       </div>
                    ) : historyData.length > 1 ? (
                       <div className="h-[300px] w-full">
                          <ResponsiveContainer width="100%" height="100%">
                             <LineChart data={historyData.filter(d => {
                               const days = parseInt(historyRange);
                               const minDate = new Date();
                               minDate.setDate(minDate.getDate() - days);
                               return new Date(d.date) >= minDate;
                             }).map(d => ({
                                date: new Date(d.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
                                hpp: d.cost_per_unit || 0
                             }))}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.1} />
                                <XAxis dataKey="date" axisLine={false} tickLine={false} className="text-[9px] font-bold text-slate-400 uppercase" />
                                <YAxis hide />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: '#0f172a', 
                                    border: 'none',
                                    borderRadius: '16px',
                                    padding: '12px 16px',
                                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                                  }}
                                  itemStyle={{ color: '#10b981', fontWeight: '900', fontSize: '13px' }}
                                  labelStyle={{ color: '#94a3b8', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px' }}
                                  formatter={(val) => [`Rp${val.toLocaleString()}`, 'HPP']}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey="hpp" 
                                  stroke="#10b981" 
                                  strokeWidth={4} 
                                  dot={{ r: 4, stroke: '#10b981', strokeWidth: 2, fill: '#fff' }}
                                  activeDot={{ r: 8, stroke: '#10b981', strokeWidth: 0, fill: '#10b981' }}
                                />
                             </LineChart>
                          </ResponsiveContainer>
                       </div>
                    ) : (
                       <div className="h-[300px] flex flex-col items-center justify-center text-slate-400 gap-4">
                          <TrendingUp className="w-12 h-12 opacity-10" />
                          <p className="text-xs font-bold uppercase tracking-widest italic">Not enough historical data points yet</p>
                       </div>
                    )}
                 </div>

                 {/* Statistics Recap */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                       { label: "Current HPP", value: formatIDR(historyItem.cost_per_unit), color: "text-emerald-600" },
                       { label: "Data points", value: historyData.length, color: "text-slate-900" },
                       { label: "Base Unit", value: historyItem.unit, color: "text-slate-400" },
                       { label: "Last Updated", value: new Date(historyItem.updated_at).toLocaleDateString(), color: "text-slate-400" }
                    ].map((s, idx) => (
                       <div key={idx} className="p-5 bg-white border border-slate-100 rounded-2xl">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.label}</p>
                          <p className={cn("text-sm font-black uppercase tabular-nums", s.color)}>{s.value}</p>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="p-8 bg-slate-50 flex justify-end gap-3">
                 <button 
                   onClick={() => setHistoryItem(null)}
                   className="px-8 h-12 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-900/10 active:scale-95 transition-all"
                 >
                   Close Insights
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
