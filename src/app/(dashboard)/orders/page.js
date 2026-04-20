"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { api } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Button } from "../../../components/ui/button";
import { Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Smartphone, Receipt, Clock, Save, AlertCircle, RefreshCcw, ShoppingBag, Maximize2, FileText, X } from "lucide-react";

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
const KITCHEN_QUICK_TAGS_FOOD = ["PEDAS", "MEDIUM", "TIDAK PEDAS", "BUNGKUS", "PISAH KUAH", "EKSTRA BAKSO", "NO SAYUR"];
const KITCHEN_QUICK_TAGS_DRINK = ["DINGIN", "PANAS", "LESS SUGAR", "NORMAL ICE", "EKSTRA ES", "NO SUGAR", "MANIS", "ASIN"];

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
  const { t } = useTranslation();
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
        width: 400,
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
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-slate-50 rounded-[2rem] p-8 min-h-[300px]">
        <RefreshCcw className="w-8 h-8 mb-4 text-rose-500 animate-spin opacity-40" />
        <p className="text-xs font-black text-rose-500 uppercase tracking-[0.2em]">{t('qris.generating') || 'Generating QR Code...'}</p>
      </div>
    );
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="relative w-full h-full bg-white flex flex-col items-center p-0 rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden ring-1 ring-slate-100">
      {/* Clean Minimalist Header */}
      <div className="w-full bg-slate-50 p-8 flex flex-col items-center relative border-b border-slate-100">
        {/* Logos Side-by-Side Tight */}
        <div className="flex items-center gap-6 px-10 py-5">
          <img src="/media/qris.png" alt="QRIS" className="h-10 w-auto object-contain" />
          <div className="w-0.5 h-8 bg-slate-200 rounded-full" />
          <img src="/media/Gerbang_Pembayaran_Nasional_logo.svg" alt="GPN" className="h-10 w-auto object-contain" />
        </div>

        <div className="mt-2 text-center relative z-10">
           <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight leading-tight">{merchantName}</h4>
           <div className="inline-block mt-2 px-3 py-1 bg-slate-100 rounded-lg border border-slate-200">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{nmid}</p>
           </div>
        </div>
      </div>

      <div className="mt-10 mb-2 text-center px-10 relative z-10">
         <p className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] mb-1">{t('qris.total_payment')}</p>
         <h1 className="text-5xl font-black text-rose-600 italic tracking-tighter drop-shadow-sm">
           {formatIDR(amount)}
         </h1>
      </div>

      {/* The Core: Dynamic QR Code Container */}
      <div className="relative flex-1 flex items-center justify-center w-full px-10 py-8">
        <div className="relative w-full max-w-[280px] aspect-square border-[6px] border-slate-50 rounded-[3rem] p-4 bg-white shadow-inner flex items-center justify-center z-10 transition-transform hover:scale-105 duration-500">
          {qrSrc ? (
            <img src={qrSrc} alt="SCAN QR" className="w-full h-full object-contain mix-blend-multiply" />
          ) : (
            <div className="text-rose-500 text-xs font-black uppercase text-center p-4">
              {t('common.error')}
            </div>
          )}
        </div>
      </div>

      {/* Simplified Standard Footer */}
      <div className="w-full p-8 text-center space-y-4 bg-slate-50 border-t border-slate-100 flex flex-col items-center relative">
        <div className="px-6 py-2 bg-slate-200 rounded-xl">
          <p className="text-xs font-black text-slate-600 uppercase tracking-[0.4em]">{t('qris.one_for_all')}</p>
        </div>
        <div className="max-w-[240px]">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center leading-relaxed">
            {t('qris.footer_text')} <span className="text-slate-700 font-black">{timeStr}</span> DAN TANGGAL <span className="text-slate-700 font-black">{dateStr}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const { t } = useTranslation();
  const { success, error: toastError, confirm } = useToast();

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
    tableNumber, setTableNumber,
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
  const [isPaymentInfoOpen, setIsPaymentInfoOpen] = useState(false);
  const [isQRISCancelConfirmOpen, setIsQRISCancelConfirmOpen] = useState(false);
  const [paymentOrderData, setPaymentOrderData] = useState(null);
  const [paymentMethodInfo, setPaymentMethodInfo] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [isPendingListOpen, setIsPendingListOpen] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [currentOrderNumber, setCurrentOrderNumber] = useState("");
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

  // Promotion Engine State
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [appliedPromos, setAppliedPromos] = useState([]);

  // Derived Values & Platform Logic
  const platform = useMemo(() => platforms.find(p => p.id.toString() === selectedPlatform), [platforms, selectedPlatform]);
  const isDelivery = platform?.type === "DELIVERY";

  const getPrice = useCallback((menu) => {
    if (!selectedPlatform) return menu.price;
    if (menu.prices && menu.prices[selectedPlatform]) return menu.prices[selectedPlatform];
    return menu.price;
  }, [selectedPlatform]);

  const { subtotal, appliedDiscount, amountAfterDiscount, taxAmount, serviceAmount, total } = useMemo(() =>
    calculateTotal(discount, discountType, promoDiscount), [calculateTotal, discount, discountType, promoDiscount]
  );

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
        if (defaultPM) { 
          setPaymentMethod(defaultPM.name); 
          setPaymentMethodId(defaultPM.id); 
        }
      }
    }
  }, [selectedPlatform, isDelivery, platform, displayedPMs, paymentMethodId, setPaymentMethod, setPaymentMethodId]);

  // Handle Automatic Price Refresh when platform changes
  useEffect(() => {
    if (!selectedPlatform || menus.length === 0 || cart.length === 0) return;
    
    setCart(prev => prev.map(item => {
      const menu = menus.find(m => m.id === item.menu_id);
      if (!menu) return item;
      
      // Get the correct price for the NEW selected platform
      let newPrice = menu.price;
      if (menu.prices && menu.prices[selectedPlatform]) {
        newPrice = menu.prices[selectedPlatform];
      }
      
      // Only update if the price is different to avoid unnecessary re-renders
      if (item.price === newPrice) return item;
      return { ...item, price: newPrice };
    }));
  }, [selectedPlatform, menus]); // We don't include cart here to avoid infinite loop, setCart functional update keeps it safe

  // Auto-evaluate promotions
  useEffect(() => {
    if (cart.length === 0) {
      setPromoDiscount(0);
      setAppliedPromos([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.post("/promo/evaluate", {
          items: cart,
          subtotal,
          platform_id: selectedPlatform,
          payment_method: paymentMethod,
          order_type: null,
        });
        setPromoDiscount(res.totalDiscount || 0);
        setAppliedPromos(res.appliedPromos || []);
      } catch (e) {
        console.error("Promo evaluation failed", e);
      }
    }, 500); // debounce

    return () => clearTimeout(timer);
  }, [cart, subtotal, selectedPlatform, paymentMethod]);

  // Initialization & Data Loading
  const loadPendingOrders = useCallback(async () => {
    try {
      const res = await api.get("/orders/pending");
      setPendingOrders(res);
    } catch (e) {
      console.error("Failed to load pending orders", e);
      toastError(t('common.error_load'));
    }
  }, [toastError, t]);

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
        if (res.storeConfig) {
          setStoreConfig(res.storeConfig);
          setTaxRate(res.storeConfig.tax_rate || 0);
          setServiceRate(res.storeConfig.service_charge || 0);
        }
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
      else {
        const detail = e.response?.data?.details || e.response?.data?.error || e.message;
        toastError("Failed to load data: " + detail);
      }
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
        if (updated) { setPaymentMethod(updated.name); setPaymentMethodInfo(updated); }
      }
    } catch (e) { console.error("Failed to refetch PMs", e); }
  };


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
    if (!currentShift) { toastError(t('shift.starting_cash_help')); return; }
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
        if (currentPM?.type === "QRIS" || currentPM?.type === "BANK_TRANSFER" || currentPM?.type === "E_WALLET") {
          const fullPM = allActivePMs.find(pm => pm.id === paymentMethodId);
          setPaymentMethodInfo(fullPM);
          setPaymentOrderData(res);
          setIsPaymentInfoOpen(true);
        } else {
          setCompletedOrder(res);
          success(`${t('pos.total_payable')} ${res.order_number} ${t('common.done')}`);
        }
        resetCart(); resetCheckoutState(); setIsCheckoutOpen(false); loadPendingOrders();
      }
    } catch (e) { toastError(e.response?.data?.error || t('common.error')); }
  };

  const handleSaveHold = async () => {
    try {
      const discountRate = discount ? parseFloat(discount) : 0;
      await savePending({ cart, selectedPlatform, currentOrderId, appliedDiscount, discountRate });
      resetCart(); resetCheckoutState(); setIsCheckoutOpen(false); success(t('pos.pending_queue')); loadPendingOrders();
    } catch (e) { toastError(e.response?.data?.error || t('common.error')); }
  };

  const handleResumeOrder = (order) => {
    const newCart = order.orderItems.map(item => ({
      cartItemId: generateCartItemId(),
      menu_id: item.menu_id,
      name: item.menu?.name || 'Unknown',
      price: item.price,
      qty: item.qty,
      note: item.note || "",
      categoryId: item.menu?.categoryId,
      categoryType: item.menu?.category?.type || "FOOD"
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
    setCurrentOrderNumber(order.order_number || "");
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
      success(t('orders.status_updated'));
      loadPendingOrders();
      if (currentOrderId === deleteTargetOrder.id) {
        resetCart();
        setCurrentOrderId(null);
        setCurrentOrderNumber("");
      }
      setIsPinDialogOpen(false);
      setDeleteTargetOrder(null);
      setCancelReason("");
    } catch (err) { toastError(err.response?.data?.error || t('common.error')); }
    finally { setIsDeletingPending(false); }
  };

  const handleStartShift = async () => {
    const amount = parseAmountToInt(startingCash);
    if (isNaN(amount) || amount < 0) { toastError(t('shift.enter_starting_cash')); return; }
    setProcessing(true);
    try {
      const res = await api.post("/shifts/start", { user_id: currentUser.id, starting_cash: amount });
      setCurrentShift(res); setIsStartShiftOpen(false); success(t('shift.started'));
      window.dispatchEvent(new Event('shift-status-changed'));
    } catch (e) { toastError(e.response?.data?.error || t('common.error')); }
    finally { setProcessing(false); }
  };

  const filteredMenus = useMemo(() => {
    const list = selectedCategory === "ALL" ? menus : menus.filter(m => m.categoryId === selectedCategory);
    return list.sort((a, b) => (a.category?.name || "").localeCompare(b.category?.name || "") || a.name.localeCompare(b.name));
  }, [menus, selectedCategory]);

  if (loading && menus.length === 0) return <div className="h-screen flex items-center justify-center font-black uppercase tracking-[0.5em] text-slate-400">{t('pos.syncing')}</div>;

  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-12 gap-4 pb-2 relative",
      isFocusMode ? "h-screen p-2 overflow-hidden" : "h-auto md:h-[calc(100dvh-128px)]"
    )}>

      {/* LEFT: Menu Grid */}
      <div className={cn(
        "md:col-span-7 lg:col-span-8 flex flex-col min-h-0 glass-card p-3 lg:p-6 overflow-hidden transition-all shrink-0",
        isFocusMode ? "h-[380px] sm:h-[450px]" : "h-full"
      )}>
        {/* Category Tabs */}
        <div className="flex space-x-2 overflow-x-auto pb-3 scrollbar-hide shrink-0">
          <button onClick={() => setSelectedCategory("ALL")} className={cn("px-5 sm:px-8 py-2.5 sm:py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-2xl border transition-colors", selectedCategory === "ALL" ? "bg-slate-900 text-white shadow-xl" : "bg-white/50 text-slate-500 border-slate-100 hover:text-slate-900")}>{t('common.all')}</button>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={cn("px-5 sm:px-8 py-2.5 sm:py-3 text-[10px] sm:text-xs font-black uppercase tracking-widest rounded-2xl border transition-colors", selectedCategory === cat.id ? "shadow-xl" : "bg-white/50 border-slate-100")} style={selectedCategory === cat.id ? { backgroundColor: cat.color, color: '#fff' } : { color: cat.color }}>{cat.name}</button>
          ))}
        </div>

        {/* Menu Grid - Stable Mobile Grid */}
        <div className={cn(
          "grid grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 overflow-y-auto pt-4 flex-1 content-start scroll-smooth pb-4",
          isFocusMode ? "max-h-[350px]" : "max-h-[460px] sm:max-h-none"
        )}>
          {filteredMenus.map((menu) => {
            const price = getPrice(menu);
            const qty = cart.filter(i => i.menu_id === menu.id).reduce((s, i) => s + i.qty, 0);
            return (
              <button
                key={menu.id}
                onClick={() => addToCart(menu, price)}
                className={cn(
                  "relative w-full text-left bg-white border-2 border-slate-50 transition-all p-3 flex flex-col justify-start rounded-2xl min-h-[110px] h-full shadow-sm hover:shadow-md active:scale-95 group overflow-hidden border-l-4",
                  "hover:border-emerald-200"
                )}
                style={{ borderLeftColor: menu.category?.color || '#cbd5e1' }}
              >
                {qty > 0 && (
                  <div className="absolute top-2 right-2 bg-rose-500 text-white text-[10px] font-black w-7 h-7 rounded-full flex items-center justify-center border-2 border-white shadow-lg z-10">
                    {qty}
                  </div>
                )}
                <div className="flex flex-col gap-1 w-full">
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 leading-tight uppercase line-clamp-2 pr-6">
                    {menu.name} {menu.productType === 'CONSIGNMENT' && <span className="text-amber-600 italic">(Titipan)</span>}
                  </h3>
                  <span className="text-[10px] sm:text-xs bg-slate-900/5 px-2 py-0.5 rounded text-slate-600 font-bold uppercase w-fit">{menu.category?.name}</span>
                  <div className="mt-1">
                    <div className="text-[13px] sm:text-lg font-black text-emerald-700 font-mono italic">{formatIDR(price)}</div>
                  </div>
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
            <div className="flex flex-col gap-0.5">
               <h3 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-emerald-600" /> {t('pos.order_summary')}</h3>
               {currentOrderNumber && <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest pl-6">ID: {currentOrderNumber}</p>}
            </div>
            <div className="flex items-center gap-1">
              {cart.length > 0 && (
                <button 
                  onClick={async () => {
                    const ok = await confirm({
                      title: t('pos.empty_cart') + "?",
                      message: t('pos.cart_empty'),
                      confirmText: t('pos.empty_cart'),
                      cancelText: t('common.back'),
                      variant: "destructive"
                    });
                    
                    if (ok) {
                      resetCart();
                      resetCheckoutState();
                      setCurrentOrderId(null);
                      setCurrentOrderNumber("");
                      success(t('common.success'));
                    }
                  }} 
                  className="p-2 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-all group relative"
                  title="Empty Order"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                  <span className="absolute -bottom-8 right-0 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none uppercase">{t('pos.empty_cart')}</span>
                </button>
              )}
              <button 
                onClick={() => setIsPendingListOpen(true)} 
                className="relative p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                title="Pending Orders"
              >
                <Clock className="w-5 h-5" />
                {pendingOrders.length > 0 && <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">{pendingOrders.length}</span>}
              </button>
            </div>
          </div>

          <div className="flex-1 p-4 space-y-3 overflow-y-auto custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
                <ShoppingBag className="w-16 h-16 mb-4" />
                <span className="text-xs font-black uppercase tracking-widest text-center">{t('pos.cart_empty')}</span>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.cartItemId} className="p-3 bg-white border border-slate-100 rounded-2xl space-y-2 group">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-black text-xs uppercase tracking-tight line-clamp-1">{item.name}</div>
                      <div className="text-[10px] font-bold text-slate-500 font-mono">{formatIDR(item.price)} {item.note && <span className="text-amber-600">- {item.note}</span>}</div>
                    </div>
                    <button onClick={() => updateQty(item.cartItemId, -item.qty)} className="text-slate-300 hover:text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded-lg border">
                      <button onClick={() => updateQty(item.cartItemId, -1)} className="hover:text-emerald-600"><Minus className="w-3 h-3" /></button>
                      <span className="text-xs font-black w-6 text-center">{item.qty}</span>
                      <button onClick={() => updateQty(item.cartItemId, 1)} className="hover:text-emerald-600"><Plus className="w-3 h-3" /></button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setEditingNoteItem(item); setTempNote(item.note || ""); }} className={cn("p-1.5 rounded-lg border shadow-sm", item.note ? "bg-amber-100 border-amber-300 text-amber-700" : "bg-white text-slate-400 hover:text-slate-600")}><FileText className="w-3 h-3" /></button>
                      <div className="text-xs font-black text-slate-900 font-mono">{formatIDR(item.price * item.qty)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-6 border-t border-slate-100 space-y-4 bg-white shrink-0">
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest"><span>{t('pos.subtotal')}</span><span>{formatIDR(subtotal)}</span></div>
              {appliedPromos.length > 0 && (
                <div className="space-y-0.5">
                  {appliedPromos.map(p => (
                    <div key={p.id} className="flex justify-between text-[9px] font-black text-emerald-600 uppercase tracking-widest italic">
                      <span className="flex items-center gap-1"><Zap className="w-2.5 h-2.5" /> {p.name}</span>
                      <span>-{formatIDR(p.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
              {appliedDiscount > (promoDiscount) && <div className="flex justify-between text-[10px] font-black text-rose-600 uppercase tracking-widest"><span>{t('pos.discount')}</span><span>-{formatIDR(appliedDiscount - promoDiscount)}</span></div>}
              {serviceAmount > 0 && <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest"><span>{t('pos.service')} ({serviceRate}%)</span><span>{formatIDR(serviceAmount)}</span></div>}
              {taxAmount > 0 && <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest"><span>{t('pos.tax')} ({taxRate}%)</span><span>{formatIDR(taxAmount)}</span></div>}
              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest border-t pt-1"><span>{t('pos.total_payable')}</span><span className="text-lg text-emerald-700">{formatIDR(total)}</span></div>
            </div>
            <Button className="w-full h-14 rounded-2xl font-black uppercase text-xs tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-500/20" disabled={cart.length === 0 || !currentShift} onClick={handleProcess}>
              {!currentShift ? t('shift.status') : t('pos.authorize_settlement')}
            </Button>
          </div>
        </div>
      </div>

      {/* Modals & Dialogs */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-xl p-0 rounded-[2.5rem] overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
            <div><p className="text-emerald-400 text-[9px] font-black uppercase mb-1">{t('pos.total_payable')}</p><p className="text-3xl font-black italic tabular-nums font-mono">{formatIDR(total)}</p></div>
            <div className="text-right"><p className="text-slate-400 text-[9px] font-black uppercase mb-1 italic">{t('pos.checkout')}</p><CreditCard className="w-8 h-8 ml-auto opacity-50" /></div>
          </div>
          <form className="p-8 space-y-8 max-h-[70dvh] overflow-y-auto scrollbar-hide">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div><Label className="text-[9px] font-black uppercase text-slate-400">{t('orders.type')}</Label><Select className="h-11" value={selectedPlatform} onChange={e => setSelectedPlatform(e.target.value)} options={platforms.map(p => ({ value: p.id, label: p.name }))} /></div>
              <div><Label className={cn("text-[9px] font-black uppercase transition-colors", currentPM?.type === "PAY_LATER" && !customerName.trim() ? "text-rose-500" : "text-slate-400")}>{t('pos.customer_name')} {currentPM?.type === "PAY_LATER" && "*"}</Label><Input placeholder={t('orders.guest')} className={cn("h-11 uppercase font-bold", currentPM?.type === "PAY_LATER" && !customerName.trim() && "border-rose-500 bg-rose-50/50")} value={customerName} onChange={e => setCustomerName(e.target.value)} /></div>
              <div><Label className="text-[9px] font-black uppercase text-slate-400">Table / Reg No</Label><Input placeholder="01" className="h-11 uppercase font-bold" value={tableNumber || ""} onChange={e => setTableNumber(e.target.value)} /></div>
            </div>
            <div className="space-y-4">
              <Label className="text-[9px] font-black uppercase text-slate-400">{t('pos.payment_method')}</Label>
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
                <div className="flex justify-between items-center font-black text-[10px] uppercase text-slate-400"><span>{t('pos.money_received')}</span><span className={change >= 0 ? "text-emerald-600" : "text-rose-500"}>{t('pos.change')}: {formatIDR(change)}</span></div>
                <Input type="number" className="h-14 text-3xl font-black text-center font-mono" value={moneyReceived} onChange={e => setMoneyReceived(e.target.value)} placeholder="0" />
                <div className="grid grid-cols-4 gap-2">
                  {quickMoneyButtons.map(amt => <button key={amt} type="button" onClick={() => setMoneyReceived(amt.toString())} className="h-10 border bg-white rounded-xl text-[10px] font-black hover:bg-emerald-500 hover:text-white transition-all uppercase tracking-tighter">{amt / 1000}k</button>)}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-[9px] font-black uppercase text-slate-400">{t('pos.special_note')}</Label><Input className="h-11 uppercase font-bold text-[10px]" value={note} onChange={e => setNote(e.target.value)} placeholder={t('pos.cooking_instruction')} /></div>
              <div><div className="flex justify-between items-center mb-1"><Label className="text-[9px] font-black uppercase text-slate-400">{t('pos.discount')}</Label></div><Input type="number" className="h-11 text-right font-black" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" /></div>
            </div>
            <div className="flex gap-4 pt-4 border-t">
              <Button type="button" variant="ghost" className="h-14 flex-1 rounded-2xl font-black uppercase text-[10px]" onClick={handleSaveHold}>{t('pos.hold_order')}</Button>
              <Button type="button" className="h-14 flex-[2] rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase text-[10px] tracking-[0.2em] text-white" onClick={handleCheckout} disabled={processing || (currentPM?.type === "CASH" && change < 0) || (currentPM?.type === "PAY_LATER" && !customerName.trim())}>
                {processing ? <RefreshCcw className="w-5 h-5 animate-spin" /> : (currentPM?.type === "PAY_LATER" && !customerName.trim() ? "NAMA WAJIB UNTUK KASBON" : t('pos.authorize_settlement'))}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isPendingListOpen} onOpenChange={setIsPendingListOpen}>
        <DialogContent className="max-w-2xl p-0 rounded-[2.5rem] overflow-hidden border-none shadow-2xl">
          <div className="bg-amber-500 p-8 text-white"><h2 className="text-2xl font-black uppercase">{t('pos.pending_queue')}</h2><p className="text-[10px] font-black uppercase tracking-widest opacity-60 italic">{t('pos.async_archive')}</p></div>
          <div className="p-8 space-y-4 max-h-[60dvh] overflow-y-auto scrollbar-hide">
            {pendingOrders.map(order => (
              <div key={order.id} className="p-5 border rounded-3xl flex justify-between items-center group hover:border-amber-400 transition-all bg-white shadow-sm">
                <div>
                  <div className="flex items-center gap-2 mb-1"><span className="bg-slate-900 text-white text-[9px] px-2 py-0.5 rounded-md font-black">{order.order_number}</span><span className="text-[9px] font-bold text-slate-400 uppercase italic">{new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
                  <div className="font-black text-slate-800 uppercase tracking-tight">{order.customer_name || t('orders.guest')}</div>
                  <div className="text-[9px] font-bold text-slate-400 uppercase italic mt-0.5">{order.orderItems?.length || 0} {t('pos.items')} · {order.platform?.name}</div>
                </div>
                <div className="text-right space-y-2">
                  <div className="font-black text-lg tracking-tighter">{formatIDR(order.total - (order.discount || 0))}</div>
                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" className="h-9 w-9 text-rose-300 hover:text-rose-500 rounded-lg" onClick={() => { setDeleteTargetOrder(order); setIsPinDialogOpen(true); }}><Trash2 className="w-4 h-4" /></Button>
                    <Button className="h-9 px-6 rounded-xl bg-slate-900 text-white font-black text-[9px] uppercase tracking-widest" onClick={() => handleResumeOrder(order)}>{t('pos.resume_order')}</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="p-6 bg-slate-50 pt-0"><Button variant="ghost" className="w-full text-slate-300 text-[10px] font-black uppercase tracking-widest" onClick={() => setIsPendingListOpen(false)}>{t('common.cancel')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <PinVerificationModal open={isPinDialogOpen} onClose={() => setIsPinDialogOpen(false)} onSubmit={handleStatusChange} title={t('orders.cancel_order')} subtitle={t('orders.verification_required')} />
      {completedOrder && <ReceiptPreview isOpen={!!completedOrder} onClose={() => setCompletedOrder(null)} order={completedOrder} config={storeConfig} />}

      <Dialog open={isPaymentInfoOpen} onOpenChange={async (open) => {
        if (!open) {
          const ok = await confirm({
            title: t('pos.hold_order'),
            message: t('pos.move_to_pending_help') || "Move this transaction to the pending queue?",
            confirmText: t('pos.move_to_pending') || "Move to Pending",
            cancelText: t('common.back'),
          });
          if (ok) {
            setIsPaymentInfoOpen(false);
            setCurrentOrderId(null);
            setCurrentOrderNumber("");
            loadPendingOrders();
          }
        }
      }}>
        <DialogContent 
          className="max-w-md p-0 rounded-[3rem] overflow-y-auto max-h-[90vh] border-none shadow-2xl bg-white scrollbar-hide focus:ring-0"
          showCloseButton={true}
          disableBackdropClick={true}
        >
          <div className="flex flex-col items-center">
            <div className="w-full">
              {(paymentMethodInfo?.type === "QRIS" || paymentMethodInfo?.qris_data) ? (
                <QRISImage
                  baseQRIS={paymentMethodInfo?.qris_data}
                  amount={paymentOrderData?.total || 0}
                  merchantName={paymentMethodInfo?.account_name || storeConfig?.store_name}
                  nmid={paymentMethodInfo?.account_number}
                />
              ) : (
                <div className="w-full bg-slate-50 p-10 relative overflow-hidden flex flex-col items-center">
                  {/* Branding Header */}
                  <div className="text-center mb-10 w-full">
                    <div className="inline-block px-5 py-2 bg-slate-900 rounded-full shadow-lg mb-4">
                      <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em]">{paymentMethodInfo?.name}</p>
                    </div>
                    <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">{t('pos.bank_info')}</h2>
                  </div>
                  
                  {/* Main Identifier Card */}
                  <div className="w-full p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-xl flex items-center gap-6 relative z-10 transition-transform hover:scale-[1.02] duration-500">
                    <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100 shrink-0 shadow-inner">
                      {paymentMethodInfo?.imageUrl ? (
                        <img src={paymentMethodInfo.imageUrl} alt={paymentMethodInfo.name} className="w-full h-full object-contain p-3" />
                      ) : (
                        paymentMethodInfo?.type === "BANK_TRANSFER" ? <CreditCard className="w-10 h-10 text-slate-300" /> : <Smartphone className="w-10 h-10 text-slate-300" />
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 leading-none">
                        {paymentMethodInfo?.type === "BANK_TRANSFER" ? "ACCOUNT NUMBER" : "IDENTIFIER"}
                      </p>
                      <h3 className="text-3xl font-black text-slate-900 font-mono tracking-tighter leading-none mb-2">{paymentMethodInfo?.account_number}</h3>
                      <div className="inline-block px-2 py-0.5 bg-emerald-50 rounded-md border border-emerald-100">
                        <p className="text-[11px] font-black text-emerald-600 uppercase italic tracking-tight">{paymentMethodInfo?.account_name}</p>
                      </div>
                    </div>
                  </div>

                  {paymentMethodInfo?.description && (
                    <div className="mt-8 w-full px-8 py-5 rounded-[2rem] bg-slate-100 border border-slate-200">
                      <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed text-center italic tracking-wide">{paymentMethodInfo?.description}</p>
                    </div>
                  )}

                  {/* Decorative element */}
                  <div className="absolute bottom-0 right-0 w-32 h-32 bg-slate-200/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                </div>
              )}
            </div>

            <div className="px-8 py-8 w-full space-y-4 bg-white rounded-t-[3rem] -mt-6 relative z-20 shadow-[0_-20px_40px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between items-center bg-slate-50 px-6 py-5 rounded-[2rem] border border-slate-100">
                <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">{t('pos.total_payable')}</p>
                  <h3 className="text-2xl font-black italic tracking-tighter font-mono text-slate-900">{formatIDR(paymentOrderData?.total || 0)}</h3>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest leading-none mb-2">{t('pos.order_id_label')}</p>
                  <p className="text-sm font-black text-slate-800 uppercase tabular-nums">#{paymentOrderData?.order_number}</p>
                </div>
              </div>

              <Button className="w-full h-16 rounded-[1.5rem] bg-slate-900 hover:bg-black font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-200 text-white text-[11px] group overflow-hidden relative" disabled={processing} onClick={async () => {
                setProcessing(true);
                try {
                  const res = await api.put(`/orders/${paymentOrderData.id}`, { ...paymentOrderData, status: "PAID", items: paymentOrderData.orderItems.map(i => ({ menu_id: i.menu_id, qty: i.qty })) });
                  setIsPaymentInfoOpen(false); setCompletedOrder(res); success(t('common.success'));
                } catch (e) { toastError(t('common.error')); }
                finally { setProcessing(false); }
              }}>
                <div className="absolute inset-0 bg-emerald-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="relative z-10">{processing ? <RefreshCcw className="w-5 h-5 animate-spin mx-auto" /> : t('pos.payment_received')}</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isStartShiftOpen} onOpenChange={setIsStartShiftOpen}>
        <DialogContent className="max-w-md p-0 rounded-[3rem] overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-900 p-12 text-center text-white relative overflow-hidden"><div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-3xl rounded-full" /><p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-2 relative z-10">{t('shift.ready_to_sync')}</p><h2 className="text-4xl font-black italic uppercase tracking-tighter relative z-10 text-white">{t('shift.open_shift')}</h2></div>
          <div className="p-12 space-y-8 bg-white">
            <div className="space-y-4"><Label className="text-[10px] font-black uppercase text-slate-400">{t('shift.starting_liquidity')}</Label><Input type="number" className="h-20 text-4xl font-black text-center font-mono bg-slate-50 border-none rounded-3xl" value={startingCash} onChange={e => setStartingCash(e.target.value)} placeholder="0" /></div>
            <Button className="w-full h-20 rounded-3xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-[0.3em] shadow-2xl shadow-emerald-500/20 text-white" onClick={handleStartShift} disabled={processing || !startingCash}>{t('shift.initialize_session')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Note Editing Modal */}
      <Dialog open={!!editingNoteItem} onOpenChange={() => setEditingNoteItem(null)}>
        <DialogContent className="max-w-md p-0 rounded-[2.5rem] overflow-hidden border-none shadow-2xl bg-white">
          <div className="bg-slate-900 p-8 text-center text-white"><h2 className="text-2xl font-black uppercase italic tracking-tighter mb-0.5">{t('pos.special_note')}</h2><p className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em]">{editingNoteItem?.name}</p></div>
          <div className="p-8 space-y-6">
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase text-slate-400">{t('pos.cooking_instruction')}</Label>
              <Input 
                className="h-14 font-bold border-2 focus:border-emerald-500 rounded-2xl uppercase placeholder:text-slate-200" 
                value={tempNote} 
                onChange={e => setTempNote(e.target.value)} 
                placeholder={t('pos.cooking_instruction')} 
              />
              <div className="flex flex-wrap gap-1.5 pt-2">
                {[
                  ...(editingNoteItem?.categoryType === "FOOD" || editingNoteItem?.categoryType === "BOTH" ? KITCHEN_QUICK_TAGS_FOOD : []),
                  ...(editingNoteItem?.categoryType === "DRINK" || editingNoteItem?.categoryType === "BOTH" ? KITCHEN_QUICK_TAGS_DRINK : [])
                ].map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      const tags = tempNote ? tempNote.split(',').map(t => t.trim()).filter(Boolean) : [];
                      if (tags.includes(tag)) {
                        setTempNote(tags.filter(t => t !== tag).join(', '));
                      } else {
                        setTempNote([...tags, tag].join(', '));
                      }
                    }}
                    className={cn(
                      "px-3 py-1.5 text-[9px] font-black uppercase tracking-tight rounded-lg border transition-all",
                      tempNote.split(',').map(t => t.trim()).includes(tag) 
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-md scale-105" 
                        : "bg-slate-50 hover:bg-slate-100 text-slate-400 border-slate-100"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <Button variant="ghost" className="h-14 flex-1 rounded-2xl font-black uppercase text-[10px]" onClick={() => setEditingNoteItem(null)}>{t('pos.discard')}</Button>
              <Button className="h-14 flex-1 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase text-[10px] tracking-widest text-white shadow-xl shadow-emerald-500/20" onClick={() => { updateItemNotes(editingNoteItem.cartItemId, tempNote); setEditingNoteItem(null); }}>{t('pos.commit_note')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancellation Reason Modal */}
      <Dialog open={isCancelReasonOpen} onOpenChange={setIsCancelReasonOpen}>
        <DialogContent className="max-w-md p-0 rounded-[3rem] overflow-hidden border-none shadow-2xl bg-white">
          <div className="bg-rose-600 p-10 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
            <h2 className="text-3xl font-black italic uppercase tracking-tighter relative z-10">{t('pos.void_reason')}</h2>
            <p className="text-[10px] font-black text-rose-100 uppercase tracking-[0.3em] mt-2 relative z-10">Audit documentation required</p>
          </div>
          <div className="p-10 space-y-8">
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase text-slate-400">Why are you cancelling this?</Label>
              <Input
                className="h-16 text-lg font-bold border-2 focus:border-rose-500 rounded-2xl uppercase placeholder:text-slate-200"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder={t('pos.void_reason')}
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
