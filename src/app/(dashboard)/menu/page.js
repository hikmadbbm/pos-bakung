"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { cn } from "../../../lib/utils";
import { formatIDR } from "../../../lib/format";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Plus, Trash2, Edit2, Settings, Sparkles, ShoppingBag } from "lucide-react";
import { useToast } from "../../../components/ui/use-toast";
import { ResponsiveDataView } from "../../../components/ResponsiveDataView";

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
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", price: "", cost: "", categoryId: "", prices: {} });
  const [isEditing, setIsEditing] = useState(null);

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({ name: "", color: "#cccccc" });
  const [isCategoryEditing, setIsCategoryEditing] = useState(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState(null);
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

  const handleMenuSubmit = async (e) => {
    e.preventDefault();
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
      success(isEditing ? "Item updated" : "Item added");
    } catch (e) {
      console.error(e);
      error("Failed to save item");
    }
  };

  const handleToggleActive = async (menu) => {
    try {
      await api.put(`/menus/${menu.id}`, { ...menu, is_active: !menu.is_active });
      setMenus(prev => prev.map(m => m.id === menu.id ? { ...m, is_active: !m.is_active } : m));
      success(`${menu.name} is now ${!menu.is_active ? 'Available' : 'Sold Out'}`);
    } catch (e) {
      console.error(e);
      error("Failed to update status");
    }
  };

  const handleDeleteMenu = async (id) => {
    const previous = menus;
    setConfirmDeleteId(null);
    setMenus(prev => prev.filter(m => m.id !== id));
    try {
      await api.delete(`/menus/${id}`);
      success("Item deleted");
    } catch (e) {
      console.error(e);
      setMenus(previous);
      error("Failed to delete item");
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
      error("Fill in Price and Cost first.");
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
      error("Failed to generate AI recommendations");
    }
  };

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
      error("Failed to save category");
    }
  };

  const handleDeleteCategory = async (id) => {
    const previous = categories;
    setConfirmDeleteCatId(null);
    setCategories(prev => prev.filter(c => c.id !== id));
    setMenus(prev => prev.map(m => m.categoryId === id ? { ...m, categoryId: null, category: null } : m));
    try {
      await api.delete(`/categories/${id}`);
      success("Category deleted");
    } catch (e) {
      console.error(e);
      setCategories(previous);
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
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20 px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 print:hidden pb-2">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">Products</h2>
          <div className="flex items-center gap-2.5 mt-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Live</p>
          </div>
        </div>
        {user?.role !== 'KITCHEN' && (
          <div className="flex gap-4 w-full md:w-auto">
            <Button 
              variant="ghost" 
              onClick={() => setIsCategoryDialogOpen(true)} 
              className="flex-1 md:flex-none h-14 px-8 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] text-slate-500 hover:text-slate-900 border border-transparent hover:border-slate-100 hover:bg-white transition-all"
            >
              <Settings className="w-4 h-4 mr-3 text-slate-400" /> Categories
            </Button>
            <Button 
              onClick={openCreateMenu} 
              className="flex-1 md:flex-none h-14 px-10 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] bg-slate-900 text-white hover:bg-black shadow-2xl shadow-slate-200 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 mr-3" /> New Item
            </Button>
          </div>
        )}
      </div>

      <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl border-none p-0 animate-in fade-in duration-700">
        <ResponsiveDataView
          loading={loading}
          data={menus}
          emptyMessage="No products found"
          columns={[
            {
              header: "Name",
              accessor: (m) => (
                <div className="py-2">
                  <p className="font-black text-slate-900 uppercase tracking-tight text-base group-hover:text-emerald-600 transition-colors truncate max-w-[240px]">{m.name}</p>
                </div>
              ),
              className: "pl-10"
            },
            {
              header: "Category",
              accessor: (m) => (
                m.category ? (
                  <span 
                    className="px-4 py-1.5 rounded-full text-[9px] font-black text-white uppercase tracking-[0.1em] shadow-lg shadow-black/5 border border-white/20 whitespace-nowrap"
                    style={{ backgroundColor: m.category.color }}
                  >
                    {m.category.name}
                  </span>
                ) : (
                  <span className="text-slate-300 text-[9px] font-black uppercase tracking-widest italic opacity-50">Unclassified</span>
                )
              )
            },
            {
              header: "Price",
              accessor: (m) => <span className="font-black text-slate-900 text-base tabular-nums">{formatIDR(m.price)}</span>
            },
            {
              header: "Channels",
              accessor: (m) => (
                <div className="flex flex-wrap gap-2 max-w-[300px]">
                  {platforms.map(p => (
                    <div key={p.id} className="px-3 py-1.5 rounded-[0.75rem] bg-white border border-slate-100 text-[10px] flex items-center shadow-sm">
                      <span className="font-black text-slate-400 mr-2 uppercase tracking-tighter opacity-70">{p.name}:</span>
                      <span className="font-black text-slate-900 tabular-nums">{m.prices && m.prices[p.id] ? formatIDR(m.prices[p.id]) : "-"}</span>
                    </div>
                  ))}
                </div>
              )
            },
            {
              header: "Profit",
              accessor: (m) => (
                <div className="flex flex-col">
                  <span className="text-emerald-700 font-black text-base tabular-nums tracking-tighter">{formatIDR(m.profit)}</span>
                  <span className="text-[9px] font-bold text-slate-300 uppercase">Cost: {formatIDR(m.cost)}</span>
                </div>
              )
            },
            {
              header: "Status",
              accessor: (m) => (
                <div className="flex flex-col items-center gap-2.5">
                  <button
                    onClick={() => handleToggleActive(m)}
                    className={cn(
                      "relative inline-flex h-6 w-12 items-center rounded-full transition-all focus:outline-none shadow-inner",
                      m.is_active ? "bg-emerald-500 shadow-lg shadow-emerald-200" : "bg-slate-200"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-transform shadow-md",
                        m.is_active ? "translate-x-6.5" : "translate-x-1"
                      )}
                    />
                  </button>
                  <p className={cn("text-[8px] font-black uppercase tracking-[0.2em]", m.is_active ? "text-emerald-600" : "text-rose-500")}>
                    {m.is_active ? "Ready" : "Sold Out"}
                  </p>
                </div>
              ),
              align: "center"
            },
            {
              header: "Actions",
              accessor: (m) => (
                confirmDeleteId === m.id ? (
                  <div className="flex flex-col items-end gap-2 pr-2">
                     <div className="flex gap-2 bg-rose-50 p-2 rounded-2xl border border-rose-100 shadow-xl shadow-rose-100/50">
                        <Button variant="destructive" size="sm" className="h-9 px-5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 active:scale-95" onClick={() => handleDeleteMenu(m.id)}>Purge</Button>
                        <Button variant="ghost" size="sm" className="h-9 px-5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 text-rose-500" onClick={() => setConfirmDeleteId(null)}>No</Button>
                     </div>
                  </div>
                ) : (
                  <div className="flex justify-end gap-2 pr-2">
                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-[1.25rem] hover:bg-slate-100 hover:shadow-xl transition-all active:scale-90" onClick={() => openEditMenu(m)} disabled={user?.role === 'KITCHEN'}>
                      <Edit2 className="w-4.5 h-4.5 text-slate-400 group-hover:text-slate-900" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-[1.25rem] hover:bg-rose-50 hover:shadow-xl group/del transition-all active:scale-90" onClick={() => setConfirmDeleteId(m.id)} disabled={user?.role === 'KITCHEN'}>
                      <Trash2 className="w-4.5 h-4.5 text-slate-300 group-hover/del:text-rose-500" />
                    </Button>
                  </div>
                )
              ),
              align: "right",
              className: "pr-10"
            }
          ]}
          renderCard={(m) => (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-black text-slate-900 uppercase tracking-tight text-lg">{m.name}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                    {m.category?.name || "No Category"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => handleToggleActive(m)}
                    className={cn(
                      "relative inline-flex h-5 w-10 items-center rounded-full transition-all focus:outline-none shadow-inner",
                      m.is_active ? "bg-emerald-500 shadow-lg shadow-emerald-200" : "bg-slate-200"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-md",
                        m.is_active ? "translate-x-5.5" : "translate-x-1"
                      )}
                    />
                  </button>
                  <span className={cn("text-[8px] font-black uppercase tracking-widest", m.is_active ? "text-emerald-600" : "text-rose-500")}>
                    {m.is_active ? "Ready" : "Sold Out"}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-end border-t border-slate-50 pt-4">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Price</p>
                  <p className="font-black text-slate-900 text-xl tabular-nums tracking-tighter">{formatIDR(m.price)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Profit</p>
                  <p className="font-black text-emerald-600 text-lg">{formatIDR(m.profit)}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-50">
                <Button variant="outline" className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase" onClick={() => openEditMenu(m)}>Edit</Button>
                <Button variant="ghost" className="h-12 w-12 rounded-xl text-rose-500 hover:bg-rose-50" onClick={() => setConfirmDeleteId(m.id)}><Trash2 className="w-4.5 h-4.5" /></Button>
              </div>
            </div>
          )}
        />
      </div>

      {/* Menu Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white animate-in zoom-in-95 duration-300 flex flex-col max-h-[90dvh]">
          <div className="bg-slate-900 p-10 text-center relative overflow-hidden shrink-0">
             <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-600 rounded-full -translate-y-1/2 translate-x-1/2 opacity-20 blur-3xl" />
              <DialogTitle className="text-3xl font-black text-white uppercase tracking-tight relative z-10">
                {isEditing ? "Edit Item" : "New Item"}
              </DialogTitle>
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mt-3 relative z-10">Item Details</p>
          </div>
          
          <form onSubmit={handleMenuSubmit} className="p-10 space-y-8 flex-1 overflow-y-auto min-h-0 scrollbar-hide">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Name</Label>
                <Input
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-base"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</Label>
                <select
                  className="w-full h-14 rounded-2xl bg-slate-50 border border-slate-100 font-black text-[11px] uppercase tracking-widest px-6"
                  value={formData.categoryId}
                  onChange={(e) => {
                    setFormData({ ...formData, categoryId: e.target.value });
                    if (e.target.value) setCategoryError(false);
                  }}
                >
                  <option value="">Select Category...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {categoryError && <p className="text-[8px] text-rose-500 font-black uppercase tracking-widest">Required</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Price (IDR)</Label>
                <Input
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 text-2xl font-black"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cost (IDR)</Label>
                <Input
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 text-2xl font-black text-emerald-700"
                  type="number"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-6 border-t border-slate-100 pt-10">
              <div className="flex justify-between items-center">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Selling Prices</Label>
                 <Button type="button" onClick={generateAIPrice} className="h-10 px-6 rounded-xl font-black text-[9px] uppercase bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                    <Sparkles className="w-3.5 h-3.5 mr-2" /> AI Recommendation
                 </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-[2rem]">
                {platforms.map(p => (
                  <div key={p.id} className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">{p.name}</Label>
                    <Input
                      className="h-12 rounded-xl bg-white font-black"
                      type="number"
                      value={formData.prices[p.id] || ""}
                      onChange={(e) => handlePlatformPriceChange(p.id, e.target.value)}
                      placeholder={formData.price || "0"}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-6 pt-10 border-t border-slate-50">
              <Button type="button" variant="ghost" className="h-14 px-10 rounded-2xl font-black text-slate-400" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="h-14 px-12 rounded-2xl font-black bg-slate-900 text-white">Save Item</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Categories Dialog */}
      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-w-2xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white flex flex-col max-h-[90dvh]">
          <div className="bg-slate-50 p-10 border-b border-slate-100 shrink-0">
            <DialogTitle className="text-3xl font-black text-slate-900 uppercase tracking-tight">Categories</DialogTitle>
          </div>
          
          <div className="p-10 space-y-10 flex-1 overflow-y-auto min-h-0 scrollbar-hide">
            <form onSubmit={handleCategorySubmit} className="p-8 bg-slate-50 rounded-[2rem] space-y-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest">Add Category</h3>
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6">
                <Input value={categoryFormData.name} onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })} required placeholder="Name" className="h-14 rounded-2xl bg-white font-black uppercase tracking-widest" />
                <input type="color" value={categoryFormData.color} onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })} className="h-14 w-20 cursor-pointer border-4 border-white rounded-2xl" />
              </div>
              <div className="flex justify-end gap-4">
                 {isCategoryEditing && <Button variant="ghost" onClick={resetCategoryForm} className="text-[10px] font-black uppercase">Cancel</Button>}
                 <Button type="submit" className="h-14 px-12 rounded-2xl font-black bg-slate-900 text-white shadow-xl">{isCategoryEditing ? "Update" : "Add Category"}</Button>
              </div>
            </form>

            <div className="max-h-72 overflow-y-auto rounded-[1.5rem] border border-slate-100">
              <ResponsiveDataView
                loading={loading}
                data={categories}
                emptyMessage="No categories"
                columns={[
                  {
                    header: "Color",
                    accessor: (cat) => <div className="w-8 h-8 rounded-xl border-2 border-white shadow-lg" style={{ backgroundColor: cat.color }}></div>,
                    className: "pl-6"
                  },
                  {
                    header: "Name",
                    accessor: (cat) => <span className="font-black text-slate-900 uppercase tracking-widest text-[11px]">{cat.name}</span>
                  },
                  {
                    header: "Actions",
                    accessor: (cat) => (
                      confirmDeleteCatId === cat.id ? (
                        <div className="flex gap-2 pr-6">
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteCategory(cat.id)}>YES</Button>
                          <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteCatId(null)}>NO</Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1 pr-6">
                          <Button variant="ghost" size="icon" onClick={() => openEditCategory(cat)}><Edit2 className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setConfirmDeleteCatId(cat.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      )
                    ),
                    align: "right"
                  }
                ]}
              />
            </div>
            
            <div className="flex justify-end pt-4">
              <Button variant="ghost" className="h-14 px-12 font-black uppercase text-slate-400" onClick={() => setIsCategoryDialogOpen(false)}>Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
