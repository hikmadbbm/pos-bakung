"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { cn } from "../../../lib/utils";
import { formatIDR } from "../../../lib/format";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Plus, Trash2, Edit2, Settings, Sparkles, ShoppingBag, X } from "lucide-react";
import { useToast } from "../../../components/ui/use-toast";
import { ResponsiveDataView } from "../../../components/ResponsiveDataView";
import { useTranslation } from "../../../lib/language-context";

export default function MenuPage() {
  const { t } = useTranslation();
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
  const [formData, setFormData] = useState({ 
    name: "", 
    price: "", 
    cost: "", 
    categoryId: "", 
    prices: {},
    productType: "OWN_PRODUCT",
    consignment: {
      partnerName: "",
      modelType: "FIXED_DAILY",
      fixedDailyFee: "",
      revenueSharePercent: "",
      startDate: new Date().toISOString().split('T')[0],
      endDate: ""
    }
  });
  const [isEditing, setIsEditing] = useState(null);

  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({ name: "", color: "#cccccc", type: "FOOD" });
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

    const previousMenus = [...menus];
    const isEdit = !!isEditing;
    const tempId = isEdit ? isEditing : Date.now();
    
    // Create optimistic item
    const optimisticItem = {
      ...formData,
      id: tempId,
      price: Number(formData.price),
      cost: Number(formData.cost),
      profit: (formData.productType === 'CONSIGNMENT') ? 0 : (Number(formData.price) || 0) - (Number(formData.cost) || 0),
      is_active: true,
      category: categories.find(c => c.id.toString() === formData.categoryId.toString())
    };

    // Optimistic Update
    if (isEdit) {
      setMenus(prev => prev.map(m => m.id === isEditing ? optimisticItem : m));
    } else {
      setMenus(prev => [optimisticItem, ...prev]);
    }

    setIsDialogOpen(false);
    
    try {
      let res;
      if (isEdit) {
        res = await api.put(`/menus/${isEditing}`, formData);
      } else {
        res = await api.post("/menus", formData);
      }
      
      // Update with real ID from server if it was a create
      if (!isEdit && res?.id) {
        setMenus(prev => prev.map(m => m.id === tempId ? { ...m, id: res.id } : m));
      }
      
      resetMenuForm();
      // Only reload full data if absolutely necessary, otherwise trust optimistic UI
      // loadData(); 
      success(isEdit ? "Item updated" : "Item added");
    } catch (e) {
      console.error(e);
      setMenus(previousMenus); // Revert
      error("Failed to save item");
    }
  };

  const handleDuplicate = (menu) => {
    setFormData({
      ...formData,
      name: `${menu.name} (Copy)`,
      price: menu.price,
      cost: menu.cost,
      categoryId: menu.categoryId ? menu.categoryId.toString() : "",
      prices: menu.prices || {},
      productType: menu.productType || "OWN_PRODUCT",
      consignment: menu.consignment ? { ...menu.consignment } : {
        partnerName: "",
        modelType: "FIXED_DAILY",
        fixedDailyFee: "",
        revenueSharePercent: "",
        startDate: new Date().toISOString().split('T')[0],
        endDate: ""
      }
    });
    setIsEditing(null);
    setIsDialogOpen(true);
    success("Item data duplicated. Review and save.");
  };

  const handleToggleActive = async (menu) => {
    const previousMenus = [...menus];
    const newStatus = !menu.is_active;
    
    // Optimistic Update
    setMenus(prev => prev.map(m => m.id === menu.id ? { ...m, is_active: newStatus } : m));

    try {
      await api.put(`/menus/${menu.id}`, { ...menu, is_active: newStatus });
      success(`${menu.name} is now ${newStatus ? 'Available' : 'Sold Out'}`);
    } catch (e) {
      console.error(e);
      setMenus(previousMenus); // Revert
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
      categoryId: menu.categoryId ? menu.categoryId.toString() : "",
      prices: menu.prices || {},
      productType: menu.productType || "OWN_PRODUCT",
      consignment: menu.consignment ? {
        partnerName: menu.consignment.partnerName,
        modelType: menu.consignment.modelType,
        fixedDailyFee: menu.consignment.fixedDailyFee,
        revenueSharePercent: menu.consignment.revenueSharePercent,
        startDate: menu.consignment.startDate ? new Date(menu.consignment.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        endDate: menu.consignment.endDate ? new Date(menu.consignment.endDate).toISOString().split('T')[0] : ""
      } : {
        partnerName: "",
        modelType: "FIXED_DAILY",
        fixedDailyFee: "",
        revenueSharePercent: "",
        startDate: new Date().toISOString().split('T')[0],
        endDate: ""
      }
    });
    setIsEditing(menu.id);
    setIsDialogOpen(true);
  };

  const openCreateMenu = () => {
    resetMenuForm();
    setIsDialogOpen(true);
  };

  const resetMenuForm = () => {
    setFormData({ 
      name: "", 
      price: "", 
      cost: "", 
      categoryId: "", 
      prices: {},
      productType: "OWN_PRODUCT",
      consignment: {
        partnerName: "",
        modelType: "FIXED_DAILY",
        fixedDailyFee: "",
        revenueSharePercent: "",
        startDate: new Date().toISOString().split('T')[0],
        endDate: ""
      }
    });
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
    setCategoryFormData({ name: cat.name, color: cat.color, type: cat.type || "FOOD" });
    setIsCategoryEditing(cat.id);
  };

  const resetCategoryForm = () => {
    setCategoryFormData({ name: "", color: "#6366f1", type: "FOOD" });
    setIsCategoryEditing(null);
  };

  return (
    <div className="max-w-[1700px] mx-auto space-y-10 animate-fade-in pb-20 px-4 md:px-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 print:hidden pb-2">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">{t('products.title')}</h2>
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
              <Settings className="w-4 h-4 mr-3 text-slate-400" /> {t('products.categories')}
            </Button>
            <Button
              onClick={openCreateMenu}
              className="flex-1 md:flex-none h-14 px-10 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] bg-slate-900 text-white hover:bg-black shadow-2xl shadow-slate-200 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 mr-3" /> {t('products.new_item')}
            </Button>
          </div>
        )}
      </div>

      <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl border-none p-0 animate-in fade-in duration-700">
        <ResponsiveDataView
          loading={loading}
          data={menus}
          emptyMessage={t('products.not_found')}
          columns={[
            {
              header: t('common.name'),
              accessor: (m) => (
                <div className="py-2">
                  <div className="flex items-center gap-2">
                    <p className="font-black text-slate-900 uppercase tracking-tight text-base group-hover:text-emerald-600 transition-colors">{m.name}</p>
                    {m.productType === 'CONSIGNMENT' && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[8px] font-black uppercase tracking-widest shadow-lg shadow-amber-200 border border-amber-600">
                        TITIPAN
                      </span>
                    )}
                  </div>
                </div>
              ),
              className: "pl-10",
              sortKey: 'name'
            },
            {
              header: t('common.category'),
              accessor: (m) => (
                m.category ? (
                  <span
                    className="px-4 py-1.5 rounded-full text-[9px] font-black text-white uppercase tracking-[0.1em] shadow-lg shadow-black/5 border border-white/20 whitespace-nowrap"
                    style={{ backgroundColor: m.category.color }}
                  >
                    {m.category.name}
                  </span>
                ) : (
                  <span className="text-slate-300 text-[9px] font-black uppercase tracking-widest italic opacity-50">{t('products.unclassified')}</span>
                )
              ),
              sortKey: 'category.name'
            },
            {
              header: t('common.price'),
              accessor: (m) => <span className="font-black text-slate-900 text-base tabular-nums">{formatIDR(m.price)}</span>,
              sortKey: 'price'
            },
            {
              header: t('orders.channel'),
              accessor: (m) => (
                <div className="flex flex-wrap gap-2">
                  {platforms.map(p => (
                    <div key={p.id} className="px-3 py-1.5 rounded-[0.75rem] bg-white border border-slate-100 text-[10px] flex items-center shadow-sm">
                      <span className="font-black text-slate-400 mr-2 uppercase tracking-tighter opacity-70">{p.name}:</span>
                      <span className="font-black text-slate-900 tabular-nums">{m.prices && m.prices[p.id] ? formatIDR(m.prices[p.id]) : "-"}</span>
                    </div>
                  ))}
                </div>
              ),
              sortable: false
            },
            {
              header: t('orders.profit'),
              accessor: (m) => (
                <div className="flex flex-col">
                  {m.productType === 'CONSIGNMENT' ? (
                    <div className="bg-amber-50 p-2 rounded-xl border border-amber-100 flex flex-col items-center min-w-[120px]">
                      <span className="text-amber-700 font-black text-[11px] tabular-nums tracking-tighter decoration-amber-300 underline underline-offset-4 decoration-2">
                        {m.consignmentValue || "MODEL KONSINYASI"}
                      </span>
                      <span className="text-[7px] font-black text-amber-500 uppercase mt-1 tracking-widest">Titipan Partner</span>
                    </div>
                  ) : (
                    <>
                      <span className="text-emerald-700 font-black text-base tabular-nums tracking-tighter">{formatIDR(m.profit)}</span>
                      <span className="text-[9px] font-bold text-slate-300 uppercase">{t('products.cost')}: {formatIDR(m.cost)}</span>
                    </>
                  )}
                </div>
              ),
              sortKey: 'profit'
            },
            {
              header: t('common.status'),
              accessor: (m) => (
                <button
                  onClick={() => handleToggleActive(m)}
                  className="flex flex-col items-center gap-1.5 group/toggle p-2 rounded-2xl hover:bg-slate-50 transition-all active:scale-95"
                >
                  <div
                    className={cn(
                      "relative inline-flex h-8 w-16 items-center rounded-full transition-all focus:outline-none shadow-inner shrink-0 p-1.5",
                      m.is_active ? "bg-emerald-500 shadow-lg shadow-emerald-200" : "bg-slate-300"
                    )}
                  >
                    <span className={cn(
                      "absolute text-[9px] font-black uppercase transition-all",
                      m.is_active ? "left-3 text-white" : "right-3 text-slate-500"
                    )}>
                      {m.is_active ? "ON" : "OFF"}
                    </span>
                    <span
                      className={cn(
                        "inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md relative z-10",
                        m.is_active ? "translate-x-8" : "translate-x-0"
                      )}
                    />
                  </div>
                  <p className={cn("text-[8px] font-black uppercase tracking-[0.2em] transition-colors", m.is_active ? "text-emerald-600" : "text-rose-500")}>
                    {m.is_active ? t('products.ready_status') : t('products.sold_out_status')}
                  </p>
                </button>
              ),
              align: "center",
              sortKey: 'is_active'
            },
            {
              header: t('common.actions'),
              sortable: false,
              accessor: (m) => (
                confirmDeleteId === m.id ? (
                  <div className="flex flex-col items-end gap-2 pr-2">
                    <div className="flex gap-2 bg-rose-50 p-2 rounded-2xl border border-rose-100 shadow-xl shadow-rose-100/50">
                      <Button variant="destructive" size="sm" className="h-9 px-5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 active:scale-95" onClick={() => handleDeleteMenu(m.id)}>{t('products.purge')}</Button>
                      <Button variant="ghost" size="sm" className="h-9 px-5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 text-rose-500" onClick={() => setConfirmDeleteId(null)}>{t('common.cancel')}</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end gap-2 pr-2">
                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-[1.25rem] hover:bg-amber-50 group/dup transition-all active:scale-90" onClick={() => handleDuplicate(m)} disabled={user?.role === 'KITCHEN'} title="Duplicate Item">
                      <Plus className="w-4.5 h-4.5 text-slate-300 group-hover/dup:text-amber-500" />
                    </Button>
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
                    {m.category?.name || t('products.unclassified')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => handleToggleActive(m)}
                  className="flex flex-col items-end gap-1.5 p-2 -mr-2 rounded-2xl hover:bg-slate-50 transition-all active:scale-95 group/toggle"
                >
                  <div
                    className={cn(
                      "relative inline-flex h-8 w-16 items-center rounded-full transition-all focus:outline-none shadow-inner shrink-0 p-1.5 border border-transparent",
                      m.is_active ? "bg-emerald-500 shadow-lg shadow-emerald-200" : "bg-slate-200/50"
                    )}
                  >
                    <span className={cn(
                      "absolute text-[9px] font-black uppercase transition-all",
                      m.is_active ? "left-3 text-white" : "right-3 text-slate-400"
                    )}>
                      {m.is_active ? "ON" : "OFF"}
                    </span>
                    <span
                      className={cn(
                        "inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-md relative z-10",
                        m.is_active ? "translate-x-8" : "translate-x-0"
                      )}
                    />
                  </div>
                  <span className={cn("text-[8px] font-black uppercase tracking-widest transition-colors", m.is_active ? "text-emerald-600" : "text-rose-500")}>
                    {m.is_active ? t('products.ready_status') : t('products.sold_out_status')}
                  </span>
                </button>
                </div>
              </div>

              <div className="flex justify-between items-end border-t border-slate-50 pt-4">
                <div className="w-full">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('common.price')}</p>
                  <div className="flex items-end justify-between">
                    <p className="font-black text-slate-900 text-xl tabular-nums tracking-tighter">{formatIDR(m.price)}</p>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('orders.profit')}</p>
                      <p className="font-black text-emerald-600 text-lg">{formatIDR(m.profit)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Platform Selling Prices (Mobile) */}
              <div className="grid grid-cols-2 gap-2 mt-1">
                {platforms.map(p => (
                  <div key={p.id} className="px-3 py-2 rounded-xl bg-slate-50/50 border border-slate-100 flex justify-between items-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tight">{p.name}</span>
                    <span className="text-[10px] font-black text-slate-900 tabular-nums">
                      {m.prices && m.prices[p.id] ? formatIDR(m.prices[p.id]) : "-"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-50">
                <Button variant="outline" className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase" onClick={() => openEditMenu(m)}>{t('common.edit')}</Button>
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
              {isEditing ? t('products.edit_item') : t('products.new_item')}
            </DialogTitle>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mt-3 relative z-10">{t('products.item_details')}</p>
          </div>

          <form onSubmit={handleMenuSubmit} className="p-10 space-y-8 flex-1 overflow-y-auto min-h-0 scrollbar-hide">
            {/* Product Type Selection */}
            <div className="space-y-3 p-6 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
               <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Inventory Logic</Label>
               <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, productType: 'OWN_PRODUCT' })}
                    className={cn(
                      "flex-1 h-14 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all",
                      formData.productType === 'OWN_PRODUCT' ? "bg-slate-900 text-white shadow-xl" : "bg-white text-slate-400 border border-slate-100 hover:bg-slate-50"
                    )}
                  >
                    <ShoppingBag className="w-4 h-4" /> Own Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, productType: 'CONSIGNMENT' })}
                    className={cn(
                      "flex-1 h-14 rounded-2xl flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all",
                      formData.productType === 'CONSIGNMENT' ? "bg-amber-600 text-white shadow-xl" : "bg-white text-slate-400 border border-slate-100 hover:bg-slate-50"
                    )}
                  >
                    <Sparkles className="w-4 h-4" /> Consignment
                  </button>
               </div>
            </div>

            {formData.productType === 'CONSIGNMENT' && (
              <div className="p-8 space-y-6 bg-amber-50 rounded-[2.5rem] border border-amber-100 animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-black">!</div>
                  <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">Consignment Configuration</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-amber-700 ml-2">Partner Name</Label>
                    <Input 
                      className="h-12 rounded-xl bg-white border-amber-100 font-bold"
                      value={formData.consignment.partnerName}
                      onChange={(e) => setFormData({
                        ...formData,
                        consignment: { ...formData.consignment, partnerName: e.target.value }
                      })}
                      required={formData.productType === 'CONSIGNMENT'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-amber-700 ml-2">Income Model</Label>
                    <div className="flex gap-2 p-1.5 bg-white rounded-xl border border-amber-100">
                      {['FIXED_DAILY', 'REVENUE_SHARE'].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormData({
                            ...formData,
                            consignment: { ...formData.consignment, modelType: t }
                          })}
                          className={cn(
                            "flex-1 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all",
                            formData.consignment.modelType === t ? "bg-amber-600 text-white" : "text-amber-400 hover:bg-amber-50"
                          )}
                        >
                          {t.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {formData.consignment.modelType === 'FIXED_DAILY' ? (
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-amber-700 ml-2">Fixed Fee (per Day)</Label>
                      <Input 
                        type="number"
                        className="h-12 rounded-xl bg-white border-amber-100 font-bold"
                        value={formData.consignment.fixedDailyFee}
                        onChange={(e) => setFormData({
                          ...formData,
                          consignment: { ...formData.consignment, fixedDailyFee: e.target.value }
                        })}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-widest text-amber-700 ml-2">Revenue Share (%)</Label>
                      <Input 
                        type="number"
                        className="h-12 rounded-xl bg-white border-amber-100 font-bold"
                        value={formData.consignment.revenueSharePercent}
                        onChange={(e) => setFormData({
                          ...formData,
                          consignment: { ...formData.consignment, revenueSharePercent: e.target.value }
                        })}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-amber-700 ml-2">Contract Start Date</Label>
                    <Input 
                      type="date"
                      className="h-12 rounded-xl bg-white border-amber-100 font-bold"
                      value={formData.consignment.startDate}
                      onChange={(e) => setFormData({
                        ...formData,
                        consignment: { ...formData.consignment, startDate: e.target.value }
                      })}
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('products.item_name')}</Label>
                <Input
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-base"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('common.category')}</Label>
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
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('products.price_idr')}</Label>
                <Input
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 text-2xl font-black"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('products.cost_idr')}</Label>
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
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-900">{t('products.selling_prices')}</Label>
                <Button type="button" onClick={generateAIPrice} className="h-10 px-6 rounded-xl font-black text-[9px] uppercase bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                  <Sparkles className="w-3.5 h-3.5 mr-2" /> {t('products.ai_recommendation')}
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
              <Button type="button" variant="ghost" className="h-14 px-10 rounded-2xl font-black text-slate-400" onClick={() => setIsDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" className="h-14 px-12 rounded-2xl font-black bg-slate-900 text-white">{t('common.save')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
        <DialogContent className="max-w-xl rounded-[3rem] border-none shadow-2xl p-0 overflow-hidden bg-white flex flex-col max-h-[85dvh]">
          <div className="bg-white p-10 border-b border-slate-50 shrink-0 flex justify-between items-center">
            <div>
              <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight">{t('products.categories')}</DialogTitle>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Classification Hub</p>
            </div>
          </div>

          <div className="p-8 space-y-8 flex-1 overflow-y-auto scrollbar-hide">
            <form onSubmit={handleCategorySubmit} className="space-y-6">
              <div className="space-y-6 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">{t('products.category_name')}</Label>
                  <Input value={categoryFormData.name} onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })} required placeholder={t('products.eg_appetizers')} className="h-14 rounded-2xl bg-white border-none shadow-sm font-black uppercase tracking-widest px-6" />
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">{t('products.classification')}</Label>
                    <div className="flex gap-1.5 p-1.5 bg-white rounded-2xl border border-slate-100/50 shadow-sm">
                      {["FOOD", "DRINK", "BOTH"].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setCategoryFormData({ ...categoryFormData, type: t })}
                          className={cn(
                            "flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase transition-all",
                            categoryFormData.type === t ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-2">{t('products.theme_color')}</Label>
                    <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-100/50 shadow-sm">
                      <input type="color" value={categoryFormData.color} onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })} className="h-10 w-12 cursor-pointer border-none bg-transparent" />
                      <span className="text-[10px] font-black text-slate-400 font-mono uppercase">{categoryFormData.color}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                {isCategoryEditing && <Button type="button" variant="ghost" onClick={resetCategoryForm} className="h-14 flex-1 rounded-2xl text-[10px] font-black uppercase text-slate-400">{t('common.cancel')}</Button>}
                <Button type="submit" className="h-14 flex-[2] rounded-2xl font-black bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl shadow-emerald-500/10 transition-all active:scale-95">{isCategoryEditing ? t('common.save') : t('common.add')}</Button>
              </div>
            </form>

            <div className="space-y-4">
              <div className="flex items-center gap-2 px-2">
                <div className="h-[1px] flex-1 bg-slate-100"></div>
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.3em]">{t('products.master_database')}</span>
                <div className="h-[1px] flex-1 bg-slate-100"></div>
              </div>
              
              <div className="space-y-3">
                {categories.map(cat => (
                  <div key={cat.id} className="flex items-center justify-between p-4 bg-white border border-slate-50 rounded-2xl hover:border-slate-200 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl shadow-inner border-4 border-white" style={{ backgroundColor: cat.color }}></div>
                      <div>
                        <p className="font-black text-slate-900 uppercase tracking-widest text-[11px]">{cat.name}</p>
                        <span className={cn(
                          "text-[7px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-md",
                          cat.type === 'DRINK' ? "bg-blue-50 text-blue-500" : cat.type === 'BOTH' ? "bg-indigo-50 text-indigo-500" : "bg-orange-50 text-orange-500"
                        )}>
                          {cat.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-50" onClick={() => openEditCategory(cat)}><Edit2 className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-rose-300 hover:text-rose-500 hover:bg-rose-50" onClick={() => setConfirmDeleteCatId(cat.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                    {confirmDeleteCatId === cat.id && (
                      <div className="absolute right-4 flex gap-2 bg-white p-2 rounded-xl shadow-xl border border-rose-50 z-10 animate-in slide-in-from-right-2">
                        <Button variant="destructive" size="sm" className="h-8 text-[8px] font-black px-3 rounded-lg" onClick={() => handleDeleteCategory(cat.id)}>{t('products.purge')}</Button>
                        <Button variant="ghost" size="sm" className="h-8 text-[8px] font-black px-3 rounded-lg" onClick={() => setConfirmDeleteCatId(null)}>{t('common.cancel')}</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
