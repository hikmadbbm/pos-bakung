"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Smartphone, Receipt, Clock, Save, AlertCircle, RefreshCcw, ShoppingBag, ChevronRight, FileText } from "lucide-react";

import { cn } from "../../../lib/utils";
import { Select } from "../../../components/ui/select";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { useToast } from "../../../components/ui/use-toast";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../../components/ui/dialog";
import { ReceiptPreview } from "../../../components/receipt-preview";
import { useFocusMode } from "../../../lib/focus-mode-context";
import { Maximize2, Minimize2 } from "lucide-react";
import PinVerificationModal from "../../../components/PinVerificationModal";
import { usePrinter } from "../../../lib/printer-context";
import { useTranslation } from "../../../lib/language-context";
import { Skeleton } from "../../../components/ui/skeleton";
import QRCode from "qrcode";
import { generateDynamicQRIS } from "../../../lib/qris";

const defaultPaymentMethods = [
  { id: 1, name: 'CASH', type: 'CASH' },
  { id: 2, name: 'QRIS', type: 'QRIS' }
];

const quickMoneyButtons = [20000, 50000, 100000, 200000];

const DRINK_TAGS = ["LESS SUGAR", "MORE SUGAR", "LESS ICE", "NO ICE", "PISAH GULA", "NORMAL"];
const FOOD_TAGS = ["PEDAS", "TIDAK PEDAS", "EXTRA PEDAS", "TANPA SAYUR", "TANPA BAWANG", "BUNGKUS", "PISAH KUAH", "ASIN", "MANIS"];

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
  const { t } = useTranslation();
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
  const [moneyReceived, setMoneyReceived] = useState("");
  const [taxRate, setTaxRate] = useState(0);
  const [serviceRate, setServiceRate] = useState(0);
  const [paymentMethodId, setPaymentMethodId] = useState(null); // New link for PM model
  const [note, setNote] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [discount, setDiscount] = useState("");
  const [discountType, setDiscountType] = useState("FIXED"); // "FIXED" or "PERCENT"
  const { isFocusMode, setIsFocusMode } = useFocusMode();
  const { connectionStatus, device, reconnect, connect } = usePrinter();

  // Pending Orders State
  const [pendingOrders, setPendingOrders] = useState([]);
  const [isPendingListOpen, setIsPendingListOpen] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetOrder, setDeleteTargetOrder] = useState(null);
  const [isDeletingPending, setIsDeletingPending] = useState(false);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [editingNoteItem, setEditingNoteItem] = useState(null);
  const [tempNote, setTempNote] = useState("");
  const [quickTagsConfig, setQuickTagsConfig] = useState({ FOOD: [], DRINK: [] });
  const [storeConfig, setStoreConfig] = useState(null);

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
    // 1. Try to load from cache for instant UI fill
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
        setLoading(false); // We have cached data, so we can hide initial global loader
      } catch (e) {
        console.warn("POS: Invalid cache", e);
      }
    } else {
      setLoading(true);
    }

    try {
      const res = await api.get("/pos/init");
      if (res) {
        setMenus(res.menus || []);
        setCategories(res.categories || []);
        setPlatforms(res.platforms || []);
        setAllActivePMs((res?.paymentMethods?.length || 0) > 0 ? res.paymentMethods : defaultPaymentMethods);
        setCurrentUser(res?.user || null); 
        setCurrentShift(res?.currentShift || null);
        
        // Update cache
        localStorage.setItem(cacheKey, JSON.stringify(res));

        if (res.storeConfig) {
          setStoreConfig(res.storeConfig);
          setTaxRate(res.storeConfig.tax_rate || 0);
          setServiceRate(res.storeConfig.service_charge || 0);
          if (res.storeConfig.quick_tags) {
            setQuickTagsConfig(res.storeConfig.quick_tags);
          }
        }

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
        window.location.href = "/login";
        return;
      }
      error("Failed to load POS data: " + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  }, [error, defaultPaymentMethods]);

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
  const generateCartItemId = () => Math.random().toString(36).substr(2, 9);

  const addToCart = (menu) => {
    const price = getPrice(menu);
    setCart((prev) => {
      // Find item with same menu_id and EMPTY note (as it's coming from menu grid)
      const existing = prev.find((item) => item.menu_id === menu.id && (!item.note || item.note.trim() === ""));
      if (existing) {
        return prev.map((item) =>
          item.cartItemId === existing.cartItemId ? { ...item, qty: item.qty + 1, price } : item
        );
      }
      return [...prev, { 
        cartItemId: generateCartItemId(),
        menu_id: menu.id, 
        name: menu.name, 
        price, 
        qty: 1, 
        note: "", 
        categoryId: menu.categoryId 
      }];
    });
  };

  /**
   * Updates notes for a specific cart row. 
   * If after editing, multiple rows have same menuId + note, they are merged.
   */
  const updateItemNotes = (cartItemId, newNote) => {
    setCart(prev => {
      const itemToUpdate = prev.find(i => i.cartItemId === cartItemId);
      if (!itemToUpdate) return prev;

      // Create new state with updated note for target item
      const updatedCart = prev.map(item => 
        item.cartItemId === cartItemId ? { ...item, note: newNote } : item
      );

      // Check if we need to merge this updated item with another one
      const mergedCart = [];
      updatedCart.forEach(item => {
        const existing = mergedCart.find(m => m.menu_id === item.menu_id && (m.note || "").trim() === (item.note || "").trim());
        if (existing) {
          existing.qty += item.qty;
        } else {
          mergedCart.push({ ...item });
        }
      });

      return mergedCart;
    });
  };

  const updateQty = (cartItemId, delta) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartItemId === cartItemId) {
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
  
  const amountAfterDiscount = Math.max(0, subtotal - appliedDiscount);
  const taxAmount = Math.round(amountAfterDiscount * (taxRate / 100));
  const serviceAmount = Math.round(amountAfterDiscount * (serviceRate / 100));
  const total = amountAfterDiscount + taxAmount + serviceAmount;

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
        items: cart.map((i) => ({ menu_id: i.menu_id, qty: i.qty, note: i.note })),
        payment_method: paymentMethod,
        payment_method_id: paymentMethodId,
        money_received: currentPM?.type === "CASH" ? received : total,
        note,
        customer_name: customerName,
        discount: appliedDiscount,
        discount_type: discountType,
        discount_rate: discountRate,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        service_rate: serviceRate,
        service_amount: serviceAmount,
        status: currentPM?.type === "QRIS" ? "PENDING" : "PAID"
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
    setIsPinDialogOpen(true);
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
      "grid grid-cols-1 md:grid-cols-12 gap-2 lg:gap-4 pb-2 lg:pb-0 relative transition-all duration-300",
      isFocusMode ? "h-[100dvh] p-2" : "h-[calc(100dvh-140px)] lg:h-[calc(100dvh-100px)]"
    )}>

      {/* LEFT: Menu Grid */}
      <div className="md:col-span-8 lg:col-span-9 flex flex-col min-h-0 glass-card p-3 lg:p-6 h-full overflow-hidden transition-all">
        {/* Category Tabs */}
        <div className="flex space-x-4 overflow-x-auto pb-6 scrollbar-hide shrink-0">
          {loading && categories.length === 0 ? (
            [1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-10 w-32 rounded-2xl" />
            ))
          ) : (
            <>
              <button
                onClick={() => setSelectedCategory("ALL")}
                className={cn(
                  "px-8 py-3 text-[10px] font-black tracking-[0.2em] rounded-2xl transition-all duration-500 whitespace-nowrap uppercase border shadow-sm",
                  selectedCategory === "ALL" 
                    ? "bg-slate-900 text-white border-slate-900 shadow-xl scale-105" 
                    : "bg-white/50 backdrop-blur-md text-slate-400 border-slate-100 hover:border-slate-300 hover:text-slate-900"
                )}
              >
                All Products
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-8 py-3 text-[10px] font-black tracking-[0.2em] rounded-2xl transition-all duration-500 whitespace-nowrap uppercase border shadow-sm",
                    selectedCategory === cat.id 
                      ? "shadow-2xl scale-105 ring-4 ring-offset-2" 
                      : "bg-white/50 backdrop-blur-md text-slate-400 border-slate-100 hover:border-slate-300"
                  )}
                  style={selectedCategory === cat.id 
                    ? { backgroundColor: cat.color, borderColor: cat.color, color: '#fff', '--tw-ring-color': `${cat.color}20` } 
                    : { color: cat.color }
                  }
                >
                  {cat.name}
                </button>
              ))}
            </>
          )}
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-4 overflow-y-auto pr-2 pb-10 custom-scrollbar">
          {loading && menus.length === 0 ? (
            [1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-24 sm:h-auto sm:aspect-square rounded-xl w-full" />
            ))
          ) : filteredMenus.map((menu) => {
            const currentPrice = getPrice(menu);
            const inCart = cart.filter(i => i.menu_id === menu.id).reduce((sum, item) => sum + item.qty, 0);
            return (
              <div key={menu.id} className="aspect-auto sm:aspect-square relative w-full group">
                <button
                  className={cn(
                    "relative sm:absolute sm:inset-0 w-full h-full text-left bg-white/40 backdrop-blur-3xl border transition-all duration-300 active:scale-95 focus:outline-none overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1",
                    "p-2.5 sm:p-5 flex flex-col justify-between items-start rounded-xl",
                    inCart > 0 
                      ? "ring-4 ring-emerald-500/10 bg-emerald-50/50 border-emerald-200" 
                      : "border-white hover:border-emerald-300 hover:bg-white"
                  )}
                  onClick={() => addToCart(menu)}
                >
                  {/* Dynamic Category Indicator */}
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1.5 sm:w-2.5 transition-all duration-300 opacity-40 sm:opacity-60 group-hover:opacity-100"
                    style={{ backgroundColor: menu.category?.color || '#CBD5E1' }}
                  />

                  <div 
                    className="absolute top-0 right-0 w-32 h-32 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 opacity-10 sm:opacity-20 group-hover:opacity-30 transition-all duration-300"
                    style={{ backgroundColor: menu.category?.color || '#CBD5E1' }}
                  />
                  
                  <div className="w-full relative z-10 space-y-0.5 sm:space-y-1">
                    <div className="hidden sm:flex items-center gap-2">
                       <div 
                         className="w-1.5 h-1.5 rounded-full"
                         style={{ backgroundColor: menu.category?.color || '#CBD5E1' }}
                       />
                       <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 group-hover:text-slate-900 transition-colors line-clamp-1">
                         {menu.category?.name || 'GENERIC'}
                       </span>
                    </div>
                    <h3 className="text-[11px] sm:text-lg lg:text-xl font-bold text-slate-800 leading-tight line-clamp-2">
                      {menu.name}
                    </h3>
                  </div>
                  
                  <div className="w-full flex justify-between items-end mt-auto relative z-10 pt-1.5 sm:pt-3 border-t border-slate-100/50 group-hover:border-slate-200 transition-colors">
                    <div className="flex flex-col">
                      <p className="text-[7px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-0 opacity-80">Price</p>
                      <div className="text-[12px] sm:text-lg lg:text-2xl font-bold text-emerald-600 tabular-nums">
                        {formatIDR(currentPrice)}
                      </div>
                    </div>
                    {inCart > 0 && (
                      <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 w-7 h-7 sm:w-10 sm:h-10 bg-gradient-to-br from-rose-400 to-rose-600 text-white rounded-full flex items-center justify-center shadow-[0_5px_15px_-5px_rgba(244,63,94,0.6)] animate-in zoom-in duration-300 border-2 border-white z-20">
                        <span className="text-[10px] sm:text-sm font-black tracking-tighter">{inCart}</span>
                      </div>
                    )}
                  </div>

                </button>
              </div>
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
      <div className="md:col-span-4 lg:col-span-3 flex flex-col min-h-0 gap-6 h-full">
        
        {/* Cart Section */}
        <div className="flex-1 glass-card flex flex-col overflow-hidden lg:h-full max-h-[45dvh] lg:max-h-none transition-all duration-500 shadow-2xl">
          <div className="p-3 lg:p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col gap-3 lg:gap-4 shrink-0">
            <div className="flex justify-between items-center w-full">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-emerald-600" /> Current Order
              </h3>
              {/* Desktop/Large screen buttons side-by-side with header if space permits, but for reliability on iPad we stack below */}
            </div>
            
            <div className="flex items-center gap-2 w-full">
              <button 
                onClick={() => {
                  if (connectionStatus === "disconnected" && device) {
                    reconnect();
                  } else if (connectionStatus === "disconnected") {
                    connect();
                  }
                }}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-100 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95",
                  connectionStatus === "disconnected" && device ? "hover:bg-emerald-50 hover:border-emerald-200 text-emerald-700" : ""
                )}
              >
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  connectionStatus === "connected" ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)] animate-pulse" :
                  connectionStatus === "connecting" ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.6)] animate-bounce" :
                  "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]"
                )} />
                <span className={cn(
                  "truncate",
                  connectionStatus === "connected" ? "text-emerald-700" :
                  connectionStatus === "connecting" ? "text-amber-700" :
                  "text-rose-700"
                )}>
                  {connectionStatus === "disconnected" && device ? "RECONNECT PRINTER" : (connectionStatus?.toUpperCase() || "PRINTER")}
                </span>
              </button>

              <button 
                onClick={() => setIsPendingListOpen(true)} 
                className="flex items-center gap-2 px-3 py-2 bg-amber-50 hover:bg-amber-100 rounded-xl transition-all group border border-amber-100/50 shadow-sm relative min-w-[44px] justify-center"
                title="View Pending Orders"
              >
                <Clock className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                <span className="hidden xs:inline text-[9px] font-black text-amber-700 uppercase tracking-widest">Pending</span>
                {pendingOrders.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-lg border-2 border-white ring-1 ring-rose-600/20">
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
                <div key={item.cartItemId} className="flex flex-col p-4 rounded-2xl border border-slate-100 hover:border-emerald-200 bg-white group transition-all duration-300 gap-4">
                  <div className="flex justify-between items-start w-full">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="font-black text-[13px] sm:text-sm text-slate-900 uppercase tracking-tight leading-tight break-words">{item.name}</div>
                      <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center gap-2">
                        {formatIDR(item.price)}
                        {item.note && <span className="text-amber-600 font-bold italic truncate">- {item.note}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button 
                        onClick={() => {
                          setEditingNoteItem(item);
                          setTempNote(item.note || "");
                        }}
                        className={cn(
                          "h-8 w-8 flex items-center justify-center rounded-xl transition-all relative",
                          item.note ? "bg-amber-100 text-amber-600 animate-in zoom-in duration-300" : "text-slate-300 hover:text-slate-600 hover:bg-slate-50"
                        )}
                        title="Add Request / Tags"
                      >
                        <FileText className="w-4 h-4" />
                        {item.note && <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white shadow-sm" />}
                      </button>
                      <button 
                        className="h-8 w-8 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" 
                        onClick={() => updateQty(item.cartItemId, -item.qty)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    {/* Qty Controls */}
                    <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-100">
                      <button 
                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-100" 
                        onClick={() => updateQty(item.cartItemId, -1)}
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-10 text-center text-xs font-black text-slate-900 tracking-tighter">{item.qty}</span>
                      <button 
                        className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-slate-900 transition-all border border-transparent hover:border-slate-100" 
                        onClick={() => updateQty(item.cartItemId, 1)}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="text-right flex-1">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.qty}x</div>
                      <div className="text-xs font-black text-slate-900">{formatIDR(item.qty * item.price)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-6 bg-slate-50/80 border-t border-slate-100 space-y-3 shrink-0 backdrop-blur-md">
            <div className="space-y-1.5 px-1">
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                <span>SUBTOTAL</span>
                <span>{formatIDR(subtotal)}</span>
              </div>
              
              {appliedDiscount > 0 && (
                <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-rose-500">
                  <span>DISCOUNT</span>
                  <span>-{formatIDR(appliedDiscount)}</span>
                </div>
              )}

              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                <span>TAX ({taxRate}%)</span>
                <span>{formatIDR(taxAmount)}</span>
              </div>
              
              <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                <span>SERVICE ({serviceRate}%)</span>
                <span>{formatIDR(serviceAmount)}</span>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{t('payable')}</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tighter tabular-nums">{formatIDR(total)}</span>
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
        <DialogContent className="max-w-xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white flex flex-col max-h-[90dvh]">
          <div className="bg-slate-900 p-8 text-white relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <CreditCard className="w-24 h-24 -rotate-12" />
            </div>
            <div className="relative z-10 flex justify-between items-center">
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{t('confirm')}</p>
                <h2 className="text-3xl font-black tracking-tight">{t('pay').toUpperCase()}</h2>
              </div>
              <div className="text-right">
                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">{t('payable')}</p>
                <p className="text-3xl font-black text-white">{formatIDR(total)}</p>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8 flex-1 overflow-y-auto min-h-0 scrollbar-hide">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Order Logistics Channel</Label>
                <Select
                  className="h-11 rounded-xl"
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  options={platforms.map(p => ({ value: p.id, label: p.name }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('guest_name')}</Label>
                <Input 
                  placeholder="OPTIONAL CUSTOMER NAME" 
                  className="h-11 rounded-xl uppercase font-bold text-xs"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
               <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Settlement Protocol</Label>
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                 {displayedPMs.map(pm => {
                   const isSelected = paymentMethodId === pm.id;
                   return (
                     <button
                       key={pm.id}
                       className={cn(
                         "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-300 h-24 group relative overflow-hidden",
                         isSelected 
                           ? "bg-slate-900 text-white border-slate-900 shadow-xl scale-105 z-10" 
                           : "bg-white text-slate-500 border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30"
                       )}
                       onClick={() => {
                          setPaymentMethod(pm.name);
                          setPaymentMethodId(pm.id);
                       }}
                     >
                       <span className="font-black text-xs uppercase tracking-tight text-center break-words w-full px-1">{pm.name}</span>
                       <span className={cn("text-[8px] font-medium uppercase tracking-widest mt-1", isSelected ? "text-emerald-400" : "text-slate-400")}>{pm.type.replace('_', ' ')}</span>
                       {isSelected && <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
                     </button>
                   );
                 })}
               </div>
            </div>

            {currentPM && (currentPM.description || currentPM.imageUrl || currentPM.account_number) && (
              <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100/50 space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                       <Banknote className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Bank Transfer Detail</p>
                       <p className="text-xs font-bold text-slate-900 uppercase">{currentPM.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Amount</p>
                    <p className="text-sm font-black text-slate-900 font-mono tracking-tight">{formatIDR(total)}</p>
                  </div>
                </div>

                {currentPM.imageUrl && (
                   <div className="w-full h-48 bg-white p-4 rounded-2xl shadow-inner border border-emerald-100/50 flex items-center justify-center group relative overflow-hidden">
                     <img src={currentPM.imageUrl} alt="Payment Instruction" className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                     <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Maximize2 className="w-8 h-8 text-white opacity-40" />
                     </div>
                   </div>
                )}
                
                {currentPM.account_number && (
                  <div className="w-full bg-white p-4 rounded-2xl border border-emerald-100/50 flex justify-between items-center shadow-sm group">
                    <div>
                      {currentPM.account_name && <div className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{currentPM.account_name}</div>}
                      <div className="font-black text-emerald-900 tracking-[0.1em] text-lg font-mono">{currentPM.account_number}</div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-xl transition-all shadow-sm" 
                      onClick={() => {
                        navigator.clipboard.writeText(currentPM.account_number);
                        success("Account number copied!");
                      }}
                    >
                      <Save className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {currentPM.description && (
                  <div className="p-4 bg-white/50 rounded-2xl border border-emerald-50 text-[10px] font-medium text-emerald-800 italic leading-relaxed">
                    {currentPM.description}
                  </div>
                )}
              </div>
            )}

            {currentPM?.type === "CASH" && (
              <div className="space-y-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-end px-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cash Received Input</Label>
                    <p className="text-[10px] font-black text-emerald-600">CHANGE DUE: <span className="text-sm ml-1">{formatIDR(change)}</span></p>
                  </div>
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-black group-focus-within:text-emerald-500 transition-colors">Rp</div>
                    <Input 
                      type="number" 
                      value={moneyReceived}
                      onChange={(e) => setMoneyReceived(e.target.value)}
                      placeholder="0"
                      className="h-20 pl-16 pr-6 text-4xl font-black bg-white border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/10 rounded-3xl transition-all shadow-inner font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {quickMoneyButtons.map(amt => {
                    const isDisabled = amt < total;
                    return (
                      <button
                        key={amt}
                        disabled={isDisabled}
                        className={cn(
                          "h-12 border rounded-xl text-xs font-black transition-all active:scale-95 shadow-sm uppercase tracking-tighter",
                          isDisabled 
                            ? "bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed" 
                            : "bg-white text-slate-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 hover:shadow-emerald-200"
                        )}
                        onClick={() => setMoneyReceived(amt.toString())}
                      >
                        {amt / 1000}k
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Internal Note</Label>
                  <Input 
                    placeholder="OPTIONAL STAFF NOTES" 
                    className="h-11 rounded-xl uppercase font-bold text-xs"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                   <div className="flex justify-between items-center mb-1 pr-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Profit Adjustment</Label>
                      <div className="flex bg-slate-100 p-0.5 rounded-lg border">
                        <button type="button" onClick={() => setDiscountType("FIXED")} className={cn("px-2 py-0.5 text-[8px] font-black rounded-md transition-all", discountType === "FIXED" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>FIXED</button>
                        <button type="button" onClick={() => setDiscountType("PERCENT")} className={cn("px-2 py-0.5 text-[8px] font-black rounded-md transition-all", discountType === "PERCENT" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400")}>%</button>
                      </div>
                   </div>
                   <div className="relative">
                      <Input 
                        type="number" 
                        className="h-11 rounded-xl pr-14 text-right font-black shadow-sm" 
                        placeholder="0"
                        value={discount} 
                        onChange={e => setDiscount(e.target.value)}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">{discountType === 'FIXED' ? 'IDR' : '%'}</div>
                   </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-8 flex gap-4">
              <Button 
                variant="ghost" 
                className="h-16 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-300 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100" 
                onClick={() => setIsCheckoutOpen(false)}
              >
                Discard
              </Button>
              <Button 
                type="button"
                className="flex-1 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest bg-amber-50 text-amber-600 border border-amber-100/50 hover:bg-amber-100 hover:border-amber-200 shadow-sm shadow-amber-200/10 active:scale-95 transition-all flex items-center justify-center" 
                onClick={handleSavePending}
                disabled={processing}
              >
                <Save className="w-5 h-5 mr-3" />
                Hold Order
              </Button>
              <Button 
                className="flex-[2] h-16 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-emerald-500/30 active:scale-95 transition-all text-white flex items-center justify-center"
                disabled={processing || (currentPM?.type === "CASH" && (parseInt(moneyReceived)||0) < total)}
                onClick={requestCheckout}
              >
                {processing ? (
                  <RefreshCcw className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Receipt className="w-6 h-6 mr-3" /> {currentOrderId ? "Update & Settle" : "Authorize & Finalize"}
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pending Orders List Dialog */}
      <Dialog open={isPendingListOpen} onOpenChange={setIsPendingListOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white flex flex-col max-h-[85dvh]">
          <div className="bg-orange-500 p-8 text-white relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Clock className="w-24 h-24 -rotate-12" />
            </div>
            <div className="relative z-10">
               <p className="text-orange-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Asynchronous Order Queue</p>
               <h2 className="text-3xl font-black tracking-tight uppercase">PENDING ARCHIVE</h2>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 space-y-4 min-h-0 scrollbar-hide">
            {pendingOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-20 text-slate-300 space-y-4">
                <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center border border-dashed border-slate-200">
                   <Clock className="w-8 h-8 opacity-20" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest">No orders in queue</p>
              </div>
            ) : (
              pendingOrders.map(order => (
                <div key={order.id} className="group relative bg-white border border-slate-100 rounded-3xl p-6 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 flex justify-between items-center gap-6">
                  <div className="space-y-3 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black tracking-widest uppercase">
                        {order.order_number}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Clock className="w-3 h-3" /> {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 uppercase tracking-tight truncate">
                        {order.customer_name || "GUEST PATRON"}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        {order.orderItems?.length || 0} ITEMS · {order.platform?.name}
                      </p>
                    </div>
                    {order.note && (
                      <div className="text-[10px] bg-amber-50 text-amber-600 px-3 py-1.5 rounded-xl border border-amber-100 font-bold uppercase tracking-tight italic line-clamp-1">
                        NOTE: {order.note}
                      </div>
                    )}
                  </div>
                  
                  <div className="text-right space-y-4">
                    <div className="text-2xl font-black text-slate-900 tracking-tighter">{formatIDR(Math.max(0, order.total - (order.discount || 0)))}</div>
                    <div className="flex items-center gap-2 justify-end">
                      {confirmCancelPendingId === order.id ? (
                        <div className="flex items-center gap-1 bg-rose-50 p-1.5 rounded-2xl border border-rose-100 animate-in slide-in-from-right-4">
                          <span className="text-[8px] font-black text-rose-600 uppercase tracking-widest px-2">VOID?</span>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="h-8 px-4 rounded-xl text-[10px] font-black uppercase" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelPendingOrder(e, order);
                              setConfirmCancelPendingId(null);
                            }}
                          >
                            YES
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-4 rounded-xl text-[10px] font-black uppercase text-slate-400" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmCancelPendingId(null);
                            }}
                          >
                            NO
                          </Button>
                        </div>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" className="h-10 w-10 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl" onClick={(e) => { e.stopPropagation(); setConfirmCancelPendingId(order.id); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                          <Button className="h-10 px-6 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all shadow-lg" onClick={() => handleResumeOrder(order)}>
                            RESUME
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter className="p-8 bg-slate-50 border-t">
            <Button variant="outline" className="h-12 w-full rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-400" onClick={() => setIsPendingListOpen(false)}>CLOSE ARCHIVE</Button>
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

      <PinVerificationModal 
        open={isPinDialogOpen}
        onClose={() => {
          setIsPinDialogOpen(false);
          setDeleteTargetOrder(null);
        }}
        onSubmit={handleCancelPinVerify}
        title="Protocol Override"
        subtitle="Security clearance required for record termination"
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
          config={storeConfig}
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
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-[2.5rem] sm:rounded-[3.5rem] border-none shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] bg-white flex flex-col max-h-[95dvh]">
          <div className="bg-slate-900 p-6 sm:p-10 text-white text-center relative overflow-hidden shrink-0">
             <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
             <div className="relative z-10">
                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.4em] mb-2 p-1.5 ring-1 ring-emerald-400/20 rounded-full inline-block mx-auto">ENCRYPTED PROTOCOL</p>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase italic">QRIS PORTAL</h2>
             </div>
          </div>
          
          <div className="p-6 sm:p-8 space-y-6 sm:space-y-8 flex flex-col items-center flex-1 overflow-y-auto min-h-0 scrollbar-hide">
            <div className="text-center">
              <p className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1 sm:mb-2">AGGREGATED VALUATION</p>
              <h3 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tighter font-mono italic">{formatIDR(qrisOrderData?.total || 0)}</h3>
            </div>

            <div className="w-full max-w-[400px] aspect-square bg-white p-4 sm:p-8 rounded-[2rem] sm:rounded-[3.5rem] border-4 sm:border-8 border-slate-50 shadow-2xl relative overflow-hidden group flex items-center justify-center">
              <div className="w-full h-full relative z-10">
                <QRISImage 
                  baseQRIS={qrisPM?.qris_data} 
                  amount={qrisOrderData?.total || 0} 
                  staticImage={qrisPM?.imageUrl}
                />
              </div>
              <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/5 transition-colors pointer-events-none" />
            </div>

            <div className="text-center space-y-2">
              <h4 className="font-black text-slate-900 uppercase tracking-[0.1em] text-xl">{qrisPM?.name}</h4>
              {qrisPM?.account_name && <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">{qrisPM.account_name}</p>}
            </div>

            <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl flex gap-6 text-left items-start">
              <AlertCircle className="w-6 h-6 text-emerald-600 shrink-0 mt-1" />
              <p className="text-[11px] text-slate-500 font-black uppercase leading-relaxed tracking-wider opacity-60 italic">Verify fund reception on management console prior to final authorization.</p>
            </div>

            <Button 
              className="w-full h-20 rounded-[2rem] bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-[0.2em] text-sm shadow-2xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center justify-center gap-4"
              disabled={processing}
              onClick={async () => {
                setProcessing(true);
                try {
                  const res = await api.put(`/orders/${qrisOrderData.id}`, {
                    ...qrisOrderData,
                    status: "PAID",
                    items: qrisOrderData.orderItems.map(i => ({ menu_id: i.menu_id, qty: i.qty }))
                  });
                  setIsQRISModalOpen(false);
                  setCompletedOrder(res);
                  success("STATION RECORD FINALIZED");
                } catch (e) {
                  console.error(e);
                  error(e.response?.data?.error || "COMMUNICATION FAILURE");
                } finally {
                  setProcessing(false);
                }
              }}
            >
              {processing ? (
                 <RefreshCcw className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <Receipt className="w-6 h-6" /> AUTHORIZE & PRINT
                </>
              )}
            </Button>
            
            <button 
              className="text-[10px] font-black text-slate-300 hover:text-slate-600 uppercase tracking-[0.5em] transition-all"
              onClick={() => setIsQRISModalOpen(false)}
            >
              POSTPONE AUDIT
            </button>
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

      <Dialog open={isStartShiftOpen} onOpenChange={(open) => {
        if (!open && !currentShift) return;
        setIsStartShiftOpen(open);
      }}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-[3rem] border-none shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] bg-white flex flex-col max-h-[90dvh]">
          <div className="bg-slate-900 p-12 text-white relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 text-center">
              <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.4em] mb-4 p-2 ring-1 ring-emerald-400/20 rounded-full inline-block mx-auto">SECURITY PROTOCOLS ACTIVE</p>
              <h2 className="text-5xl font-black tracking-tighter uppercase italic">START SHIFT</h2>
              <div className="mt-8 flex items-center justify-center gap-4">
                <div className="px-5 py-2 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-300">
                  {currentUser?.name || 'SYSTEM OPERATOR'}
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-12 space-y-10 flex-1 overflow-y-auto min-h-0 scrollbar-hide">
            <div className="space-y-6">
              <div className="flex justify-between items-end px-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Initial Drawer Fund</Label>
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Mandatory Input</p>
              </div>
              <div className="relative group">
                <div className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 font-black text-2xl group-focus-within:text-emerald-500 transition-colors">Rp</div>
                <Input 
                  type="text"
                  placeholder="0"
                  className="h-24 pl-20 pr-8 text-4xl font-black bg-slate-50 border-none focus:ring-0 rounded-[2rem] transition-all font-mono"
                  value={startingCash}
                  onChange={(e) => setStartingCash(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStartShift()}
                />
              </div>
              <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex gap-6 items-start">
                 <AlertCircle className="w-6 h-6 text-slate-400 shrink-0 mt-1" />
                 <p className="text-[10px] text-slate-500 font-black uppercase leading-relaxed tracking-wider opacity-60 italic">
                   Verify opening liquidity. This audit log is permanent.
                 </p>
              </div>
            </div>

            <Button 
              className="w-full h-20 rounded-[2rem] bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-[0.3em] text-sm shadow-2xl shadow-emerald-500/20 transition-all active:scale-95 group"
              onClick={handleStartShift}
              disabled={processing || !startingCash}
            >
              {processing ? (
                <RefreshCcw className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  INITIALIZE SYSTEM
                </>
              )}
            </Button>
            
            <button 
              onClick={() => window.location.href = '/'}
              className="w-full text-[10px] font-black text-slate-300 hover:text-slate-600 uppercase tracking-[0.5em] transition-all"
            >
              TERMINATE SESSION
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Item Note Modal */}
      <Dialog open={!!editingNoteItem} onOpenChange={() => setEditingNoteItem(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white/95 backdrop-blur-xl">
          <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="text-xl font-black uppercase tracking-tighter flex items-center gap-3 relative z-10">
              <Receipt className="w-6 h-6 text-emerald-400" />
              Item Note / Tags
            </div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1 relative z-10">
              {editingNoteItem?.name}
            </p>
          </div>

          <div className="p-8 space-y-8 min-h-[300px]">
            {editingNoteItem && (
              <div className="space-y-6">
                <div>
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4 block">Quick Tags</Label>
                  <div className="flex flex-wrap gap-2">
                    {( () => {
                      const category = categories.find(c => c.id === editingNoteItem.categoryId);
                      const catName = category?.name?.toUpperCase() || "";
                      const isDrink = category?.type === 'DRINK' || 
                                     catName.includes("MINUM") || 
                                     catName.includes("DRINK") || 
                                     catName.includes("BEVERAGE") || 
                                     catName.includes("WATER") || 
                                     catName.includes("SODA") || 
                                     catName.includes("JUICE") || 
                                     catName.includes("KOPI") || 
                                     catName.includes("TEH");
                      
                      let tags = isDrink 
                        ? (quickTagsConfig.DRINK?.length > 0 ? quickTagsConfig.DRINK : DRINK_TAGS)
                        : (quickTagsConfig.FOOD?.length > 0 ? quickTagsConfig.FOOD : FOOD_TAGS);
                      
                      return tags.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            const trimmed = tempNote.trim();
                            if (trimmed.includes(tag)) {
                              setTempNote(trimmed.replace(new RegExp(`${tag},?\\s*`, 'g'), '').replace(/,\s*$/, '').trim());
                            } else {
                              setTempNote(trimmed ? `${trimmed}, ${tag}` : tag);
                            }
                          }}
                          className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                            tempNote.includes(tag)
                              ? "bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                              : "bg-slate-50 border-slate-100 text-slate-500 hover:border-emerald-200 hover:text-emerald-600"
                          )}
                        >
                          {tag}
                        </button>
                      ));
                    })() }
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 block">Custom Notes</Label>
                  <textarea
                    placeholder="TYPE ANYTHING ELSE..."
                    className="w-full h-32 bg-slate-50 border-slate-100 rounded-2xl p-6 text-sm font-black uppercase tracking-tight text-slate-900 placeholder:text-slate-300 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all resize-none shadow-inner"
                    value={tempNote}
                    onChange={(e) => setTempNote(e.target.value.toUpperCase())}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <Button 
                variant="outline"
                className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-[10px] border-slate-100"
                onClick={() => setEditingNoteItem(null)}
              >
                Discard
              </Button>
              <Button 
                className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-widest text-[10px] text-white shadow-lg" 
                onClick={() => {
                  updateItemNotes(editingNoteItem.cartItemId, tempNote);
                  setEditingNoteItem(null);
                }}
              >
                Save Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
