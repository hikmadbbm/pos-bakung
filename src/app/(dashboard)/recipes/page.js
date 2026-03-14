"use client";

import React, { useState, useEffect } from "react";
import { 
  ClipboardList, Plus, Search, Trash2, Edit2, 
  ChevronRight, ArrowLeft, Save, Info, Calculator, 
  Sparkles, Scale, RefreshCw, TrendingUp, History,
  AlertTriangle, Eye, X,
  CheckCircle2
} from "lucide-react";
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
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Recipe Management</h2>
        <div className="flex bg-white rounded-lg p-1 border shadow-sm h-10">
          <button
            onClick={() => setActiveTab("recipes")}
            className={cn(
              "px-4 text-sm font-medium rounded-md transition-all",
              activeTab === "recipes" ? "bg-blue-600 text-white shadow" : "text-gray-500 hover:text-gray-900"
            )}
          >
            Recipes
          </button>
          <button
            onClick={() => setActiveTab("ingredients")}
            className={cn(
              "px-4 text-sm font-medium rounded-md transition-all",
              activeTab === "ingredients" ? "bg-blue-600 text-white shadow" : "text-gray-500 hover:text-gray-900"
            )}
          >
            Ingredients
          </button>
        </div>
      </div>

      <div className="animate-in fade-in duration-300">
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
      <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      <p className="text-gray-500 font-medium">Fetching recipes...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-3xl border shadow-sm gap-4">
        <div className="flex flex-col">
          <h3 className="font-black text-gray-900 text-lg">Your Recipes</h3>
          <div className="flex bg-gray-50 p-1 rounded-xl mt-2">
            <button 
              onClick={() => setSubTab("STANDARD")}
              className={cn(
                "px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all",
                subTab === "STANDARD" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Menu Items
            </button>
            <button 
              onClick={() => setSubTab("COMPONENT")}
              className={cn(
                "px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all",
                subTab === "COMPONENT" ? "bg-white text-purple-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
              )}
            >
              Components
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={onAdd} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 rounded-2xl md:h-12 px-6">
            <Plus className="w-4 h-4 mr-2" /> New Recipe
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes.map(recipe => (
          <div key={recipe.id} className="relative">
            <Card className="group hover:shadow-xl hover:scale-[1.01] transition-all relative overflow-hidden rounded-3xl border-none shadow-sm h-full flex flex-col">
              {recipe.cost_change_alert > 5 && (
                 <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse" />
              )}
              <CardHeader className="pb-3 px-6">
                <div className="flex justify-between items-start pt-2">
                  <div className="space-y-1">
                    <div className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase inline-block mb-1", recipe.type === 'STANDARD' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600")}>
                      {recipe.type === 'STANDARD' ? 'Menu Item' : 'Component'}
                    </div>
                    <CardTitle className="text-lg font-black text-gray-900 group-hover:text-blue-600 transition-colors">{recipe.name}</CardTitle>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all -mr-2 scale-90">
                  {confirmDeleteId === recipe.id ? (
                    <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-100 animate-in fade-in zoom-in slide-in-from-right-1 duration-200">
                       <span className="text-[8px] font-black text-red-600 px-2 uppercase tracking-tighter">Delete?</span>
                       <Button variant="destructive" size="sm" className="h-6 px-2 text-[8px] font-black rounded-lg" onClick={(e) => { e.stopPropagation(); handleDelete(recipe.id); }}>YES</Button>
                       <Button variant="ghost" size="sm" className="h-6 px-2 text-[8px] font-black rounded-lg" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}>NO</Button>
                    </div>
                  ) : (
                    <>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setViewingRecipeId(recipe.id); }} className="rounded-full w-8 h-8 hover:bg-blue-50 hover:text-blue-600 group" title="View Recipe Details">
                        <Eye className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDuplicate(recipe); }} className="rounded-full w-8 h-8 hover:bg-blue-50 hover:text-blue-600 group" title="Duplicate">
                        <History className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(recipe.id); }} className="rounded-full w-8 h-8 hover:bg-blue-50 hover:text-blue-600 group" title="Edit">
                        <Edit2 className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(recipe.id); }} className="rounded-full w-8 h-8 hover:bg-red-50 hover:text-red-500 group" title="Delete">
                        <Trash2 className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500 transition-colors" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
              <CardContent className="px-6 pb-6 pt-2 flex-1">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1">HPP / Unit</div>
                    <div className="text-3xl font-black text-gray-900 tracking-tighter">{formatIDR(recipe.total_hpp)}</div>
                  </div>
                  {recipe.cost_change_alert !== 0 && (
                     <div className={cn(
                       "flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-full",
                       recipe.cost_change_alert > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                     )}>
                       {recipe.cost_change_alert > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                       {Math.abs(recipe.cost_change_alert).toFixed(1)}%
                     </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between text-[10px] font-bold text-gray-400 uppercase">
                   <span className="flex items-center gap-1.5">
                     <Info className="w-3 h-3" /> Yield: {recipe.base_quantity}
                   </span>
                   <span className="truncate max-w-[120px]">
                     {recipe.menu?.name ? `Linked: ${recipe.menu.name}` : "No link"}
                   </span>
                </div>
              </CardContent>
              {recipe.cost_change_alert > 5 && (
                <CardFooter className="py-2.5 bg-red-500 text-white flex items-center justify-center gap-2 text-[10px] font-black uppercase px-6">
                  <AlertTriangle className="w-3 h-3" /> Cost Warning: Review Prices
                </CardFooter>
              )}

              {/* Explicit Preview Overlay */}
              <div className={cn(
                "absolute inset-x-0 bottom-0 top-0 bg-white/98 backdrop-blur-md p-6 transition-all duration-300 transform flex flex-col overflow-hidden z-20",
                viewingRecipeId === recipe.id ? "opacity-100 translate-y-0 visible pointer-events-auto" : "opacity-0 translate-y-8 invisible pointer-events-none"
              )}>
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                   <div className="flex items-center gap-2">
                     <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Recipe Details</h4>
                     <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-full">{recipe.items?.length || 0} Items</span>
                   </div>
                   <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setViewingRecipeId(null); }} className="rounded-full w-7 h-7 hover:bg-gray-100 hover:text-gray-900 transition-all">
                     <X className="w-4 h-4" />
                   </Button>
                </div>
                <div className="overflow-auto flex-1">
                   <table className="w-full text-left text-[11px]">
                     <thead>
                       <tr className="text-gray-400 font-bold border-b border-gray-50">
                         <th className="pb-2 font-black uppercase tracking-tighter">Item</th>
                         <th className="pb-2 font-black uppercase tracking-tighter text-right">Qty</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-50">
                       {(recipe.items || []).map((item, idx) => (
                         <tr key={idx} className="hover:bg-gray-50 transition-colors">
                           <td className="py-2.5 font-bold text-gray-700 leading-tight pr-4">
                             {item.item_type === 'INGREDIENT' ? item.ingredient?.item_name : item.component_recipe?.name}
                           </td>
                           <td className="py-2.5 text-right font-black text-gray-900 tabular-nums">
                             {item.quantity} <span className="text-[8px] text-gray-400 uppercase">{item.unit || (item.item_type === 'INGREDIENT' ? item.ingredient?.unit : 'portion')}</span>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center gap-4">
                   <div className="flex items-center gap-1.5 tabular-nums">
                     <span className="text-[10px] font-black text-gray-400 uppercase">Yield:</span>
                     <span className="text-[10px] font-black text-gray-900">{recipe.base_quantity}</span>
                   </div>
                   <div className="flex gap-1">
                      {confirmDeleteId === recipe.id ? (
                        <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-100 animate-in fade-in zoom-in slide-in-from-right-1 duration-200">
                           <span className="text-[8px] font-black text-red-600 px-2 uppercase tracking-tighter">Delete?</span>
                           <Button variant="destructive" size="sm" className="h-6 px-2 text-[8px] font-black rounded-lg" onClick={(e) => { e.stopPropagation(); handleDelete(recipe.id); }}>YES</Button>
                           <Button variant="ghost" size="sm" className="h-6 px-2 text-[8px] font-black rounded-lg" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}>NO</Button>
                        </div>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleDuplicate(recipe); }} title="Duplicate" className="rounded-full w-8 h-8 hover:bg-blue-50 hover:text-blue-600 group">
                            <History className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(recipe.id); }} className="rounded-full w-8 h-8 hover:bg-blue-50 hover:text-blue-600 group">
                            <Edit2 className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(recipe.id); }} className="rounded-full w-8 h-8 hover:bg-red-50 hover:text-red-500 group">
                            <Trash2 className="w-3.5 h-3.5 text-gray-400 group-hover:text-red-500 transition-colors" />
                          </Button>
                        </>
                      )}
                   </div>
                </div>
              </div>
            </Card>
          </div>
        ))}
      </div>
      
      {recipes.length === 0 && (
        <div className="text-center py-32 bg-white rounded-3xl border-2 border-dashed border-gray-100 shadow-sm">
          <ClipboardList className="w-16 h-16 text-gray-200 mx-auto mb-6" />
          <h3 className="text-xl font-black text-gray-900 tracking-tight">No Recipes Found</h3>
          <p className="text-sm text-gray-400 mt-2 max-w-[280px] mx-auto uppercase tracking-wider font-bold">Start building your menu by creating your first recipe above</p>
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
      <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      <p className="text-gray-500 font-medium">Loading recipe builder...</p>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-32">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 z-40 bg-gray-50/80 backdrop-blur-md py-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onClose} size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{id ? "Edit Recipe" : "New Recipe"}</h2>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">HPP Calculator & Builder</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200">
          <Save className="w-4 h-4 mr-2" /> {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-gray-50/50 pb-4">
              <CardTitle className="text-sm font-bold uppercase tracking-tight text-gray-600">Recipe Basics</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-1 sm:col-span-2">
                  <label className="text-xs font-bold text-gray-500 uppercase">Recipe Name</label>
                  <Input 
                    value={recipe.name} 
                    onChange={(e) => setRecipe({...recipe, name: e.target.value})} 
                    placeholder="e.g. Signature Chicken Noodle"
                    className="h-11 font-medium text-lg border-gray-200 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Recipe Type</label>
                  <select 
                    className="w-full h-11 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    value={recipe.type}
                    onChange={(e) => setRecipe({...recipe, type: e.target.value})}
                  >
                    <option value="STANDARD">Standard Menu</option>
                    <option value="COMPONENT">Component / Sub-recipe</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase">Total Yield (Portions)</label>
                  <Input 
                    type="number" 
                    value={recipe.base_quantity} 
                    onChange={(e) => setRecipe({...recipe, base_quantity: parseFloat(e.target.value) || 1})}
                    className="h-11 font-bold text-blue-600"
                  />
                </div>
              </div>

              {recipe.type === 'STANDARD' && (
                <div className="pt-2">
                   <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Link to Menu Item</label>
                   <select 
                    className="w-full h-11 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={recipe.menu_id || ""}
                    onChange={(e) => setRecipe({...recipe, menu_id: e.target.value ? Number(e.target.value) : null})}
                  >
                    <option value="">No Menu Linked</option>
                    {menus.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Builder Section */}
          <Card className="border-none shadow-sm overflow-hidden min-h-[400px]">
            <CardHeader className="bg-gray-50/50 flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-tight text-gray-600">Recipe Items</CardTitle>
                <CardDescription className="text-[10px]">Ingredients & components</CardDescription>
              </div>
              <div className="flex bg-white rounded-lg p-1 border shadow-sm">
                <button 
                  onClick={() => setSelectionType("INGREDIENT")}
                  className={cn("px-3 py-1 text-[10px] font-bold rounded transition-all", selectionType === "INGREDIENT" ? "bg-blue-600 text-white" : "text-gray-500")}
                >Ingredient</button>
                <button 
                  onClick={() => setSelectionType("COMPONENT")}
                  className={cn("px-3 py-1 text-[10px] font-bold rounded transition-all", selectionType === "COMPONENT" ? "bg-blue-600 text-white" : "text-gray-500")}
                >Component</button>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Search Dropdown */}
              <div className="relative group">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    placeholder={selectionType === 'INGREDIENT' ? "Search Ingredient Master..." : "Search Component Recipes..."}
                    value={suggestionTerm}
                    onChange={(e) => setSuggestionTerm(e.target.value)}
                    className="pl-10 h-12 bg-gray-50/50 border-gray-100 group-hover:border-blue-300 transition-colors"
                  />
                </div>
                
                {suggestionTerm && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                    {selectionType === 'INGREDIENT' ? (
                      <>
                        {filteredIngs.map(i => (
                          <button 
                            key={i.id} 
                            onClick={() => addItem(i, 'INGREDIENT')}
                            className="w-full flex items-center justify-between p-4 border-b last:border-0 hover:bg-blue-50 transition-colors text-left"
                          >
                            <div className="flex-1">
                              <div className="font-bold text-gray-900">{i.item_name}</div>
                              <div className="text-[10px] text-gray-500">{i.brand} • {i.volume} {i.unit}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-black text-blue-600 text-sm">{formatIDR(i.price)}</div>
                              <div className="text-[10px] text-gray-400">Rp/{i.unit}</div>
                            </div>
                          </button>
                        ))}
                        <button 
                          onClick={() => { window.location.href='/ingredients'; }}
                          className="w-full p-4 text-center bg-gray-50 text-blue-600 font-bold text-xs hover:bg-blue-100 transition-colors"
                        >
                          + Create New Ingredient
                        </button>
                      </>
                    ) : (
                      <>
                        {filteredComps.map(r => (
                          <button 
                            key={r.id} 
                            onClick={() => addItem(r, 'COMPONENT')}
                            className="w-full flex items-center justify-between p-4 border-b last:border-0 hover:bg-blue-50 transition-colors text-left"
                          >
                            <div className="flex-1">
                              <div className="font-bold text-gray-900">{r.name}</div>
                              <div className="text-[10px] text-gray-500">Sub-recipe • Yield: {r.base_quantity}</div>
                            </div>
                            <div className="text-right font-black text-blue-600 text-sm">{formatIDR(r.total_hpp)}</div>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-4">
                {(recipe.items || []).map((item, idx) => {
                  const data = item.item_type === 'INGREDIENT' ? item.ingredient : item.component_recipe;
                  const itemCost = item.item_type === 'INGREDIENT' 
                    ? (data?.cost_per_unit || 0) * (item.quantity || 0)
                    : ((data?.total_hpp || 0) / (data?.base_quantity || 1)) * (item.quantity || 0);

                  return (
                    <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm hover:border-blue-200 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div className={cn("px-2 py-0.5 rounded text-[8px] font-black uppercase", item.item_type === 'INGREDIENT' ? "bg-orange-100 text-orange-600" : "bg-purple-100 text-purple-600")}>
                            {item.item_type}
                          </div>
                          <span className="font-bold text-gray-900">{data?.item_name || data?.name}</span>
                        </div>
                        <button onClick={() => removeItem(idx)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end">
                        <div className="space-y-1">
                           <label className="text-[9px] font-bold text-gray-400 uppercase">Quantity</label>
                           <Input 
                             type="number" 
                             value={item.quantity} 
                             onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                             className="h-9 font-bold bg-gray-50 border-none"
                           />
                        </div>
                        <div className="space-y-1">
                           <label className="text-[9px] font-bold text-gray-400 uppercase">Unit</label>
                           <Input 
                             value={item.unit} 
                             onChange={(e) => updateItem(idx, { unit: e.target.value })}
                             className="h-9 text-xs bg-gray-50 border-none"
                             placeholder="gr, ml, etc"
                           />
                        </div>
                        <div className="col-span-2 text-right">
                           <div className="text-[9px] font-bold text-gray-400 uppercase mb-1">Cost Preview</div>
                           <div className="text-lg font-black text-gray-900">{formatIDR(itemCost)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {(recipe.items || []).length === 0 && (
                  <div className="text-center py-20 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-200">
                    <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-sm font-bold text-gray-500">No items added yet</h3>
                    <p className="text-[10px] text-gray-400 mt-1 max-w-[200px] mx-auto uppercase tracking-wider">Search above to add ingredients or sub-recipes</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Overhead allocation */}
          <Card className="border-none shadow-sm bg-orange-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-tight text-orange-600 flex items-center gap-2">
                <Calculator className="w-4 h-4" /> Fixed Cost Allocation
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Monthly Fixed Costs (Total)</label>
                <Input 
                  type="number" 
                  value={recipe.monthly_fixed_cost} 
                  onChange={(e) => setRecipe({...recipe, monthly_fixed_cost: parseInt(e.target.value) || 0})}
                  className="bg-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Monthly Production (Units)</label>
                <Input 
                  type="number" 
                  value={recipe.monthly_production_volume} 
                  onChange={(e) => setRecipe({...recipe, monthly_production_volume: parseInt(e.target.value) || 0})}
                  className="bg-white"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Summary */}
        <div className="space-y-6">
          <Card className="bg-blue-600 text-white shadow-xl shadow-blue-200 border-none overflow-hidden relative rounded-3xl">
             <div className="absolute top-0 right-0 p-6 opacity-10">
                <Calculator className="w-24 h-24" />
             </div>
             <CardHeader className="pb-2">
                <CardTitle className="text-white/60 uppercase text-[10px] tracking-widest font-black">HPP Summary</CardTitle>
             </CardHeader>
             <CardContent className="space-y-6 relative">
                <div>
                   <div className="text-[10px] uppercase font-bold text-white/50 mb-1">Total HPP per {recipe.type === 'COMPONENT' ? 'Yield' : 'Portion'}</div>
                   <div className="text-5xl font-black">{formatIDR(hpp.total)}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                   <div>
                     <div className="text-[8px] uppercase font-bold text-white/50">Ingredients</div>
                     <div className="text-sm font-bold">{formatIDR(hpp.variable)}</div>
                   </div>
                   <div className="text-right">
                     <div className="text-[8px] uppercase font-bold text-white/50">Fixed Cost</div>
                     <div className="text-sm font-bold">{formatIDR(hpp.fixed)}</div>
                   </div>
                </div>
             </CardContent>
             <CardFooter className="bg-blue-700/50 flex flex-col items-center pt-4 pb-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-blue-100 bg-blue-800/50 px-3 py-1 rounded-full">
                  <Scale className="w-3 h-3" /> Base qty: {recipe.base_quantity}
                </div>
             </CardFooter>
          </Card>

          {/* Simulation */}
          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
             <button 
               onClick={() => setShowSimulation(!showSimulation)}
               className="w-full flex items-center justify-between p-6 text-left"
             >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-gray-900">Profit Simulation</span>
                </div>
                <ChevronRight className={cn("w-4 h-4 transition-transform text-gray-400", showSimulation && "rotate-90")} />
             </button>
             {showSimulation && (
                <CardContent className="pt-0 pb-6 space-y-4 px-6 animate-in slide-in-from-top-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase">Simulated Price</label>
                    <Input 
                      type="number" 
                      value={sellingPriceSim} 
                      onChange={(e) => setSellingPriceSim(parseInt(e.target.value) || 0)}
                      className="h-11 font-black text-lg bg-green-50/50 border-none text-green-700"
                    />
                  </div>
                  {sellingPriceSim > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 rounded-2xl">
                        <div className="text-[8px] font-bold text-gray-400 uppercase">Profit</div>
                        <div className="text-lg font-black text-green-600">{formatIDR(sellingPriceSim - hpp.total)}</div>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-2xl text-right">
                        <div className="text-[8px] font-bold text-gray-400 uppercase">Margin</div>
                        <div className="text-lg font-black text-green-600">
                          {Math.round(((sellingPriceSim - hpp.total) / sellingPriceSim) * 100)}%
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
             )}
          </Card>

          <PricingRecommendations hpp={hpp.total} />
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
      color: "bg-blue-50 text-blue-700 border-blue-100",
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
