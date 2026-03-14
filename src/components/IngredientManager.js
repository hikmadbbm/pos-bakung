"use client";

import React, { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./ui/table";
import { useToast } from "./ui/use-toast";
import { api } from "../lib/api";
import { formatIDR } from "../lib/format";

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
    if (saving) return; // Guard
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
      (i.brand || "").toLowerCase().includes(search.toLowerCase())
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
  };

  if (loading) return <div className="p-10 text-center text-gray-400">Loading ingredients...</div>;

  return (
    <div className="space-y-6">
      {isStandalone && (
         <div className="flex justify-between items-center mb-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 border-none">Ingredient Master</h2>
              <p className="text-sm text-gray-500">Manage raw materials and purchase costs.</p>
            </div>
         </div>
      )}

      {/* Header & Controls */}
      {!isAdding && !editing && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search by name or brand..." 
              className="pl-10 h-10 border-gray-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select 
              className="px-3 py-2 border border-gray-200 rounded-md text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="category">Sort by Category</option>
              <option value="price">Sort by Price</option>
            </select>
            <Button onClick={() => { setIsAdding(true); setEditing(null); setForm({ category: "", item_name: "", brand: "", volume: "", unit: "", price: "", purchase_location: "", purchase_link: "", notes: "" }); }} className="bg-blue-600 hover:bg-blue-700 h-10">
              <Plus className="w-4 h-4 mr-2" /> Add Ingredient
            </Button>
          </div>
        </div>
      )}

      {/* Form Card */}
      {(isAdding || editing) && (
        <Card className="border-blue-100 shadow-xl overflow-hidden">
          <CardHeader className="bg-blue-600 py-4">
            <CardTitle className="text-white text-lg font-bold">{editing ? "Update Ingredient" : "New Ingredient"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 pt-8 px-6">
            {/* Section 1: Basic */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-4 bg-blue-600 rounded-full" /> Basic Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-tight">Category</label>
                  <Input 
                    placeholder="e.g. Meat, Sauce" 
                    className="focus:border-blue-400" 
                    value={form.category} 
                    onChange={(e) => setForm({...form, category: e.target.value})}
                    list="category-suggestions"
                  />
                  <datalist id="category-suggestions">
                    {suggestions.categories.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-tight">Item Name</label>
                  <Input 
                    placeholder="e.g. Chicken Thigh" 
                    className="focus:border-blue-400" 
                    value={form.item_name} 
                    onChange={(e) => setForm({...form, item_name: e.target.value})}
                    list="item-name-suggestions"
                  />
                  <datalist id="item-name-suggestions">
                    {suggestions.itemNames.map(n => <option key={n} value={n} />)}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-tight">Brand</label>
                  <Input placeholder="e.g. ABC, Indofood" className="focus:border-blue-400" value={form.brand} onChange={(e) => setForm({...form, brand: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Section 2: Packaging */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-4 bg-blue-600 rounded-full" /> Packaging & Price
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-tight">Volume Size</label>
                  <Input type="number" placeholder="e.g. 1, 500" className="focus:border-blue-400" value={form.volume} onChange={(e) => setForm({...form, volume: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-tight">Unit</label>
                  <Input placeholder="e.g. kg, gr, ml" className="focus:border-blue-400" value={form.unit} onChange={(e) => setForm({...form, unit: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-tight">Purchase Price</label>
                  <Input type="number" placeholder="Rp" className="focus:border-blue-400 font-bold" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Section 3: Purchase */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-4 bg-blue-600 rounded-full" /> Purchase Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-tight">Location</label>
                  <Input placeholder="Traditional Market, Tokopedia..." className="focus:border-blue-400" value={form.purchase_location} onChange={(e) => setForm({...form, purchase_location: e.target.value})} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-tight">Purchase Link (Optional)</label>
                  <Input placeholder="https://..." className="focus:border-blue-400" value={form.purchase_link} onChange={(e) => setForm({...form, purchase_link: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Section 4: Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-4 bg-blue-600 rounded-full" /> Notes
              </label>
              <Input placeholder="Additional info..." className="focus:border-blue-400" value={form.notes} onChange={(e) => setForm({...form, notes: e.target.value})} />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-3 bg-gray-50/80 py-6 px-6 border-t mt-4">
            <Button variant="ghost" className="h-10 px-6 font-medium text-gray-500" disabled={saving} onClick={() => { setEditing(null); setIsAdding(false); }}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 h-10 px-10 font-bold shadow-md shadow-blue-100 min-w-[160px]">
              {saving ? "Saving..." : "Save Ingredient"}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* List Table */}
      {!isAdding && !editing && (
        <>
          <div className="hidden lg:block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 hover:bg-gray-50/80">
                  <TableHead className="font-bold text-xs uppercase text-gray-600 px-6">Category</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-gray-600">Item Name</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-gray-600">Brand</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-gray-600">Volume/Unit</TableHead>
                  <TableHead className="text-right font-bold text-xs uppercase text-gray-600">Price</TableHead>
                  <TableHead className="text-right font-bold text-xs uppercase text-gray-600">Cost/Unit</TableHead>
                  <TableHead className="font-bold text-xs uppercase text-gray-600">Location</TableHead>
                  <TableHead className="text-center font-bold text-xs uppercase text-gray-600">Link</TableHead>
                  <TableHead className="text-right font-bold text-xs uppercase text-gray-600 px-6">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(i => (
                  <TableRow key={i.id} className="hover:bg-blue-50/30 transition-colors border-b border-gray-50">
                    <TableCell className="px-6">
                      <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-tighter">{i.category}</span>
                    </TableCell>
                    <TableCell className="font-black text-gray-900">{i.item_name}</TableCell>
                    <TableCell className="text-gray-400 font-medium">{i.brand}</TableCell>
                    <TableCell className="text-gray-600 font-semibold">{i.volume} {i.unit}</TableCell>
                    <TableCell className="text-right font-black text-gray-900">{formatIDR(i.price)}</TableCell>
                    <TableCell className="text-right text-[11px] text-gray-400 font-bold italic">{formatIDR(i.cost_per_unit)} / {i.unit}</TableCell>
                    <TableCell className="text-[11px] text-gray-400 font-medium italic">{i.purchase_location || "-"}</TableCell>
                    <TableCell className="text-center">
                       {i.purchase_link ? (
                         <a href={i.purchase_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all transform hover:scale-110 shadow-sm border border-blue-100">
                           <ExternalLink className="w-3.5 h-3.5" />
                         </a>
                       ) : (
                         <span className="text-gray-200">
                           <ExternalLink className="w-3.5 h-3.5" />
                         </span>
                       )}
                    </TableCell>
                    <TableCell className="text-right px-6">
                      <div className="flex justify-end items-center gap-1">
                        {confirmDeleteId === i.id ? (
                          <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-100 animate-in fade-in zoom-in slide-in-from-right-2 duration-200">
                             <span className="text-[10px] font-black text-red-600 px-2 uppercase tracking-tighter">DELETE?</span>
                             <Button variant="destructive" size="sm" className="h-7 px-3 text-[10px] font-black" onClick={() => handleDelete(i.id)}>YES</Button>
                             <Button variant="ghost" size="sm" className="h-7 px-3 text-[10px] font-black" onClick={() => setConfirmDeleteId(null)}>NO</Button>
                          </div>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(i)} className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-600 group">
                              <Edit2 className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setConfirmDeleteId(i.id)} className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-500 group">
                              <Trash2 className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card List */}
          <div className="lg:hidden space-y-4">
            {filtered.map(i => (
              <Card key={i.id} className="p-0 border-none shadow-md overflow-hidden bg-white">
                <div className="bg-gray-50/50 px-4 py-3 flex justify-between items-center border-b">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{i.category}</span>
                  <div className="text-right">
                    <div className="font-black text-gray-900">{formatIDR(i.price)}</div>
                    <div className="text-[10px] text-gray-400 font-bold">{formatIDR(i.cost_per_unit)} / {i.unit}</div>
                  </div>
                </div>
                <div className="px-4 py-4 space-y-3">
                  <div>
                    <div className="font-black text-lg text-gray-900 leading-none mb-1">{i.item_name}</div>
                    <div className="text-xs text-gray-500 font-medium italic">{i.brand} • {i.volume} {i.unit}</div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                    <div className="flex items-center gap-2">
                      <div className="text-[11px] text-gray-400 font-bold flex items-center gap-1 italic">
                        <div className="w-1 h-1 bg-gray-300 rounded-full" /> {i.purchase_location || "No location"}
                      </div>
                      {i.purchase_link && (
                         <a href={i.purchase_link} target="_blank" rel="noopener noreferrer" className="p-1 rounded bg-blue-50 text-blue-600 border border-blue-100">
                           <ExternalLink className="w-3 h-3" />
                         </a>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {confirmDeleteId === i.id ? (
                        <div className="flex items-center gap-1 scale-90 origin-right">
                          <Button variant="destructive" size="sm" className="h-8 px-4 text-xs font-black" onClick={() => handleDelete(i.id)}>YES</Button>
                          <Button variant="ghost" size="sm" className="h-8 px-4 text-xs font-black" onClick={() => setConfirmDeleteId(null)}>NO</Button>
                        </div>
                      ) : (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(i)} className="h-9 w-9 p-0 bg-blue-50/50 text-blue-600">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(i.id)} className="h-9 w-9 p-0 bg-red-50 text-red-500">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
