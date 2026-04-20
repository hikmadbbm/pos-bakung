"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "../../../lib/api";
import { useTranslation } from "../../../lib/language-context";
import { useToast } from "../../../components/ui/use-toast";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Sparkles, Plus, Trash2, Edit2, Zap, Target, Tag, Gift,
  Loader2, X, ChevronDown, ChevronUp, ToggleLeft, ToggleRight,
  ShoppingBag, Percent, Minus, Clock, Calendar, AlertCircle,
  Check, PlayCircle, Package, ArrowRight, RefreshCw, Search
} from "lucide-react";
import { formatIDR } from "../../../lib/format";
import { cn } from "../../../lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────
const ACTION_TYPES = [
  { value: "PERCENT_DISCOUNT", label: "% Diskon", icon: Percent, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { value: "FIXED_DISCOUNT",   label: "Diskon Flat", icon: Minus,   color: "text-blue-600 bg-blue-50 border-blue-200" },
  { value: "FREE_ITEM",        label: "Item Gratis", icon: Gift,    color: "text-purple-600 bg-purple-50 border-purple-200" },
  { value: "BUY_X_GET_Y",      label: "Beli X Gratis Y", icon: ShoppingBag, color: "text-amber-600 bg-amber-50 border-amber-200" },
];

const PROMO_TYPES = [
  { value: "CART", label: "Seluruh Keranjang" },
  { value: "ITEM", label: "Produk Tertentu" },
  { value: "BUNDLE", label: "Bundle / Paket" },
];

const DAYS = [
  { val: "1", label: "Sen" }, { val: "2", label: "Sel" },
  { val: "3", label: "Rab" }, { val: "4", label: "Kam" },
  { val: "5", label: "Jum" }, { val: "6", label: "Sab" },
  { val: "7", label: "Min" },
];

const BLANK_PROMO = {
  name: "", description: "", type: "CART", status: "ACTIVE",
  priority: 1, stackable: false,
  startDate: "", endDate: "", daysActive: "", timeStart: "", timeEnd: "",
  conditions: [{ minTransactionAmount: 0 }],
  actions: [{ actionType: "PERCENT_DISCOUNT", value: 10 }],
  constraints: [{}],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getActionIcon(type) {
  return ACTION_TYPES.find(a => a.value === type)?.icon || Tag;
}
function getActionColor(type) {
  return ACTION_TYPES.find(a => a.value === type)?.color || "text-slate-600 bg-slate-50 border-slate-200";
}
function getActionLabel(type) {
  return ACTION_TYPES.find(a => a.value === type)?.label || type;
}
function describeAction(action) {
  if (!action) return "–";
  switch (action.actionType) {
    case "PERCENT_DISCOUNT": return `${action.value}% off`;
    case "FIXED_DISCOUNT":   return `${formatIDR(action.value)} off`;
    case "FREE_ITEM":        return "Item gratis";
    case "BUY_X_GET_Y":      return `Beli ${action.triggerQty || 1}, Gratis ${action.freeQty || 1}`;
    default: return action.actionType;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PromotionsPage() {
  const { t } = useTranslation();
  const { success, error } = useToast();

  const [promotions, setPromotions]   = useState([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [editingPromo, setEditingPromo] = useState(null);
  const [deletingId, setDeletingId]   = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get("/promotions");
      setPromotions(data);
    } catch { error("Gagal memuat promosi"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggleStatus = async (promo) => {
    const next = promo.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await api.put(`/promotions/${promo.id}`, { ...promo, status: next });
      setPromotions(ps => ps.map(p => p.id === promo.id ? { ...p, status: next } : p));
      success(`Promosi ${next === "ACTIVE" ? "diaktifkan" : "dinonaktifkan"}`);
    } catch { error("Gagal mengubah status"); }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/promotions/${id}`);
      setPromotions(ps => ps.filter(p => p.id !== id));
      setDeletingId(null);
      success("Promosi dihapus");
    } catch { error("Gagal menghapus"); }
  };

  const filtered = promotions.filter(p => {
    const q = search.toLowerCase();
    const nameMatch = p.name.toLowerCase().includes(q);
    const statusMatch = filterStatus === "ALL" || p.status === filterStatus;
    return nameMatch && statusMatch;
  });

  return (
    <div className="space-y-6 pb-24">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase italic tracking-tight flex items-center gap-3">
            Promosi <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-500" />
          </h1>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
            Kelola diskon, bundling & reward otomatis
          </p>
        </div>
        <Button
          onClick={() => setEditingPromo({ ...BLANK_PROMO })}
          className="w-full sm:w-auto h-12 px-6 rounded-2xl bg-slate-900 text-white font-black uppercase text-[11px] tracking-widest hover:bg-black active:scale-95 transition-all shadow-lg"
        >
          <Plus className="w-4 h-4 mr-2" /> Buat Promo
        </Button>
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari promosi..."
            className="w-full h-11 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
          />
        </div>
        <div className="flex gap-2">
          {["ALL","ACTIVE","INACTIVE"].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "flex-1 sm:flex-none h-11 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                filterStatus === s
                  ? s === "ACTIVE" ? "bg-emerald-600 text-white border-emerald-600"
                    : s === "INACTIVE" ? "bg-slate-900 text-white border-slate-900"
                    : "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              )}
            >
              {s === "ALL" ? "Semua" : s === "ACTIVE" ? "Aktif" : "Nonaktif"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Summary Bar ── */}
      {!loading && promotions.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Promo", val: promotions.length, color: "text-slate-900" },
            { label: "Aktif", val: promotions.filter(p => p.status === "ACTIVE").length, color: "text-emerald-600" },
            { label: "Nonaktif", val: promotions.filter(p => p.status !== "ACTIVE").length, color: "text-rose-500" },
          ].map(s => (
            <div key={s.label} className="bg-white border border-slate-100 rounded-2xl p-4 text-center">
              <p className={cn("text-xl sm:text-2xl font-black", s.color)}>{s.val}</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── List ── */}
      {loading ? (
        <div className="h-40 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm">
            <Zap className="w-8 h-8 text-slate-200" />
          </div>
          <div>
            <h4 className="text-lg font-black text-slate-700 uppercase">
              {search ? "Tidak ditemukan" : "Belum ada promo"}
            </h4>
            <p className="text-slate-400 text-sm mt-1">
              {search ? "Coba kata kunci lain" : "Buat promo pertama untuk tingkatkan penjualan"}
            </p>
          </div>
          {!search && (
            <Button
              onClick={() => setEditingPromo({ ...BLANK_PROMO })}
              variant="outline"
              className="rounded-xl font-black uppercase text-[10px] tracking-widest"
            >
              Buat Promo Sekarang
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(promo => (
            <PromoCard
              key={promo.id}
              promo={promo}
              onEdit={() => setEditingPromo(promo)}
              onToggle={() => handleToggleStatus(promo)}
              deletingId={deletingId}
              onDeleteRequest={() => setDeletingId(promo.id)}
              onDeleteCancel={() => setDeletingId(null)}
              onDeleteConfirm={() => handleDelete(promo.id)}
            />
          ))}
        </div>
      )}

      {/* ── Form Modal ── */}
      {editingPromo && (
        <PromoFormModal
          promo={editingPromo}
          onClose={() => setEditingPromo(null)}
          onSaved={() => { load(); setEditingPromo(null); }}
        />
      )}
    </div>
  );
}

// ─── Promo Card ───────────────────────────────────────────────────────────────
function PromoCard({ promo, onEdit, onToggle, deletingId, onDeleteRequest, onDeleteCancel, onDeleteConfirm }) {
  const action  = promo.actions?.[0];
  const cond    = promo.conditions?.[0];
  const isActive = promo.status === "ACTIVE";
  const isDeleting = deletingId === promo.id;
  const Icon = getActionIcon(action?.actionType);

  return (
    <div className={cn(
      "group relative bg-white border rounded-3xl p-5 transition-all duration-300",
      isActive
        ? "border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-0.5"
        : "border-slate-100 opacity-60"
    )}>
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div className={cn(
          "w-11 h-11 rounded-2xl flex items-center justify-center border shrink-0",
          getActionColor(action?.actionType)
        )}>
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex items-center gap-2">
          {/* Status toggle */}
          <button
            onClick={onToggle}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all",
              isActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-50 text-slate-400 border-slate-200"
            )}
          >
            {isActive
              ? <><ToggleRight className="w-3 h-3" /> Aktif</>
              : <><ToggleLeft className="w-3 h-3" /> Nonaktif</>
            }
          </button>
        </div>
      </div>

      {/* Content */}
      <h3 className="font-black text-slate-900 uppercase text-sm leading-tight mb-1 line-clamp-1">
        {promo.name}
      </h3>
      <p className="text-[10px] text-slate-400 font-medium line-clamp-2 mb-4">
        {promo.description || "Tidak ada deskripsi"}
      </p>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[9px] font-black uppercase rounded-lg tracking-widest">
          {promo.type}
        </span>
        {action && (
          <span className={cn("px-2 py-1 text-[9px] font-black uppercase rounded-lg tracking-widest border", getActionColor(action.actionType))}>
            {describeAction(action)}
          </span>
        )}
        {cond?.minTransactionAmount > 0 && (
          <span className="px-2 py-1 bg-amber-50 text-amber-600 border border-amber-200 text-[9px] font-black uppercase rounded-lg tracking-widest">
            Min {formatIDR(cond.minTransactionAmount)}
          </span>
        )}
        {promo.stackable && (
          <span className="px-2 py-1 bg-blue-50 text-blue-600 border border-blue-200 text-[9px] font-black uppercase rounded-lg tracking-widest">
            Stackable
          </span>
        )}
      </div>

      {/* Schedule */}
      {(promo.startDate || promo.daysActive) && (
        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold mb-4">
          <Calendar className="w-3 h-3" />
          {promo.daysActive
            ? `Hari: ${promo.daysActive.split(",").map(d => DAYS.find(x => x.val === d.trim())?.label || d).join(", ")}`
            : promo.startDate
              ? `${new Date(promo.startDate).toLocaleDateString("id-ID")} – ${promo.endDate ? new Date(promo.endDate).toLocaleDateString("id-ID") : "∞"}`
              : "Selalu Aktif"
          }
        </div>
      )}

      {/* Actions */}
      {isDeleting ? (
        <div className="flex gap-2">
          <button
            onClick={onDeleteConfirm}
            className="flex-1 h-10 rounded-xl bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
          >
            Hapus
          </button>
          <button
            onClick={onDeleteCancel}
            className="flex-1 h-10 rounded-xl bg-slate-100 text-slate-600 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
          >
            Batal
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="flex-1 h-10 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </button>
          <button
            onClick={onDeleteRequest}
            className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 active:scale-95 transition-all flex items-center justify-center"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Promo Form Modal ─────────────────────────────────────────────────────────
function PromoFormModal({ promo, onClose, onSaved }) {
  const { success, error: toastError } = useToast();
  const [step, setStep]         = useState(1); // 1: Info, 2: Conditions, 3: Actions, 4: Schedule
  const [saving, setSaving]     = useState(false);
  const [simming, setSimming]   = useState(false);
  const [simCart, setSimCart]   = useState([]);
  const [simResult, setSimResult] = useState(null);

  const [menus, setMenus]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [platforms, setPlatforms]   = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const isEdit = !!promo.id;

  const [form, setForm] = useState({
    name:        promo.name || "",
    description: promo.description || "",
    type:        promo.type || "CART",
    status:      promo.status || "ACTIVE",
    priority:    promo.priority || 1,
    stackable:   promo.stackable || false,
    startDate:   promo.startDate ? promo.startDate.split("T")[0] : "",
    endDate:     promo.endDate   ? promo.endDate.split("T")[0]   : "",
    daysActive:  promo.daysActive || "",
    timeStart:   promo.timeStart || "",
    timeEnd:     promo.timeEnd   || "",
    // Conditions — take first condition, or blank
    minTransactionAmount: promo.conditions?.[0]?.minTransactionAmount || 0,
    minItemQuantity:      promo.conditions?.[0]?.minItemQuantity || 0,
    productIds:           promo.conditions?.[0]?.productIds || [],
    categoryIds:          promo.conditions?.[0]?.categoryIds || [],
    paymentMethods:       promo.conditions?.[0]?.paymentMethods || [],
    platform:             promo.conditions?.[0]?.platform || "",
    // Actions — take first action, or blank
    actionType:    promo.actions?.[0]?.actionType || "PERCENT_DISCOUNT",
    actionValue:   promo.actions?.[0]?.value || 10,
    maxDiscount:   promo.actions?.[0]?.maxDiscount || "",
    freeProductId: promo.actions?.[0]?.freeProductId || "",
    triggerQty:    promo.actions?.[0]?.triggerQty || 2,
    freeQty:       promo.actions?.[0]?.freeQty || 1,
  });

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      try {
        const [m, c, p] = await Promise.all([api.get("/menus"), api.get("/categories"), api.get("/platforms")]);
        setMenus(m);
        setCategories(c);
        setPlatforms(p);
      } catch { /* silent */ }
      finally { setLoadingData(false); }
    })();
  }, []);

  const toggleDay = (d) => {
    const days = form.daysActive ? form.daysActive.split(",").map(x => x.trim()).filter(Boolean) : [];
    const next = days.includes(d) ? days.filter(x => x !== d) : [...days, d];
    setF("daysActive", next.join(","));
  };

  const toggleArr = (key, val) => {
    const arr = form[key] || [];
    setF(key, arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const buildPayload = () => {
    return {
      name: form.name,
      description: form.description,
      type: form.type,
      status: form.status,
      priority: parseInt(form.priority) || 1,
      stackable: form.stackable,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      daysActive: form.daysActive || null,
      timeStart: form.timeStart || null,
      timeEnd: form.timeEnd || null,
      conditions: [{
        minTransactionAmount: parseInt(form.minTransactionAmount) || 0,
        minItemQuantity: parseInt(form.minItemQuantity) || 0,
        productIds: form.productIds.map(Number),
        categoryIds: form.categoryIds.map(Number),
        paymentMethods: form.paymentMethods,
        platform: form.platform || null,
      }],
      actions: [{
        actionType: form.actionType,
        value: parseFloat(form.actionValue) || 0,
        maxDiscount: form.maxDiscount ? parseInt(form.maxDiscount) : null,
        freeProductId: form.freeProductId ? parseInt(form.freeProductId) : null,
        triggerQty: parseInt(form.triggerQty) || null,
        freeQty: parseInt(form.freeQty) || null,
      }],
      constraints: [{}],
    };
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toastError("Nama promo wajib diisi"); return; }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isEdit) await api.put(`/promotions/${promo.id}`, payload);
      else        await api.post("/promotions", payload);
      success(isEdit ? "Promo diperbarui" : "Promo dibuat!");
      onSaved();
    } catch { toastError("Gagal menyimpan promo"); }
    finally { setSaving(false); }
  };

  const runSim = () => {
    if (!simCart.length) return;
    setSimming(true);
    
    // Simulate locally based on the current form state instead of API,
    // because the promo isn't saved to DB yet!
    setTimeout(() => {
      try {
        const payload = buildPayload();
        const subtotal = simCart.reduce((s, i) => s + i.price * i.qty, 0);
        let isValid = true;
        const cond = payload.conditions[0];
        
        // Check conditions
        if (cond.minTransactionAmount && subtotal < cond.minTransactionAmount) isValid = false;
        const totalQty = simCart.reduce((s, i) => s + i.qty, 0);
        if (cond.minItemQuantity && totalQty < cond.minItemQuantity) isValid = false;
        
        if (cond.productIds?.length > 0) {
          if (!simCart.some(i => cond.productIds.includes(i.menu_id))) isValid = false;
        }
        if (cond.categoryIds?.length > 0) {
          if (!simCart.some(i => cond.categoryIds.includes(i.categoryId))) isValid = false;
        }
        if (cond.paymentMethods?.length > 0) {
          if (!cond.paymentMethods.includes("CASH")) isValid = false;
        }

        let discountAmount = 0;
        let explanation = "";
        if (isValid) {
          const action = payload.actions[0];
          if (action.actionType === 'PERCENT_DISCOUNT') {
            discountAmount = Math.round(subtotal * (action.value / 100));
            if (action.maxDiscount && discountAmount > action.maxDiscount) {
              discountAmount = action.maxDiscount;
              explanation = `Diskon ${action.value}% (Maks. ${formatIDR(action.maxDiscount)})`;
            } else {
              explanation = `Diskon ${action.value}%`;
            }
          } else if (action.actionType === 'FIXED_DISCOUNT') {
            discountAmount = action.value;
            explanation = `Potongan harga ${formatIDR(action.value)}`;
          } else if (action.actionType === 'FREE_ITEM') {
            // Check simCart first, fallback to menus array to show potential discount
            const inCart = simCart.find(i => i.menu_id === action.freeProductId);
            const menuRef = menus.find(m => m.id === action.freeProductId);
            const freeItem = inCart || menuRef;
            if (freeItem) {
               discountAmount = freeItem.price;
               explanation = `Gratis 1x ${freeItem.name}`;
            }
          } else if (action.actionType === 'BUY_X_GET_Y') {
             const X = action.triggerQty || 1;
             const Y = action.freeQty || 1;
             const eligibleItems = (cond.productIds?.length || cond.categoryIds?.length) 
               ? simCart.filter(i => cond.productIds?.includes(i.menu_id) || cond.categoryIds?.includes(i.categoryId))
               : simCart;
               
             const eligibleQty = eligibleItems.reduce((s, i) => s + i.qty, 0);
             if (eligibleQty >= X) {
                 const times = Math.floor(eligibleQty / X);
                 const freeUnits = times * Y;
                 
                 let freeProduct;
                 let availableQtyToDiscount = freeUnits;

                 if (action.freeProductId) {
                    const inCart = simCart.find(i => i.menu_id === action.freeProductId);
                    if (inCart) {
                       freeProduct = inCart;
                       availableQtyToDiscount = Math.min(freeUnits, inCart.qty);
                    } else {
                       freeProduct = menus.find(m => m.id === action.freeProductId);
                       // If not in cart, we assume the potential of all freeUnits
                    }
                 } else {
                    freeProduct = eligibleItems[0];
                    availableQtyToDiscount = Math.min(freeUnits, freeProduct.qty);
                 }

                 if (freeProduct) {
                     discountAmount = freeProduct.price * availableQtyToDiscount;
                     explanation = `Beli ${X} Gratis ${availableQtyToDiscount}x ${freeProduct.name}`;
                 }
             }
          }
        }

        setSimResult({
          totalDiscount: isValid ? Math.max(0, discountAmount) : 0,
          appliedPromos: isValid && discountAmount > 0 ? [{ 
            name: payload.name || "TEST PROMO (BELUM DISIMPAN)", 
            amount: discountAmount,
            explanation
          }] : []
        });
      } catch (err) {
        toastError("Simulasi gagal");
      } finally {
        setSimming(false);
      }
    }, 400); 
  };

  const STEPS = ["Info", "Kondisi", "Aksi", "Jadwal"];

  return (
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg sm:rounded-[2rem] rounded-t-[2rem] shadow-2xl flex flex-col max-h-[95dvh] overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-black text-slate-900 uppercase text-base tracking-tight">
              {isEdit ? "Edit Promo" : "Buat Promo Baru"}
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Langkah {step} dari {STEPS.length}: {STEPS[step - 1]}
            </p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl hover:bg-slate-100 flex items-center justify-center transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pt-4 pb-2 shrink-0">
          <div className="flex gap-1.5">
            {STEPS.map((s, i) => (
              <button
                key={s}
                onClick={() => setStep(i + 1)}
                className={cn(
                  "flex-1 h-1.5 rounded-full transition-all",
                  i + 1 <= step ? "bg-emerald-500" : "bg-slate-200"
                )}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1.5">
            {STEPS.map((s, i) => (
              <span key={s} className={cn(
                "text-[9px] font-black uppercase tracking-widest transition-colors",
                i + 1 === step ? "text-emerald-600" : i + 1 < step ? "text-slate-400" : "text-slate-200"
              )}>{s}</span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* ── Step 1: Info ── */}
          {step === 1 && (
            <>
              <FormField label="Nama Promo *">
                <Input
                  value={form.name}
                  onChange={e => setF("name", e.target.value.toUpperCase())}
                  placeholder="DISKON WEEKEND 10%"
                  className="h-12 rounded-xl font-black uppercase text-sm"
                />
              </FormField>

              <FormField label="Deskripsi (opsional)">
                <textarea
                  value={form.description}
                  onChange={e => setF("description", e.target.value)}
                  placeholder="Tampil di struk kasir..."
                  rows={2}
                  className="w-full p-3 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none transition-all"
                />
              </FormField>

              <FormField label="Tipe Promo">
                <div className="grid grid-cols-3 gap-2">
                  {PROMO_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setF("type", t.value)}
                      className={cn(
                        "h-12 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                        form.type === t.value
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Prioritas">
                  <Input
                    type="number"
                    min={1}
                    value={form.priority}
                    onChange={e => setF("priority", e.target.value)}
                    className="h-12 rounded-xl font-black"
                  />
                </FormField>
                <FormField label="Stackable">
                  <button
                    onClick={() => setF("stackable", !form.stackable)}
                    className={cn(
                      "w-full h-12 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                      form.stackable ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-slate-400 border-slate-200"
                    )}
                  >
                    {form.stackable ? <><Check className="w-4 h-4" /> Ya</> : "Tidak"}
                  </button>
                </FormField>
              </div>

              <FormField label="Status">
                <div className="flex gap-2">
                  {["ACTIVE","INACTIVE"].map(s => (
                    <button
                      key={s}
                      onClick={() => setF("status", s)}
                      className={cn(
                        "flex-1 h-11 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                        form.status === s
                          ? s === "ACTIVE" ? "bg-emerald-500 text-white border-emerald-500" : "bg-rose-500 text-white border-rose-500"
                          : "bg-white text-slate-400 border-slate-200"
                      )}
                    >
                      {s === "ACTIVE" ? "Aktif" : "Nonaktif"}
                    </button>
                  ))}
                </div>
              </FormField>
            </>
          )}

          {/* ── Step 2: Conditions ── */}
          {step === 2 && (
            <>
              <FormField label="Min. Transaksi (Rp)">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                  <Input
                    type="number"
                    value={form.minTransactionAmount}
                    onChange={e => setF("minTransactionAmount", e.target.value)}
                    className="h-12 rounded-xl font-black pl-9"
                    placeholder="0 = tidak ada min."
                  />
                </div>
              </FormField>

              <FormField label="Min. Jumlah Item">
                <Input
                  type="number"
                  min={0}
                  value={form.minItemQuantity}
                  onChange={e => setF("minItemQuantity", e.target.value)}
                  className="h-12 rounded-xl font-black"
                  placeholder="0 = tidak ada min."
                />
              </FormField>

              <FormField label="Khusus Produk (opsional)">
                {loadingData ? <p className="text-xs text-slate-400">Memuat...</p> : (
                  <>
                    <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
                      {form.productIds.map(id => {
                        const m = menus.find(x => x.id === id || x.id === Number(id));
                        return m ? (
                          <span key={id} className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-black px-2 py-1 rounded-full">
                            {m.name}
                            <button onClick={() => toggleArr("productIds", id)} className="ml-0.5"><X className="w-2.5 h-2.5" /></button>
                          </span>
                        ) : null;
                      })}
                    </div>
                    <select
                      onChange={e => { if (e.target.value) toggleArr("productIds", parseInt(e.target.value)); e.target.value = ""; }}
                      className="w-full h-11 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                    >
                      <option value="">+ Tambah produk...</option>
                      {menus.filter(m => !form.productIds.includes(m.id)).map(m => (
                        <option key={m.id} value={m.id}>{m.name} – {formatIDR(m.price)}</option>
                      ))}
                    </select>
                  </>
                )}
              </FormField>

              <FormField label="Khusus Kategori (opsional)">
                <div className="flex flex-wrap gap-1.5">
                  {categories.map(c => (
                    <button
                      key={c.id}
                      onClick={() => toggleArr("categoryIds", c.id)}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-[10px] font-black uppercase border transition-all",
                        form.categoryIds.includes(c.id)
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                      )}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </FormField>

              <FormField label="Metode Pembayaran (opsional)">
                <div className="flex flex-wrap gap-2">
                  {["CASH","QRIS","TRANSFER"].map(m => (
                    <button
                      key={m}
                      onClick={() => toggleArr("paymentMethods", m)}
                      className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase border transition-all",
                        form.paymentMethods.includes(m)
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </FormField>

              {platforms.length > 0 && (
                <FormField label="Platform (opsional)">
                  <select
                    value={form.platform}
                    onChange={e => setF("platform", e.target.value)}
                    className="w-full h-11 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">Semua Platform</option>
                    {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </FormField>
              )}
            </>
          )}

          {/* ── Step 3: Actions ── */}
          {step === 3 && (
            <>
              <FormField label="Jenis Aksi">
                <div className="grid grid-cols-2 gap-2">
                  {ACTION_TYPES.map(a => {
                    const Icon = a.icon;
                    return (
                      <button
                        key={a.value}
                        onClick={() => setF("actionType", a.value)}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-xl border text-left transition-all",
                          form.actionType === a.value
                            ? cn("border-2", a.color)
                            : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                      >
                        <Icon className={cn("w-4 h-4 shrink-0", form.actionType === a.value ? "" : "text-slate-400")} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{a.label}</span>
                      </button>
                    );
                  })}
                </div>
              </FormField>

              {/* PERCENT_DISCOUNT */}
              {form.actionType === "PERCENT_DISCOUNT" && (
                <>
                  <FormField label="Besar Diskon (%)">
                    <div className="relative">
                      <Input
                        type="number"
                        min={1} max={100}
                        value={form.actionValue}
                        onChange={e => setF("actionValue", e.target.value)}
                        className="h-12 rounded-xl font-black pr-12 text-lg"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400">%</span>
                    </div>
                  </FormField>
                  <FormField label="Maks. Diskon (Rp, opsional)">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                      <Input
                        type="number"
                        value={form.maxDiscount}
                        onChange={e => setF("maxDiscount", e.target.value)}
                        className="h-12 rounded-xl font-black pl-9"
                        placeholder="Tidak ada batas"
                      />
                    </div>
                  </FormField>
                </>
              )}

              {/* FIXED_DISCOUNT */}
              {form.actionType === "FIXED_DISCOUNT" && (
                <FormField label="Besar Diskon (Rp)">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                    <Input
                      type="number"
                      value={form.actionValue}
                      onChange={e => setF("actionValue", e.target.value)}
                      className="h-12 rounded-xl font-black pl-9 text-lg"
                    />
                  </div>
                </FormField>
              )}

              {/* FREE_ITEM */}
              {form.actionType === "FREE_ITEM" && (
                <FormField label="Produk Gratis">
                  <select
                    value={form.freeProductId}
                    onChange={e => setF("freeProductId", e.target.value)}
                    className="w-full h-12 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                  >
                    <option value="">Pilih produk gratis...</option>
                    {menus.map(m => <option key={m.id} value={m.id}>{m.name} – {formatIDR(m.price)}</option>)}
                  </select>
                </FormField>
              )}

              {/* BUY_X_GET_Y */}
              {form.actionType === "BUY_X_GET_Y" && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <FormField label="Beli (X)">
                      <Input
                        type="number" min={1}
                        value={form.triggerQty}
                        onChange={e => setF("triggerQty", e.target.value)}
                        className="h-12 rounded-xl font-black text-lg text-center"
                      />
                    </FormField>
                    <FormField label="Gratis (Y)">
                      <Input
                        type="number" min={1}
                        value={form.freeQty}
                        onChange={e => setF("freeQty", e.target.value)}
                        className="h-12 rounded-xl font-black text-lg text-center"
                      />
                    </FormField>
                  </div>
                  <FormField label="Produk Gratis (Y)">
                    <select
                      value={form.freeProductId}
                      onChange={e => setF("freeProductId", e.target.value)}
                      className="w-full h-12 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                    >
                      <option value="">Produk yang sama / pilih...</option>
                      {menus.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </FormField>
                </>
              )}

              {/* ── Simulation ── */}
              <div className="mt-2 bg-slate-900 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-white uppercase tracking-widest">Simulasi Promo</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5">Tes logika sebelum disimpan</p>
                  </div>
                  <button
                    onClick={runSim}
                    disabled={simming || !simCart.length}
                    className="h-9 px-4 rounded-xl bg-emerald-600 text-white font-black text-[9px] uppercase tracking-widest disabled:opacity-50 active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    {simming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
                    Jalankan
                  </button>
                </div>

                <select
                  onChange={e => {
                    if (!e.target.value) return;
                    const m = menus.find(x => x.id === parseInt(e.target.value));
                    if (m) { setSimCart(c => [...c, { ...m, menu_id: m.id, qty: 1 }]); e.target.value = ""; }
                  }}
                  className="w-full h-10 bg-slate-800 border border-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-400 px-3 focus:outline-none"
                >
                  <option value="">+ Tambah item ke simulasi...</option>
                  {menus.map(m => <option key={m.id} value={m.id}>{m.name} – {formatIDR(m.price)}</option>)}
                </select>

                {simCart.length > 0 && (
                  <div className="space-y-1.5">
                    {simCart.map((item, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-800 px-3 py-2 rounded-xl">
                        <span className="text-[10px] font-black text-white uppercase">{item.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-slate-400">{formatIDR(item.price)}</span>
                          <button onClick={() => setSimCart(c => c.filter((_, j) => j !== i))} className="text-slate-600 hover:text-white">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-between text-[10px] font-black text-slate-400 px-1 pt-1">
                      <span>Subtotal</span>
                      <span>{formatIDR(simCart.reduce((s, i) => s + i.price * i.qty, 0))}</span>
                    </div>
                  </div>
                )}

                {simResult && (
                  <div className="bg-slate-800 rounded-xl p-3 space-y-2">
                    {simResult.appliedPromos?.length > 0 ? (
                      <>
                        {simResult.appliedPromos.map((p, i) => (
                          <div key={i} className="flex flex-col gap-1 text-[10px] font-black text-emerald-400 bg-emerald-400/10 px-3 py-2 rounded-lg">
                            <div className="flex justify-between items-center">
                               <span className="flex items-center gap-1.5"><Check className="w-3 h-3" />{p.name}</span>
                               <span>-{formatIDR(p.amount)}</span>
                            </div>
                            {p.explanation && <span className="pl-4 text-[9px] text-emerald-600/80 font-bold italic tracking-wide">{p.explanation}</span>}
                          </div>
                        ))}
                        <div className="flex justify-between text-[11px] font-black text-white pt-1 border-t border-slate-700">
                          <span>Total Diskon</span>
                          <span className="text-emerald-400">-{formatIDR(simResult.totalDiscount)}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-[10px] font-black text-rose-400 uppercase text-center py-2">
                        Tidak ada promo yang berlaku
                      </p>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Step 4: Schedule ── */}
          {step === 4 && (
            <>
              <FormField label="Tanggal Mulai">
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={e => setF("startDate", e.target.value)}
                  className="h-12 rounded-xl font-bold"
                />
              </FormField>
              <FormField label="Tanggal Selesai (opsional)">
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={e => setF("endDate", e.target.value)}
                  className="h-12 rounded-xl font-bold"
                />
              </FormField>

              <FormField label="Hari Aktif (kosong = setiap hari)">
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map(d => {
                    const activeDays = form.daysActive ? form.daysActive.split(",").map(x => x.trim()) : [];
                    const isOn = activeDays.includes(d.val);
                    return (
                      <button
                        key={d.val}
                        onClick={() => toggleDay(d.val)}
                        className={cn(
                          "w-12 h-12 rounded-xl text-[11px] font-black uppercase transition-all border",
                          isOn ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-400 border-slate-200 hover:border-slate-300"
                        )}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Jam Mulai (opsional)">
                  <Input
                    type="time"
                    value={form.timeStart}
                    onChange={e => setF("timeStart", e.target.value)}
                    className="h-12 rounded-xl font-bold"
                  />
                </FormField>
                <FormField label="Jam Selesai (opsional)">
                  <Input
                    type="time"
                    value={form.timeEnd}
                    onChange={e => setF("timeEnd", e.target.value)}
                    className="h-12 rounded-xl font-bold"
                  />
                </FormField>
              </div>

              {/* Summary Preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Ringkasan Promo</p>
                <SummaryRow label="Nama" value={form.name || "—"} />
                <SummaryRow label="Tipe" value={form.type} />
                <SummaryRow label="Aksi" value={`${getActionLabel(form.actionType)}: ${form.actionType === "PERCENT_DISCOUNT" ? form.actionValue + "%" : form.actionType === "FIXED_DISCOUNT" ? formatIDR(form.actionValue) : "—"}`} />
                {form.minTransactionAmount > 0 && <SummaryRow label="Min. Transaksi" value={formatIDR(form.minTransactionAmount)} />}
                <SummaryRow label="Status" value={form.status === "ACTIVE" ? "Aktif" : "Nonaktif"} />
                <SummaryRow label="Stackable" value={form.stackable ? "Ya" : "Tidak"} />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex gap-3 shrink-0">
          {step > 1 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="flex-1 h-12 rounded-xl bg-slate-100 text-slate-700 font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all"
            >
              Kembali
            </button>
          ) : (
            <button
              onClick={onClose}
              className="flex-1 h-12 rounded-xl bg-slate-100 text-slate-500 font-black text-[11px] uppercase tracking-widest active:scale-95 transition-all"
            >
              Batal
            </button>
          )}

          {step < STEPS.length ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && !form.name.trim()}
              className="flex-1 h-12 rounded-xl bg-slate-900 text-white font-black text-[11px] uppercase tracking-widest hover:bg-black active:scale-95 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
            >
              Lanjut <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 h-12 rounded-xl bg-emerald-600 text-white font-black text-[11px] uppercase tracking-widest hover:bg-emerald-700 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isEdit ? "Simpan Perubahan" : "Buat Promo"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function FormField({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-slate-400 font-bold">{label}</span>
      <span className="text-slate-900 font-black">{value}</span>
    </div>
  );
}
