"use client";

import React, { useState, useEffect } from "react";
import { 
  ClipboardList, Plus, Search, Trash2, Edit2, 
  ChevronRight, ArrowLeft, Save, Info, Calculator, 
  Sparkles, Scale, RefreshCw, TrendingUp, History,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { 
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle 
} from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { useToast } from "../../../components/ui/use-toast";
import { cn } from "../../../lib/utils";
import { calculateIngredientCost } from "../../../lib/conversions";

const formatIDR = (amount) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

const api = {
  get: async (url) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GET ${url} failed`);
    return res.json();
  },
  post: async (url, data) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`POST ${url} failed`);
    return res.json();
  },
  put: async (url, data) => {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`PUT ${url} failed`);
    return res.json();
  },
  delete: async (url) => {
    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error(`DELETE ${url} failed`);
    return res.json();
  }
};

// --- Components ---

function IngredientManager() {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", unit: "", cost_per_unit: 0 });
  const { success, error } = useToast();

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    try {
      const data = await api.get("/api/ingredients");
      setIngredients(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/api/ingredients/${editing.id}`, form);
        success("Ingredient updated");
      } else {
        await api.post("/api/ingredients", form);
        success("Ingredient added");
      }
      setEditing(null);
      setIsAdding(false);
      loadIngredients();
    } catch (e) {
      error("Error saving ingredient");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure?")) return;
    try {
      await api.delete(`/api/ingredients/${id}`);
      loadIngredients();
    } catch (e) {
      error("Could not delete. Ingredient might be in use.");
    }
  };

  const filtered = ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      {/* Search & Add Header */}
      {!isAdding && !editing && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search ingredients..." 
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => { setIsAdding(true); setForm({ name: "", unit: "", cost_per_unit: 0 }); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Add Ingredient
          </Button>
        </div>
      )}

      {/* Add/Edit Form Card */}
      {(isAdding || editing) && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-lg">{editing ? "Edit Ingredient" : "New Ingredient"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input placeholder="e.g. Flour" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit</label>
                <Input placeholder="e.g. kg, gr, pcs" value={form.unit} onChange={(e) => setForm({...form, unit: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Cost / Unit</label>
                <Input type="number" value={form.cost_per_unit} onChange={(e) => setForm({...form, cost_per_unit: e.target.value})} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setEditing(null); setIsAdding(false); }}>Cancel</Button>
            <Button onClick={handleSave} className="bg-blue-600">Save Ingredient</Button>
          </CardFooter>
        </Card>
      )}

      {/* Ingredient List */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ingredient Name</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Cost / Unit</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.name}</TableCell>
                <TableCell>{i.unit}</TableCell>
                <TableCell className="text-right">{formatIDR(i.cost_per_unit)}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(i); setForm({ name: i.name, unit: i.unit, cost_per_unit: i.cost_per_unit }); }}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(i.id)} className="text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {filtered.map(i => (
          <Card key={i.id} className="p-4 flex justify-between items-center">
            <div>
              <div className="font-bold">{i.name}</div>
              <div className="text-xs text-gray-500">{i.unit} • {formatIDR(i.cost_per_unit)} / unit</div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditing(i); setForm({ name: i.name, unit: i.unit, cost_per_unit: i.cost_per_unit }); }}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(i.id)} className="text-red-500">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// 2. Main Page with Tabs
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

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    try {
      const data = await api.get("/api/recipes");
      setRecipes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (recipe) => {
    try {
      const data = {
        name: `${recipe.name} (Copy)`,
        menu_id: null,
        base_quantity: recipe.base_quantity,
        ingredients: recipe.ingredients.map(i => ({
          ingredient_id: i.ingredient_id,
          manual_name: i.manual_name,
          manual_unit: i.manual_unit,
          manual_cost: i.manual_cost,
          quantity: i.quantity,
          source: i.source
        }))
      };
      await api.post("/api/recipes", data);
      loadRecipes();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this recipe?")) return;
    try {
      await api.delete(`/api/recipes/${id}`);
      loadRecipes();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div>Loading recipes...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={onAdd} className="bg-blue-600">
          <Plus className="w-4 h-4 mr-2" /> Create Recipe
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes.map(recipe => (
          <Card key={recipe.id} className="group hover:shadow-md transition-shadow relative overflow-hidden">
            {recipe.cost_change_alert > 5 && (
               <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse" />
            )}
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-bold">{recipe.name}</CardTitle>
                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" onClick={() => handleDuplicate(recipe)} title="Duplicate">
                    <ClipboardList className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onEdit(recipe.id)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(recipe.id)} className="text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardDescription className="flex items-center gap-1">
                Linked: <span className="font-medium text-blue-600 truncate">{recipe.menu?.name || "None"}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">HPP / Unit</div>
                  <div className="text-2xl font-black text-gray-900">{formatIDR(recipe.total_hpp)}</div>
                </div>
                {recipe.cost_change_alert !== 0 && (
                   <div className={cn(
                     "flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded",
                     recipe.cost_change_alert > 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"
                   )}>
                     {recipe.cost_change_alert > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
                     {Math.abs(recipe.cost_change_alert).toFixed(1)}%
                   </div>
                )}
              </div>
            </CardContent>
            {recipe.cost_change_alert > 5 && (
              <CardFooter className="py-2 bg-red-50 flex items-center gap-2 text-[10px] text-red-600 font-medium">
                <AlertTriangle className="w-3 h-3" /> Cost increase detected! Review prices.
              </CardFooter>
            )}
          </Card>
        ))}
      </div>
      
      {recipes.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed rounded-xl border-gray-200">
          <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No recipes yet</h3>
          <p className="text-sm text-gray-500">Add your first recipe to start calculating HPP.</p>
        </div>
      )}
    </div>
  );
}

