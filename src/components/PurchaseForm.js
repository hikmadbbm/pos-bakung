"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, Search, Save, X, Calendar, 
  Package, DollarSign, User, FileText,
  Info, RefreshCw, TrendingUp, Edit3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function PurchaseForm({ onClose, onSuccess, initialData }) {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [isNewIngredient, setIsNewIngredient] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  
  const [formData, setFormData] = useState({
    ingredient_id: "",
    new_ingredient_name: "",
    category: "",
    unit: "",
    volume: "1", // Pack size per quantity
    quantity: "",
    unit_price: "",
    brand: "",
    supplier: "",
    notes: "",
    purchase_date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  });

  const { success, error } = useToast();

  useEffect(() => {
    loadInitial();
  }, []);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const data = await api.get("/ingredients");
      setIngredients(data);

      if (initialData) {
        setFormData({
             ...formData,
             ingredient_id: initialData.ingredient_id,
             quantity: initialData.quantity,
             unit_price: initialData.unit_price,
             volume: initialData.volume || "1",
             supplier: initialData.supplier || "",
             notes: initialData.notes || "",
             purchase_date: new Date(new Date(initialData.purchase_date).getTime() - new Date(initialData.purchase_date).getTimezoneOffset() * 60000).toISOString().slice(0, 16),
             category: initialData.ingredient.category,
             brand: initialData.ingredient.brand || ""
        });
        setSelectedIngredient(initialData.ingredient);
      }
    } catch (e) {
      console.error(e);
      error("Failed to load initial data");
    } finally {
      setLoading(false);
    }
  };

  const filteredIngredients = searchTerm.trim() 
    ? ingredients.filter(i => 
        i.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.brand && i.brand.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : ingredients.slice(0, 5);

  const handleSelectIngredient = (ing) => {
    setSelectedIngredient(ing);
    setIsNewIngredient(false);
    setFormData({
      ...formData,
      ingredient_id: ing.id,
      new_ingredient_name: "",
      unit: ing.unit,
      volume: ing.volume || "1",
      unit_price: ing.price,
      category: ing.category,
      brand: ing.brand || ""
    });
    setSearchTerm("");
  };

  const handleCreateNew = () => {
    setSelectedIngredient(null);
    setIsNewIngredient(true);
    setFormData({
      ...formData,
      ingredient_id: "",
      new_ingredient_name: searchTerm,
      unit: "",
      volume: "1",
      category: "",
      brand: ""
    });
    setSearchTerm("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isEditing = !!initialData?.id;
    const isManualValid = isNewIngredient && formData.new_ingredient_name && formData.category && formData.unit;
    const isExistingValid = (!isNewIngredient && formData.ingredient_id) || isEditing;

    if (!(isManualValid || isExistingValid) || !formData.quantity || !formData.unit_price) {
      error("Please fill in all required fields (Qty & Price are mandatory)");
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing) {
        await api.put(`/purchases/${initialData.id}`, {
          ...formData,
          purchase_date: formData.purchase_date ? new Date(formData.purchase_date).toISOString() : new Date().toISOString(),
          quantity: parseFloat(formData.quantity),
          volume: parseFloat(formData.volume) || 1,
          unit_price: parseInt(formData.unit_price)
        });
        success("Purchase updated successfully");
      } else {
        await api.post("/purchases", {
          ...formData,
          purchase_date: formData.purchase_date ? new Date(formData.purchase_date).toISOString() : new Date().toISOString(),
          quantity: parseFloat(formData.quantity),
          volume: parseFloat(formData.volume) || 1,
          unit_price: parseInt(formData.unit_price)
        });
        success(isNewIngredient ? "New ingredient added and purchase recorded" : "Purchase recorded successfully");
      }
      if (onSuccess) onSuccess();
    } catch (e) {
      console.error(e);
      error(e.response?.data?.error || "Failed to save purchase");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest">Pre-fetching Data...</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-12 pb-10">
      {/* 1. Item Selection Section (Hide if editing) */}
      {!initialData && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-400">Search & Select</h3>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <Input
              placeholder="Search for material or add new..."
              value={searchTerm}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-14 h-16 bg-white border-slate-100 rounded-[1.5rem] font-black text-slate-900 focus-visible:ring-emerald-500 transition-all shadow-sm group-hover:shadow-md"
            />
            
            {searchFocused && (
              <div className="absolute z-[100] w-full mt-4 bg-white border border-slate-100 rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.25)] max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                   <button
                    type="button"
                    onClick={handleCreateNew}
                    className="w-full flex items-center gap-5 p-6 border-b border-slate-50 hover:bg-slate-900 group transition-all text-left"
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-500 transition-colors">
                       <Plus className="w-5 h-5 text-emerald-600 group-hover:text-white" />
                    </div>
                    <div>
                      <div className="font-black text-slate-900 group-hover:text-white uppercase tracking-tight">Create New: "{searchTerm || 'Type Name...'}"</div>
                      <div className="text-[10px] font-black text-slate-400 group-hover:text-emerald-400 uppercase tracking-widest mt-1">Add missing item to system</div>
                    </div>
                  </button>

                  {filteredIngredients.map(i => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => handleSelectIngredient(i)}
                      className="w-full flex items-center justify-between p-6 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-all text-left group"
                    >
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-[10px]">
                           {i.unit}
                        </div>
                        <div>
                           <div className="font-black text-slate-900 uppercase tracking-tight group-hover:text-emerald-600 transition-colors">{i.item_name}</div>
                           <div className="text-[9px] text-slate-300 font-black uppercase tracking-widest mt-1">{i.brand || "UNBRANDED"} • {i.category}</div>
                        </div>
                      </div>
                      <div className="text-right">
                         <div className="text-sm font-black text-emerald-600">{formatIDR(i.price)}</div>
                         <div className="text-[9px] text-slate-300 font-black uppercase tracking-widest mt-1">Last Rate</div>
                      </div>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Basic Info */}
      <div className="space-y-8">
        <div className="flex items-center gap-6">
           <div className="h-px bg-slate-100 flex-1" />
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] whitespace-nowrap">Basic Info</span>
           <div className="h-px bg-slate-100 flex-1" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
             <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</Label>
             <select 
                className="w-full h-14 bg-white border border-slate-100 rounded-2xl px-6 text-sm font-black text-slate-900 outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-sm"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                disabled={(!isNewIngredient && !!selectedIngredient) || !!initialData}
             >
                <option value="">Select Category</option>
                {[...new Set(ingredients.map(i => i.category))].map(c => <option key={c} value={c}>{c}</option>)}
                <option value="New Category">+ Other / New Category</option>
             </select>
          </div>

          <div className="space-y-3">
             <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Material Name</Label>
             <Input
                placeholder="E.G. GARLIC"
                value={isNewIngredient ? formData.new_ingredient_name : (selectedIngredient?.item_name || "")}
                onChange={(e) => setFormData({...formData, new_ingredient_name: e.target.value})}
                readOnly={!isNewIngredient && (!!selectedIngredient || !!initialData)}
                className="h-14 bg-white border-slate-100 rounded-2xl font-black uppercase text-sm px-6 shadow-sm"
             />
          </div>

          <div className="space-y-3">
             <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Brand</Label>
             <Input
                placeholder="E.G. INDOFOOD"
                value={isNewIngredient ? (formData.brand || "") : (formData.brand || selectedIngredient?.brand || "")}
                onChange={(e) => setFormData({...formData, brand: e.target.value})}
                readOnly={!isNewIngredient && (!!selectedIngredient || !!initialData)}
                className="h-14 bg-white border-slate-100 rounded-2xl font-black uppercase text-sm px-6 shadow-sm"
             />
          </div>
        </div>
      </div>

      {/* 3. Pricing & Unit */}
      <div className="space-y-8">
        <div className="flex items-center gap-6">
           <div className="h-px bg-slate-100 flex-1" />
           <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] whitespace-nowrap">Pricing & Unit</span>
           <div className="h-px bg-slate-100 flex-1" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-3">
             <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Qty (pcs/packs)</Label>
             <Input
                type="number"
                placeholder="0"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                className="h-14 bg-white border-slate-100 rounded-2xl font-black text-sm px-6 shadow-sm focus:border-emerald-500"
             />
          </div>

          <div className="space-y-3">
             <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit Weight/Size (Multiplier)</Label>
             <Input
                type="number"
                placeholder="E.G. 1.0"
                value={formData.volume}
                onChange={(e) => setFormData({...formData, volume: e.target.value})}
                className="h-14 bg-white border-slate-100 rounded-2xl font-black text-sm px-6 shadow-sm focus:border-emerald-500"
             />
          </div>

          <div className="space-y-3">
             <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Buy Price (total for this qty)</Label>
             <div className="relative group">
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-500 uppercase">IDR</div>
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({...formData, unit_price: e.target.value})}
                  className="h-14 pl-14 pr-6 bg-emerald-50/20 border-emerald-100/50 rounded-2xl font-black text-slate-900 text-lg shadow-sm focus:border-emerald-500 transition-all"
                />
             </div>
          </div>
        </div>
      </div>

      {/* 4. Footer & Store Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-8">
        <div className="space-y-8">
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                 <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Calendar className="w-3 h-3" /> Date
                 </Label>
                 <Input
                    type="datetime-local"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                    className="h-12 bg-white border-slate-100 rounded-xl font-bold text-xs shadow-sm"
                 />
              </div>
              <div className="space-y-2">
                 <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <User className="w-3 h-3" /> Supplier
                 </Label>
                 <Input
                    placeholder="STORE NAME"
                    value={formData.supplier}
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                    className="h-12 bg-white border-slate-100 rounded-xl font-black uppercase text-[10px] shadow-sm"
                 />
              </div>
           </div>
           
           <div className="p-6 bg-slate-900 rounded-[2rem] flex items-center justify-between shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform">
                 <TrendingUp className="w-12 h-12 text-white" />
              </div>
              <div className="relative z-10">
                 <div className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1.5">Grand Total Update</div>
                 <div className="text-2xl font-black text-white tracking-tighter tabular-nums">
                    {formatIDR((Number(formData.quantity) || 0) * (Number(formData.unit_price) || 0))}
                 </div>
              </div>
              <div className="text-right relative z-10">
                 <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Impact</div>
                 <div className="text-xs font-black text-emerald-500">
                    + {(parseFloat(formData.quantity) || 0) * (parseFloat(formData.volume) || 1)} {selectedIngredient?.unit || "Units"}
                 </div>
              </div>
           </div>
        </div>

        <div className="flex flex-col justify-end gap-6">
           <p className="text-[10px] font-bold text-slate-300 italic text-center md:text-right">
              {initialData ? "Editing will automatically sync stock net-differences." : "Stock will be auto-updated upon confirmation."}
           </p>
           <div className="flex gap-4">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={onClose} 
                className="flex-1 h-16 rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest text-slate-400 border border-slate-100 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving} 
                className={cn(
                  "flex-[2] h-16 rounded-[1.25rem] text-white shadow-2xl font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all",
                  initialData ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" : "bg-slate-900 hover:bg-black shadow-slate-200"
                )}
              >
                {isSaving ? "Saving..." : initialData ? "Confirm Update" : "Confirm Purchase"}
              </Button>
           </div>
        </div>
      </div>
    </form>
  );
}
