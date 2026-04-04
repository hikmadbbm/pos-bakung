"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Button } from "../../../components/ui/button";
import { Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Smartphone, Receipt, Clock, Save, AlertCircle, RefreshCcw, ShoppingBag, Maximize2, FileText } from "lucide-react";

import { cn } from "../../../lib/utils";
import { Select } from "../../../components/ui/select";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { useToast } from "../../../components/ui/use-toast";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../../components/ui/dialog";
import { ReceiptPreview } from "../../../components/receipt-preview";
import { useFocusMode } from "../../../lib/focus-mode-context";
import PinVerificationModal from "../../../components/PinVerificationModal";
import { usePrinter } from "../../../lib/printer-context";
import { useTranslation } from "../../../lib/language-context";
import { Skeleton } from "../../../components/ui/skeleton";
import QRCode from "qrcode";
import { generateDynamicQRIS } from "../../../lib/qris";

// Custom Hooks - Refactored
import { useCart } from "../../../hooks/useCart";
import { useCheckout } from "../../../hooks/useCheckout";

const defaultPaymentMethods = [
  { id: 1, name: 'CASH', type: 'CASH' },
  { id: 2, name: 'QRIS', type: 'QRIS' }
];

const quickMoneyButtons = [20000, 50000, 100000, 200000];

function parseAmountToInt(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const normalized = raw.replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return NaN;
  const num = Number(normalized);
  if (!Number.isFinite(num)) return NaN;
  if (num <= 0) return NaN;
  return Math.round(num);
}

// Professional Standard QRIS Branding Assets (Merged into the component)
function QRISImage({ baseQRIS, amount, merchantName, nmid }) {
  const [qrSrc, setQrSrc] = useState(null);
  const [error, setError] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");

  useEffect(() => {
    if (!baseQRIS) {
        setError(true);
        return;
    }

    setError(false);
    setDebugInfo("");

    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted && !qrSrc) { 
        setError(true);
        setDebugInfo("QR Generation Delay");
      }
    }, 10000);

    try {
        const dynamicQRIS = generateDynamicQRIS(baseQRIS, amount);
        QRCode.toDataURL(dynamicQRIS, {
            margin: 1,
            width: 1000,
            color: { dark: '#000000', light: '#ffffff' }
        })
        .then(url => {
            if (!isMounted) return;
            clearTimeout(timer);
            setQrSrc(url);
            setError(false);
        })
        .catch(err => {
            if (!isMounted) return;
            clearTimeout(timer);
            setError(true);
            setDebugInfo(err.message);
        });
    } catch (e) {
        clearTimeout(timer);
        setError(true);
        setDebugInfo(e.message);
    }

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [baseQRIS, amount]);

  if (!qrSrc && !error) {
    return (
        <div className="w-full flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-[3rem] p-12 min-h-[400px]">
            <RefreshCcw className="w-12 h-12 mb-4 text-rose-500 animate-spin opacity-40" />
            <p className="text-[12px] font-black text-rose-400 uppercase tracking-[0.2em]">Securing Connection...</p>
        </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-white flex flex-col items-center p-0 rounded-[3.5rem] shadow-[0_32px_64px_-16px_rgba(225,29,72,0.15)] border-4 border-rose-50 overflow-hidden ring-8 ring-white">
        {/* Dominant Red Branding Header */}
        <div className="w-full bg-rose-600 p-8 flex justify-between items-center relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 -translate-y-1/2 translate-x-1/2 rounded-full blur-3xl opacity-20" />
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 translate-y-1/2 -translate-x-1/2 rounded-full blur-3xl opacity-20" />
           
           {/* QRIS Logo from Media */}
           <div className="bg-white p-3 rounded-2xl shadow-lg relative z-10">
              <img src="/media/qris.png" alt="QRIS" className="h-8 w-auto object-contain" />
           </div>

           {/* GPN Logo from Media */}
           <div className="bg-white p-3 rounded-2xl shadow-lg relative z-10 scale-110">
              <img src="/media/Gerbang_Pembayaran_Nasional_logo.svg" alt="GPN" className="h-8 w-auto object-contain" />
           </div>
        </div>

        {/* Diagonal Decorators */}
        <div className="absolute top-[120px] left-0 w-24 h-24 bg-rose-600 -rotate-45 -translate-x-1/2 translate-y-0 z-0 opacity-100 shadow-xl" />
        <div className="absolute bottom-0 right-0 w-24 h-24 bg-rose-600 -rotate-45 translate-x-1/2 translate-y-0 z-0 opacity-100 shadow-xl" />

        {/* Merchant Identification Section */}
        <div className="text-center pt-8 pb-6 px-10 relative z-10 w-full">
          <h4 className="text-2xl font-black text-slate-900 uppercase italic tracking-tight mb-2 drop-shadow-sm">{merchantName}</h4>
          <div className="inline-flex flex-col gap-1 items-center bg-slate-50 px-6 py-2 rounded-2xl border border-slate-100/50">
            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest break-all">NMID: {nmid || 'ID1020000000000'}</p>
            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.25em]">TERMINAL ID: {Math.random().toString(36).substring(2, 9).toUpperCase()}</p>
          </div>
        </div>

        {/* The Core: Dynamic QR Code Container */}
        <div className="relative w-[300px] aspect-square border-4 border-slate-50 rounded-[2.5rem] p-4 bg-white shadow-2xl flex items-center justify-center mb-10 group transition-all ring-12 ring-slate-50/50">
            {qrSrc ? (
              <img src={qrSrc} alt="SCAN QRIS" className="w-full h-full object-contain mix-blend-multiply" />
            ) : (
              <div className="text-rose-500 text-[10px] font-black uppercase text-center p-8">
                 <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
                 Failed to render QR<br/>{debugInfo}
              </div>
            )}
        </div>

        {/* Compliance Footer (Vibrant Red) */}
        <div className="text-center space-y-3 relative z-10 mt-auto pb-10 w-full flex flex-col items-center">
          <div className="px-8 py-2 bg-rose-600 rounded-full shadow-lg shadow-rose-200">
             <p className="text-[10px] font-black text-white uppercase tracking-[0.4em]">SATU QRIS UNTUK SEMUA</p>
          </div>
          <div>
            <p className="text-[8px] font-bold text-rose-900/40 uppercase tracking-widest text-center px-12 leading-relaxed">
              Cek aplikasi penyelenggara di: <span className="text-rose-600 italic">www.aspi-qris.id</span><br/>
              Ditetapkan oleh Bank Indonesia
            </p>
          </div>

          <div className="flex gap-4 mt-4 opacity-10">
             {[1,2,3,4,5].map(i => <div key={i} className="w-6 h-6 rounded-lg bg-rose-900" />)}
          </div>
        </div>
    </div>
  );
}