// 4. Recipe Form (Builder + Calculator)
function RecipeForm({ id, onClose }) {
  const [recipe, setRecipe] = useState({
    name: "",
    menu_id: null,
    base_quantity: 1,
    ingredients: [],
    monthly_fixed_cost: 0,
    monthly_production_volume: 0
  });
  const [targetPortions, setTargetPortions] = useState(1);
  const [sellingPriceSim, setSellingPriceSim] = useState(0);
  const [showSimulation, setShowSimulation] = useState(false);
  const [suggestionTerm, setSuggestionTerm] = useState("");
  const [menus, setMenus] = useState([]);
  const [dbIngredients, setDbIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToast();

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allMenus, allIngs] = await Promise.all([
        api.get("/api/menus"),
        api.get("/api/ingredients")
      ]);
      setMenus(allMenus);
      setDbIngredients(allIngs);

      if (id) {
        const data = await api.get(`/api/recipes/${id}`);
        setRecipe(data);
        setTargetPortions(data.base_quantity || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addIngredient = (source) => {
    if (source === 'DATABASE') {
       // Handled by search suggestions now
    } else {
      setRecipe({
        ...recipe,
        ingredients: [...recipe.ingredients, {
          source: 'MANUAL',
          manual_name: "",
          manual_unit: "gr",
          manual_cost: 0,
          quantity: 1
        }]
      });
    }
    setSuggestionTerm("");
  };

  const filteredSuggestions = dbIngredients.filter(i => 
    i.name.toLowerCase().includes(suggestionTerm.toLowerCase()) &&
    !recipe.ingredients.some(ri => ri.ingredient_id === i.id)
  );

  const updateIngredient = (index, updates) => {
    const newIngredients = [...recipe.ingredients];
    if (updates.ingredient_id) {
      const dbIng = dbIngredients.find(i => i.id === Number(updates.ingredient_id));
      if (dbIng) {
        newIngredients[index] = {
          ...newIngredients[index],
          ingredient_id: dbIng.id,
          name: dbIng.name,
          unit: dbIng.unit, // Purchase unit
          usage_unit: dbIng.unit, // Default usage unit
          cost_per_unit: dbIng.cost_per_unit
        };
      }
    } else {
      newIngredients[index] = { ...newIngredients[index], ...updates };
    }
    setRecipe({ ...recipe, ingredients: newIngredients });
  };

  const removeIngredient = (index) => {
    const newIngredients = recipe.ingredients.filter((_, i) => i !== index);
    setRecipe({ ...recipe, ingredients: newIngredients });
  };

  const calculateHpp = () => {
    let variable = 0;
    recipe.ingredients.forEach(i => {
      let cost = 0;
      if (i.source === 'DATABASE') {
        const purchasePrice = i.cost_per_unit || 0;
        const purchaseUnit = i.unit;
        const usageUnit = i.usage_unit || purchaseUnit;
        const usageQty = Number(i.quantity) || 0;
        variable += calculateIngredientCost(purchasePrice, purchaseUnit, usageQty, usageUnit);
      } else {
        variable += (Number(i.quantity) || 0) * (Number(i.manual_cost) || 0);
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

  const getScaledQuantity = (qty) => {
    const ratio = targetPortions / (Number(recipe.base_quantity) || 1);
    return (qty * ratio).toFixed(2);
  };

  const handleSave = async () => {
    try {
      if (id) {
        await api.put(`/api/recipes/${id}`, recipe);
      } else {
        await api.post("/api/recipes", recipe);
      }
      success("Recipe Saved");
      onClose();
    } catch (e) {
      error("Save Failed");
    }
  };

  const hpp = calculateHpp();

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onClose} size="sm">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-2xl font-bold">{id ? "Edit Recipe" : "New Recipe Builder"}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Inputs */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Recipe Name</label>
                <Input value={recipe.name} onChange={(e) => setRecipe({...recipe, name: e.target.value})} placeholder="e.g. Signature Noodle Bowl" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Link to Menu Item (Optional)</label>
                  <select 
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={recipe.menu_id || ""}
                    onChange={(e) => setRecipe({...recipe, menu_id: e.target.value})}
                  >
                    <option value="">Select Menu</option>
                    {menus.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1">
                    Recipe Yield (Portions) <Info className="w-3 h-3 text-gray-400" />
                  </label>
                  <Input type="number" value={recipe.base_quantity} onChange={(e) => setRecipe({...recipe, base_quantity: e.target.value})} />
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                <div>
                   <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2">
                     <Scale className="w-4 h-4" /> Recipe Scaling
                   </h4>
                   <p className="text-[10px] text-blue-700">Adjust ingredient quantities for planning</p>
                </div>
                <div className="flex items-center gap-2">
                   <label className="text-xs font-medium text-blue-900">Target:</label>
                   <Input 
                     type="number" 
                     className="w-20 h-8 bg-white" 
                     value={targetPortions} 
                     onChange={(e) => setTargetPortions(Number(e.target.value))} 
                   />
                   <span className="text-xs font-bold text-blue-900">Portions</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Ingredients</CardTitle>
                <CardDescription>Recipe ingredients and quantities</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => addIngredient('MANUAL')}>
                  <Plus className="w-4 h-4 mr-2" /> Manual
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Smart Suggestion Search */}
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    placeholder="Search or add from Ingredient Master..." 
                    className="pl-10"
                    value={suggestionTerm}
                    onChange={(e) => setSuggestionTerm(e.target.value)}
                  />
                </div>
                {suggestionTerm && filteredSuggestions.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredSuggestions.map(i => (
                      <button
                        key={i.id}
                        className="w-full text-left px-4 py-2 hover:bg-blue-50 text-sm flex justify-between items-center"
                        onClick={() => {
                          setRecipe({
                            ...recipe,
                            ingredients: [...recipe.ingredients, {
                              ingredient_id: i.id,
                              source: 'DATABASE',
                              quantity: 1,
                              name: i.name,
                              unit: i.unit,
                              cost_per_unit: i.cost_per_unit
                            }]
                          });
                          setSuggestionTerm("");
                        }}
                      >
                        <span className="font-medium">{i.name}</span>
                        <span className="text-xs text-gray-500">{formatIDR(i.cost_per_unit)} / {i.unit}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {recipe.ingredients.length === 0 && (
                <div className="text-center py-10 text-gray-400 text-sm">No ingredients added. Search above to add from database.</div>
              )}
              <div className="space-y-3">
                {recipe.ingredients.map((ing, idx) => (
                  <div key={idx} className="relative p-4 border rounded-xl hover:border-blue-400 transition-colors bg-white shadow-sm">
                    <button 
                      onClick={() => removeIngredient(idx)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center hover:bg-red-200"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {ing.source === 'DATABASE' ? (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Ingredient (DB)</label>
                          <select 
                            className="w-full text-sm font-semibold border-none p-0 focus:ring-0"
                            value={ing.ingredient_id}
                            onChange={(e) => updateIngredient(idx, { ingredient_id: e.target.value })}
                          >
                            {dbIngredients.map(di => <option key={di.id} value={di.id}>{di.name} ({formatIDR(di.cost_per_unit)}/{di.unit})</option>)}
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Manual Ingredient Name</label>
                          <Input 
                            value={ing.manual_name} 
                            onChange={(e) => updateIngredient(idx, { manual_name: e.target.value })} 
                            className="h-8 border-none p-0 focus-visible:ring-0 text-sm"
                            placeholder="Unnamed ingredient"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase">Qty (for yield)</label>
                          <div className="flex items-center gap-2">
                            <Input 
                              type="number" 
                              step="0.01"
                              value={ing.quantity} 
                              onChange={(e) => updateIngredient(idx, { quantity: e.target.value })} 
                              className="h-8"
                            />
                            {ing.source === 'DATABASE' ? (
                              <select 
                                className="text-xs bg-gray-50 border-none p-0 h-8 focus:ring-0"
                                value={ing.usage_unit || ing.unit}
                                onChange={(e) => updateIngredient(idx, { usage_unit: e.target.value })}
                              >
                                {['kg','g','gr','kilogram','gram','l','ml','liter','milliliter','pcs','pack'].includes(ing.unit?.toLowerCase()) ? (
                                  ['kg','gr','ml','l','pcs','pack'].map(u => <option key={u} value={u}>{u}</option>)
                                ) : (
                                  <option value={ing.unit}>{ing.unit}</option>
                                )}
                              </select>
                            ) : (
                              <span className="text-xs font-medium text-gray-500 shrink-0">{ing.manual_unit}</span>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1 text-right">
                          <label className="text-[10px] font-bold text-blue-600 uppercase flex items-center justify-end gap-1">
                            <Scale className="w-2 h-2" /> Scaled Qty
                          </label>
                          <div className="h-8 flex items-center justify-end font-bold text-blue-700 text-sm">
                            {getScaledQuantity(ing.quantity)} {ing.usage_unit || ing.unit || ing.manual_unit}
                          </div>
                        </div>
                      </div>
                    </div>

                    {ing.source === 'MANUAL' && (
                      <div className="grid grid-cols-2 gap-4 mt-2 pt-2 border-t border-dashed">
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Unit (kg/gr)" 
                            value={ing.manual_unit} 
                            onChange={(e) => updateIngredient(idx, { manual_unit: e.target.value })} 
                            className="h-7 text-xs"
                          />
                          <Input 
                            type="number"
                            placeholder="Cost/Unit" 
                            value={ing.manual_cost} 
                            onChange={(e) => updateIngredient(idx, { manual_cost: e.target.value })} 
                            className="h-7 text-xs"
                          />
                        </div>
                        <div className="text-[10px] text-gray-400 flex items-center justify-end">Source: Manual Entry</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50/30 border-orange-100">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-orange-500" /> Fixed Cost Allocation
              </CardTitle>
              <CardDescription>Allocate monthly overhead to this recipe</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Monthly Fixed Cost (Total)</label>
                <Input type="number" value={recipe.monthly_fixed_cost} onChange={(e) => setRecipe({...recipe, monthly_fixed_cost: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Est. Monthly Production (Units)</label>
                <Input type="number" value={recipe.monthly_production_volume} onChange={(e) => setRecipe({...recipe, monthly_production_volume: e.target.value})} />
              </div>
            </CardContent>
            <CardFooter className="bg-orange-100/30 text-sm py-2">
              <span className="text-orange-700">Allocated Fixed Cost: <b>{formatIDR(hpp.fixed)}</b> per product</span>
            </CardFooter>
          </Card>
        </div>

        {/* Right Side: HPP Summary & AI Recommendations */}
        <div className="space-y-6">
          <Card className="bg-blue-600 text-white shadow-xl overflow-hidden relative">
             <div className="absolute top-0 right-0 p-4 opacity-10">
                <Calculator className="w-24 h-24" />
             </div>
             <CardHeader>
                <CardTitle className="text-white opacity-80 uppercase text-xs tracking-widest font-bold">HPP Calculation Summary</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4 relative">
                <div className="flex justify-between items-center text-sm opacity-90">
                  <span>Variable Cost / Product</span>
                  <span className="font-bold">{formatIDR(hpp.variable)}</span>
                </div>
                <div className="flex justify-between items-center text-sm opacity-90">
                  <span>Allocated Fixed Cost</span>
                  <span className="font-bold">{formatIDR(hpp.fixed)}</span>
                </div>
                <div className="pt-4 border-t border-white/20">
                   <div className="text-[10px] uppercase font-bold text-white/70">Total HPP per Product</div>
                   <div className="text-4xl font-black mt-1">{formatIDR(hpp.total)}</div>
                </div>
             </CardContent>
             <CardFooter className="bg-blue-700/50 flex flex-col gap-2">
                <Button onClick={handleSave} className="w-full bg-white text-blue-700 hover:bg-blue-50">
                  <Save className="w-4 h-4 mr-2" /> {id ? "Update Recipe" : "Save Recipe"}
                </Button>
                {id && (
                  <Button variant="ghost" className="w-full text-white/70 text-xs" onClick={() => success("Snapshot feature active")}>
                    <History className="w-4 h-4 mr-2" /> Viewed as version {new Date().toLocaleDateString()}
                  </Button>
                )}
             </CardFooter>
          </Card>

          <PricingRecommendations hpp={hpp.total} />

          <Card className="border-green-200 shadow-none">
             <button 
               onClick={() => setShowSimulation(!showSimulation)}
               className="w-full flex items-center justify-between p-4 text-left"
             >
                <CardTitle className="text-sm flex items-center text-green-800">
                  <TrendingUp className="w-4 h-4 mr-2" /> Profit Simulation
                </CardTitle>
                <ChevronRight className={cn("w-4 h-4 transition-transform", showSimulation && "rotate-90")} />
             </button>
             {showSimulation && (
               <CardContent className="space-y-4 pt-0 animate-in slide-in-from-top-2">
                 <div className="space-y-2">
                   <label className="text-xs font-semibold text-gray-600">Simulate Selling Price</label>
                   <Input 
                     type="number" 
                     value={sellingPriceSim} 
                     onChange={(e) => setSellingPriceSim(Number(e.target.value))}
                     className="bg-green-50/50 border-green-100"
                   />
                 </div>

                 {sellingPriceSim > 0 && (
                   <div className="grid grid-cols-2 gap-4 mt-4">
                     <div className="p-3 bg-white border rounded-xl">
                       <div className="text-[8px] uppercase font-bold text-gray-500">Profit / Unit</div>
                       <div className="text-lg font-black text-green-700">{formatIDR(sellingPriceSim - hpp.total)}</div>
                     </div>
                     <div className="p-3 bg-white border rounded-xl">
                       <div className="text-[8px] uppercase font-bold text-gray-500">Gross Margin</div>
                       <div className="text-lg font-black text-green-700">
                         {Math.round(((sellingPriceSim - hpp.total) / sellingPriceSim) * 100)}%
                       </div>
                     </div>
                     <div className="col-span-2 p-3 bg-white border rounded-xl flex justify-between items-center">
                       <div>
                         <div className="text-[8px] uppercase font-bold text-gray-500">Break-even Sales</div>
                         <div className="text-lg font-black text-orange-600">
                           {recipe.monthly_fixed_cost > 0 && sellingPriceSim > hpp.total 
                             ? Math.ceil(recipe.monthly_fixed_cost / (sellingPriceSim - hpp.total))
                             : "-"}
                         </div>
                       </div>
                       <div className="text-[10px] text-gray-400 text-right">Units / month <br/> to cover fixed costs</div>
                     </div>
                   </div>
                 )}
               </CardContent>
             )}
          </Card>
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
