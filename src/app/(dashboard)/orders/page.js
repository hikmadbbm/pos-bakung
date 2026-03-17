"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Smartphone, Receipt, Clock, Save, AlertCircle, RefreshCcw, ShoppingBag, ChevronRight } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Select } from "../../../components/ui/select";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { useToast } from "../../../components/ui/use-toast";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../../components/ui/dialog";
import { ReceiptPreview } from "../../../components/receipt-preview";
import { useFocusMode } from "../../../lib/focus-mode-context";
import { Maximize2, Minimize2 } from "lucide-react";
import { PinDialog } from "../../../components/pin-dialog";
import { usePrinter } from "../../../lib/printer-context";
import QRCode from "qrcode";
import { generateDynamicQRIS } from "../../../lib/qris";

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

function QRISImage({ baseQRIS, amount, staticImage }) {
  const [qrSrc, setQrSrc] = useState(null);
  const [error, setError] = useState(false);
  const [debugInfo, setDebugInfo] = useState("");

  useEffect(() => {
    console.log("QRISImage: Generating for", { amount, hasBase: !!baseQRIS });
    
    if (!baseQRIS) {
        console.warn("QRISImage: No base QRIS provided, using static image");
        setQrSrc(staticImage);
        setError(false);
        return;
    }

    // Reset error state and debug info at start of new attempt
    setError(false);
    setDebugInfo("");

    let isMounted = true;
    const timer = setTimeout(() => {
      if (isMounted && !qrSrc) { // Note: qrSrc here is still the value from the current render's scope
        console.error("QRISImage: Generation timed out");
        setError(true);
        setQrSrc(staticImage);
        setDebugInfo("Generation timed out");
      }
    }, 5000);

    try {
        const dynamicQRIS = generateDynamicQRIS(baseQRIS, amount);
        console.log("QRISImage: Dynamic string generated", dynamicQRIS.substring(0, 20) + "...");
        
        QRCode.toDataURL(dynamicQRIS, {
            margin: 2,
            width: 512,
            color: {
                dark: '#012345',
                light: '#ffffff'
            }
        })
        .then(url => {
            if (!isMounted) return;
            clearTimeout(timer);
            console.log("QRISImage: QRCode.toDataURL success");
            setQrSrc(url);
            setError(false);
        })
        .catch(err => {
            if (!isMounted) return;
            clearTimeout(timer);
            console.error("QRISImage: QRCode.toDataURL error:", err);
            setError(true);
            setQrSrc(staticImage);
            setDebugInfo(err.message);
        });
    } catch (e) {
        clearTimeout(timer);
        console.error("QRISImage: processing error:", e);
        setError(true);
        setQrSrc(staticImage);
        setDebugInfo(e.message);
    }

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [baseQRIS, amount, staticImage]);

  if (!qrSrc && !error) {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400 text-xs text-center p-4">
            <Smartphone className="w-12 h-12 mb-2 opacity-20 text-emerald-600 animate-pulse" />
            <p>Generating QR Code...</p>
        </div>
    );
  }

  if (!qrSrc && error) {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 text-red-400 text-xs text-center p-4">
            <AlertCircle className="w-12 h-12 mb-2 opacity-20" />
            <p>Failed to generate QR</p>
            {debugInfo && <p className="mt-1 opacity-60 text-[8px]">{debugInfo}</p>}
        </div>
    );
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center">
        <img src={qrSrc} alt="QRIS" className="w-full h-full object-contain" />
        {error && (
            <div className="absolute bottom-0 inset-x-0 bg-red-500/80 text-white text-[8px] py-1 px-2 text-center">
                Using fallback static image
            </div>
        )}
    </div>
  );
}

