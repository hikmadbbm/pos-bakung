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

import PurchaseOCR from "./PurchaseOCR";
import PriceChangeAlert from "./PriceChangeAlert";
import { Sparkles, History } from "lucide-react";

export default function PurchaseForm({ onClose, onSuccess, initialData }) {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [isNewIngredient, setIsNewIngredient] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [showOCR, setShowOCR] = useState(false);
  const [showPriceAlert, setShowPriceAlert] = useState(false);
  const [priceHistory, setPriceHistory] = useState([]);
  
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
    purchase_date: new Date().toISOString().split('T')[0]
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
             purchase_date: new Date(initialData.purchase_date).toISOString().split('T')[0],
             category: initialData.ingredient.category,
             brand: initialData.ingredient.brand || ""
        });
        setSelectedIngredient(initialData.ingredient);
        loadPriceHistory(initialData.ingredient_id);
      }
    } catch (e) {
      console.error(e);
      error("Failed to load initial data");
    } finally {
      setLoading(false);
    }
  };

  const loadPriceHistory = async (id) => {
    try {
      const res = await api.get(`/ingredients/${id}/price-history`);
      if (res) setPriceHistory(res);
    } catch (e) {
      console.warn("Failed to load history", e);
    }
  };

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
    loadPriceHistory(ing.id);
  };

  const handleOCRExtracted = (data) => {
    // If multiple items, we'll suggest the first one that matches or just take the first
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      
      // Try to find a match in the ingredients list
      const match = ingredients.find(ing => 
        ing.item_name.toLowerCase() === item.name.toLowerCase()
      );
      
      if (match) {
        handleSelectIngredient(match);
      } else {
        setIsNewIngredient(true);
        setFormData(prev => ({
          ...prev,
          new_ingredient_name: item.name,
          unit: item.unit || prev.unit,
          unit_price: item.unit_price || prev.unit_price,
          quantity: item.quantity || prev.quantity
        }));
      }

      setFormData(prev => ({
        ...prev,
        supplier: data.supplier || prev.supplier,
        notes: `OCR Imported: ${item.name} total ${item.total_price}`
      }));

      success(`Successfully extracted ${data.items.length} items. Mapping first item.`);
    }
  };

  const checkPriceIntelligence = () => {
    if (!selectedIngredient || !formData.unit_price) return;
    const currentWac = selectedIngredient.cost_per_unit || 0;
    const newCpu = Number(formData.unit_price) / (Number(formData.volume) || 1);
    
    // Only show alert if price changed significantly (>0.5%)
    if (currentWac > 0 && Math.abs((newCpu - currentWac) / currentWac) > 0.005) {
      setShowPriceAlert(true);
    }
  };

  useEffect(() => {
    if (selectedIngredient && formData.unit_price) {
      const timer = setTimeout(checkPriceIntelligence, 1000);
      return () => clearTimeout(timer);
    }
  }, [formData.unit_price, selectedIngredient]);

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
      // Merge selected date with current time
      const finalDate = new Date(formData.purchase_date);
      const now = new Date();
      finalDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

      if (isEditing) {
        await api.put(`/purchases/${initialData.id}`, {
          ...formData,
          purchase_date: finalDate.toISOString(),
          quantity: parseFloat(formData.quantity),
          volume: parseFloat(formData.volume) || 1,
          unit_price: parseInt(formData.unit_price)
        });
        success("Purchase updated successfully");
      } else {
        await api.post("/purchases", {
          ...formData,
          purchase_date: finalDate.toISOString(),
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
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Search Material</h3>
          </div>
          
          <div className="flex gap-2">
            <div className="relative group flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <Input
                placeholder="Search or add new..."
                value={searchTerm}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 bg-white border-slate-100 rounded-xl font-semibold text-slate-900 focus-visible:ring-emerald-500/10 transition-all shadow-sm"
              />
              
              {searchFocused && (
                <div className="absolute z-[100] w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-1">
                     <button
                      type="button"
                      onClick={() => {
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
                      }}
                      className="w-full flex items-center gap-3 p-3 border-b border-slate-50 hover:bg-slate-50 transition-all text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                         <Plus className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-sm">Create "{searchTerm || 'New Material'}"</div>
                        <div className="text-[9px] font-medium text-slate-400 uppercase tracking-tight mt-0.5">Add to inventory</div>
                      </div>
                    </button>

                    {ingredients
                      .filter(i => 
                        i.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (i.brand && i.brand.toLowerCase().includes(searchTerm.toLowerCase()))
                      )
                      .slice(0, 5)
                      .map(i => (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => handleSelectIngredient(i)}
                        className="w-full flex items-center justify-between p-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-all text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 text-[9px] font-bold">
                             {i.unit}
                          </div>
                          <div>
                             <div className="font-bold text-slate-800 text-sm group-hover:text-emerald-600 transition-colors uppercase tracking-tight">{i.item_name}</div>
                             <div className="text-[9px] text-slate-400 font-medium uppercase tracking-tight mt-0.5">{i.brand || "UNBRANDED"} • {i.category}</div>
                          </div>
                        </div>
                        <div className="text-right">
                           <div className="text-xs font-bold text-emerald-600">{formatIDR(i.price)}</div>
                           <div className="text-[8px] text-slate-300 font-medium uppercase tracking-tight mt-0.5">Last Rate</div>
                        </div>
                      </button>
                    ))}
                </div>
              )}
            </div>
            {!initialData && (
              <Button
                type="button"
                onClick={() => setShowOCR(true)}
                className="h-12 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-95 transition-all"
              >
                <Sparkles className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline font-bold text-xs">Scan Receipt</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 2. Basic Info */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
           <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Material Information</h4>
           <div className="h-px bg-slate-50 flex-1" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-1.5">
             <Label className="text-xs font-semibold text-slate-600 ml-1">Category</Label>
             <select 
                className="w-full h-11 bg-slate-50 border border-slate-100 rounded-xl px-4 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                disabled={(!isNewIngredient && !!selectedIngredient) || !!initialData}
             >
                <option value="">Select Category</option>
                {[...new Set(ingredients.map(i => i.category))].map(c => <option key={c} value={c}>{c}</option>)}
                <option value="New Category">+ Other / New Category</option>
             </select>
          </div>

          <div className="space-y-1.5">
             <Label className="text-xs font-semibold text-slate-600 ml-1">Material Name</Label>
             <Input
                placeholder="E.G. GARLIC"
                value={isNewIngredient ? formData.new_ingredient_name : (selectedIngredient?.item_name || "")}
                onChange={(e) => setFormData({...formData, new_ingredient_name: e.target.value})}
                readOnly={!isNewIngredient && (!!selectedIngredient || !!initialData)}
                className="h-11 bg-slate-50 border-slate-100 rounded-xl font-bold uppercase text-[11px] px-4"
             />
          </div>

          <div className="space-y-1.5">
             <Label className="text-xs font-semibold text-slate-600 ml-1">Brand</Label>
             <Input
                placeholder="E.G. INDOFOOD"
                value={isNewIngredient ? (formData.brand || "") : (formData.brand || selectedIngredient?.brand || "")}
                onChange={(e) => setFormData({...formData, brand: e.target.value})}
                readOnly={!isNewIngredient && (!!selectedIngredient || !!initialData)}
                className="h-11 bg-slate-50 border-slate-100 rounded-xl font-bold uppercase text-[11px] px-4"
             />
          </div>
        </div>
      </div>

      {/* 3. Pricing & Unit */}
      <div className="space-y-6">
        <div className="flex items-center gap-4">
           <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Pricing & Measurements</h4>
           <div className="h-px bg-slate-50 flex-1" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-1.5">
             <Label className="text-xs font-semibold text-slate-600 ml-1">Buy Quantity (Pcs/Packs)</Label>
             <Input
                type="number"
                placeholder="0"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                className="h-11 bg-slate-50 border-slate-100 rounded-xl font-bold text-xs px-4 focus:border-emerald-500"
             />
          </div>

          <div className="space-y-1.5">
             <Label className="text-xs font-semibold text-slate-600 ml-1">Volume per Unit (Multiplier)</Label>
             <Input
                type="number"
                placeholder="e.g. 1.0"
                value={formData.volume}
                onChange={(e) => setFormData({...formData, volume: e.target.value})}
                className="h-11 bg-slate-50 border-slate-100 rounded-xl font-bold text-xs px-4 focus:border-emerald-500"
             />
          </div>

          <div className="space-y-1.5">
             <Label className="text-xs font-semibold text-slate-600 ml-1">Total Purchase Price (IDR)</Label>
             <div className="relative group">
                <Input
                  type="number"
                  placeholder="0"
                  value={formData.unit_price}
                  onChange={(e) => setFormData({...formData, unit_price: e.target.value})}
                  className="h-11 pl-4 pr-12 bg-emerald-50 border-emerald-100 rounded-xl font-bold text-emerald-800 text-sm focus:border-emerald-500"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-bold text-emerald-600 uppercase">Total</div>
             </div>
          </div>
        </div>
      </div>

      {/* 4. Footer & Store Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
        <div className="space-y-6">
           <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5 flex-1">
                 <Label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Date
                 </Label>
                 <Input
                    id="purchase_date_input"
                    type="date"
                    value={formData.purchase_date}
                    onClick={(e) => e.currentTarget.showPicker && e.currentTarget.showPicker()}
                    onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                    className="h-10 bg-slate-50 border-slate-100 rounded-xl text-[9px] font-bold text-slate-700 focus:bg-white focus:border-emerald-500 transition-all px-2 md:px-4"
                 />
              </div>
              <div className="space-y-1.5 flex-1">
                 <Label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] flex items-center gap-1">
                    <User className="w-3 h-3" /> Supplier
                 </Label>
                 <Input
                    placeholder="STORE..."
                    value={formData.supplier}
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                    className="h-10 bg-slate-50 border-slate-100 rounded-xl font-bold uppercase text-[9px] text-slate-700 focus:bg-white focus:border-emerald-500 transition-all px-2 md:px-4"
                 />
              </div>
           </div>
           
           <div className="p-5 bg-slate-900 rounded-2xl flex items-center justify-between shadow-sm relative overflow-hidden group">
              <div className="relative z-10">
                 <div className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5">Total Transaction</div>
                 <div className="text-xl font-bold text-white tabular-nums">
                    {formatIDR((Number(formData.quantity) || 0) * (Number(formData.unit_price) || 0))}
                 </div>
              </div>
              <div className="text-right relative z-10">
                 <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Stock Impact</div>
                 <div className="text-xs font-bold text-emerald-500">
                    + {(parseFloat(formData.quantity) || 0) * (parseFloat(formData.volume) || 1)} {selectedIngredient?.unit || "Units"}
                 </div>
              </div>
           </div>
        </div>

        <div className="flex flex-col justify-end gap-5">
           <p className="text-[10px] font-medium text-slate-400 italic text-center md:text-right">
              {initialData ? "Editing will automatically sync stock differences." : "Stock levels update instantly upon confirmation."}
           </p>
           <div className="flex gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={onClose} 
                className="flex-1 h-12 rounded-xl font-bold text-[11px] uppercase tracking-wider text-slate-400 border border-slate-100 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isSaving} 
                className={cn(
                  "flex-[2] h-12 rounded-xl text-white shadow-sm font-bold text-[11px] uppercase tracking-wider active:scale-95 transition-all outline-none",
                  initialData ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-900 hover:bg-black"
                )}
              >
                {isSaving ? "Saving..." : initialData ? "Confirm Update" : "Confirm Purchase"}
              </Button>
           </div>
        </div>
      </div>
      <PriceChangeAlert 
        isOpen={showPriceAlert} 
        onClose={() => setShowPriceAlert(false)} 
        ingredient={selectedIngredient}
        newPrice={Number(formData.unit_price)}
        history={priceHistory}
      />

      <PurchaseOCR
        isOpen={showOCR}
        onClose={() => setShowOCR(false)}
        onItemsExtracted={handleOCRExtracted}
      />
    </form>
  );
}
