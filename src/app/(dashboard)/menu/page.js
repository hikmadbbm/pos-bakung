"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { cn } from "../../../lib/utils";
import { formatIDR } from "../../../lib/format";
import { Button } from "../../../components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select } from "../../../components/ui/select";
import { Plus, Trash2, Edit2, Settings, Sparkles } from "lucide-react";
import { useToast } from "../../../components/ui/use-toast";

export default function MenuPage() {
  const { success, error } = useToast();
  const [menus, setMenus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) setUser(JSON.parse(userStr));
  }, []);
  
  // Menu Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", price: "", cost: "", categoryId: "", prices: {} });
  const [isEditing, setIsEditing] = useState(null);

  // Category Dialog State
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({ name: "", color: "#cccccc" });
  const [isCategoryEditing, setIsCategoryEditing] = useState(null);

  // Inline delete confirmation state (avoids window.confirm() which blocks the thread)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState(null);

  // Form validation
  const [categoryError, setCategoryError] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mRes, cRes, pRes] = await Promise.allSettled([
        api.get("/menus?all=true"),
        api.get("/categories"),
        api.get("/platforms"),
      ]);
      if (mRes.status === "fulfilled") setMenus(mRes.value);
      else error("Failed to load menus");
      if (cRes.status === "fulfilled") setCategories(cRes.value);
      else error("Failed to load categories");
      if (pRes.status === "fulfilled") setPlatforms(pRes.value);
      else error("Failed to load platforms");
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // --- Menu Handlers ---

  const handleMenuSubmit = async (e) => {
    e.preventDefault();
    // Category is required
    if (!formData.categoryId) {
      setCategoryError(true);
      return;
    }
    setCategoryError(false);
    try {
      if (isEditing) {
        await api.put(`/menus/${isEditing}`, formData);
      } else {
        await api.post("/menus", formData);
      }
      setIsDialogOpen(false);
      resetMenuForm();
      loadData();
      success(isEditing ? "Menu updated successfully" : "Menu added successfully");
    } catch (e) {
      console.error(e);
      error("Failed to save menu");
    }
  };

  const handleToggleActive = async (menu) => {
    try {
      await api.put(`/menus/${menu.id}`, { ...menu, is_active: !menu.is_active });
      setMenus(prev => prev.map(m => m.id === menu.id ? { ...m, is_active: !m.is_active } : m));
      success(`${menu.name} is now ${!menu.is_active ? 'Active' : 'Sold Out'}`);
    } catch (e) {
      console.error(e);
      error("Failed to update availability");
    }
  };

  const handleDeleteMenu = async (id) => {
    // --- Optimistic UI: remove instantly before server responds ---
    const previous = menus;
    setConfirmDeleteId(null);
    setMenus(prev => prev.filter(m => m.id !== id));
    try {
      await api.delete(`/menus/${id}`);
      success("Menu deleted");
    } catch (e) {
      console.error(e);
      setMenus(previous); // rollback on failure
      error("Failed to delete menu");
    }
  };

  const openEditMenu = (menu) => {
    setFormData({ 
      name: menu.name, 
      price: menu.price, 
      cost: menu.cost, 
      categoryId: menu.categoryId || "",
      prices: menu.prices || {}
    });
    setIsEditing(menu.id);
    setIsDialogOpen(true);
  };

  const openCreateMenu = () => {
    resetMenuForm();
    setIsDialogOpen(true);
  };

  const resetMenuForm = () => {
    setFormData({ name: "", price: "", cost: "", categoryId: "", prices: {} });
    setIsEditing(null);
  };

  const handlePlatformPriceChange = (platformId, val) => {
    setFormData(prev => ({
      ...prev,
      prices: {
        ...prev.prices,
        [platformId]: val
      }
    }));
  };

  const generateAIPrice = async () => {
    if (formData.price === "" || formData.cost === "") {
      error("Please fill in Base Price and Cost (HPP) first.");
      return;
    }
    try {
      const res = await api.post("/analytics/price-recommendation", {
        basePrice: parseInt(formData.price) || 0,
        cost: parseInt(formData.cost) || 0
      });
      setFormData(prev => ({
        ...prev,
        prices: {
          ...prev.prices,
          ...res.recommendations
        }
      }));
      success("AI recommendations generated!");
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.error || "Failed to generate AI recommendations";
      error(msg);
    }
  };

  // --- Category Handlers ---

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    try {
      if (isCategoryEditing) {
        await api.put(`/categories/${isCategoryEditing}`, categoryFormData);
      } else {
        await api.post("/categories", categoryFormData);
      }
      resetCategoryForm();
      loadData();
      success(isCategoryEditing ? "Category updated" : "Category added");
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.error || "Failed to save category";
      error(msg);
    }
  };

  const handleDeleteCategory = async (id) => {
    // --- Optimistic UI: remove instantly before server responds ---
    const previous = categories;
    setConfirmDeleteCatId(null);
    setCategories(prev => prev.filter(c => c.id !== id));
    // Also clear category reference from menus immediately
    setMenus(prev => prev.map(m => m.categoryId === id ? { ...m, categoryId: null, category: null } : m));
    try {
      await api.delete(`/categories/${id}`);
      success("Category deleted");
    } catch (e) {
      console.error(e);
      setCategories(previous); // rollback on failure
      error("Failed to delete category");
    }
  };

  const openEditCategory = (cat) => {
    setCategoryFormData({ name: cat.name, color: cat.color });
    setIsCategoryEditing(cat.id);
  };

  const resetCategoryForm = () => {
    setCategoryFormData({ name: "", color: "#cccccc" });
    setIsCategoryEditing(null);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Master Menu</h2>
          <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
            Central catalog and availability control
            <span className="inline-block w-1 h-1 bg-emerald-600 rounded-full" />
          </p>
        </div>
        {user?.role !== 'KITCHEN' && (
          <div className="flex gap-3 w-full md:w-auto">
            <Button variant="ghost" size="sm" onClick={() => setIsCategoryDialogOpen(true)} className="h-10 px-4 rounded-2xl font-black text-[10px] uppercase tracking-wider bg-white/80 backdrop-blur-md border border-slate-200/60 shadow-sm hover:bg-slate-50 active:scale-95 transition-all">
              <Settings className="w-4 h-4 mr-2 text-slate-400" /> CATEGORIES
            </Button>
            <Button onClick={openCreateMenu} className="h-10 px-6 rounded-2xl font-black text-[10px] uppercase tracking-wider bg-slate-900 text-white hover:bg-slate-800 shadow-xl active:scale-95 transition-all">
              <Plus className="w-4 h-4 mr-2" /> ADD NEW MENU
            </Button>
          </div>
        )}
      </div>

      <div className="glass-card rounded-[2rem] overflow-hidden shadow-2xl border-none">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="text-[10px] font-black uppercase text-slate-500 py-5 px-6">Name</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-500 py-5">Category</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-500 py-5">Base Price</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-500 py-5">Platform Pricing</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-500 py-5">Cost</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-500 py-5">Profit</TableHead>
              <TableHead className="text-center text-[10px] font-black uppercase text-slate-500 py-5">Status</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-5 px-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : menus.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">No menus found.</TableCell>
              </TableRow>
            ) : (
              menus.map((m) => (
                <TableRow key={m.id} className="hover:bg-slate-50/50 border-slate-100 transition-colors group">
                  <TableCell className="font-black text-slate-900 px-6 py-5 uppercase tracking-tight">{m.name}</TableCell>
                  <TableCell>
                    {m.category ? (
                      <span 
                        className="px-3 py-1 rounded-full text-[9px] font-black text-white uppercase tracking-tighter shadow-sm"
                        style={{ backgroundColor: m.category.color }}
                      >
                        {m.category.name}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-[10px] font-bold uppercase italic">No Category</span>
                    )}
                  </TableCell>
                  <TableCell className="font-bold text-slate-600">{formatIDR(m.price)}</TableCell>
                  <TableCell>
                    {platforms.length === 0 ? (
                      <span className="text-slate-300 text-[9px] font-bold uppercase italic">Not Set</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {platforms.map(p => (
                          <div key={p.id} className="px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-100 text-[9px] flex items-center shadow-sm">
                            <span className="font-black text-slate-400 mr-1 uppercase tracking-tighter">{p.name}:</span>
                            <span className="font-bold text-slate-700">{m.prices && m.prices[p.id] ? formatIDR(m.prices[p.id]) : "-"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-slate-400 text-xs">{formatIDR(m.cost)}</TableCell>
                   <TableCell className="text-emerald-600 font-black text-xs">
                    {formatIDR(m.profit)}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        onClick={() => handleToggleActive(m)}
                        className={cn(
                          "relative inline-flex h-5 w-10 items-center rounded-full transition-all focus:outline-none shadow-inner",
                          m.is_active ? "bg-emerald-500 shadow-emerald-200" : "bg-slate-200"
                        )}
                      >
                        <span
                          className={cn(
                            "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm",
                            m.is_active ? "translate-x-6" : "translate-x-0.5"
                          )}
                        />
                      </button>
                      <p className={cn("text-[8px] font-black uppercase tracking-widest", m.is_active ? "text-emerald-600" : "text-rose-500")}>
                        {m.is_active ? "READY" : "SOLD OUT"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right px-6 space-x-1">
                    {confirmDeleteId === m.id ? (
                      <span className="inline-flex items-center gap-2 bg-rose-50 p-1 rounded-xl border border-rose-100">
                        <span className="text-[9px] font-black text-rose-600 uppercase tracking-tighter ml-2">DELETE?</span>
                        <Button variant="destructive" size="sm" className="h-7 px-3 rounded-lg font-black text-[9px] uppercase hover:bg-rose-700" onClick={() => handleDeleteMenu(m.id)}>YES</Button>
                        <Button variant="ghost" size="sm" className="h-7 px-3 rounded-lg font-black text-[9px] uppercase hover:bg-rose-100 text-rose-400" onClick={() => setConfirmDeleteId(null)}>NO</Button>
                      </span>
                    ) : (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100" onClick={() => openEditMenu(m)} disabled={user?.role === 'KITCHEN'}>
                          <Edit2 className="w-4 h-4 text-slate-400" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-rose-50 group/del" onClick={() => setConfirmDeleteId(m.id)} disabled={user?.role === 'KITCHEN'}>
                          <Trash2 className="w-4 h-4 text-slate-300 group-hover/del:text-rose-500" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Menu Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      >
        <DialogContent className="max-w-2xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600 rounded-full -translate-y-1/2 translate-x-1/2 opacity-20" />
             <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                <Plus className="w-8 h-8 text-white" />
             </div>
             <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">
               {isEditing ? "Modify Menu" : "Create New Menu"}
             </DialogTitle>
          </div>
          
          <form onSubmit={handleMenuSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
          <div className="space-y-2">
            <Label>Menu Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g. Mie Ayam Bakso"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Category <span className="text-red-500">*</span></Label>
            <Select
              value={formData.categoryId}
              onChange={(e) => {
                setFormData({ ...formData, categoryId: e.target.value });
                if (e.target.value) setCategoryError(false);
              }}
              options={[
                { value: "", label: "Select Category..." },
                ...categories.map(c => ({ value: c.id, label: c.name }))
              ]}
            />
            {categoryError && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                ⚠️ Please select a category before saving.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Base Price (Default)</Label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
                placeholder="15000"
              />
            </div>
            <div className="space-y-2">
              <Label>Cost (HPP)</Label>
              <Input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                required
                placeholder="8000"
              />
            </div>
          </div>

          {/* Platform Pricing Section */}
          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Platform Pricing</Label>
              {platforms.length > 0 && (
                <Button 
                  type="button" 
                  size="sm" 
                  variant="outline" 
                  className="h-7 text-[10px] border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  onClick={generateAIPrice}
                >
                  <Sparkles className="w-3 h-3 mr-1" /> Auto AI Price
                </Button>
              )}
            </div>
            {platforms.length === 0 ? (
              <div className="p-3 bg-gray-50 border border-dashed rounded text-center text-xs text-gray-500">
                No platforms configured. Please go to Platform Management to add one.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {platforms.map(p => (
                  <div key={p.id} className="space-y-1">
                    <Label className="text-xs text-gray-500">{p.name}</Label>
                    <Input
                      type="number"
                      value={formData.prices[p.id] || ""}
                      onChange={(e) => handlePlatformPriceChange(p.id, e.target.value)}
                      placeholder={formData.price} // hint base price
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button type="button" variant="ghost" className="rounded-2xl h-12 px-8 font-black text-slate-400 uppercase tracking-widest text-[10px]" onClick={() => setIsDialogOpen(false)}>
              Discard
            </Button>
            <Button type="submit" className="rounded-2xl h-12 px-10 font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200 active:scale-95 transition-all">
              Save Changes
            </Button>
          </div>
        </form>
        </DialogContent>
      </Dialog>

      {/* Category Management Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-slate-50 p-8 border-b border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                <Settings className="w-6 h-6 text-slate-400" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">Group Categories</DialogTitle>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Organize your menu structure</p>
              </div>
            </div>
          </div>
          
          <div className="p-8 space-y-8">
          {/* Add/Edit Form */}
          <form onSubmit={handleCategorySubmit} className="p-4 bg-gray-50 rounded-md border space-y-4">
            <h3 className="font-medium text-sm">{isCategoryEditing ? "Edit Category" : "Add New Category"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 items-end">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input 
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  required
                  placeholder="Category Name"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label>Color</Label>
                <div className="flex items-center h-9">
                  <input 
                    type="color" 
                    value={categoryFormData.color}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                    className="h-9 w-12 cursor-pointer border rounded"
                    title="Pick a color"
                  />
                </div>
              </div>
              <Button type="submit" size="sm" className="h-9">
                {isCategoryEditing ? "Update" : "Add"}
              </Button>
            </div>
            {isCategoryEditing && (
              <div className="flex justify-end">
                 <Button type="button" variant="ghost" size="sm" onClick={resetCategoryForm} className="text-xs h-6">
                   Cancel Edit
                 </Button>
              </div>
            )}
          </form>

          {/* List */}
          <div className="max-h-60 overflow-y-auto border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Color</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-sm text-gray-500">No categories yet.</TableCell>
                  </TableRow>
                ) : (
                  categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell>
                        <div className="w-6 h-6 rounded-full border shadow-sm" style={{ backgroundColor: cat.color }}></div>
                      </TableCell>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="text-right space-x-1">
                        {confirmDeleteCatId === cat.id ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-xs text-gray-500 mr-1">Delete?</span>
                            <Button variant="destructive" size="sm" className="h-6 px-2 text-xs" onClick={() => handleDeleteCategory(cat.id)}>Yes</Button>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setConfirmDeleteCatId(null)}>Cancel</Button>
                          </span>
                        ) : (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditCategory(cat)}>
                              <Edit2 className="w-3 h-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setConfirmDeleteCatId(cat.id)}>
                              <Trash2 className="w-3 h-3 text-red-500" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex justify-end">
            <Button variant="ghost" className="rounded-2xl h-12 px-8 font-black text-slate-400 uppercase tracking-widest text-[10px]" onClick={() => setIsCategoryDialogOpen(false)}>
              DONE
            </Button>
          </div>
        </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