export default function OrdersPage() {
  const { success, error } = useToast();
  const [menus, setMenus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [mounted, setMounted] = useState(false);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentShift, setCurrentShift] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [isPaymentConfirmOpen, setIsPaymentConfirmOpen] = useState(false);
  const [paymentConfirmData, setPaymentConfirmData] = useState(null);
  
  // Mounted check to prevent SSR auth issues
  useEffect(() => {
    setMounted(true);
    // Assuming getAuth is defined elsewhere or removed if not needed
    // const u = getAuth(); 
    // if (u) setCurrentUser(u);
  }, []);

  const [isStartShiftOpen, setIsStartShiftOpen] = useState(false);
  const [startingCash, setStartingCash] = useState("");

  // Checkout State
  const [allActivePMs, setAllActivePMs] = useState(defaultPaymentMethods);
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [confirmCancelPendingId, setConfirmCancelPendingId] = useState(null);
  const [isQRISModalOpen, setIsQRISModalOpen] = useState(false);
  const [isQRISCancelConfirmOpen, setIsQRISCancelConfirmOpen] = useState(false);
  const [qrisOrderData, setQrisOrderData] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("CASH"); // Legacy string value for older orders
  const [paymentMethodId, setPaymentMethodId] = useState(null); // New link for PM model
  const [moneyReceived, setMoneyReceived] = useState("");
  const [note, setNote] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [discount, setDiscount] = useState("");
  const [discountType, setDiscountType] = useState("FIXED"); // "FIXED" or "PERCENT"
  const { isFocusMode, setIsFocusMode } = useFocusMode();
  const { connectionStatus } = usePrinter();

  // Pending Orders State
  const [pendingOrders, setPendingOrders] = useState([]);
  const [isPendingListOpen, setIsPendingListOpen] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetOrder, setDeleteTargetOrder] = useState(null);
  const [isDeletingPending, setIsDeletingPending] = useState(false);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);

  const loadPendingOrders = useCallback(async () => {
    try {
      const res = await api.get("/orders/pending");
      setPendingOrders(res);
    } catch (e) {
      console.error("Failed to load pending orders", e);
      error("Failed to load pending orders");
    }
  }, [error]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/pos/init");
      if (res) {
        setMenus(res.menus || []);
        setCategories(res.categories || []);
        setPlatforms(res.platforms || []);
        setAllActivePMs((res?.paymentMethods?.length || 0) > 0 ? res.paymentMethods : defaultPaymentMethods);
        setCurrentUser(res?.user || null); 
        setCurrentShift(res?.currentShift || null);
        
        // Show Start Shift dialog if no active shift found
        if (!res.currentShift) {
          setIsStartShiftOpen(true);
        } else {
          setIsStartShiftOpen(false);
        }
      }

      if (res?.platforms?.length > 0) {
        const p = res.platforms;
        const defaultPlatform = p.find(plat => plat.name?.toLowerCase() === "take away") || p[0];
        setSelectedPlatform(defaultPlatform?.id?.toString() || "");
      }
    } catch (e) {
      console.error("Failed to load POS data", e);
      if (e.response?.status === 401) {
        // setAuth(null, null); // Removed as per instruction to replace user/setUser
        window.location.href = "/login";
        return;
      }
      error("Failed to load POS data: " + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => {
    if (mounted) {
      loadData();
    }
    loadPendingOrders();
    // Poll pending orders every 15 seconds
    const interval = setInterval(loadPendingOrders, 15000);
    return () => clearInterval(interval);
  }, [mounted, loadData, loadPendingOrders]); // Added mounted to dependency array

  const [qrisPM, setQrisPM] = useState(null);

  const refetchPaymentMethods = async () => {
    try {
      const res = await api.get("/payment-methods");
      const activePMs = res.filter(pm => pm.is_active);
      setAllActivePMs(activePMs.length > 0 ? activePMs : defaultPaymentMethods);
      
      // Update selected PM if it exists in the new list to refresh its data (like images)
      if (paymentMethodId) {
        const updated = activePMs.find(pm => pm.id === paymentMethodId);
        if (updated) {
          setPaymentMethod(updated.name);
          setQrisPM(updated);
        }
      }
    } catch (e) {
      console.error("Failed to refetch payment methods", e);
    }
  };

  const getPrice = useCallback((menu) => {
    if (!selectedPlatform) return menu.price;
    if (menu.prices && menu.prices[selectedPlatform]) {
      return menu.prices[selectedPlatform];
    }
    return menu.price;
  }, [selectedPlatform]);

  // --- Cart Logic ---

  const addToCart = (menu) => {
    const price = getPrice(menu);
    setCart((prev) => {
      const existing = prev.find((item) => item.menu_id === menu.id);
      if (existing) {
        return prev.map((item) =>
          item.menu_id === menu.id ? { ...item, qty: item.qty + 1, price } : item
        );
      }
      return [...prev, { menu_id: menu.id, name: menu.name, price, qty: 1 }];
    });
  };

  const updateQty = (menuId, delta) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.menu_id === menuId) {
          const newQty = Math.max(0, item.qty + delta);
          return { ...item, qty: newQty };
        }
        return item;
      }).filter((item) => item.qty > 0)
    );
  };

  // Update cart prices when platform changes
  useEffect(() => {
    if (cart.length > 0 && selectedPlatform) {
      setCart(prev => prev.map(item => {
        const menu = menus.find(m => m.id === item.menu_id);
        if (menu) {
          return { ...item, price: getPrice(menu) };
        }
        return item;
      }));
    }
  }, [selectedPlatform, menus, cart.length, getPrice]);

  // Logic: When selectedPlatform changes, filter payment methods
  const platform = platforms.find(p => p.id.toString() === selectedPlatform);
  const isDelivery = platform?.type === "DELIVERY";

  const displayedPMs = isDelivery 
    ? [
        ...allActivePMs.filter(pm => pm.type === 'CASH'),
        { id: 'platform', name: platform.name, type: 'PLATFORM' }
      ]
    : allActivePMs;

  const currentPM = displayedPMs.find(pm => String(pm.id) === String(paymentMethodId));

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const discountRate = discount ? parseFloat(discount) : 0;
  const appliedDiscount = discountType === "PERCENT" 
    ? Math.round(subtotal * (discountRate / 100)) 
    : discountRate;
  const total = Math.max(0, subtotal - appliedDiscount);
  const receivedPreview = currentPM?.type === "CASH" ? parseAmountToInt(moneyReceived) : total;
  const change = Number.isFinite(receivedPreview) ? (receivedPreview - total) : 0;

  useEffect(() => {
    if (!platform || displayedPMs.length === 0) return;

    // For Delivery, force selection of the virtual Platform Payment
    if (isDelivery) {
      setPaymentMethod(platform.name);
      setPaymentMethodId('platform');
    } else {
      // For Offline, if no PM selected or it was the 'platform' virtual one, revert to CASH
      const current = displayedPMs.find(pm => pm.id === paymentMethodId);
      if (!current || paymentMethodId === 'platform') {
        const defaultPM = displayedPMs.find(pm => pm.type === 'CASH') || displayedPMs[0];
        if (defaultPM) {
          setPaymentMethod(defaultPM.name);
          setPaymentMethodId(defaultPM.id);
        }
      }
    }
  }, [selectedPlatform, platforms, isDelivery]); // Removed allActivePMs.length to be more targeted


  const handleProcessPaymentClick = () => {
    if (cart.length === 0) return;
    if (!currentShift) {
      error("You must start a shift before processing orders.");
      return;
    }
    if (!selectedPlatform && platforms.length > 0) {
      const defaultPlatform = platforms.find(plat => plat.name.toLowerCase() === "take away") || platforms[0];
      setSelectedPlatform(defaultPlatform.id.toString());
    }
    refetchPaymentMethods();
    setIsCheckoutOpen(true);
  };

  const requestCheckout = () => {
    if (cart.length === 0) return;
    if (!selectedPlatform) {
      error("Please select a platform");
      return;
    }

    const received =
      currentPM?.type === "CASH"
        ? parseAmountToInt(moneyReceived)
        : total;

    if (!Number.isFinite(received)) {
      error("Invalid amount. Use numbers only (optionally with up to 2 decimals).");
      return;
    }
    if (currentPM?.type === "CASH" && received < total) {
      error("Money received is less than total amount!");
      return;
    }

    performCheckout(received);
  };

  const performCheckout = async (received) => {
    if (cart.length === 0) return;
    if (!selectedPlatform) return;

    setProcessing(true);
    try {
      const payload = {
        platform_id: selectedPlatform,
        items: cart.map((i) => ({ menu_id: i.menu_id, qty: i.qty })),
        payment_method: paymentMethod,
        payment_method_id: paymentMethodId,
        money_received: currentPM?.type === "CASH" ? received : total,
        note,
        customer_name: customerName,
        discount: appliedDiscount,
        discount_type: discountType,
        discount_rate: discountRate,
        status: currentPM?.type === "QRIS" ? "PENDING" : "COMPLETED"
      };
      
      let res;
      if (currentOrderId) {
        res = await api.put(`/orders/${currentOrderId}`, payload);
      } else {
        res = await api.post("/orders", payload);
      }
      
      // If the response doesn't have the relation, we fetch it manually to be sure
      if (currentPM?.type === "QRIS") {
        const fullPM = allActivePMs.find(pm => pm.id === paymentMethodId);
        setQrisPM(fullPM);
        setQrisOrderData(res);
        setIsQRISModalOpen(true);
        success("QR Code ready for scan. Order saved as PENDING.");
      } else {
        setCompletedOrder(res);
        success(`Order ${res.order_number || ''} processed successfully!`);
      }
      
      resetCart();
      setIsCheckoutOpen(false);
      loadPendingOrders();
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.error || "Failed to process order";
      error(msg);
    } finally {
      setProcessing(false);
    }
  };

  const handleSavePending = async () => {
    if (cart.length === 0) return;
    if (!selectedPlatform) {
      error("Please select a platform");
      return;
    }

    setProcessing(true);
    try {
      const payload = {
        platform_id: selectedPlatform,
        items: cart.map((i) => ({ menu_id: i.menu_id, qty: i.qty })),
        payment_method: paymentMethod,
        payment_method_id: paymentMethodId,
        money_received: 0, // Not relevant for pending
        note,
        customer_name: customerName,
        discount: appliedDiscount,
        discount_type: discountType,
        discount_rate: discountRate,
        status: "PENDING"
      };

      if (currentOrderId) {
        await api.put(`/orders/${currentOrderId}`, payload);
      } else {
        await api.post("/orders", payload);
      }

      resetCart();
      setIsCheckoutOpen(false);
      success("Order saved as Pending");
      loadPendingOrders();
    } catch (e) {
      console.error(e);
      error(e.response?.data?.error || "Failed to save pending order");
    } finally {
      setProcessing(false);
    }
  };

  const resetCart = () => {
    setCart([]);
    setMoneyReceived("");
    setNote("");
    setCustomerName("");
    setDiscount("");
    setDiscountType("FIXED");
    setCurrentOrderId(null);
    const defaultPM = displayedPMs.find(pm => pm.type === 'CASH') || displayedPMs[0];
    if (defaultPM) {
      setPaymentMethod(defaultPM.name);
      setPaymentMethodId(defaultPM.id);
    }
  };

  const handleResumeOrder = (order) => {
    // Map orderItems back to cart format
    const newCart = order.orderItems.map(item => ({
      menu_id: item.menu_id,
      name: item.menu.name,
      price: item.price,
      qty: item.qty
    }));
    
    setCart(newCart);
    if (order.platform_id) setSelectedPlatform(order.platform_id.toString());
    setCustomerName(order.customer_name || "");
    setNote(order.note || "");
    const dType = order.discount_type || "FIXED";
    setDiscountType(dType);
    setDiscount(order.discount_rate !== undefined ? order.discount_rate.toString() : (order.discount ? order.discount.toString() : ""));
    setPaymentMethod(order.payment_method || "CASH");
    setPaymentMethodId(order.payment_method_id);
    setCurrentOrderId(order.id);
    setIsPendingListOpen(false);
    success(`Resumed order ${order.order_number}`);
  };

  const handleCancelPendingOrder = (e, order) => {
    e.stopPropagation();
    setDeleteTargetOrder(order);
    setIsDeleteConfirmOpen(true);
  };

  const openPinForCancel = () => {
    if (!deleteTargetOrder) return;
    setIsDeleteConfirmOpen(false);
    setIsPinDialogOpen(true);
  };

  const handleCancelPinVerify = async (pin) => {
    if (!deleteTargetOrder) return;

    setIsDeletingPending(true);
    try {
      await api.patch(`/orders/${deleteTargetOrder.id}/status`, {
        status: "CANCELLED",
        pin
      });
      success(`Order ${deleteTargetOrder.order_number} cancelled`);
      loadPendingOrders();
      if (currentOrderId === deleteTargetOrder.id) {
        resetCart();
      }
      setIsPinDialogOpen(false);
      setDeleteTargetOrder(null);
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Failed to cancel order";
      error(msg);
      throw new Error(msg);
    } finally {
      setIsDeletingPending(false);
    }
  };

  const handleStartShift = async () => {
    if (!currentUser) return;
    const amount = parseAmountToInt(startingCash);
    if (isNaN(amount) || amount < 0) {
      error("Please enter a valid starting cash amount.");
      return;
    }
    
    setProcessing(true);
    try {
      const res = await api.post("/shifts/start", {
        user_id: currentUser.id,
        starting_cash: amount
      });
      setCurrentShift(res);
      setIsStartShiftOpen(false);
      success("Shift started successfully! Ready to take orders.");
    } catch (e) {
      console.error(e);
      error(e.response?.data?.error || "Failed to start shift");
    } finally {
      setProcessing(false);
    }
  };

  const filteredMenus = (selectedCategory === "ALL"
    ? menus 
    : menus.filter(m => m.categoryId === selectedCategory)).sort((a, b) => {
      // Sort by Category Name first
      const catA = a.category?.name || "";
      const catB = b.category?.name || "";
      if (catA < catB) return -1;
      if (catA > catB) return 1;
      
      // Then by Item Name
      return a.name.localeCompare(b.name);
    });

  return (
    <div className={cn(
      "flex flex-col lg:flex-row gap-2 lg:gap-4 pb-2 lg:pb-0 relative transition-all duration-300",
      isFocusMode ? "h-[100dvh] p-2" : "h-[calc(100dvh-140px)] lg:h-[calc(100dvh-100px)]"
    )}>

      {/* LEFT: Menu Grid */}
      <div className="flex-[2.5] flex flex-col min-h-0 glass-card p-4 lg:p-6 order-2 lg:order-1 h-full overflow-hidden">
        {/* Category Tabs */}
        <div className="flex space-x-2 sm:space-x-3 overflow-x-auto pb-4 lg:pb-6 mb-2 scrollbar-hide shrink-0 px-2">
          <button 
            onClick={() => setSelectedCategory("ALL")}
            className={cn(
              "px-6 py-2 text-[10px] font-black tracking-widest rounded-xl transition-all duration-300 whitespace-nowrap uppercase border",
              selectedCategory === "ALL" 
                ? "bg-slate-900 text-white border-slate-900 shadow-xl scale-105" 
                : "bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-900"
            )}
          >
            All Collections
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-6 py-2 text-[10px] font-black tracking-widest rounded-xl transition-all duration-300 whitespace-nowrap uppercase border",
                selectedCategory === cat.id 
                  ? "shadow-xl scale-105" 
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
              )}
              style={selectedCategory === cat.id 
                ? { backgroundColor: cat.color, borderColor: cat.color, color: '#fff' } 
                : { borderColor: `${cat.color}40`, color: cat.color }
              }
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto pr-2 pb-6 custom-scrollbar">
          {loading ? (
            <div className="col-span-full flex flex-col items-center justify-center py-32 space-y-4">
               <RefreshCcw className="w-12 h-12 text-emerald-600 animate-spin" />
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Inventory Sync in progress...</p>
            </div>
          ) : filteredMenus.map((menu) => {
            const currentPrice = getPrice(menu);
            const inCart = cart.find(i => i.menu_id === menu.id);
            return (
              <button
                key={menu.id}
                className={cn(
                  "relative w-full text-left bg-white border border-slate-100 rounded-2xl transition-all duration-300 active:scale-95 focus:outline-none group overflow-hidden",
                  "p-3 sm:p-4 h-32 sm:h-40 flex flex-col justify-between items-start",
                  inCart 
                    ? "ring-2 ring-emerald-500 bg-emerald-50/30 shadow-xl shadow-emerald-500/10" 
                    : "hover:shadow-2xl hover:shadow-slate-200 hover:-translate-y-1 hover:border-emerald-200"
                )}
                onClick={() => addToCart(menu)}
                aria-label={`Add ${menu.name} to cart, price ${formatIDR(currentPrice)}`}
              >
                {/* Visual Category Accent */}
                <div 
                  className="absolute top-0 left-0 w-1.5 h-full opacity-60 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: menu.category?.color || '#cbd5e1' }}
                />
                
                <div className="w-full">
                  <div className="text-[8px] font-black uppercase tracking-widest mb-1 text-slate-400 group-hover:text-emerald-500 transition-colors">
                    {menu.category?.name || 'Item'}
                  </div>
                  <h3 className="text-xs sm:text-sm lg:text-base font-black text-slate-900 leading-tight line-clamp-2 uppercase tracking-tight">
                    {menu.name}
                  </h3>
                </div>
                
                <div className="w-full flex justify-between items-end mt-auto">
                  <div className="text-xs font-black text-emerald-600">
                    {formatIDR(currentPrice)}
                  </div>
                  {inCart && (
                    <div className="flex items-center justify-center bg-emerald-600 text-white w-7 h-7 rounded-lg shadow-lg shadow-emerald-500/40 animate-in zoom-in duration-300">
                      <span className="text-[10px] font-black">{inCart.qty}</span>
                    </div>
                  )}
                </div>

                {/* Hover Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-500/0 via-emerald-500/0 to-emerald-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Cart & Checkout */}
      {/* On Mobile: Sticky Bottom Bar or Toggleable Drawer. For simplicity, let's keep it visible but collapsible or fixed height? 
          Better approach for POS mobile: 
          - Cart is usually a bottom sheet or a toggle.
          - Here, let's make it a fixed bottom bar that expands, or just a section that stacks on top/bottom.
          - Current layout: Flex Row on Desktop, Flex Col on Mobile.
      */}
      <div className="lg:flex-1 flex flex-col min-h-0 gap-6 order-1 lg:order-2 shrink-0 lg:h-full">
        
        {/* Cart Section */}
        <div className="flex-1 glass-card flex flex-col overflow-hidden lg:h-full max-h-[45dvh] lg:max-h-none transition-all duration-500 shadow-2xl">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-600" /> ACTIVE ORDER
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm">
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full animate-pulse",
                  connectionStatus === "connected" ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]" :
                  connectionStatus === "connecting" ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)]" :
                  "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]"
                )} />
                <span className={cn(
                  connectionStatus === "connected" ? "text-emerald-700" :
                  connectionStatus === "connecting" ? "text-amber-700" :
                  "text-rose-700"
                )}>
                  {connectionStatus}
                </span>
              </div>

              <button 
                onClick={() => setIsPendingListOpen(true)} 
                className="relative p-2 hover:bg-white rounded-xl transition-all group"
              >
                <Clock className="w-5 h-5 text-slate-400 group-hover:text-emerald-600" />
                {pendingOrders.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg border-2 border-white ring-1 ring-rose-600/20">
                    {pendingOrders.length}
                  </span>
                )}
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0 custom-scrollbar">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-4 py-12">
                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center border border-dashed border-slate-200">
                   <ShoppingBag className="w-8 h-8 opacity-20" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Cart awaiting input...</span>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.menu_id} className="flex justify-between items-center p-3 sm:p-4 rounded-2xl border border-slate-100 hover:border-emerald-200 bg-white group transition-all duration-300">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="font-black text-xs sm:text-sm text-slate-900 truncate leading-tight uppercase tracking-tight">{item.name}</div>
                    <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{formatIDR(item.price)}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Qty Controls */}
                    <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-100">
                      <button 
                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-100" 
                        onClick={() => updateQty(item.menu_id, -1)}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-xs font-black text-slate-900 tracking-tighter">{item.qty}</span>
                      <button 
                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-100" 
                        onClick={() => updateQty(item.menu_id, 1)}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button 
                      className="h-10 w-10 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" 
                      onClick={() => updateQty(item.menu_id, -item.qty)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-6 bg-slate-50/80 border-t border-slate-100 space-y-4 shrink-0 backdrop-blur-md">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Gross Value</span>
                <span>{formatIDR(subtotal)}</span>
              </div>
              <div className="flex justify-between text-2xl font-black text-slate-900 tracking-tighter">
                <span>TOTAL</span>
                <span className="text-emerald-600">{formatIDR(total)}</span>
              </div>
            </div>
            
            <Button 
              size="lg" 
              className={cn(
                "w-full h-14 font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all duration-500 rounded-2xl",
                !currentShift ? "bg-slate-200 text-slate-400 grayscale" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30"
              )} 
              disabled={cart.length === 0 || !currentShift}
              onClick={handleProcessPaymentClick}
            >
              {!currentShift ? (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  SHIFTS OFFLINE
                </>
              ) : (
                `CONFIRM & SETTLE`
              )}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Checkout & Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[75dvh] overflow-y-auto pr-1">
          <div className="text-center border-b pb-4">
            <div className="text-sm text-gray-500">Total Amount</div>
            <div className="text-3xl font-bold text-emerald-600">{formatIDR(total)}</div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-500 uppercase font-bold">Order Source</Label>
            <Select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              options={platforms.map(p => ({ value: p.id, label: p.name }))}
            />
          </div>

          <div className="space-y-2 hidden md:block">
            <Label className="text-xs text-gray-500 uppercase font-bold">Customer</Label>
            <Input 
              placeholder="Customer Name (Optional)..." 
              className="text-sm"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
             <Label className="text-xs text-gray-500 uppercase font-bold">Payment Method</Label>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
               {displayedPMs.map(pm => {
                 const isSelected = paymentMethodId === pm.id;
                 return (
                   <button
                     key={pm.id}
                     className={cn(
                       "flex flex-col items-center justify-center p-2 sm:p-3 rounded border text-xs transition-colors h-16 sm:h-20 break-words text-center",
                       isSelected 
                         ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-200" 
                         : "bg-white text-gray-600 hover:bg-gray-50"
                     )}
                     onClick={() => {
                        setPaymentMethod(pm.name);
                        setPaymentMethodId(pm.id);
                     }}
                   >
                     <span className="font-bold truncate w-full">{pm.name}</span>
                     <span className="text-[10px] opacity-70 mt-1">{pm.type.replace('_', ' ')}</span>
                   </button>
                 );
               })}
             </div>
          </div>

          {currentPM && (currentPM.description || currentPM.imageUrl || currentPM.account_number) && (
            <div className="bg-emerald-50 p-4 rounded border border-emerald-100 flex flex-col items-center gap-3">
              <div className="text-center">
                <div className="text-[10px] text-emerald-600 font-bold mb-1">Transfer Total</div>
                <div className="text-xl font-bold text-emerald-900 font-mono">{formatIDR(total)}</div>
              </div>

              {currentPM.imageUrl && (
                 <div className="w-32 h-32 bg-white p-2 rounded shadow-sm border border-emerald-100">
                   <img src={currentPM.imageUrl} alt="Payment Instruction" className="w-full h-full object-contain" />
                 </div>
              )}
              
              {currentPM.description && (
                <p className="text-xs text-emerald-800 text-center whitespace-pre-wrap italic">{currentPM.description}</p>
              )}
              
              {currentPM.account_number && (
                <div className="w-full space-y-2">
                  <div className="text-[10px] text-emerald-600 font-bold px-1">Payment Target</div>
                  <div className="text-xs font-mono bg-white px-3 py-2.5 rounded border border-emerald-100 flex justify-between items-center shadow-sm">
                    <div>
                      {currentPM.account_name && <div className="text-gray-400 text-[10px] mb-0.5">{currentPM.account_name}</div>}
                      <div className="font-bold text-emerald-900 tracking-wider">{currentPM.account_number}</div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" 
                      onClick={() => {
                        navigator.clipboard.writeText(currentPM.account_number);
                        success("Account number copied!");
                      }}
                    >
                      <Save className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {currentPM?.type === "CASH" && (
            <div className="space-y-2 bg-gray-50 p-4 rounded border">
              <div className="space-y-1">
                <Label className="text-xs">Money Received</Label>
                <Input 
                  type="number" 
                  value={moneyReceived}
                  onChange={(e) => setMoneyReceived(e.target.value)}
                  placeholder="Enter amount..."
                  className="text-right font-mono text-base sm:text-lg h-10"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {quickMoneyButtons.map(amt => {
                  const isDisabled = amt < total;
                  return (
                    <button
                      key={amt}
                      disabled={isDisabled}
                      className={cn(
                        "px-1 py-2 border rounded text-xs font-medium transition-colors",
                        isDisabled 
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200" 
                          : "bg-white hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200"
                      )}
                      onClick={() => setMoneyReceived(amt.toString())}
                    >
                      {amt / 1000}k
                    </button>
                  );
                })}
              </div>
              <div className="flex justify-between items-center pt-3 mt-2 border-t border-gray-200">
                <span className="text-sm font-medium">Change Due:</span>
                <span className={cn("text-xl font-bold", change < 0 ? "text-red-500" : "text-green-600")}>
                  {formatIDR(change)}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <Label className="text-xs text-gray-500 uppercase font-bold">Discount</Label>
              <div className="flex items-center gap-2">
                <div className="flex border rounded overflow-hidden h-10 sm:h-8">
                  <button
                    type="button"
                    className={cn(
                      "px-3 text-xs font-bold transition-colors",
                      discountType === "FIXED" ? "bg-emerald-600 text-white" : "bg-white text-gray-400 hover:bg-gray-50"
                    )}
                    onClick={() => setDiscountType("FIXED")}
                  >
                    Rp
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "px-3 text-xs font-bold transition-colors",
                      discountType === "PERCENT" ? "bg-emerald-600 text-white" : "bg-white text-gray-400 hover:bg-gray-50"
                    )}
                    onClick={() => setDiscountType("PERCENT")}
                  >
                    %
                  </button>
                </div>
                <Input 
                  type="number" 
                  className="h-10 sm:h-8 w-full sm:w-24 text-right text-base sm:text-sm font-mono" 
                  placeholder="0"
                  value={discount} 
                  onChange={e => setDiscount(e.target.value)}
                />
              </div>
            </div>
            <Input 
              placeholder="Order Notes (Optional)..." 
              className="text-base sm:text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="pt-4 flex flex-col gap-2 sm:flex-row sm:gap-3">
             <Button variant="outline" className="w-full sm:flex-1" onClick={() => setIsCheckoutOpen(false)}>Cancel</Button>
             <Button 
               type="button"
               variant="secondary" 
               className="w-full sm:flex-1 bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100" 
               onClick={handleSavePending}
               disabled={processing}
             >
               <Save className="w-4 h-4 mr-2" />
               Save Pending
             </Button>
          <Button 
  className="w-full sm:flex-[2] font-bold text-md" 
  disabled={processing || (currentPM?.type === "CASH" && (parseInt(moneyReceived)||0) < total)}
  onClick={requestCheckout} // <-- Ubah dari handleCheckout ke requestCheckout
>
  {processing ? "Processing..." : (currentOrderId ? "Update & Pay" : "Complete Payment")}
</Button>
          </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pending Orders List Dialog */}
      <Dialog open={isPendingListOpen} onOpenChange={setIsPendingListOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              Pending Orders ({pendingOrders.length})
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-3 py-2">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-10 text-gray-400 bg-gray-50 rounded-lg border border-dashed">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p>No pending orders</p>
              </div>
            ) : (
              pendingOrders.map(order => (
                <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-emerald-600">{order.order_number}</span>
                      <span className="text-xs text-gray-500">{new Date(order.date).toLocaleString()}</span>
                    </div>
                    {order.customer_name && (
                      <div className="text-sm font-medium text-gray-800">
                        Customer: {order.customer_name}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      {order.orderItems?.length || 0} items • {order.platform?.name}
                    </div>
                    {order.note && (
                      <div className="text-xs bg-yellow-50 text-yellow-700 px-2 py-1 rounded inline-block mt-1">
                        Note: {order.note}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right space-y-2 shrink-0">
                    <div className="font-bold text-lg">{formatIDR(Math.max(0, order.total - (order.discount || 0)))}</div>
                    <div className="flex flex-col sm:flex-row gap-2 justify-end">
                      {confirmCancelPendingId === order.id ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-xs text-gray-500 mr-1 font-bold">Cancel?</span>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="h-8 px-3 text-xs" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelPendingOrder(e, order);
                              setConfirmCancelPendingId(null);
                            }}
                          >
                            Yes
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-3 text-xs" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmCancelPendingId(null);
                            }}
                          >
                            No
                          </Button>
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="destructive"
                          aria-label={`Cancel ${order.order_number}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmCancelPendingId(order.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                      <Button size="sm" className="w-full sm:w-auto" onClick={() => handleResumeOrder(order)}>
                        Resume Order
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPendingListOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteConfirmOpen}
        onOpenChange={(open) => {
          setIsDeleteConfirmOpen(open);
          if (!open) setDeleteTargetOrder(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Cancel Pending Order
            </DialogTitle>
            <DialogDescription>
              {deleteTargetOrder?.order_number
                ? `This will cancel ${deleteTargetOrder.order_number} and remove it from Pending Orders.`
                : "This will cancel this pending order and remove it from Pending Orders."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteConfirmOpen(false);
                setDeleteTargetOrder(null);
              }}
              disabled={isDeletingPending}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={openPinForCancel} disabled={isDeletingPending}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PinDialog
        isOpen={isPinDialogOpen}
        onClose={(open) => {
          setIsPinDialogOpen(open);
          if (!open) setDeleteTargetOrder(null);
        }}
        onVerify={handleCancelPinVerify}
        title={`Authorize Cancel Order`}
      />

      <Button
        variant="outline"
        size="icon"
        className="absolute bottom-4 left-4 z-50 h-10 w-10 rounded-full bg-white shadow-md"
        onClick={() => setIsFocusMode(!isFocusMode)}
      >
        {isFocusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
      </Button>

      {/* Receipt Preview Dialog */}
      {completedOrder && (
        <ReceiptPreview 
          isOpen={!!completedOrder} 
          onClose={() => setCompletedOrder(null)} 
          order={completedOrder} 
        />
      )}

      {/* QRIS Scan Modal */}
      <Dialog 
        open={isQRISModalOpen} 
        onOpenChange={(open) => {
          if (!open) {
            setIsQRISCancelConfirmOpen(true);
          } else {
            setIsQRISModalOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center font-bold text-xl">Scan QRIS to Pay</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            <div className="text-center">
              <div className="text-sm text-gray-500 font-bold mb-1 tracking-tight">Total Payment</div>
              <div className="text-3xl font-mono font-bold text-emerald-600">{formatIDR(qrisOrderData?.total || 0)}</div>
            </div>

            <div className="w-64 h-64 bg-white p-3 rounded-xl border-4 border-emerald-50 shadow-xl relative overflow-hidden group flex items-center justify-center">
              <QRISImage 
                baseQRIS={qrisPM?.qris_data} 
                amount={qrisOrderData?.total || 0} 
                staticImage={qrisPM?.imageUrl}
              />
            </div>

            <div className="text-center space-y-1">
              <p className="font-bold text-gray-800">{qrisPM?.name}</p>
              {qrisPM?.account_name && <p className="text-xs text-gray-500 uppercase tracking-wider">{qrisPM.account_name}</p>}
            </div>

            <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-lg text-center w-full">
              <p className="text-[10px] text-yellow-700 font-medium">Please ensure the customer has successfully scanned and completed the payment before proceeding.</p>
            </div>

            <Button 
              className="w-full h-12 text-lg font-bold shadow-lg shadow-emerald-100 mt-2"
              disabled={processing}
              onClick={async () => {
                setProcessing(true);
                try {
                  // Update order status to COMPLETED
                  const res = await api.put(`/orders/${qrisOrderData.id}`, {
                    ...qrisOrderData,
                    status: "COMPLETED",
                    items: qrisOrderData.orderItems.map(i => ({ menu_id: i.menu_id, qty: i.qty }))
                  });
                  setIsQRISModalOpen(false);
                  setCompletedOrder(res);
                  success("Payment confirmed & Order completed!");
                } catch (e) {
                  console.error(e);
                  error("Failed to complete order. Please try again.");
                } finally {
                  setProcessing(false);
                }
              }}
            >
              {processing ? "Confirming..." : "Confirmed & Print Receipt"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* QRIS Cancel Confirmation Dialog */}
      <Dialog open={isQRISCancelConfirmOpen} onOpenChange={setIsQRISCancelConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="w-5 h-5" />
              Unconfirmed Payment
            </DialogTitle>
            <DialogDescription className="pt-2 text-gray-600">
              Payment hasn't been confirmed yet. If you close this, the order will stay as <span className="font-bold text-gray-900">PENDING</span> and won't be recorded in the history.
              <br /><br />
              Are you sure you want to close the QRIS scan?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsQRISCancelConfirmOpen(false)}
            >
              Go Back to QRIS
            </Button>
            <Button 
              variant="destructive"
              className="flex-1"
              onClick={() => {
                setIsQRISCancelConfirmOpen(false);
                setIsQRISModalOpen(false);
                success("QRIS scanner closed. Order remains PENDING.");
              }}
            >
              Yes, Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Start Shift Dialog */}
      <Dialog open={isStartShiftOpen} onOpenChange={(open) => {
        if (!open && !currentShift) return;
        setIsStartShiftOpen(open);
      }}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
          <div className="bg-emerald-600 p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Clock className="w-32 h-32 -rotate-12" />
            </div>
            <div className="relative z-10 text-center py-4">
              <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.2em] mb-2">POS SECURITY PROTOCOL</p>
              <h2 className="text-4xl font-black tracking-tighter">START SHIFT</h2>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold">
                  {currentUser?.name || 'Personnel'}
                </div>
                <div className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-bold">
                  {new Date().toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-8 space-y-8 bg-white">
            <div className="space-y-4">
              <div className="flex justify-between items-end px-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Initial Drawer Fund (IDR)</Label>
                <p className="text-[10px] font-bold text-emerald-600">REQUIRED</p>
              </div>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 font-black group-focus-within:text-emerald-500 transition-colors">Rp</div>
                <Input 
                  type="text"
                  placeholder="0"
                  className="h-20 pl-14 pr-6 text-3xl font-black tracking-tight bg-slate-50 border-slate-100 focus:border-emerald-500 focus:ring-emerald-500/10 rounded-[2rem] transition-all"
                  value={startingCash}
                  onChange={(e) => setStartingCash(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartShift()}
                />
              </div>
              <div className="flex gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                 <AlertCircle className="w-5 h-5 text-slate-400 shrink-0" />
                 <p className="text-[10px] text-slate-500 font-medium leading-relaxed italic">
                   Input the verified opening cash amount. This will be used to calculate daily discrepancy at checkout.
                 </p>
              </div>
            </div>

            <Button 
              className="w-full h-16 rounded-[1.5rem] bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-[0.1em] text-sm shadow-xl shadow-emerald-500/20 transition-all active:scale-95 group"
              onClick={handleStartShift}
              disabled={processing || !startingCash}
            >
              {processing ? (
                <RefreshCcw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  INITIALIZE SYSTEM <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
            
            <div className="flex flex-col items-center gap-2">
               <button 
                onClick={() => window.location.href = '/'} // Fallback if they want to exit
                className="text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
               >
                 Cancel Session & Exit
               </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