export default function OrdersPage() {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  
  // Data State
  const [menus, setMenus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentShift, setCurrentShift] = useState(null);
  const [storeConfig, setStoreConfig] = useState(null);
  const [taxRate, setTaxRate] = useState(0);
  const [serviceRate, setServiceRate] = useState(0);
  
  // Custom Hooks Integration
  const { 
    cart, setCart, addToCart, updateQty, updateItemNotes, resetCart, calculateTotal, generateCartItemId 
  } = useCart(taxRate, serviceRate);

  const {
    isCheckoutOpen, setIsCheckoutOpen, processing, setProcessing,
    paymentMethod, setPaymentMethod, paymentMethodId, setPaymentMethodId,
    moneyReceived, setMoneyReceived, note, setNote, customerName, setCustomerName,
    discount, setDiscount, discountType, setDiscountType, resetCheckoutState, 
    performCheckout, savePending
  } = useCheckout();

  // Component UI State
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [completedOrder, setCompletedOrder] = useState(null);
  const [allActivePMs, setAllActivePMs] = useState(defaultPaymentMethods);
  const [isStartShiftOpen, setIsStartShiftOpen] = useState(false);
  const [startingCash, setStartingCash] = useState("");
  const [isQRISModalOpen, setIsQRISModalOpen] = useState(false);
  const [isQRISCancelConfirmOpen, setIsQRISCancelConfirmOpen] = useState(false);
  const [qrisOrderData, setQrisOrderData] = useState(null);
  const [qrisPM, setQrisPM] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [isPendingListOpen, setIsPendingListOpen] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [deleteTargetOrder, setDeleteTargetOrder] = useState(null);
  const [confirmCancelPendingId, setConfirmCancelPendingId] = useState(null);
  const [editingNoteItem, setEditingNoteItem] = useState(null);
  const [tempNote, setTempNote] = useState("");
  const [isDeletingPending, setIsDeletingPending] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelReasonOpen, setIsCancelReasonOpen] = useState(false);

  const { isFocusMode } = useFocusMode();
  const { connectionStatus, device, reconnect, connect } = usePrinter();

  // Initialization & Data Loading
  const loadPendingOrders = useCallback(async () => {
    try {
      const res = await api.get("/orders/pending");
      setPendingOrders(res);
    } catch (e) {
      console.error("Failed to load pending orders", e);
      toastError("Failed to load pending orders");
    }
  }, [toastError]);

  const loadData = useCallback(async () => {
    const cacheKey = "pos_init_cache";
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const res = JSON.parse(cached);
        setMenus(res.menus || []);
        setCategories(res.categories || []);
        setPlatforms(res.platforms || []);
        setAllActivePMs((res?.paymentMethods?.length || 0) > 0 ? res.paymentMethods : defaultPaymentMethods);
        setCurrentUser(res?.user || null); 
        setCurrentShift(res?.currentShift || null);
        setLoading(false);
      } catch (e) { console.warn("POS: Invalid cache", e); }
    } else { setLoading(true); }

    try {
      const res = await api.get("/pos/init");
      if (res) {
        setMenus(res.menus || []);
        setCategories(res.categories || []);
        setPlatforms(res.platforms || []);
        setAllActivePMs((res?.paymentMethods?.length || 0) > 0 ? res.paymentMethods : defaultPaymentMethods);
        setCurrentUser(res?.user || null); 
        setCurrentShift(res?.currentShift || null);
        localStorage.setItem(cacheKey, JSON.stringify(res));

        if (res.storeConfig) {
          setStoreConfig(res.storeConfig);
          setTaxRate(res.storeConfig.tax_rate || 0);
          setServiceRate(res.storeConfig.service_charge || 0);
        }

        if (!res.currentShift && localStorage.getItem("is_viewing_report") !== "true") {
          setIsStartShiftOpen(true);
        }
        
        if (res.platforms?.length > 0) {
          const defaultPlatform = res.platforms.find(plat => plat.name?.toLowerCase() === "take away") || res.platforms[0];
          setSelectedPlatform(defaultPlatform?.id?.toString() || "");
        }
      }
    } catch (e) {
      console.error("Failed to load POS data", e);
      if (e.response?.status === 401) window.location.href = "/login";
      else toastError("Failed to load data: " + (e.response?.data?.error || e.message));
    } finally { setLoading(false); }
  }, [toastError]);

  useEffect(() => {
    loadData();
    loadPendingOrders();
    const interval = setInterval(loadPendingOrders, 15000);
    return () => clearInterval(interval);
  }, [loadData, loadPendingOrders]);

  const refetchPaymentMethods = async () => {
    try {
      const res = await api.get("/payment-methods");
      const activePMs = res.filter(pm => pm.is_active);
      setAllActivePMs(activePMs.length > 0 ? activePMs : defaultPaymentMethods);
      if (paymentMethodId) {
        const updated = activePMs.find(pm => pm.id === paymentMethodId);
        if (updated) { setPaymentMethod(updated.name); setQrisPM(updated); }
      }
    } catch (e) { console.error("Failed to refetch PMs", e); }
  };

  const getPrice = useCallback((menu) => {
    if (!selectedPlatform) return menu.price;
    if (menu.prices && menu.prices[selectedPlatform]) return menu.prices[selectedPlatform];
    return menu.price;
  }, [selectedPlatform]);

  // Derived Values
  const { subtotal, appliedDiscount, amountAfterDiscount, taxAmount, serviceAmount, total } = useMemo(() => 
    calculateTotal(discount, discountType), [calculateTotal, discount, discountType]
  );

  const platform = useMemo(() => platforms.find(p => p.id.toString() === selectedPlatform), [platforms, selectedPlatform]);
  const isDelivery = platform?.type === "DELIVERY";

  const displayedPMs = useMemo(() => {
    if (isDelivery) return [
      ...allActivePMs.filter(pm => pm.type === 'CASH'),
      { id: 'platform', name: platform.name, type: 'PLATFORM' }
    ];
    return allActivePMs;
  }, [allActivePMs, isDelivery, platform]);

  const currentPM = useMemo(() => displayedPMs.find(pm => String(pm.id) === String(paymentMethodId)), [displayedPMs, paymentMethodId]);
  const change = useMemo(() => (parseAmountToInt(moneyReceived) || total) - total, [moneyReceived, total]);

  // Automatic PM selection based on platform
  useEffect(() => {
    if (!platform || displayedPMs.length === 0) return;
    if (isDelivery) {
      setPaymentMethod(platform.name);
      setPaymentMethodId('platform');
    } else {
      const current = displayedPMs.find(pm => pm.id === paymentMethodId);
      if (!current || paymentMethodId === 'platform') {
        const defaultPM = displayedPMs.find(pm => pm.type === 'CASH') || displayedPMs[0];
        if (defaultPM) { setPaymentMethod(defaultPM.name); setPaymentMethodId(defaultPM.id); }
      }
    }
  }, [selectedPlatform, isDelivery, platform, displayedPMs, paymentMethodId, setPaymentMethod, setPaymentMethodId]);

  // Handlers
  // Prevent accidental page refresh when cart is not empty
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (cart.length > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [cart]);

  const handleProcess = () => {
    if (cart.length === 0) return;
    if (!currentShift) { toastError("Start a shift first."); return; }
    refetchPaymentMethods();
    setIsCheckoutOpen(true);
  };

  const handleCheckout = async () => {
    try {
      const discountRate = discount ? parseFloat(discount) : 0;
      const res = await performCheckout({
        cart, total, taxRate, taxAmount, serviceRate, serviceAmount,
        selectedPlatform, currentOrderId, currentPM, appliedDiscount, discountRate
      });
      
      if (res) {
        if (currentPM?.type === "QRIS") {
          const fullPM = allActivePMs.find(pm => pm.id === paymentMethodId);
          setQrisPM(fullPM);
          setQrisOrderData(res);
          setIsQRISModalOpen(true);
        } else {
          setCompletedOrder(res);
          success(`Order ${res.order_number} settled!`);
        }
        resetCart(); resetCheckoutState(); setIsCheckoutOpen(false); loadPendingOrders();
      }
    } catch (e) { toastError(e.response?.data?.error || "Failed to process order"); }
  };

  const handleSaveHold = async () => {
    try {
      const discountRate = discount ? parseFloat(discount) : 0;
      await savePending({ cart, selectedPlatform, currentOrderId, appliedDiscount, discountRate });
      resetCart(); resetCheckoutState(); setIsCheckoutOpen(false); success("Order held."); loadPendingOrders();
    } catch (e) { toastError(e.response?.data?.error || "Failed to hold order"); }
  };

  const handleResumeOrder = (order) => {
    const newCart = order.orderItems.map(item => ({
      cartItemId: generateCartItemId(),
      menu_id: item.menu_id,
      name: item.menu?.name || 'Unknown',
      price: item.price,
      qty: item.qty,
      note: item.note || "",
      categoryId: item.menu?.categoryId
    }));
    setCart(newCart);
    if (order.platform_id) setSelectedPlatform(order.platform_id.toString());
    setCustomerName(order.customer_name || "");
    setNote(order.note || "");
    setDiscountType(order.discount_type || "FIXED");
    setDiscount(order.discount_rate?.toString() || order.discount?.toString() || "");
    setPaymentMethod(order.payment_method || "CASH");
    setPaymentMethodId(order.payment_method_id);
    setCurrentOrderId(order.id);
    setIsPendingListOpen(false);
  };

  const handleStatusChange = async (pin) => {
    if (!deleteTargetOrder) return;
    setIsDeletingPending(true);
    try {
      await api.patch(`/orders/${deleteTargetOrder.id}/status`, { 
        status: "CANCELLED", 
        pin, 
        reason: cancelReason 
      });
      success(`Order cancelled`);
      loadPendingOrders();
      if (currentOrderId === deleteTargetOrder.id) resetCart();
      setIsPinDialogOpen(false); 
      setDeleteTargetOrder(null);
      setCancelReason("");
    } catch (err) { toastError(err.response?.data?.error || "Cancel failed"); }
    finally { setIsDeletingPending(false); }
  };

  const handleStartShift = async () => {
    const amount = parseAmountToInt(startingCash);
    if (isNaN(amount) || amount < 0) { toastError("Enter valid cash."); return; }
    setProcessing(true);
    try {
      const res = await api.post("/shifts/start", { user_id: currentUser.id, starting_cash: amount });
      setCurrentShift(res); setIsStartShiftOpen(false); success("Shift started!");
      window.dispatchEvent(new Event('shift-status-changed'));
    } catch (e) { toastError(e.response?.data?.error || "Failed to start"); }
    finally { setProcessing(false); }
  };

  const filteredMenus = useMemo(() => {
    const list = selectedCategory === "ALL" ? menus : menus.filter(m => m.categoryId === selectedCategory);
    return list.sort((a, b) => (a.category?.name || "").localeCompare(b.category?.name || "") || a.name.localeCompare(b.name));
  }, [menus, selectedCategory]);

  if (loading && menus.length === 0) return <div className="h-screen flex items-center justify-center font-black uppercase tracking-[0.5em] text-slate-400">Syncing POS Station...</div>;

  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-12 gap-4 pb-2 relative transition-all duration-300",
      isFocusMode ? "h-[100dvh] p-2" : "h-auto md:h-[calc(100dvh-128px)]"
    )}>

      {/* LEFT: Menu Grid */}
      <div className={cn(
        "md:col-span-7 lg:col-span-8 flex flex-col min-h-0 glass-card p-3 lg:p-6 overflow-hidden transition-all shrink-0",
        isFocusMode ? "h-[380px] sm:h-[450px]" : "h-full"
      )}>
        {/* Category Tabs */}
        <div className="flex space-x-2 overflow-x-auto pb-3 scrollbar-hide shrink-0">
          <button onClick={() => setSelectedCategory("ALL")} className={cn("px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl border transition-all", selectedCategory === "ALL" ? "bg-slate-900 text-white shadow-xl scale-105" : "bg-white/50 text-slate-400 border-slate-100 hover:text-slate-900")}>ALL</button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={cn("px-8 py-3 text-[10px] font-black uppercase tracking-widest rounded-2xl border transition-all", selectedCategory === cat.id ? "shadow-xl scale-105" : "bg-white/50 border-slate-100")} style={selectedCategory === cat.id ? { backgroundColor: cat.color, color: '#fff' } : { color: cat.color }}>{cat.name}</button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className={cn("grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pt-4 flex-1 content-start", isFocusMode ? "max-h-[350px]" : "max-h-none")}>
          {filteredMenus.map((menu) => {
            const price = getPrice(menu);
            const qty = cart.filter(i => i.menu_id === menu.id).reduce((s, i) => s + i.qty, 0);
            return (
              <button key={menu.id} onClick={() => addToCart(menu, price)} className={cn("relative w-full text-left bg-white/40 border transition-all p-3 flex flex-col justify-between rounded-2xl aspect-square shadow-sm hover:shadow-xl hover:-translate-y-1 group", qty > 0 ? "border-emerald-500 bg-emerald-50/50" : "border-white hover:border-emerald-300")}>
                <div className="absolute left-0 top-0 bottom-0 w-1.5 opacity-60" style={{ backgroundColor: menu.category?.color }} />
                <div>
                   <h3 className="text-sm font-black text-slate-800 leading-tight uppercase mb-1">{menu.name}</h3>
                   <span className="text-[10px] bg-slate-900/5 px-2 py-0.5 rounded text-slate-500 font-bold uppercase">{menu.category?.name}</span>
                </div>
                <div className="flex justify-between items-end">
                   <div className="text-lg font-black text-emerald-600 font-mono italic">{formatIDR(price)}</div>
                   {qty > 0 && <div className="bg-rose-500 text-white text-[10px] font-black w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-lg">{qty}</div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Cart Section */}
      <div className="md:col-span-5 lg:col-span-4 flex flex-col min-h-0 h-full gap-4">
        <div className="flex-1 glass-card flex flex-col overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-emerald-600" /> ORDER SUMMARY</h3>
             <button onClick={() => setIsPendingListOpen(true)} className="relative p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-all">
                <Clock className="w-5 h-5" />
                {pendingOrders.length > 0 && <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">{pendingOrders.length}</span>}
             </button>
          </div>

          <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                <ShoppingBag className="w-16 h-16 mb-4" />
                <span className="text-[10px] font-black uppercase tracking-widest text-center">Protocol Idle...</span>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.cartItemId} className="p-3 bg-white border border-slate-100 rounded-2xl space-y-2 group">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-black text-xs uppercase tracking-tight line-clamp-1">{item.name}</div>
                      <div className="text-[9px] font-bold text-slate-400 font-mono">{formatIDR(item.price)} {item.note && <span className="text-amber-500">- {item.note}</span>}</div>
                    </div>
                    <button onClick={() => updateQty(item.cartItemId, -item.qty)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border">
                      <button onClick={() => updateQty(item.cartItemId, -1)} className="hover:text-emerald-600"><Minus className="w-3 h-3" /></button>
                      <span className="text-[11px] font-black w-6 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.cartItemId, 1)} className="hover:text-emerald-600"><Plus className="w-3 h-3" /></button>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={() => { setEditingNoteItem(item); setTempNote(item.note || ""); }} className={cn("p-1.5 rounded-lg border", item.note ? "bg-amber-100 border-amber-200 text-amber-600" : "bg-white text-slate-300")}><FileText className="w-3 h-3" /></button>
                       <div className="text-xs font-black text-slate-900 font-mono">{formatIDR(item.price * item.qty)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 border-t border-slate-100 space-y-4 bg-white shrink-0">
             <div className="space-y-1">
                <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest"><span>SUBTOTAL</span><span>{formatIDR(subtotal)}</span></div>
                {appliedDiscount > 0 && <div className="flex justify-between text-[9px] font-black text-rose-500 uppercase tracking-widest"><span>PROMO</span><span>-{formatIDR(appliedDiscount)}</span></div>}
                <div className="flex justify-between text-[9px] font-black text-slate-300 uppercase tracking-widest border-t pt-1"><span>TOTAL PAYABLE</span><span className="text-lg text-emerald-600">{formatIDR(total)}</span></div>
             </div>
             <Button className="w-full h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20" disabled={cart.length === 0 || !currentShift} onClick={handleProcess}>
                {!currentShift ? "SHIFTS INACTIVE" : "AUTHORIZE SETTLEMENT"}
             </Button>
          </div>
        </div>
      </div>

      {/* Modals & Dialogs */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-xl p-0 rounded-[2.5rem] overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
            <div><p className="text-emerald-400 text-[9px] font-black uppercase mb-1">TOTAL AMOUNT</p><p className="text-3xl font-black italic tabular-nums font-mono">{formatIDR(total)}</p></div>
            <div className="text-right"><p className="text-slate-400 text-[9px] font-black uppercase mb-1 italic">PAYMENT PORTAL</p><CreditCard className="w-8 h-8 ml-auto opacity-50" /></div>
          </div>
          <form className="p-8 space-y-8 max-h-[70dvh] overflow-y-auto scrollbar-hide">
            <div className="grid grid-cols-2 gap-4">
               <div><Label className="text-[9px] font-black uppercase text-slate-400">Platform</Label><Select className="h-11" value={selectedPlatform} onChange={e => setSelectedPlatform(e.target.value)} options={platforms.map(p => ({ value: p.id, label: p.name }))} /></div>
               <div><Label className="text-[9px] font-black uppercase text-slate-400">Customer</Label><Input placeholder="GUEST NAME" className="h-11 uppercase font-bold" value={customerName} onChange={e => setCustomerName(e.target.value)} /></div>
            </div>
            <div className="space-y-4">
               <Label className="text-[9px] font-black uppercase text-slate-400">Settlement Method</Label>
               <div className="grid grid-cols-4 gap-2">
                 {displayedPMs.map(pm => (
                   <button key={pm.id} type="button" onClick={() => { setPaymentMethod(pm.name); setPaymentMethodId(pm.id); }} className={cn("h-20 border rounded-2xl flex flex-col items-center justify-center transition-all p-2", paymentMethodId === pm.id ? "bg-slate-900 text-white border-slate-900 shadow-xl" : "bg-white border-slate-100 hover:bg-slate-50")}>
                      <span className="text-[10px] font-black uppercase text-center line-clamp-2">{pm.name}</span>
                   </button>
                 ))}
               </div>
            </div>
            {currentPM?.type === "CASH" && (
               <div className="bg-slate-50 p-6 rounded-3xl space-y-4 border">
                  <div className="flex justify-between items-center font-black text-[10px] uppercase text-slate-400"><span>Cash Tendered</span><span className={change >= 0 ? "text-emerald-600" : "text-rose-500"}>Change: {formatIDR(change)}</span></div>
                  <Input type="number" className="h-14 text-3xl font-black text-center font-mono" value={moneyReceived} onChange={e => setMoneyReceived(e.target.value)} placeholder="0" />
                  <div className="grid grid-cols-4 gap-2">
                    {quickMoneyButtons.map(amt => <button key={amt} type="button" onClick={() => setMoneyReceived(amt.toString())} className="h-10 border bg-white rounded-xl text-[10px] font-black hover:bg-emerald-500 hover:text-white transition-all uppercase tracking-tighter">{amt / 1000}k</button>)}
                  </div>
               </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-[9px] font-black uppercase text-slate-400">Special Note</Label><Input className="h-11 uppercase font-bold text-[10px]" value={note} onChange={e => setNote(e.target.value)} placeholder="COOKING INSTRUCTION" /></div>
              <div><div className="flex justify-between items-center mb-1"><Label className="text-[9px] font-black uppercase text-slate-400">Promo</Label></div><Input type="number" className="h-11 text-right font-black" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" /></div>
            </div>
            <div className="flex gap-4 pt-4 border-t">
               <Button type="button" variant="ghost" className="h-14 flex-1 rounded-2xl font-black uppercase text-[10px]" onClick={handleSaveHold}>Hold Order</Button>
               <Button type="button" className="h-14 flex-[2] rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase text-[10px] tracking-[0.2em]" onClick={handleCheckout} disabled={processing || (currentPM?.type === "CASH" && change < 0)}>
                 {processing ? <RefreshCcw className="w-5 h-5 animate-spin" /> : "Authorize & Finalize"}
               </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPendingListOpen} onOpenChange={setIsPendingListOpen}>
        <DialogContent className="max-w-2xl p-0 rounded-[2.5rem] overflow-hidden border-none shadow-2xl">
          <div className="bg-amber-500 p-8 text-white"><h2 className="text-2xl font-black uppercase">Pending Queue</h2><p className="text-[10px] font-black uppercase tracking-widest opacity-60 italic">Async Workstations Archive</p></div>
          <div className="p-8 space-y-4 max-h-[60dvh] overflow-y-auto scrollbar-hide">
            {pendingOrders.map(order => (
               <div key={order.id} className="p-5 border rounded-3xl flex justify-between items-center group hover:border-amber-400 transition-all bg-white shadow-sm">
                  <div>
                    <div className="flex items-center gap-2 mb-1"><span className="bg-slate-900 text-white text-[9px] px-2 py-0.5 rounded-md font-black">{order.order_number}</span><span className="text-[9px] font-bold text-slate-400 uppercase italic">{new Date(order.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></div>
                    <div className="font-black text-slate-800 uppercase tracking-tight">{order.customer_name || "GUEST PATRON"}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase italic mt-0.5">{order.orderItems?.length || 0} Items · {order.platform?.name}</div>
                  </div>
                  <div className="text-right space-y-2">
                    <div className="font-black text-lg tracking-tighter">{formatIDR(order.total - (order.discount || 0))}</div>
                    <div className="flex gap-2">
                       <Button size="icon" variant="ghost" className="h-9 w-9 text-rose-300 hover:text-rose-500 rounded-lg" onClick={() => { setDeleteTargetOrder(order); setIsCancelReasonOpen(true); }}><Trash2 className="w-4 h-4" /></Button>
                       <Button className="h-9 px-6 rounded-xl bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest" onClick={() => handleResumeOrder(order)}>RESUME</Button>
                    </div>
                  </div>
               </div>
            ))}
          </div>
          <DialogFooter className="p-6 bg-slate-50 pt-0"><Button variant="ghost" className="w-full text-slate-300 text-[10px] font-black uppercase tracking-widest" onClick={() => setIsPendingListOpen(false)}>Close Archive</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <PinVerificationModal open={isPinDialogOpen} onClose={() => setIsPinDialogOpen(false)} onSubmit={handleStatusChange} title="Override Check" subtitle="Security clearance for record termination" />
      {completedOrder && <ReceiptPreview isOpen={!!completedOrder} onClose={() => setCompletedOrder(null)} order={completedOrder} config={storeConfig} />}
      
      <Dialog open={isQRISModalOpen} onOpenChange={o => !o ? setIsQRISCancelConfirmOpen(true) : null}>
        <DialogContent className="max-w-md p-0 rounded-[3rem] overflow-hidden border-none shadow-2xl bg-slate-50">
          <div className="p-4 flex flex-col items-center gap-6">
            <div className="w-full">
              <QRISImage 
                baseQRIS={qrisPM?.qris_data} 
                amount={qrisOrderData?.total || 0} 
                merchantName={qrisPM?.account_name || storeConfig?.store_name}
                nmid={qrisPM?.account_number}
              />
            </div>
            
            <div className="px-8 pb-8 w-full space-y-4">
              <div className="flex justify-between items-end bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Total Bill</p>
                   <h3 className="text-3xl font-black italic tracking-tighter font-mono text-slate-900">{formatIDR(qrisOrderData?.total || 0)}</h3>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest leading-none mb-2">Payment</p>
                   <p className="text-xs font-black uppercase text-slate-800">{qrisPM?.name}</p>
                </div>
              </div>

              <Button className="w-full h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 text-white" disabled={processing} onClick={async () => {
                setProcessing(true);
                try {
                  const res = await api.put(`/orders/${qrisOrderData.id}`, { ...qrisOrderData, status: "PAID", items: qrisOrderData.orderItems.map(i => ({ menu_id: i.menu_id, qty: i.qty })) });
                  setIsQRISModalOpen(false); setCompletedOrder(res); success("AUDIT FINALIZED");
                } catch (e) { toastError("COMMUNICATION FAILURE"); }
                finally { setProcessing(false); }
              }}>{processing ? <RefreshCcw className="w-5 h-5 animate-spin mx-auto" /> : "FINALIZE TRANSACTION"}</Button>
              
              <p className="text-[8px] font-bold text-slate-300 text-center uppercase tracking-widest">Transaction is monitored for security compliance</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isStartShiftOpen} onOpenChange={o => !o && !currentShift ? null : setIsStartShiftOpen(o)}>
        <DialogContent className="max-w-md p-0 rounded-[3rem] overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-900 p-12 text-center text-white relative overflow-hidden"><div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-3xl rounded-full" /><p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-2 relative z-10">AUTH ACTIVE</p><h2 className="text-4xl font-black italic uppercase italic tracking-tighter relative z-10">START SHIFT</h2></div>
          <div className="p-12 space-y-8 bg-white">
             <div className="space-y-4"><Label className="text-[10px] font-black uppercase text-slate-400">Starting Liquidity</Label><Input type="number" className="h-20 text-4xl font-black text-center font-mono bg-slate-50 border-none rounded-3xl" value={startingCash} onChange={e => setStartingCash(e.target.value)} placeholder="0" /></div>
             <Button className="w-full h-20 rounded-3xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-[0.3em] shadow-2xl shadow-emerald-500/20" onClick={handleStartShift} disabled={processing || !startingCash}>INITIALIZE STATION</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Note Editing Modal */}
      <Dialog open={!!editingNoteItem} onOpenChange={() => setEditingNoteItem(null)}>
        <DialogContent className="max-w-md p-0 rounded-[2.5rem] overflow-hidden border-none shadow-2xl bg-white">
          <div className="bg-slate-900 p-8 text-center text-white"><h2 className="text-2xl font-black uppercase italic tracking-tighter mb-0.5">Kitchen Note</h2><p className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]">{editingNoteItem?.name}</p></div>
          <div className="p-8 space-y-6">
            <div className="space-y-4"><Label className="text-[10px] font-black uppercase text-slate-400">Cooking Instruction</Label><Input className="h-14 font-bold border-2 focus:border-emerald-500 rounded-2xl uppercase" value={tempNote} onChange={e => setTempNote(e.target.value)} placeholder="e.g. EXTRA SPICY, NO SUGAR" /></div>
            <div className="flex gap-4">
               <Button variant="ghost" className="h-14 flex-1 rounded-2xl font-black uppercase text-[10px]" onClick={() => setEditingNoteItem(null)}>Discard</Button>
               <Button className="h-14 flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase text-[10px] tracking-widest text-white shadow-xl shadow-emerald-500/20" onClick={() => { updateItemNotes(editingNoteItem.cartItemId, tempNote); setEditingNoteItem(null); }}>Commit Note</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancellation Reason Modal */}
      <Dialog open={isCancelReasonOpen} onOpenChange={setIsCancelReasonOpen}>
        <DialogContent className="max-w-md p-0 rounded-[3rem] overflow-hidden border-none shadow-2xl bg-white">
          <div className="bg-rose-600 p-10 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <h2 className="text-3xl font-black italic uppercase tracking-tighter relative z-10">Void Reason</h2>
            <p className="text-[10px] font-black text-rose-100 uppercase tracking-[0.3em] mt-2 relative z-10">Audit documentation required</p>
          </div>
          <div className="p-10 space-y-8">
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase text-slate-400">Why are you cancelling this?</Label>
              <Input 
                className="h-16 text-lg font-bold border-2 focus:border-rose-500 rounded-2xl uppercase placeholder:text-slate-200" 
                value={cancelReason} 
                onChange={e => setCancelReason(e.target.value)} 
                placeholder="e.g. WRONG INPUT / OUT OF STOCK" 
              />
              <div className="flex flex-wrap gap-2 pt-2">
                {["WRONG INPUT", "OUT OF STOCK", "CANCELLED BY GUEST", "TEST ORDER"].map(r => (
                  <button 
                    key={r}
                    onClick={() => setCancelReason(r)}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-[9px] font-black uppercase tracking-tight rounded-lg border text-slate-500 transition-all"
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
               <Button variant="ghost" className="h-16 flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-300" onClick={() => { setIsCancelReasonOpen(false); setDeleteTargetOrder(null); }}>Dismiss</Button>
               <Button 
                className="h-16 flex-[2] rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-slate-200" 
                disabled={!cancelReason}
                onClick={() => { setIsCancelReasonOpen(false); setIsPinDialogOpen(true); }}
               >
                 Next: Manager PIN
               </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
