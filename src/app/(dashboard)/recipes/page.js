"use client";

import React, { useState, useEffect } from "react";
import { 
  ClipboardList, Plus, Search, Trash2, Edit2, 
  ChevronRight, ArrowLeft, Save, Info, Calculator, 
  Sparkles, Scale, RefreshCw, TrendingUp, History,
  AlertTriangle, Eye, X,
  CheckCircle2, Layers
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from "../../../components/ui/dialog";
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from "../../../components/ui/card";


import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import IngredientManager from "../../../components/IngredientManager";
import { useToast } from "../../../components/ui/use-toast";
import { cn } from "../../../lib/utils";
import { calculateIngredientCost } from "../../../lib/conversions";
import { api } from "../../../lib/api"; // Use global authenticated API
import { formatIDR } from "../../../lib/format";

// --- Main Page with Tabs
export default function RecipesPage() {
  const [activeTab, setActiveTab] = useState("recipes"); 
  const [creatingRecipe, setCreatingRecipe] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState(null);

  if (creatingRecipe || editingRecipeId) {
    return <RecipeForm 
      id={editingRecipeId} 
      onClose={() => { setCreatingRecipe(false); setEditingRecipeId(null); }} 
    />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
            <span className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
              HPP Calculator & Ingredient Management
              <span className="inline-block w-1 h-1 bg-emerald-600 rounded-full" />
            </span>
        </div>
        
        <div className="flex bg-slate-100/50 backdrop-blur-sm rounded-[1.25rem] p-1.5 border border-slate-200/50 shadow-inner">
          <button
            onClick={() => setActiveTab("recipes")}
            className={cn(
              "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
              activeTab === "recipes" ? "bg-white text-slate-900 shadow-xl shadow-slate-200/50" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <ClipboardList className="w-3.5 h-3.5" /> Recipes
          </button>
          <button
            onClick={() => setActiveTab("ingredients")}
            className={cn(
              "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
              activeTab === "ingredients" ? "bg-white text-slate-900 shadow-xl shadow-slate-200/50" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Scale className="w-3.5 h-3.5" /> Ingredients
          </button>
        </div>
      </div>

      <div className="animate-in fade-in duration-500">
        {activeTab === "ingredients" ? (
          <IngredientManager />
        ) : (
          <RecipeList onAdd={() => setCreatingRecipe(true)} onEdit={(id) => setEditingRecipeId(id)} />
        )}
      </div>
    </div>
  );
}

// 3. Recipe List Component
function RecipeList({ onAdd, onEdit }) {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState("STANDARD"); // STANDARD or COMPONENT
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [viewingRecipeId, setViewingRecipeId] = useState(null);
  const viewingRecipe = recipes.find(r => r.id === viewingRecipeId);
  const { success, error } = useToast();

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const data = await api.get("/recipes");
      setRecipes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecipes = recipes.filter(r => r.type === subTab);

  const handleDuplicate = async (recipe) => {
    try {
      const data = {
        name: `${recipe.name} (Copy)`,
        type: recipe.type,
        menu_id: null,
        base_quantity: recipe.base_quantity,
        items: (recipe.items || []).map(i => ({
          item_type: i.item_type,
          ingredient_id: i.ingredient_id,
          component_recipe_id: i.component_recipe_id,
          quantity: i.quantity,
          unit: i.unit
        }))
      };
      await api.post("/recipes", data);
      success("Recipe duplicated successfully");
      loadRecipes();
    } catch (e) {
      console.error(e);
      error("Failed to duplicate recipe");
    }
  };

  const handleDelete = async (id) => {
    setConfirmDeleteId(null);
    try {
      await api.delete(`/recipes/${id}`);
      success("Recipe deleted");
      loadRecipes();
    } catch (e) {
      console.error(e);
      error("Failed to delete recipe");
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      <p className="text-slate-500 font-medium uppercase tracking-widest text-[10px]">Synchronizing Vault...</p>
    </div>
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center glass-card p-6 rounded-[2rem] shadow-2xl border-none gap-6">
        <div className="flex flex-col gap-3">
          <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">Recipe Vault</h3>
          <div className="flex bg-slate-100/50 p-1 rounded-xl">
            <button 
              onClick={() => setSubTab("STANDARD")}
              className={cn(
                "px-6 py-2 text-[9px] font-black uppercase rounded-lg transition-all tracking-widest",
                subTab === "STANDARD" ? "bg-white text-emerald-600 shadow-lg shadow-emerald-100" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Menu Items
            </button>
            <button 
              onClick={() => setSubTab("COMPONENT")}
              className={cn(
                "px-6 py-2 text-[9px] font-black uppercase rounded-lg transition-all tracking-widest",
                subTab === "COMPONENT" ? "bg-white text-purple-600 shadow-lg shadow-purple-100" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Components
            </button>
          </div>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={onAdd} 
            className="flex items-center gap-3 bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Create Recipe
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredRecipes.map(recipe => (
          <div key={recipe.id} className="relative group">
            <div className="glass-card hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-2 transition-all duration-500 relative overflow-hidden rounded-[2.5rem] border-none shadow-2xl h-full flex flex-col p-8 bg-white/40">
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-3">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest inline-block border", 
                    recipe.type === 'STANDARD' ? "bg-emerald-400/10 text-emerald-600 border-emerald-400/20" : "bg-purple-400/10 text-purple-600 border-purple-400/20"
                  )}>
                    {recipe.type === 'STANDARD' ? 'Menu Item' : 'Component'}
                  </div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-tight group-hover:text-emerald-600 transition-colors">{recipe.name}</h3>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all scale-90 -mr-4">
                  {confirmDeleteId === recipe.id ? (
                    <div className="flex items-center gap-1 bg-rose-50 p-1.5 rounded-2xl border border-rose-100 animate-in fade-in zoom-in slide-in-from-right-2">
                       <Button variant="destructive" size="sm" className="h-8 px-3 text-[9px] font-black rounded-xl" onClick={(e) => { e.stopPropagation(); handleDelete(recipe.id); }}>DELETE</Button>
                       <Button variant="ghost" size="sm" className="h-8 px-3 text-[9px] font-black rounded-xl" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}>ESC</Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={(e) => { e.stopPropagation(); setViewingRecipeId(recipe.id); }} className="w-10 h-10 rounded-2xl bg-white shadow-lg flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDuplicate(recipe); }} className="w-10 h-10 rounded-2xl bg-white shadow-lg flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all">
                        <History className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onEdit(recipe.id); }} className="w-10 h-10 rounded-2xl bg-white shadow-lg flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <div className="flex justify-between items-end mt-4">
                  <div>
                    <div className="text-[9px] text-slate-400 uppercase font-black tracking-[0.2em] mb-2">HPP / Unit</div>
                    <div className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums">{formatIDR(recipe.total_hpp)}</div>
                  </div>
                  {recipe.cost_change_alert !== 0 && (
                     <div className={cn(
                       "flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm border",
                       recipe.cost_change_alert > 0 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                     )}>
                       {recipe.cost_change_alert > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5 rotate-180" />}
                       {Math.abs(recipe.cost_change_alert).toFixed(1)}%
                     </div>
                  )}
                </div>
                
                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                   <div className="flex items-center gap-2">
                     <Scale className="w-3.5 h-3.5 text-slate-300" /> 
                     <span>Yield: {recipe.base_quantity}</span>
                   </div>
                   <div className="flex items-center gap-2 max-w-[140px] truncate">
                     <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                     <span>{recipe.menu?.name || "Unlinked"}</span>
                   </div>
                </div>
              </div>

              {recipe.cost_change_alert > 5 && (
                <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-500 animate-pulse" />
              )}

            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!viewingRecipeId} onOpenChange={(open) => !open && setViewingRecipeId(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white flex flex-col max-h-[90dvh]">
          {viewingRecipe && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="p-8 sm:p-10 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
                  <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.3em]">Material Blueprint Breakdown</h4>
                </div>
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none">{viewingRecipe.name}</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto px-8 sm:px-10 py-6 custom-scrollbar">
                <Table className="w-full">
                  <TableHeader className="sticky top-0 bg-white/90 backdrop-blur-md z-10 border-b-2 border-slate-100">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-4 text-[11px] font-black uppercase text-slate-500 tracking-widest pl-0">Composition</TableHead>
                      <TableHead className="py-4 text-[11px] font-black uppercase text-slate-500 tracking-widest text-right pr-0">Volume / Metric</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(viewingRecipe.items || []).map((item, idx) => (
                      <TableRow key={idx} className="group/row hover:bg-emerald-50/30 transition-all border-slate-50">
                        <TableCell className="py-6 pl-0">
                          <p className="text-lg font-black text-slate-900 uppercase tracking-tight leading-tight">
                            {item.item_type === 'INGREDIENT' ? item.ingredient?.item_name : item.component_recipe?.name}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={cn(
                              "text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest border",
                              item.item_type === 'INGREDIENT' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-purple-50 text-purple-600 border-purple-100"
                            )}>
                              {item.item_type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-6 text-right pr-0">
                          <span className="text-xl font-black text-slate-900 tabular-nums">
                            {item.quantity}
                          </span>
                          <span className="text-[11px] font-black text-slate-400 uppercase ml-2 tracking-widest">
                            {item.unit || (item.item_type === 'INGREDIENT' ? item.ingredient?.unit : 'portion')}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="p-8 sm:p-10 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Net Batch Yield Output</p>
                  <p className="text-3xl font-black text-emerald-600 tracking-tight">{viewingRecipe.base_quantity} <span className="text-sm text-slate-400 ml-1">UNITS</span></p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setViewingRecipeId(null)} 
                    className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all"
                  >
                    Close
                  </button>
                  <button 
                    onClick={() => { onEdit(viewingRecipe.id); setViewingRecipeId(null); }} 
                    className="px-10 py-5 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-2xl shadow-slate-200 flex items-center gap-3"
                  >
                    <Edit2 className="w-4 h-4" /> Edit Blueprint
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {recipes.length === 0 && (
        <div className="text-center py-32 glass-card rounded-[2.5rem] border-none shadow-2xl">
          <ClipboardList className="w-16 h-16 text-slate-200 mx-auto mb-6" />
          <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">No Recipes Found</h3>
          <p className="text-[10px] text-slate-400 mt-4 max-w-[280px] mx-auto uppercase tracking-widest font-black leading-relaxed">Start building your menu by creating your first recipe above</p>
        </div>
      )}
    </div>
  );
}


// 4. Recipe Form (Builder + Calculator)
function RecipeForm({ id, onClose }) {
  const [recipe, setRecipe] = useState({
    name: "",
    type: "STANDARD",
    menu_id: null,
    base_quantity: 1,
    items: [],
    monthly_fixed_cost: 0,
    monthly_production_volume: 0
  });
  const [targetPortions, setTargetPortions] = useState(1);
  const [sellingPriceSim, setSellingPriceSim] = useState(0);
  const [showSimulation, setShowSimulation] = useState(false);
  const [suggestionTerm, setSuggestionTerm] = useState("");
  const [selectionType, setSelectionType] = useState("INGREDIENT"); // INGREDIENT or COMPONENT
  const [menus, setMenus] = useState([]);
  const [dbIngredients, setDbIngredients] = useState([]);
  const [componentRecipes, setComponentRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allMenus, allIngs, allRecipes] = await Promise.all([
        api.get("/menus?all=true"),
        api.get("/ingredients"),
        api.get("/recipes")
      ]);
      setMenus(allMenus);
      setDbIngredients(allIngs);
      setComponentRecipes(allRecipes.filter(r => r.type === 'COMPONENT' && r.id !== id));

      if (id) {
        const data = await api.get(`/recipes/${id}`);
        setRecipe(data);
        setTargetPortions(data.base_quantity || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addItem = (item, type) => {
    const newItem = {
      item_type: type,
      quantity: 1,
      unit: type === 'INGREDIENT' ? item.unit : 'portion'
    };

    if (type === 'INGREDIENT') {
      newItem.ingredient_id = item.id;
      newItem.ingredient = item;
    } else {
      newItem.component_recipe_id = item.id;
      newItem.component_recipe = item;
    }

    setRecipe({
      ...recipe,
      items: [...(recipe.items || []), newItem]
    });
    setSuggestionTerm("");
  };

  const removeItem = (index) => {
    const newItems = recipe.items.filter((_, i) => i !== index);
    setRecipe({ ...recipe, items: newItems });
  };

  const updateItem = (index, updates) => {
    const newItems = [...recipe.items];
    newItems[index] = { ...newItems[index], ...updates };
    setRecipe({ ...recipe, items: newItems });
  };

  const calculateHpp = () => {
    let variable = 0;
    (recipe.items || []).forEach(item => {
      if (item.item_type === 'INGREDIENT' && item.ingredient) {
        // Simple calc for now, backend handles robust conversion
        variable += (item.ingredient.cost_per_unit || 0) * (Number(item.quantity) || 0);
      } else if (item.item_type === 'COMPONENT' && item.component_recipe) {
        const costPerPortion = (item.component_recipe.total_hpp || 0) / (item.component_recipe.base_quantity || 1);
        variable += costPerPortion * (Number(item.quantity) || 0);
      }
    });

    const baseQty = Number(recipe.base_quantity) || 1;
    const variablePerPortion = variable / baseQty;

    let fixed = 0;
    if (recipe.monthly_fixed_cost && recipe.monthly_production_volume > 0) {
      fixed = Number(recipe.monthly_fixed_cost) / Number(recipe.monthly_production_volume);
    }

    return {
      variable: variablePerPortion,
      fixed,
      total: variablePerPortion + fixed
    };
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      if (id) {
        await api.put(`/recipes/${id}`, recipe);
      } else {
        await api.post("/recipes", recipe);
      }
      success("Recipe Saved");
      onClose();
    } catch (e) {
      error("Save Failed");
    } finally {
      setIsSaving(false);
    }
  };

  const hpp = calculateHpp();

  const filteredIngs = dbIngredients.filter(i => 
    (i.item_name || "").toLowerCase().includes(suggestionTerm.toLowerCase()) ||
    (i.brand || "").toLowerCase().includes(suggestionTerm.toLowerCase())
  );

  const filteredComps = componentRecipes.filter(r => 
    (r.name || "").toLowerCase().includes(suggestionTerm.toLowerCase())
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      <p className="text-gray-500 font-medium">Loading recipe builder...</p>
    </div>
  );

  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between sticky top-0 z-[100] bg-slate-50/80 backdrop-blur-xl py-6 -mx-4 px-4 sm:mx-0 sm:px-0 border-b border-slate-200/50 mb-10">
        <div className="flex items-center gap-6">
          <button 
            onClick={onClose} 
            className="w-14 h-14 rounded-2xl bg-white shadow-xl shadow-slate-200 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all active:scale-95 group"
          >
            <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">{id ? "Refine Blueprint" : "Architect Recipe"}</h2>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-black">HPP Intelligence & Material Builder</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-6 md:mt-0">
          <button 
            onClick={onClose} 
            className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-all"
          >
            Discard Draft
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="px-10 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-slate-300 transition-all active:scale-95 flex items-center gap-3"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Syncing..." : "Commit Recipe"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Main Section */}
        <div className="lg:col-span-8 space-y-10">
          {/* Identity Block */}
          <div className="glass-card rounded-[2.5rem] p-10 bg-white/60">
             <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
                  <Info className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Identity Definitions</h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Recipe Designation</label>
                  <input 
                    value={recipe.name} 
                    onChange={(e) => setRecipe({...recipe, name: e.target.value})} 
                    placeholder="e.g. ULTRA SIGNATURE RAMEN"
                    className="w-full h-16 bg-white border border-slate-100 rounded-[1.25rem] px-8 font-black text-lg uppercase tracking-tight text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-sm placeholder:text-slate-200"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Classification</label>
                  <select 
                    className="w-full h-16 bg-white border border-slate-100 rounded-[1.25rem] px-8 font-black uppercase text-[11px] tracking-widest text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-sm appearance-none cursor-pointer"
                    value={recipe.type}
                    onChange={(e) => setRecipe({...recipe, type: e.target.value})}
                  >
                    <option value="STANDARD">Standard Menu Item</option>
                    <option value="COMPONENT">Component / Sub-Recipe</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Batch Yield (Units)</label>
                  <input 
                    type="number" 
                    value={recipe.base_quantity} 
                    onChange={(e) => setRecipe({...recipe, base_quantity: parseFloat(e.target.value) || 1})}
                    className="w-full h-16 bg-emerald-50/30 border border-emerald-100 rounded-[1.25rem] px-8 font-black text-2xl text-emerald-600 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-inner"
                  />
                </div>
             </div>

             {recipe.type === 'STANDARD' && (
                <div className="mt-8 pt-8 border-t border-slate-100">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-3 block">Digital Ledger Corelation (Menu Link)</label>
                   <select 
                    className="w-full h-16 bg-white border border-slate-100 rounded-[1.25rem] px-8 font-black uppercase text-[11px] tracking-widest text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-sm appearance-none cursor-pointer"
                    value={recipe.menu_id || ""}
                    onChange={(e) => setRecipe({...recipe, menu_id: e.target.value ? Number(e.target.value) : null})}
                  >
                    <option value="">STANDALONE (NO LINK)</option>
                    {menus.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
             )}
          </div>

          {/* Builder Block */}
          <div className="glass-card rounded-[2.5rem] p-10 bg-white/60 min-h-[500px]">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center">
                    <Layers className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Material Composition</h3>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-[1.25rem]">
                  <button 
                    onClick={() => setSelectionType("INGREDIENT")}
                    className={cn("px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", selectionType === "INGREDIENT" ? "bg-white text-emerald-600 shadow-xl shadow-emerald-100" : "text-slate-400 hover:text-slate-600")}
                  >Ingredients</button>
                  <button 
                    onClick={() => setSelectionType("COMPONENT")}
                    className={cn("px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", selectionType === "COMPONENT" ? "bg-white text-purple-600 shadow-xl shadow-purple-100" : "text-slate-400 hover:text-slate-600")}
                  >Sub-Recipes</button>
                </div>
             </div>

             {/* Search Interface */}
             <div className="relative mb-10 group">
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                  <input 
                    placeholder={selectionType === 'INGREDIENT' ? "ASSEMBLY: SCAN MATERIAL MASTER..." : "ASSEMBLY: SCAN SUB-RECIPE VAULT..."}
                    value={suggestionTerm}
                    onChange={(e) => setSuggestionTerm(e.target.value)}
                    className="w-full h-16 bg-white border border-slate-100 rounded-[1.25rem] pl-16 pr-8 font-black uppercase text-[10px] tracking-widest text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-sm placeholder:text-slate-200"
                  />
                </div>
                
                {suggestionTerm && (
                  <div className="absolute z-40 w-full mt-4 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-[2rem] shadow-2xl max-h-[400px] overflow-y-auto animate-in fade-in slide-in-from-top-4 p-4 border-none">
                    {selectionType === 'INGREDIENT' ? (
                      <div className="space-y-2">
                        {filteredIngs.map(i => (
                          <button 
                            key={i.id} 
                            onClick={() => addItem(i, 'INGREDIENT')}
                            className="w-full flex items-center justify-between p-6 rounded-2xl hover:bg-slate-50 transition-all text-left border border-transparent hover:border-slate-100 group"
                          >
                            <div>
                               <div className="font-black text-slate-900 uppercase tracking-tight group-hover:text-emerald-600 transition-colors">{i.item_name}</div>
                               <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{i.brand || "UNBRANDED"} • {i.volume} {i.unit}</div>
                            </div>
                            <div className="text-right">
                               <div className="font-black text-slate-900">{formatIDR(i.price)}</div>
                               <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1">SELECT MATERIAL</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredComps.map(r => (
                          <button 
                            key={r.id} 
                            onClick={() => addItem(r, 'COMPONENT')}
                            className="w-full flex items-center justify-between p-6 rounded-2xl hover:bg-slate-50 transition-all text-left border border-transparent hover:border-slate-100 group"
                          >
                            <div>
                               <div className="font-black text-slate-900 uppercase tracking-tight group-hover:text-purple-600 transition-colors">{r.name}</div>
                               <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">COMPONENT • YIELD: {r.base_quantity}</div>
                            </div>
                            <div className="text-right">
                               <div className="font-black text-slate-900">{formatIDR(r.total_hpp)}</div>
                               <div className="text-[9px] font-black text-purple-500 uppercase tracking-widest mt-1">SELECT COMPONENT</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
             </div>

             {/* Items Registry */}
             <div className="space-y-4">
                {(recipe.items || []).map((item, idx) => {
                  const data = item.item_type === 'INGREDIENT' ? item.ingredient : item.component_recipe;
                  const itemCost = item.item_type === 'INGREDIENT' 
                    ? (data?.cost_per_unit || 0) * (item.quantity || 0)
                    : ((data?.total_hpp || 0) / (data?.base_quantity || 1)) * (item.quantity || 0);

                  return (
                    <div key={idx} className="bg-white border border-slate-100 rounded-[1.5rem] p-6 shadow-sm hover:shadow-xl hover:shadow-slate-100 transition-all group/item">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] border", 
                            item.item_type === 'INGREDIENT' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-purple-50 text-purple-600 border-purple-100"
                          )}>
                            {item.item_type}
                          </div>
                          <span className="font-black text-slate-900 uppercase tracking-tight text-base group-hover/item:text-emerald-600 transition-colors">{data?.item_name || data?.name}</span>
                        </div>
                        <button onClick={() => removeItem(idx)} className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all hover:bg-rose-500 hover:text-white">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 items-end">
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Quantity</label>
                           <input 
                             type="number" 
                             value={item.quantity} 
                             onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                             className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-black text-slate-900 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Metric</label>
                           <input 
                             value={item.unit} 
                             onChange={(e) => updateItem(idx, { unit: e.target.value })}
                             className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-black text-[10px] uppercase tracking-widest text-slate-900 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all"
                             placeholder="UNIT"
                           />
                        </div>
                        <div className="col-span-2 text-right">
                           <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Cost Projection</div>
                           <div className="text-2xl font-black text-slate-900 tracking-tighter tabular-nums">{formatIDR(itemCost)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {(recipe.items || []).length === 0 && (
                  <div className="text-center py-24 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                    <RefreshCw className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                    <h3 className="text-lg font-black text-slate-400 uppercase tracking-tight">Material Registry Empty</h3>
                    <p className="text-[10px] text-slate-300 mt-4 max-w-[240px] mx-auto uppercase tracking-[0.2em] font-black leading-relaxed">Search and select materials from the master vault above to begin assembly</p>
                  </div>
                )}
             </div>
          </div>

          {/* Overhead Block */}
          <div className="glass-card rounded-[2.5rem] p-10 bg-emerald-50/20 border-emerald-100/50">
             <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                  <Calculator className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600/60">Overhead Allocation</h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-emerald-700/50 uppercase tracking-widest ml-1">Monthly OpEx (Fixed)</label>
                  <input 
                    type="number" 
                    value={recipe.monthly_fixed_cost} 
                    onChange={(e) => setRecipe({...recipe, monthly_fixed_cost: parseInt(e.target.value) || 0})}
                    className="w-full h-16 bg-white border border-emerald-100 rounded-[1.25rem] px-8 font-black text-emerald-600 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-sm"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-emerald-700/50 uppercase tracking-widest ml-1">Target Production (Units)</label>
                  <input 
                    type="number" 
                    value={recipe.monthly_production_volume} 
                    onChange={(e) => setRecipe({...recipe, monthly_production_volume: parseInt(e.target.value) || 0})}
                    className="w-full h-16 bg-white border border-emerald-100 rounded-[1.25rem] px-8 font-black text-emerald-600 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-sm"
                  />
                </div>
             </div>
          </div>
        </div>

        {/* Sidebar Intelligence */}
        <div className="lg:col-span-4">
          <div className="sticky top-32 space-y-10 overflow-y-auto max-h-[85dvh] pr-4 scrollbar-hide pb-20">
            <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] relative overflow-hidden mx-auto w-full max-w-md lg:max-w-none">
             <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
             <div className="relative z-10 space-y-10">
                <div className="flex items-center justify-between">
                   <div className="text-[10px] uppercase font-black tracking-[0.4em] text-emerald-400">Ledger Summary</div>
                   <Calculator className="w-5 h-5 text-white/30" />
                </div>
                
                <div className="space-y-2">
                   <p className="text-[10px] uppercase font-black text-white/40 tracking-widest">Calculated HPP / Portion</p>
                   <div className="text-6xl font-black tracking-tighter tabular-nums">{formatIDR(hpp.total)}</div>
                </div>
                
                <div className="space-y-6 pt-10 border-t border-white/5">
                   <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Material Cost</span>
                      <span className="font-black text-lg">{formatIDR(hpp.variable)}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Overhead Cost</span>
                      <span className="font-black text-lg">{formatIDR(hpp.fixed)}</span>
                   </div>
                </div>

                <div className="pt-8">
                   <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10">
                      <Scale className="w-4 h-4 text-emerald-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Base qty: {recipe.base_quantity}</span>
                   </div>
                </div>
             </div>
          </div>

          {/* Simulations */}
          <div className="glass-card rounded-[2.5rem] p-8 border-none shadow-2xl space-y-8">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="text-[10px] font-semibold text-slate-400 tracking-tight">Profit Matrix Simulation</h3>
             </div>

             <div className="space-y-4">
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Hypothetical Unit Price</label>
                  <input 
                    type="number" 
                    value={sellingPriceSim} 
                    onChange={(e) => setSellingPriceSim(parseInt(e.target.value) || 0)}
                    className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 font-black text-xl text-emerald-600 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all"
                  />
                </div>
                {sellingPriceSim > 0 && (
                  <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-4">
                     <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-3xl">
                        <div className="text-[8px] font-semibold text-emerald-600/40 mb-1">Unit Profit</div>
                        <div className="text-xl font-bold text-emerald-600">{formatIDR(sellingPriceSim - hpp.total)}</div>
                      </div>
                    <div className="p-5 bg-emerald-50/50 border border-emerald-100 rounded-3xl text-right">
                      <div className="text-[8px] font-semibold text-emerald-600/40 mb-1">Margin %</div>
                      <div className="text-2xl font-bold text-emerald-600">
                        {Math.round(((sellingPriceSim - hpp.total) / sellingPriceSim) * 100)}%
                      </div>
                    </div>
                  </div>
                )}
             </div>
          </div>

          <PricingRecommendations hpp={hpp.total} />
          </div>
        </div>
      </div>
    </div>
  );
}

function PricingRecommendations({ hpp }) {
  if (hpp <= 0) return null;

  const strategies = [
    { 
      label: "Competitive", 
      margin: 0.20, 
      color: "bg-green-50 text-green-700 border-green-100",
      desc: "Lower margin to increase sales volume"
    },
    { 
      label: "Standard", 
      margin: 0.40, 
      color: "bg-emerald-50 text-emerald-700 border-emerald-100",
      desc: "Balanced profit and sustainability"
    },
    { 
      label: "Premium", 
      margin: 0.60, 
      color: "bg-purple-50 text-purple-700 border-purple-100",
      desc: "Higher margin for premium positioning"
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold flex items-center text-gray-700 px-2 uppercase tracking-wider">
        <Sparkles className="w-4 h-4 mr-2 text-yellow-500" /> AI Price Tiers
      </h3>
      <div className="flex flex-col gap-3">
        {strategies.map(s => {
          const price = Math.ceil((hpp / (1 - s.margin)) / 500) * 500;
          const profit = price - hpp;
          const actualMargin = Math.round((profit / price) * 100);

          return (
            <div key={s.label} className={cn("p-4 rounded-2xl border transition-all hover:scale-[1.02]", s.color)}>
              <div className="flex justify-between items-start mb-1">
                <span className="text-xs uppercase font-black tracking-widest">{s.label}</span>
                <span className="text-lg font-black">{formatIDR(price)}</span>
              </div>
              <div className="text-[10px] opacity-70 mb-3">{s.desc}</div>
              <div className="flex justify-between items-end border-t border-current/10 pt-2">
                <div>
                   <div className="text-[8px] uppercase font-bold opacity-60">Profit</div>
                   <div className="text-sm font-bold">{formatIDR(profit)}</div>
                </div>
                <div className="text-right">
                   <div className="text-[8px] uppercase font-bold opacity-60">Margin</div>
                   <div className="text-sm font-bold">{actualMargin}%</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="p-3 rounded bg-gray-50 border border-gray-100 flex items-start gap-2">
          <Info className="w-3 h-3 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-gray-500 italic leading-relaxed">
            Recommendations calculated by adjusting for target profit margin and rounding to nearest Rp500.
          </p>
      </div>
    </div>
  );
}
