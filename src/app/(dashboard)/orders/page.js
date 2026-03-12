"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Plus, Minus, Trash2, ShoppingCart, CreditCard, Banknote, Smartphone, Receipt, Clock, Save, AlertCircle } from "lucide-react";
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

// Dynamically loaded from /api/payment-methods
const defaultPaymentMethods = [
  { id: 'cash', value: "CASH", name: "Cash", type: "CASH", icon: Banknote },
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

export default function OrdersPage() {
  const { success, error } = useToast();
  const [menus, setMenus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [user, setUser] = useState(null);
  const [currentShift, setCurrentShift] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [isPaymentConfirmOpen, setIsPaymentConfirmOpen] = useState(false);
  const [paymentConfirmData, setPaymentConfirmData] = useState(null);
  
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

  // Pending Orders State
  const [pendingOrders, setPendingOrders] = useState([]);
  const [isPendingListOpen, setIsPendingListOpen] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteTargetOrder, setDeleteTargetOrder] = useState(null);
  const [isDeletingPending, setIsDeletingPending] = useState(false);
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
    loadPendingOrders();
    // Poll pending orders every 15 seconds
    const interval = setInterval(loadPendingOrders, 15000);
    return () => clearInterval(interval);
  }, []);

  const loadPendingOrders = async () => {
    try {
      const res = await api.get("/orders/pending");
      setPendingOrders(res);
    } catch (e) {
      console.error("Failed to load pending orders", e);
      error("Failed to load pending orders");
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [mRes, cRes, pRes, uRes, pmRes] = await Promise.allSettled([
        api.get("/menus"),
        api.get("/categories"),
        api.get("/platforms"),
        api.get("/users/me"),
        api.get("/payment-methods")
      ]);
      if (mRes.status === "fulfilled") setMenus(mRes.value);
      else error("Failed to load menus");
      if (cRes.status === "fulfilled") setCategories(cRes.value);
      else error("Failed to load categories");
      if (pRes.status === "fulfilled") setPlatforms(pRes.value);
      else error("Failed to load platforms");
      
      if (pmRes.status === "fulfilled") {
        const activePMs = pmRes.value.filter(pm => pm.is_active);
        setAllActivePMs(activePMs.length > 0 ? activePMs : defaultPaymentMethods);
        // Default PM is set via effect on selectedPlatform
      }

      let userId = null;
      if (uRes.status === "fulfilled" && uRes.value?.id) {
        userId = uRes.value.id;
        setUser(uRes.value);
      } else {
        // Fallback: try parsing token
        const token = localStorage.getItem("token");
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            userId = payload.id;
            setUser({ id: userId });
          } catch (e) {}
        }
      }

      if (userId) {
        try {
          const shift = await api.get(`/shifts/current/${userId}`);
          setCurrentShift(shift);
        } catch (e) {
          console.error("No active shift found", e);
        }
      }

      const p = pRes.status === "fulfilled" ? pRes.value : [];
      if (p.length > 0) {
        // Default to "Take Away" platform if exists, otherwise first one
        const defaultPlatform = p.find(plat => plat.name.toLowerCase() === "take away") || p[0];
        setSelectedPlatform(defaultPlatform.id.toString());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

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
      "flex flex-col lg:flex-row gap-4 pb-2 lg:pb-0 relative transition-all duration-300",
      isFocusMode ? "h-[100dvh] p-2" : "h-[calc(100dvh-140px)] lg:h-[calc(100dvh-100px)]"
    )}>

      {/* LEFT: Menu Grid */}
      <div className="flex-[2] flex flex-col min-h-0 bg-gray-50/50 rounded-lg border p-3 lg:p-4 order-2 lg:order-1 h-full overflow-hidden shadow-sm">
        {/* Category Tabs */}
        <div className="flex space-x-2 overflow-x-auto pb-4 mb-2 scrollbar-hide shrink-0">
          <Button 
            variant={selectedCategory === "ALL" ? "default" : "outline"}
            onClick={() => setSelectedCategory("ALL")}
            className="whitespace-nowrap rounded-full h-8 text-xs shrink-0"
          >
            All Items
          </Button>
          {categories.map(cat => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat.id)}
              className="whitespace-nowrap rounded-full h-8 text-xs shrink-0"
              style={selectedCategory === cat.id ? { backgroundColor: cat.color, borderColor: cat.color, color: '#fff' } : { borderColor: cat.color, color: 'inherit' }}
            >
              {cat.name}
            </Button>
          ))}
        </div>

        {/* Menu Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 overflow-y-auto pr-1 pb-2">
          {loading ? (
            <div className="col-span-2 md:col-span-4 text-center text-gray-400 py-10">Loading menus...</div>
          ) : filteredMenus.map((menu) => {
            const currentPrice = getPrice(menu);
            const inCart = cart.find(i => i.menu_id === menu.id);
            return (
              <button
                key={menu.id}
                className={cn(
                  "relative w-full text-left bg-white border rounded-lg shadow-sm transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500",
                  "p-6 min-h-[120px] flex flex-col justify-between group overflow-hidden",
                  inCart ? "ring-2 ring-blue-500 bg-blue-50/50" : "hover:bg-gray-50 hover:shadow-md hover:-translate-y-0.5"
                )}
                onClick={() => addToCart(menu)}
                aria-label={`Add ${menu.name} to cart, price ${formatIDR(currentPrice)}`}
                style={{ borderLeft: `6px solid ${menu.category ? menu.category.color : '#ccc'}` }}
              >
                <div className="flex-1 w-full">
                  <h3 className="text-lg lg:text-xl font-bold text-gray-900 leading-snug mb-2 line-clamp-3">
                    {menu.name}
                  </h3>
                </div>
                
                <div className="w-full flex justify-end items-end mt-2">
                  {inCart && (
                    <div className="flex items-center justify-center bg-blue-600 text-white w-8 h-8 rounded-full shadow-sm animate-in zoom-in duration-200">
                      <span className="text-sm font-bold">{inCart.qty}</span>
                    </div>
                  )}
                </div>
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
      <div className="lg:flex-1 flex flex-col min-h-0 gap-4 order-1 lg:order-2 shrink-0 lg:h-full">
        
        {/* Cart Section */}
        <div className="flex-1 bg-white rounded-lg border flex flex-col overflow-hidden shadow-sm lg:h-full max-h-[30dvh] lg:max-h-none transition-all">
          <div className="p-3 border-b bg-gray-50 flex justify-between items-center shrink-0">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Current Order
            </h3>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsPendingListOpen(true)} 
                className="h-7 text-xs relative"
              >
                <Clock className="w-3 h-3 mr-1" />
                Pending
                {pendingOrders.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                    {pendingOrders.length}
                  </span>
                )}
              </Button>
              <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                {cart.reduce((a, b) => a + b.qty, 0)} items
              </span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2 py-8 lg:py-0">
                <ShoppingCart className="w-8 h-8 opacity-20" />
                <span className="text-sm">Cart is empty</span>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.menu_id} className="flex justify-between items-start md:items-center p-3 md:p-2 rounded-lg border border-gray-100 hover:border-blue-100 bg-white shadow-sm transition-all min-h-[80px] md:min-h-0">
                  <div className="flex-1 min-w-0 w-[70%] md:w-auto pr-2">
                    <div className="font-bold text-base md:text-sm text-gray-900 truncate leading-tight">{item.name}</div>
                    <div className="text-sm md:text-xs text-gray-500 mt-1 md:mt-0">{formatIDR(item.price)}</div>
                  </div>
                  <div className="flex flex-col md:flex-row items-end md:items-center gap-3 md:gap-0 md:space-x-2">
                    {/* Qty Controls */}
                    <div className="flex items-center space-x-3 md:space-x-2 order-2 md:order-1">
                      <Button variant="outline" size="icon" className="h-8 w-8 md:h-6 md:w-6 rounded-full border-gray-300" onClick={() => updateQty(item.menu_id, -1)}>
                        <Minus className="w-4 h-4 md:w-3 md:h-3" />
                      </Button>
                      <span className="w-4 text-center text-sm font-medium">{item.qty}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8 md:h-6 md:w-6 rounded-full border-gray-300" onClick={() => updateQty(item.menu_id, 1)}>
                        <Plus className="w-4 h-4 md:w-3 md:h-3" />
                      </Button>
                    </div>

                    {/* Delete Button - Larger on mobile */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-11 w-11 md:h-6 md:w-6 text-red-500 hover:text-red-700 bg-red-50 md:bg-transparent rounded-full order-1 md:order-2" 
                      onClick={() => updateQty(item.menu_id, -item.qty)}
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-5 h-5 md:w-3 md:h-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
          
          <div className="p-3 bg-gray-50 border-t space-y-2 shrink-0">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatIDR(subtotal)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Total</span>
              <span className="text-blue-600">{formatIDR(total)}</span>
            </div>
            <Button 
              size="lg" 
              className="w-full font-bold text-md shadow-md mt-2" 
              disabled={cart.length === 0 || !currentShift}
              onClick={handleProcessPaymentClick}
            >
              {!currentShift ? (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Shift Not Started
                </>
              ) : (
                `Process Payment (${formatIDR(total)})`
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
            <div className="text-3xl font-bold text-blue-600">{formatIDR(total)}</div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-gray-500 uppercase font-bold">Order Source</Label>
            <Select
              value={selectedPlatform}
              onChange={(e) => setSelectedPlatform(e.target.value)}
              options={platforms.map(p => ({ value: p.id, label: p.name }))}
            />
          </div>

          <div className="space-y-2">
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
                         ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-200" 
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
            <div className="bg-blue-50 p-4 rounded border border-blue-100 flex flex-col items-center gap-3">
              <div className="text-center">
                <div className="text-[10px] text-blue-600 uppercase font-bold mb-1">Transfer Total</div>
                <div className="text-xl font-bold text-blue-900 font-mono">{formatIDR(total)}</div>
              </div>

              {currentPM.imageUrl && (
                 <div className="w-32 h-32 bg-white p-2 rounded shadow-sm border border-blue-100">
                   <img src={currentPM.imageUrl} alt="Payment Instruction" className="w-full h-full object-contain" />
                 </div>
              )}
              
              {currentPM.description && (
                <p className="text-xs text-blue-800 text-center whitespace-pre-wrap italic">{currentPM.description}</p>
              )}
              
              {currentPM.account_number && (
                <div className="w-full space-y-2">
                  <div className="text-[10px] text-blue-600 uppercase font-bold px-1">Payment Target</div>
                  <div className="text-xs font-mono bg-white px-3 py-2.5 rounded border border-blue-100 flex justify-between items-center shadow-sm">
                    <div>
                      {currentPM.account_name && <div className="text-gray-400 text-[10px] mb-0.5">{currentPM.account_name}</div>}
                      <div className="font-bold text-blue-900 tracking-wider">{currentPM.account_number}</div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 text-blue-600 hover:bg-blue-50" 
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
                          : "bg-white hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
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
                      discountType === "FIXED" ? "bg-blue-600 text-white" : "bg-white text-gray-400 hover:bg-gray-50"
                    )}
                    onClick={() => setDiscountType("FIXED")}
                  >
                    Rp
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "px-3 text-xs font-bold transition-colors",
                      discountType === "PERCENT" ? "bg-blue-600 text-white" : "bg-white text-gray-400 hover:bg-gray-50"
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
                      <span className="font-mono font-bold text-blue-600">{order.order_number}</span>
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
                    <div className="font-bold text-lg">{formatIDR(order.total)}</div>
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
              <div className="text-sm text-gray-500 uppercase font-bold mb-1 tracking-tight">Total Payment</div>
              <div className="text-3xl font-mono font-bold text-blue-600">{formatIDR(qrisOrderData?.total || 0)}</div>
            </div>

            <div className="w-64 h-64 bg-white p-3 rounded-xl border-4 border-blue-50 shadow-xl relative overflow-hidden group">
              {qrisPM?.imageUrl ? (
                <img src={qrisPM.imageUrl} alt="QRIS" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-400 text-xs text-center p-4">
                  <Smartphone className="w-12 h-12 mb-2 opacity-20 text-blue-600" />
                  <p>Check "Settings &gt; Payment Methods" to upload a QRIS image.</p>
                </div>
              )}
            </div>

            <div className="text-center space-y-1">
              <p className="font-bold text-gray-800">{qrisPM?.name}</p>
              {qrisPM?.account_name && <p className="text-xs text-gray-500 uppercase tracking-wider">{qrisPM.account_name}</p>}
            </div>

            <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-lg text-center w-full">
              <p className="text-[10px] text-yellow-700 font-medium">Please ensure the customer has successfully scanned and completed the payment before proceeding.</p>
            </div>

            <Button 
              className="w-full h-12 text-lg font-bold shadow-lg shadow-blue-100 mt-2"
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
    </div>
  );
}
