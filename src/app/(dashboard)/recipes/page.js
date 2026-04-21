"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  ClipboardList, Plus, Search, Trash2, Edit2, 
  ChevronRight, ArrowLeft, Save, Info, Calculator, 
  Sparkles, Scale, RefreshCw, TrendingUp, History,
  AlertTriangle, Eye, X,
  CheckCircle2, Layers, Rocket, Tag, Percent
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
import { useTranslation } from "../../../lib/language-context";
import { cn } from "../../../lib/utils";
import { calculateIngredientCost } from "../../../lib/conversions";
import { api } from "../../../lib/api"; // Use global authenticated API
import { formatIDR } from "../../../lib/format";
import PinVerificationModal from "../../../components/PinVerificationModal";
import { decodeAndValidateJwt } from "../../../lib/api";

import { useSearchParams, useRouter, usePathname } from "next/navigation";

// --- Main Page with Tabs
export default function RecipesPage() {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState(null);
  const [pinModal, setPinModal] = useState({ open: false, action: null, targetId: null });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) setUser(decodeAndValidateJwt(token));
  }, []);

  const canEdit = user?.role === 'OWNER' || user?.role === 'ADMIN';

  const activeTab = searchParams.get("tab") || "recipes";
  const subTab = searchParams.get("type") || "STANDARD";
  const creatingRecipe = searchParams.get("action") === "create";
  const editingRecipeId = searchParams.get("edit") ? Number(searchParams.get("edit")) : null;
  const publishingRecipeId = searchParams.get("publish") ? Number(searchParams.get("publish")) : null;
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadRecipes();
  }, [refreshKey]);

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

  const handleDelete = async (id) => {
    try {
      await api.delete(`/recipes/${id}`);
      success(t('recipes.delete_success'));
      loadRecipes();
    } catch (e) {
      console.error(e);
      error(t('common.error'));
    }
  };

  const handlePinSubmit = async (pin) => {
    try {
      await api.post('/auth/verify-manager', { pin });
      if (pinModal.action === 'DELETE') {
        await handleDelete(pinModal.targetId);
      }
      setPinModal({ open: false, action: null, targetId: null });
    } catch (err) {
      throw new Error("Invalid Manager PIN");
    }
  };

  const setActiveTab = (tab) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const setCreatingRecipe = (val, type = "STANDARD") => {
    const params = new URLSearchParams(searchParams);
    if (val) {
      params.set("action", "create");
      params.set("type", type);
    } else {
      params.delete("action");
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const setSubTab = (type) => {
    const params = new URLSearchParams(searchParams);
    params.set("type", type);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const setEditingRecipeId = (id) => {
    const params = new URLSearchParams(searchParams);
    if (id) params.set("edit", id);
    else params.delete("edit");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const setPublishingRecipe = (id) => {
    const params = new URLSearchParams(searchParams);
    if (id) params.set("publish", id);
    else params.delete("publish");
    router.replace(`${pathname}?${params.toString()}`);
  };

  const publishingRecipe = recipes.find(r => r.id === publishingRecipeId);

  const handleCloseForm = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("action");
    params.delete("edit");
    params.delete("type"); // Optional: clear type too if desired
    router.replace(`${pathname}?${params.toString()}`);
    setRefreshKey(prev => prev + 1);
  };

  if (creatingRecipe || editingRecipeId) {
    return <RecipeForm 
      id={editingRecipeId} 
      onClose={handleCloseForm} 
    />;
  }

  return (
    <div className="max-w-[1700px] mx-auto space-y-10 animate-fade-in pb-20 px-4 md:px-8">
      <PublishToProductModal 
        recipe={publishingRecipe} 
        onClose={() => setPublishingRecipe(null)} 
        onSuccess={() => {
           setPublishingRecipe(null);
           setRefreshKey(prev => prev + 1);
        }}
      />
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">{t('recipes.title')}</h2>
            <span className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
              {t('recipes.subtitle')}
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
            <ClipboardList className="w-3.5 h-3.5" /> {t('recipes.recipes_tab')}
          </button>
          <button
            onClick={() => setActiveTab("ingredients")}
            className={cn(
              "px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2",
              activeTab === "ingredients" ? "bg-white text-slate-900 shadow-xl shadow-slate-200/50" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Scale className="w-3.5 h-3.5" /> {t('recipes.ingredients_tab')}
          </button>
        </div>
      </div>

      <div className="animate-in fade-in duration-500">
        {activeTab === "ingredients" ? (
          <IngredientManager />
        ) : (
          <RecipeList 
            recipes={recipes}
            loading={loading}
            subTab={subTab}
            setSubTab={setSubTab}
            onAdd={(type) => setCreatingRecipe(true, type)} 
            onEdit={(id) => setEditingRecipeId(id)} 
            onPublish={(id) => setPublishingRecipe(id)}
            canEdit={canEdit}
            loadRecipes={loadRecipes}
            pinModal={pinModal}
            setPinModal={setPinModal}
            handlePinSubmit={handlePinSubmit}
          />
        )}
      </div>
    </div>
  );
}

// 3. Recipe List Component
function RecipeList({ recipes, loading, subTab, setSubTab, onAdd, onEdit, onPublish, canEdit, loadRecipes, pinModal, setPinModal, handlePinSubmit }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [viewingRecipeId, setViewingRecipeId] = useState(null);
  const viewingRecipe = recipes.find(r => r.id === viewingRecipeId);
  const [sortBy, setSortBy] = useState("name"); // name, category, hpp
  const [searchTerm, setSearchTerm] = useState("");
  const { success, error } = useToast();
  const { t } = useTranslation();

  const filteredRecipes = useMemo(() => {
    return recipes
      .filter(r => r.type === subTab)
      .filter(r => 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.menu?.name || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === "name") return a.name.localeCompare(b.name);
        if (sortBy === "category") return (a.menu?.name || "").localeCompare(b.menu?.name || "");
        if (sortBy === "hpp") return a.total_hpp - b.total_hpp;
        return 0;
      });
  }, [recipes, subTab, searchTerm, sortBy]);

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
      success(t('recipes.save_success'));
      loadRecipes();
    } catch (e) {
      console.error(e);
      error(t('common.error'));
    }
  };

  const handleDelete = async (id) => {
    setConfirmDeleteId(null);
    try {
      await api.delete(`/recipes/${id}`);
      success(t('recipes.delete_success'));
      loadRecipes();
    } catch (e) {
      console.error(e);
      error(t('common.error'));
    }
  };

  if (loading) return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {[1,2,3,4,5,6].map(i => (
          <div key={i} className="h-64 bg-slate-50 rounded-[2.5rem] animate-pulse shadow-inner border border-slate-100" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-10">
      <div className="glass-card p-8 rounded-[2.5rem] shadow-2xl border-none space-y-8 bg-white/60">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-4">
            <h3 className="font-black text-slate-900 text-2xl uppercase tracking-tight italic">{t('recipes.recipe_vault')}</h3>
            <div className="flex bg-slate-100/80 p-1.5 rounded-2xl w-fit">
              <button 
                onClick={() => setSubTab("STANDARD")}
                className={cn(
                  "px-8 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all tracking-widest",
                  subTab === "STANDARD" ? "bg-white text-emerald-600 shadow-xl shadow-emerald-100" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {t('recipes.menu_items')}
              </button>
              <button 
                onClick={() => setSubTab("COMPONENT")}
                className={cn(
                  "px-8 py-2.5 text-[10px] font-black uppercase rounded-xl transition-all tracking-widest",
                  subTab === "COMPONENT" ? "bg-white text-purple-600 shadow-xl shadow-purple-100" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {t('recipes.components')}
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row flex-1 w-full lg:max-w-4xl items-center gap-4">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
              <input 
                placeholder="Search blueprints..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-14 bg-white border border-slate-100 rounded-2xl pl-14 pr-4 font-black text-[10px] uppercase tracking-widest text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all shadow-sm"
              />
            </div>
            
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-14 min-w-[180px] bg-white border border-slate-100 rounded-2xl px-6 font-black text-[10px] uppercase tracking-widest text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all appearance-none cursor-pointer pr-12 relative shadow-sm"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23cbd5e1\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1.25rem center', backgroundSize: '1.25em' }}
            >
              <option value="name">Sort by Name</option>
              <option value="category">Sort by Category</option>
              <option value="hpp">Sort by COGS (HPP)</option>
            </select>

            {canEdit && (
              <button 
                onClick={() => onAdd(subTab)} 
                className="w-full sm:w-auto flex items-center justify-center gap-3 bg-slate-900 hover:bg-black text-white h-14 px-10 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-slate-200 transition-all active:scale-95"
              >
                <Plus className="w-5 h-5" /> {subTab === 'STANDARD' ? t('recipes.create_recipe') : t('recipes.add_component')}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 sm:gap-8">
        {filteredRecipes.map(recipe => (
          <div key={recipe.id} className="relative group h-full">
            <div className="glass-card hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] transition-all duration-500 relative overflow-hidden rounded-[2.5rem] border-none shadow-2xl h-full flex flex-col bg-white">
              {/* Top Accent line based on type */}
              <div className={cn(
                "h-2 w-full",
                recipe.type === 'STANDARD' ? "bg-emerald-500" : "bg-purple-500"
              )} />

              <div className="p-8 flex flex-col flex-1">
                {/* Header Section: Badge + Title */}
                <div className="mb-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={cn(
                      "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border", 
                      recipe.type === 'STANDARD' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-purple-50 text-purple-600 border-purple-100"
                    )}>
                      {recipe.type === 'STANDARD' ? t('recipes.menu_items') : t('recipes.components')}
                    </div>
                    {recipe.cost_change_alert > 5 && (
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">
                         <AlertTriangle className="w-3.5 h-3.5" />
                         HIGH
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-snug min-h-[56px] line-clamp-2">
                    {recipe.name}
                  </h3>
                </div>

                {/* Financial Section */}
                <div className="flex-1">
                  <div className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] mb-1">{t('recipes.hpp_per_unit')}</div>
                  <div className="flex items-end justify-between gap-2">
                    <div className="text-3xl font-black text-slate-900 tracking-tighter tabular-nums truncate">
                      {formatIDR(recipe.total_hpp)}
                    </div>
                    {recipe.cost_change_alert !== 0 && (
                       <div className={cn(
                         "flex items-center gap-1.5 text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm border shrink-0",
                         recipe.cost_change_alert > 0 ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                       )}>
                         {recipe.cost_change_alert > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5 rotate-180" />}
                         {Math.abs(recipe.cost_change_alert).toFixed(1)}%
                       </div>
                    )}
                  </div>
                </div>

                {/* Metadata Row */}
                <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                   <div className="flex items-center gap-2 shrink-0">
                     <Scale className="w-3.5 h-3.5 text-slate-300" /> 
                     <span>{t('recipes.yield')}: {recipe.base_quantity}</span>
                   </div>
                   <div className="flex items-center gap-2 max-w-[50%]">
                     <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                     <span className="truncate">{recipe.menu?.name || t('kitchen.unclassified')}</span>
                   </div>
                </div>

                {/* Actions Footer - Structure Icons into a clean bar */}
                <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setViewingRecipeId(recipe.id); }} 
                      className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all group/btn"
                      title={t('common.view')}
                    >
                      <Eye className="w-4.5 h-4.5" />
                    </button>
                    {canEdit && recipe.type === 'STANDARD' && !recipe.menu_id && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); onPublish(recipe.id); }} 
                        className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all"
                        title="Publish to Product List"
                      >
                        <Rocket className="w-4.5 h-4.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDuplicate(recipe); }} 
                          className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all"
                          title="Duplicate"
                        >
                          <History className="w-4.5 h-4.5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onEdit(recipe.id); }} 
                          className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all"
                          title={t('common.edit')}
                        >
                          <Edit2 className="w-4.5 h-4.5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setPinModal({ open: true, action: 'DELETE', targetId: recipe.id }); }} 
                          className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-4.5 h-4.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
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
                  <h4 className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.3em]">{t('recipes.blueprint_breakdown')}</h4>
                </div>
                <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight leading-none">{viewingRecipe.name}</h3>
              </div>
              
              <div className="flex-1 overflow-y-auto px-8 sm:px-10 py-6 custom-scrollbar">
                <Table className="w-full">
                  <TableHeader className="sticky top-0 bg-white/90 backdrop-blur-md z-10 border-b-2 border-slate-100">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="py-4 text-[11px] font-black uppercase text-slate-500 tracking-widest pl-0">{t('recipes.composition')}</TableHead>
                      <TableHead className="py-4 text-[11px] font-black uppercase text-slate-500 tracking-widest text-right pr-0">{t('recipes.volume_metric')}</TableHead>
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
                            {item.unit && item.unit !== 'portion' ? item.unit : (item.item_type === 'INGREDIENT' ? item.ingredient?.unit : item.component_recipe?.base_unit || "")}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="p-8 sm:p-10 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{t('recipes.net_yield')}</p>
                  <p className="text-3xl font-black text-emerald-600 tracking-tight">{viewingRecipe.base_quantity} <span className="text-sm text-slate-400 ml-1">{viewingRecipe.base_unit || "UNITS"}</span></p>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setViewingRecipeId(null)} 
                    className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all"
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    onClick={() => { onEdit(viewingRecipe.id); setViewingRecipeId(null); }} 
                    className="px-10 py-5 bg-slate-900 hover:bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-2xl shadow-slate-200 flex items-center gap-3"
                  >
                    <Edit2 className="w-4 h-4" /> {t('recipes.edit_blueprint')}
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
          <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">{t('shift.no_records')}</h3>
          <p className="text-[10px] text-slate-400 mt-4 max-w-[280px] mx-auto uppercase tracking-widest font-black leading-relaxed">{t('recipes.not_found_help')}</p>
        </div>
      )}
      <PinVerificationModal 
        open={pinModal.open}
        onClose={() => setPinModal({ open: false, action: null, targetId: null })}
        onSubmit={handlePinSubmit}
        title={pinModal.action === 'DELETE' ? "Confirm Deletion" : "Authentication Required"}
        subtitle="Manager or Owner PIN required for this action"
      />
    </div>
  );
}


// 4. Recipe Form (Builder + Calculator)
function RecipeForm({ id, onClose }) {
  const searchParams = useSearchParams();
  const [recipe, setRecipe] = useState({
    name: "",
    type: "STANDARD",
    menu_id: null,
    base_quantity: 1,
    base_unit: "portion",
    items: [],
    monthly_fixed_cost: 0,
    monthly_production_volume: 0
  });
  // Smart Pricing Engine state
  const [overheadPercent, setOverheadPercent] = useState(20);
  const [targetFoodCostPercent, setTargetFoodCostPercent] = useState(40);
  const [dailySalesTarget, setDailySalesTarget] = useState(30);
  const [dailyProfitTarget, setDailyProfitTarget] = useState(100000);
  const [suggestionTerm, setSuggestionTerm] = useState("");
  const [selectionType, setSelectionType] = useState("INGREDIENT"); // INGREDIENT or COMPONENT
  const [menus, setMenus] = useState([]);
  const [dbIngredients, setDbIngredients] = useState([]);
  const [componentRecipes, setComponentRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { success, error } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    loadData();
    
    // Accessibility: Close on Escape
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [id]);

  const loadData = async () => {
    if (!id) {
      setRecipe({
        name: "",
        type: searchParams.get("type") || "STANDARD",
        menu_id: null,
        base_quantity: 1,
        base_unit: (searchParams.get("type") || "STANDARD") === 'COMPONENT' ? 'gr' : "portion",
        items: [],
        monthly_fixed_cost: 0,
        monthly_production_volume: 0
      });
    }
    setLoading(true);
    try {
      const [allMenus, allIngs, allRecipes, existingData] = await Promise.all([
        api.get("/menus?all=true"),
        api.get("/ingredients?essential=true"),
        api.get("/recipes?type=COMPONENT&essential=true"),
        id ? api.get(`/recipes/${id}`) : Promise.resolve(null)
      ]);
      setMenus(allMenus);
      setDbIngredients(allIngs);
      setComponentRecipes(allRecipes.filter(r => r.id !== id));

      if (id && existingData) {
        const data = existingData;
        
        // Auto-Sync Units with Master Data on Load
        const syncedItems = (data.items || []).map(item => {
           if (item.item_type === 'INGREDIENT' && item.ingredient) {
             const masterUnit = item.ingredient.is_generic 
               ? item.ingredient.subItems?.find(s => s.is_active_brand)?.unit || item.ingredient.unit
               : item.ingredient.unit;
             if (masterUnit && item.unit !== masterUnit) {
               return { ...item, unit: masterUnit };
             }
           }
           return item;
        });

        setRecipe({ ...data, items: syncedItems });
        setTargetPortions(data.base_quantity || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addItem = (item, type) => {
    const getMasterUnit = () => {
      if (type !== 'INGREDIENT') return (item.base_unit || 'portion');
      if (item.is_generic) {
        return item.subItems?.find(s => s.is_active_brand)?.unit || item.unit;
      }
      return item.unit;
    };

    const newItem = {
      item_type: type,
      quantity: 1,
      unit: getMasterUnit()
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
        let costPerUnit = item.ingredient.cost_per_unit || 0;
        if (item.ingredient.is_generic && item.ingredient.subItems) {
           const activeBrand = item.ingredient.subItems.find(s => s.is_active_brand);
           if (activeBrand) costPerUnit = activeBrand.cost_per_unit || 0;
        }
        variable += costPerUnit * (Number(item.quantity) || 0);
      } else if (item.item_type === 'COMPONENT' && item.component_recipe) {
        const costPerPortion = (item.component_recipe.total_hpp || 0) / (item.component_recipe.base_quantity || 1);
        variable += costPerPortion * (Number(item.quantity) || 0);
      }
    });
    const baseQty = Number(recipe.base_quantity) || 1;
    const materialCost = variable / baseQty;
    // New: overhead is a % of material cost
    const overheadAmount = materialCost * (overheadPercent / 100);
    const totalCost = materialCost + overheadAmount;
    // Pricing engine
    const fc = Math.max(1, targetFoodCostPercent);
    const suggestedPrice = Math.ceil((totalCost / (fc / 100)) / 500) * 500;
    const profitPerUnit = suggestedPrice - totalCost;
    const dailyRevenue = suggestedPrice * dailySalesTarget;
    const dailyProfit = profitPerUnit * dailySalesTarget;
    const requiredSales = profitPerUnit > 0 ? Math.ceil(dailyProfitTarget / profitPerUnit) : Infinity;
    const isTargetAchievable = dailySalesTarget >= requiredSales;
    return {
      variable: materialCost,
      overheadAmount,
      total: totalCost,
      suggestedPrice,
      profitPerUnit,
      dailyRevenue,
      dailyProfit,
      requiredSales,
      isTargetAchievable
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
      success(t('recipes.save_success'));
      onClose();
    } catch (e) {
      error(t('common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const hpp = calculateHpp();

  const filteredIngs = dbIngredients
    .filter(i => !i.parentId) // Hide sub-items (brands linked to generic)
    .filter(i => 
      (i.item_name || "").toLowerCase().includes(suggestionTerm.toLowerCase()) ||
      (i.brand || "").toLowerCase().includes(suggestionTerm.toLowerCase())
    );

  const filteredComps = componentRecipes.filter(r => 
    (r.name || "").toLowerCase().includes(suggestionTerm.toLowerCase())
  );

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in">
       <div className="glass-card rounded-[3rem] p-10 bg-white/40 backdrop-blur-xl border-none shadow-2xl space-y-8">
          <div className="flex items-center gap-6">
             <div className="w-16 h-16 rounded-2xl bg-slate-100 animate-pulse" />
             <div className="space-y-2">
                <div className="h-8 w-48 bg-slate-100 rounded-lg animate-pulse" />
                <div className="h-4 w-32 bg-slate-50 rounded-lg animate-pulse" />
             </div>
          </div>
          <div className="grid grid-cols-2 gap-8">
             <div className="h-20 bg-slate-50 rounded-2xl animate-pulse" />
             <div className="h-20 bg-slate-50 rounded-2xl animate-pulse" />
          </div>
          <div className="h-96 bg-slate-50 rounded-[2rem] animate-pulse" />
       </div>
    </div>
  );

  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between sticky top-0 z-[100] bg-slate-50/90 backdrop-blur-xl py-6 -mx-4 px-6 sm:mx-0 sm:px-0 border-b border-slate-200/50 mb-10">
        <div className="flex items-center gap-6">
          <button 
            onClick={onClose} 
            className="w-14 h-14 rounded-2xl bg-white shadow-xl shadow-slate-200 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all active:scale-95 group"
          >
            <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none">{id ? t('recipes.edit_blueprint') : t('recipes.create_recipe')}</h2>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-2 h-2 bg-emerald-600 rounded-full animate-pulse" />
              <p className="text-[10px] text-slate-400 uppercase tracking-[0.3em] font-black">{t('recipes.hpp_intelligence')}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-6 md:mt-0">
          <button 
            onClick={onClose} 
            className="px-8 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 transition-all"
          >
            {t('common.cancel')}
          </button>
          <button 
            onClick={handleSave} 
            disabled={isSaving} 
            className="px-10 py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-slate-300 transition-all active:scale-95 flex items-center gap-3"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? t('common.saving') : t('common.save')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
        {/* Main Section */}
        <div className="md:col-span-8 space-y-10">
          {/* Identity Block */}
          <div className="glass-card rounded-[2.5rem] p-10 bg-white/60">
             <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center">
                  <Info className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">{t('recipes.identity')}</h3>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3 col-span-1 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('recipes.recipe_name')}</label>
                  <input 
                    value={recipe.name} 
                    onChange={(e) => setRecipe({...recipe, name: e.target.value})} 
                    placeholder={t('recipes.eg_ramen')}
                    className="w-full h-16 bg-white border border-slate-100 rounded-[1.25rem] px-8 font-black text-lg uppercase tracking-tight text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-sm placeholder:text-slate-200"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('recipes.identity')}</label>
                  <select 
                    className="w-full h-16 bg-white border border-slate-100 rounded-[1.25rem] px-8 font-black uppercase text-[11px] tracking-widest text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-sm appearance-none cursor-pointer"
                    value={recipe.type}
                    onChange={(e) => setRecipe({...recipe, type: e.target.value})}
                  >
                    <option value="STANDARD">{t('recipes.standard_menu')}</option>
                    <option value="COMPONENT">{t('recipes.sub_recipe')}</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('recipes.batch_yield')}</label>
                    <input 
                      type="number" 
                      value={recipe.base_quantity} 
                      onChange={(e) => setRecipe({...recipe, base_quantity: parseFloat(e.target.value) || 1})}
                      className="w-full h-16 bg-emerald-50/30 border border-emerald-100 rounded-[1.25rem] px-8 font-black text-2xl text-emerald-600 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-inner"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">{t('stock.unit')}</label>
                    <input 
                      value={recipe.base_unit} 
                      onChange={(e) => setRecipe({...recipe, base_unit: e.target.value})}
                      placeholder="ml, gr..."
                      className="w-full h-16 bg-white border border-slate-100 rounded-[1.25rem] px-6 font-black uppercase text-[11px] tracking-widest text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>
             </div>

             {recipe.type === 'STANDARD' && (
                <div className="mt-8 pt-8 border-t border-slate-100">
                   <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-3 block">{t('recipes.ledger_summary')}</label>
                   <select 
                    className="w-full h-16 bg-white border border-slate-100 rounded-[1.25rem] px-8 font-black uppercase text-[11px] tracking-widest text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-sm appearance-none cursor-pointer"
                    value={recipe.menu_id || ""}
                    onChange={(e) => setRecipe({...recipe, menu_id: e.target.value ? Number(e.target.value) : null})}
                  >
                    <option value="">{t('recipes.standalone')}</option>
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
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">{t('recipes.composition')}</h3>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-[1.25rem]">
                  <button 
                    onClick={() => setSelectionType("INGREDIENT")}
                    className={cn("px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", selectionType === "INGREDIENT" ? "bg-white text-emerald-600 shadow-xl shadow-emerald-100" : "text-slate-400 hover:text-slate-600")}
                  >{t('recipes.ingredients_tab')}</button>
                  <button 
                    onClick={() => setSelectionType("COMPONENT")}
                    className={cn("px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", selectionType === "COMPONENT" ? "bg-white text-purple-600 shadow-xl shadow-purple-100" : "text-slate-400 hover:text-slate-600")}
                  >{t('recipes.components')}</button>
                </div>
             </div>

             {/* Search Interface */}
             <div className="relative mb-10 group">
                <div className="relative">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                  <input 
                    placeholder={selectionType === 'INGREDIENT' ? t('recipes.registry_empty') : t('recipes.components')}
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
                               <div className="font-black text-slate-900 uppercase tracking-tight group-hover:text-emerald-600 transition-colors">
                                 {i.item_name} {i.is_generic && <span className="ml-2 px-1.5 py-0.5 rounded-md bg-emerald-600 text-white text-[7px] font-black uppercase tracking-widest">GENERIC</span>}
                               </div>
                               <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                 {i.is_generic ? (i.subItems?.find(s => s.is_active_brand)?.brand || i.brand || "GENERIC") : (i.brand || "UNBRANDED")} • {i.is_generic ? (i.subItems?.find(s => s.is_active_brand)?.volume || i.volume) : i.volume} {i.is_generic ? (i.subItems?.find(s => s.is_active_brand)?.unit || i.unit) : i.unit}
                               </div>
                            </div>
                            <div className="text-right">
                               <div className="font-black text-slate-900">
                                 {formatIDR(i.is_generic ? (i.subItems?.find(s => s.is_active_brand)?.price || i.price) : i.price)}
                               </div>
                               <div className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1">{t('common.add')} {t('stock.title')}</div>
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
                               <div className="text-[9px] font-black text-purple-500 uppercase tracking-widest mt-1">{t('common.add')} {t('recipes.components')}</div>
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
                  const getIngredientCost = (ing) => {
                    if (!ing) return 0;
                    if (ing.is_generic && ing.subItems) {
                      const active = ing.subItems.find(s => s.is_active_brand);
                      return active?.cost_per_unit || 0;
                    }
                    return ing.cost_per_unit || 0;
                  };

                  const itemCost = item.item_type === 'INGREDIENT' 
                    ? getIngredientCost(item.ingredient) * (item.quantity || 0)
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
                          <span className="font-black text-slate-900 uppercase tracking-tight text-base group-hover/item:text-emerald-600 transition-colors">
                            {data?.item_name || data?.name}
                            {item.item_type === 'INGREDIENT' && !item.ingredient?.is_generic && item.ingredient?.brand && item.ingredient.brand !== 'Local' && (
                              <span className="ml-2 font-medium opacity-40 text-xs">
                                 - {item.ingredient.brand}
                              </span>
                            )}
                          </span>
                          {item.item_type === 'INGREDIENT' && item.ingredient?.is_generic && (
                            <div className="flex items-center gap-3">
                              <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[8px] font-black uppercase tracking-widest shadow-sm">GENERIC</span>
                              <span className="text-[10px] font-bold text-slate-400 italic">
                                Using: {item.ingredient.subItems?.find(s => s.is_active_brand)?.brand || 'No Brand Name'}
                              </span>
                            </div>
                          )}
                        </div>
                        <button onClick={() => removeItem(idx)} className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all hover:bg-rose-500 hover:text-white">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 items-end">
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('common.quantity')}</label>
                           <input 
                             type="number" 
                             value={item.quantity} 
                             onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                             className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-black text-slate-900 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all"
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('stock.unit')}</label>
                           <input 
                             value={item.unit} 
                             onChange={(e) => updateItem(idx, { unit: e.target.value })}
                             className="w-full h-12 bg-slate-50 border-none rounded-xl px-4 font-black text-[10px] uppercase tracking-widest text-slate-900 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all"
                             placeholder="UNIT"
                           />
                        </div>
                        <div className="col-span-2 text-right">
                           <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">{t('recipes.hpp_per_unit')}</div>
                           <div className="text-2xl font-black text-slate-900 tracking-tighter tabular-nums">{formatIDR(itemCost)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {(recipe.items || []).length === 0 && (
                  <div className="text-center py-24 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-200">
                    <RefreshCw className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                    <h3 className="text-lg font-black text-slate-400 uppercase tracking-tight">{t('recipes.registry_empty')}</h3>
                    <p className="text-[10px] text-slate-300 mt-4 max-w-[240px] mx-auto uppercase tracking-[0.2em] font-black leading-relaxed">{t('recipes.registry_empty_help')}</p>
                  </div>
                )}
             </div>
             
             <div className="mt-12 pt-12 border-t border-slate-100">
               <PricingRecommendations hpp={hpp.total} />
             </div>
           </div>

           {/* Pricing Strategy Block */}
           <div className="glass-card rounded-[2.5rem] p-10 bg-emerald-50/20 border border-emerald-100/50">
              {/* Header + Preset Modes */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-200">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600/60">Pricing Strategy</h3>
                      <p className="text-[8px] text-slate-400 uppercase tracking-widest font-medium mt-0.5">Configure your business model</p>
                    </div>
                 </div>
                 {/* Preset Mode Toggles */}
                 <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                   {[
                     { label: 'Conservative', fc: 45, oh: 15, color: 'text-sky-600' },
                     { label: 'Balanced', fc: 40, oh: 20, color: 'text-emerald-600' },
                     { label: 'Aggressive', fc: 35, oh: 25, color: 'text-purple-600' },
                   ].map(preset => (
                     <button
                       key={preset.label}
                       type="button"
                       onClick={() => { setTargetFoodCostPercent(preset.fc); setOverheadPercent(preset.oh); }}
                       className={cn(
                         "px-4 py-2 text-[8px] font-black uppercase tracking-widest rounded-xl transition-all",
                         targetFoodCostPercent === preset.fc && overheadPercent === preset.oh
                           ? `bg-white shadow-lg ${preset.color}`
                           : 'text-slate-400 hover:text-slate-600'
                       )}
                     >
                       {preset.label}
                     </button>
                   ))}
                 </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {/* Overhead % */}
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-emerald-700/50 uppercase tracking-widest ml-1 block">Overhead %</label>
                  <div className="relative">
                    <input type="number" min="0" max="100" value={overheadPercent}
                      onChange={(e) => setOverheadPercent(parseFloat(e.target.value) || 0)}
                      className="w-full h-16 bg-white border border-emerald-100 rounded-[1.25rem] pl-6 pr-10 font-black text-2xl text-emerald-600 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-sm"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-400 font-black text-lg">%</span>
                  </div>
                  <p className="text-[8px] text-slate-400 ml-1">Added on top of material cost</p>
                </div>
                {/* Food Cost % */}
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-emerald-700/50 uppercase tracking-widest ml-1 block">Food Cost %</label>
                  <div className="relative">
                    <input type="number" min="1" max="100" value={targetFoodCostPercent}
                      onChange={(e) => setTargetFoodCostPercent(parseFloat(e.target.value) || 40)}
                      className="w-full h-16 bg-white border border-emerald-100 rounded-[1.25rem] pl-6 pr-10 font-black text-2xl text-emerald-600 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-sm"
                    />
                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-400 font-black text-lg">%</span>
                  </div>
                  <p className="text-[8px] text-slate-400 ml-1">Total cost ÷ selling price</p>
                </div>
                {/* Daily Sales Target */}
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-emerald-700/50 uppercase tracking-widest ml-1 block">Daily Sales Target</label>
                  <input type="number" min="1" value={dailySalesTarget}
                    onChange={(e) => setDailySalesTarget(parseInt(e.target.value) || 1)}
                    className="w-full h-16 bg-white border border-emerald-100 rounded-[1.25rem] px-6 font-black text-2xl text-emerald-600 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-sm"
                  />
                  <p className="text-[8px] text-slate-400 ml-1">Estimated units sold / day</p>
                </div>
                {/* Daily Profit Target */}
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-emerald-700/50 uppercase tracking-widest ml-1 block">Daily Profit Target</label>
                  <input type="number" min="0" value={dailyProfitTarget}
                    onChange={(e) => setDailyProfitTarget(parseInt(e.target.value) || 0)}
                    className="w-full h-16 bg-white border border-emerald-100 rounded-[1.25rem] px-6 font-black text-xl text-emerald-600 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-sm"
                  />
                  <p className="text-[8px] text-slate-400 ml-1">Target net profit per day</p>
                </div>
              </div>
           </div>
        </div>

        {/* Sidebar Intelligence */}
        <div className="md:col-span-4">
          <div className="sticky top-32 space-y-6 overflow-y-auto max-h-[90dvh] pr-1 scrollbar-hide pb-20">

            {/* Cost Breakdown Panel */}
            <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.2)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/30 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-black tracking-[0.4em] text-emerald-400">Cost Ledger</span>
                  <Calculator className="w-4 h-4 text-white/20" />
                </div>
                {/* Material + Overhead + Total */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Material Cost</span>
                    <span className="font-black">{formatIDR(hpp.variable)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Overhead ({overheadPercent}%)</span>
                    <span className="font-black text-emerald-400">{formatIDR(hpp.overheadAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-white/10 pt-3">
                    <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">Total Cost / Unit</span>
                    <span className="font-black text-lg">{formatIDR(hpp.total)}</span>
                  </div>
                </div>
                {/* Suggested Price + Profit */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Suggested Price</span>
                    <span className="font-black text-2xl text-emerald-400">{formatIDR(hpp.suggestedPrice)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Profit / Unit</span>
                    <span className="font-black text-emerald-300">{formatIDR(hpp.profitPerUnit)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Simulation Panel */}
            <div className="glass-card rounded-[2.5rem] p-8 border-none shadow-xl space-y-5 bg-white/60">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-white" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Daily Simulation</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Daily Revenue</span>
                  <span className="font-black text-slate-900">{formatIDR(hpp.dailyRevenue)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-emerald-50 rounded-2xl">
                  <span className="text-[9px] font-black text-emerald-600/60 uppercase tracking-widest">Daily Profit</span>
                  <span className="font-black text-emerald-600 text-lg">{formatIDR(hpp.dailyProfit)}</span>
                </div>
              </div>
            </div>

            {/* Break Even + Status Panel */}
            <div className="glass-card rounded-[2.5rem] p-8 border-none shadow-xl space-y-5 bg-white/60">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-white" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Break-Even Analysis</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Required Sales / Day</span>
                  <span className="font-black text-slate-900 text-lg">
                    {isFinite(hpp.requiredSales) ? `${hpp.requiredSales} pcs` : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Your Target</span>
                  <span className="font-black text-slate-900">{dailySalesTarget} pcs</span>
                </div>
              </div>
              {/* Smart Status Indicator */}
              {hpp.profitPerUnit > 0 && isFinite(hpp.requiredSales) && (
                <div className={cn(
                  "rounded-2xl p-4 flex items-start gap-3 mt-2",
                  hpp.isTargetAchievable
                    ? "bg-emerald-50 border border-emerald-200"
                    : "bg-rose-50 border border-rose-200"
                )}>
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-0.5 shrink-0",
                    hpp.isTargetAchievable ? "bg-emerald-500" : "bg-rose-500"
                  )} />
                  <p className={cn(
                    "text-[9px] font-black uppercase tracking-widest leading-relaxed",
                    hpp.isTargetAchievable ? "text-emerald-700" : "text-rose-700"
                  )}>
                    {hpp.isTargetAchievable
                      ? `✓ Target achievable — you need ${hpp.requiredSales} pcs/day, you plan ${dailySalesTarget} pcs.`
                      : `⚠ Not achievable — need ${hpp.requiredSales} pcs/day but target is only ${dailySalesTarget} pcs. Increase sales or adjust price.`
                    }
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

function PricingRecommendations({ hpp }) {
  // ... (existing helper)
  // ...
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

// 5. Publish to Product Modal
function PublishToProductModal({ recipe, onClose, onSuccess }) {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    price: "",
    categoryId: ""
  });

  useEffect(() => {
    if (recipe) {
      loadCategories();
      // Estimate a good price (Standard margin 40%)
      const hppValue = recipe.total_hpp || 0;
      const initialPrice = Math.ceil((hppValue / 0.6) / 500) * 500;
      setForm({
         price: initialPrice.toString(),
         categoryId: ""
      });
    }
  }, [recipe]);

  const loadCategories = async () => {
    try {
      const data = await api.get("/categories");
      setCategories(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!form.price || !form.categoryId) {
      error("Please fill in price and category");
      return;
    }

    setIsSaving(true);
    try {
      await api.post("/menus", {
        name: recipe.name,
        price: parseInt(form.price),
        cost: recipe.total_hpp,
        categoryId: parseInt(form.categoryId),
        recipeId: recipe.id
      });
      success("Product published successfully!");
      onSuccess();
    } catch (e) {
      error("Failed to publish product");
    } finally {
      setIsSaving(false);
    }
  };

  const hppVal = recipe?.total_hpp || 0;
  const priceVal = parseInt(form.price) || 0;
  const profitVal = priceVal - hppVal;
  const marginVal = priceVal > 0 ? Math.round((profitVal / priceVal) * 100) : 0;

  return (
    <Dialog open={!!recipe} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white">
        {recipe && (
          <div className="flex flex-col">
            <div className="p-8 bg-slate-50/50 border-b border-slate-100">
               <div className="flex items-center gap-3 mb-2">
                  <Rocket className="w-4 h-4 text-emerald-600" />
                  <span className="text-[10px] font-black uppercase text-emerald-600 tracking-[0.2em]">Publish to Product List</span>
               </div>
               <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{recipe.name}</h3>
            </div>

            <div className="p-8 space-y-8">
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                     <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total COGS (HPP)</div>
                     <div className="text-lg font-black text-slate-900">{formatIDR(hppVal)}</div>
                  </div>
                  <div className={cn(
                    "p-4 rounded-2xl border transition-all",
                    marginVal >= 30 ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100"
                  )}>
                     <div className="flex justify-between items-center mb-1">
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-60">Est. Margin</span>
                        <Percent className="w-3 h-3 opacity-30" />
                     </div>
                     <div className={cn("text-lg font-black", marginVal >= 30 ? "text-emerald-600" : "text-amber-600")}>{marginVal}%</div>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('common.category')}</label>
                     <select 
                       className="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl px-6 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all appearance-none cursor-pointer"
                       value={form.categoryId}
                       onChange={(e) => setForm({...form, categoryId: e.target.value})}
                     >
                        <option value="">Select Category</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                     </select>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t('pos.selling_price')}</label>
                     <div className="relative">
                        <Tag className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                        <input 
                          type="number" 
                          value={form.price}
                          onChange={(e) => setForm({...form, price: e.target.value})}
                          className="w-full h-16 bg-white border border-slate-100 rounded-2xl pl-12 pr-6 font-black text-2xl text-slate-900 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all shadow-sm"
                        />
                     </div>
                  </div>
               </div>

               <div className="pt-4 flex items-center justify-between">
                  <div className="space-y-1">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Est. Profit / Unit</p>
                     <p className="text-xl font-black text-emerald-600">{formatIDR(profitVal)}</p>
                  </div>
                  <div className="flex gap-3">
                     <Button variant="ghost" onClick={onClose} className="h-14 px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-400">
                        {t('common.cancel')}
                     </Button>
                     <Button 
                       onClick={handlePublish} 
                       disabled={isSaving}
                       className="h-14 px-10 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-slate-200"
                     >
                        {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
                        {isSaving ? "Processing..." : "Publish Now"}
                     </Button>
                  </div>
               </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
