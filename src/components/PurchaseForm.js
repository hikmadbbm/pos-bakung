"use client";

import React, { useState, useEffect } from "react";
import { 
  Plus, Search, Save, X, Calendar, 
  Package, DollarSign, User, FileText,
  Info, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { api } from "@/lib/api";
import { formatIDR } from "@/lib/format";
import { cn } from "@/lib/utils";

export default function PurchaseForm({ onClose, onSuccess }) {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [isNewIngredient, setIsNewIngredient] = useState(false);
  
  const [formData, setFormData] = useState({
    ingredient_id: "",
    new_ingredient_name: "",
    category: "",
    unit: "",
    volume: "1", // Units per quantity
    quantity: "",
    unit_price: "",
    supplier: "",
    notes: "",
    purchase_date: new Date().toISOString().split('T')[0]
  });

  const { success, error } = useToast();

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    try {
      const data = await api.get("/ingredients");
      setIngredients(data);
    } catch (e) {
      console.error(e);
      error("Failed to load ingredients");
    } finally {
      setLoading(false);
    }
  };

  const filteredIngredients = searchTerm.trim() 
    ? ingredients.filter(i => 
        i.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.brand && i.brand.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : [];

  const handleSelectIngredient = (ing) => {
    setSelectedIngredient(ing);
    setIsNewIngredient(false);
    setFormData({
      ...formData,
      ingredient_id: ing.id,
      new_ingredient_name: "",
      unit: ing.unit,
      volume: "1",
      unit_price: ing.price,
      category: ing.category
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
      category: ""
    });
    setSearchTerm("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isManualValid = isNewIngredient && formData.new_ingredient_name && formData.category && formData.unit;
    const isExistingValid = !isNewIngredient && formData.ingredient_id;

    if (!(isManualValid || isExistingValid) || !formData.quantity || !formData.unit_price) {
      error("Please fill in all required fields (Name, Category, Unit, Qty, Price)");
      return;
    }

    setIsSaving(true);
    try {
      await api.post("/purchases", {
        ...formData,
        quantity: parseFloat(formData.quantity),
        volume: parseFloat(formData.volume) || 1,
        unit_price: parseInt(formData.unit_price)
      });
      success(isNewIngredient ? "New ingredient created and purchase recorded" : "Purchase recorded successfully");
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (e) {
      console.error(e);
      error(e.response?.data?.error || "Failed to record purchase");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 gap-4">
      <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      <p className="text-gray-500 font-medium font-sans">Loading Master Ingredients...</p>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Side: Select & Details */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-gray-50/50 pb-4 px-6 pt-6 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-500">
                {isNewIngredient ? "Creating New Ingredient" : "Ingredient Selection"}
              </CardTitle>
              {isNewIngredient && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsNewIngredient(false)}
                  className="text-[10px] font-semibold text-emerald-600 h-7"
                >
                  Switch to Search
                </Button>
              )}
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {!isNewIngredient && (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search Ingredient Master or type new..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-12 bg-gray-50 border-none rounded-2xl font-medium focus-visible:ring-emerald-500"
                  />
                  
                  {searchTerm && (
                    <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                       {/* Show "Create New" option first */}
                       <button
                        type="button"
                        onClick={handleCreateNew}
                        className="w-full flex items-center gap-3 p-4 border-b hover:bg-emerald-600 hover:text-white transition-colors text-left group"
                      >
                        <Plus className="w-4 h-4 text-emerald-600 group-hover:text-white" />
                        <div>
                          <div className="font-bold">Add New: "{searchTerm}"</div>
                          <div className="text-[10px] font-semibold opacity-60">Register into Master List</div>
                        </div>
                      </button>

                      {filteredIngredients.map(i => (
                        <button
                          key={i.id}
                          type="button"
                          onClick={() => handleSelectIngredient(i)}
                          className="w-full flex items-center justify-between p-4 border-b last:border-0 hover:bg-emerald-50 transition-colors text-left"
                        >
                          <div>
                            <div className="font-bold text-gray-900">{i.item_name}</div>
                            <div className="text-[10px] text-gray-500 font-black uppercase tracking-tighter">{i.brand} • {i.volume} {i.unit}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-black text-emerald-600">{formatIDR(i.price)}</div>
                            <div className="text-[9px] text-gray-400 font-bold uppercase">Last Price</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {isNewIngredient ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 mb-2">
                    <div className="text-[9px] font-semibold text-emerald-400 tracking-tight mb-1">New Ingredient Name</div>
                    <div className="text-lg font-black text-emerald-700">{formData.new_ingredient_name}</div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                    <select 
                      className="w-full h-11 bg-gray-50 border-none rounded-xl px-4 text-sm font-bold text-gray-700 outline-none"
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      <option value="">Select Category</option>
                      {[...new Set(ingredients.map(i => i.category))].map(c => <option key={c} value={c}>{c}</option>)}
                      <option value="New Category">+ Other / New Category</option>
                    </select>
                    {formData.category === "New Category" && (
                      <Input
                        placeholder="Type new category name..."
                        className="h-11 bg-gray-50 border-none rounded-xl font-bold mt-2"
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                      />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Base Unit</label>
                    <Input
                      placeholder="e.g., kg, gr, ml, pcs"
                      value={formData.unit}
                      onChange={(e) => setFormData({...formData, unit: e.target.value})}
                      className="h-11 bg-gray-50 border-none rounded-xl font-bold"
                    />
                  </div>
                </div>
              ) : selectedIngredient ? (
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-black text-emerald-700 text-sm">{selectedIngredient.item_name}</h4>
                    <span className="bg-emerald-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">Selected</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Brand</div>
                      <div className="text-xs font-bold text-gray-700">{selectedIngredient.brand}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Master Category</div>
                      <div className="text-xs font-bold text-gray-700">{selectedIngredient.category}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Base Pkg</div>
                      <div className="text-xs font-bold text-gray-700">{selectedIngredient.volume} {selectedIngredient.unit}</div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Current Stock</div>
                      <div className="text-xs font-bold text-gray-700">{selectedIngredient.stock} {selectedIngredient.unit}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-3xl">
                   <Package className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Select or type an ingredient</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Form Controls */}
        <div className="space-y-6">
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden bg-white">
            <CardHeader className="bg-gray-50/50 pb-4 px-6 pt-6">
               <CardTitle className="text-sm font-semibold text-gray-500">Purchase Details</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2 lg:col-span-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> Date
                  </label>
                  <Input
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                    className="h-11 bg-gray-50 border-none rounded-xl font-bold text-gray-700"
                  />
                </div>
                <div className="space-y-1.5 col-span-2 lg:col-span-1">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <User className="w-3 h-3" /> Supplier
                  </label>
                  <Input
                    placeholder="Enter supplier..."
                    value={formData.supplier}
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                    className="h-11 bg-gray-50 border-none rounded-xl font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Package className="w-3 h-3" /> Qty (Units)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="e.g., 2"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    className="h-11 bg-gray-50 border-none rounded-xl font-black text-emerald-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                     Multiplier / Vol
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g., 25"
                      value={formData.volume}
                      onChange={(e) => setFormData({...formData, volume: e.target.value})}
                      className="h-11 bg-gray-50 border-none rounded-xl font-black text-orange-600 pr-12"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-gray-400 uppercase">
                      {formData.unit || (selectedIngredient?.unit) || "unit"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-orange-50/50 border border-orange-100 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-[9px] font-black text-orange-400 uppercase tracking-widest">Base Stock Addition</div>
                  <div className="text-sm font-black text-orange-700">
                    {(parseFloat(formData.quantity) || 0) * (parseFloat(formData.volume) || 1)} {formData.unit || (selectedIngredient?.unit) || ""}
                  </div>
                </div>
                <Info className="w-4 h-4 text-orange-300" />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <DollarSign className="w-3 h-3" /> Purchase Unit Price
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="0"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({...formData, unit_price: e.target.value})}
                    className="h-11 bg-gray-50 border-none rounded-xl font-black text-gray-900"
                  />
                  {(parseFloat(formData.volume) > 1) && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400 italic">
                      {formatIDR((parseInt(formData.unit_price) || 0) / (parseFloat(formData.volume) || 1))} / {formData.unit || (selectedIngredient?.unit) || "base"}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <FileText className="w-3 h-3" /> Notes
                </label>
                <Input
                  placeholder="Optional details..."
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="h-11 bg-gray-50 border-none rounded-xl font-medium"
                />
              </div>

              <div className="pt-4 border-t border-gray-50 mt-4">
                <div className="flex justify-between items-center mb-6">
                  <div className="text-[10px] font-semibold text-gray-400 mb-1">Total Transaction</div>
                  <div className="text-2xl font-bold text-gray-900 tabular-nums">
                    {formatIDR((Number(formData.quantity) || 0) * (Number(formData.unit_price) || 0))}
                  </div>
                </div>
                <div className="flex gap-3">
                   <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={onClose} 
                    className="flex-1 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100"
                   >
                     Cancel
                   </Button>
                   <Button 
                    type="submit" 
                    disabled={isSaving} 
                    className="flex-[2] h-12 rounded-2xl bg-emerald-800 hover:bg-emerald-900 shadow-lg shadow-emerald-100 font-semibold text-[11px]"
                   >
                     {isSaving ? "Saving..." : isNewIngredient ? "Create & Save" : "Record Purchase"}
                   </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
