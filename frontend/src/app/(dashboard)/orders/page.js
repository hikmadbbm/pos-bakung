"use client";
import { useEffect, useState } from "react";
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

const paymentMethods = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "QRIS", label: "QRIS", icon: Smartphone },
  { value: "DEBIT", label: "Debit Card", icon: CreditCard },
  { value: "CREDIT", label: "Credit Card", icon: CreditCard },
  { value: "TRANSFER", label: "Bank Transfer", icon: Receipt },
  { value: "PLATFORM", label: "Platform", icon: Smartphone }, // For online platforms
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
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState(null);
  const [isPaymentConfirmOpen, setIsPaymentConfirmOpen] = useState(false);
  const [paymentConfirmData, setPaymentConfirmData] = useState(null);
  
  // Checkout State
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [moneyReceived, setMoneyReceived] = useState("");
  const [note, setNote] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [discount, setDiscount] = useState("");
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
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, c, p] = await Promise.all([
        api.get("/menus"),
        api.get("/categories"),
        api.get("/platforms")
      ]);
      setMenus(m);
      setCategories(c);
      setPlatforms(p);
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

  const getPrice = (menu) => {
    if (!selectedPlatform) return menu.price;
    if (menu.prices && menu.prices[selectedPlatform]) {
      return menu.prices[selectedPlatform];
    }
    return menu.price;
  };

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
  }, [selectedPlatform, menus]);

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.qty, 0);
  const discountVal = discount ? parseInt(discount) : 0;
  const total = Math.max(0, subtotal - discountVal);
  const receivedPreview = paymentMethod === "CASH" ? parseAmountToInt(moneyReceived) : total;
  const change = Number.isFinite(receivedPreview) ? Math.max(0, receivedPreview - total) : 0;

  // Logic: When selectedPlatform changes, check if it's "DELIVERY"
  useEffect(() => {
    if (!selectedPlatform || platforms.length === 0) return;
    const platform = platforms.find(p => p.id.toString() === selectedPlatform);
    if (platform && platform.type === "DELIVERY") {
      // If delivery, restrict to CASH (COD) or PLATFORM (Online)
      // If current method is not allowed, switch to PLATFORM or CASH
      if (paymentMethod !== "CASH" && paymentMethod !== "PLATFORM") {
        setPaymentMethod("PLATFORM");
      }
    }
  }, [selectedPlatform, platforms, paymentMethod]);

  const availablePaymentMethods = (() => {
    if (!selectedPlatform) return paymentMethods;
    const platform = platforms.find(p => p.id.toString() === selectedPlatform);
    if (platform && platform.type === "DELIVERY") {
      return paymentMethods.filter(pm => ["CASH", "PLATFORM"].includes(pm.value));
    }
    // For Offline, exclude PLATFORM usually? Or allow all except PLATFORM?
    // Let's exclude PLATFORM for offline unless needed.
    return paymentMethods.filter(pm => pm.value !== "PLATFORM");
  })();

  const handleProcessPaymentClick = () => {
    if (cart.length === 0) return;
    if (!selectedPlatform && platforms.length > 0) {
      const defaultPlatform = platforms.find(plat => plat.name.toLowerCase() === "take away") || platforms[0];
      setSelectedPlatform(defaultPlatform.id.toString());
    }
    setIsCheckoutOpen(true);
  };

  const requestCheckout = () => {
    if (cart.length === 0) return;
    if (!selectedPlatform) {
      error("Please select a platform");
      return;
    }

    const received =
      paymentMethod === "CASH"
        ? parseAmountToInt(moneyReceived)
        : total;

    if (!Number.isFinite(received)) {
      error("Invalid amount. Use numbers only (optionally with up to 2 decimals).");
      return;
    }
    if (paymentMethod === "CASH" && received < total) {
      error("Money received is less than total amount!");
      return;
    }

    setPaymentConfirmData({
      payment_method: paymentMethod,
      total,
      received,
      change: paymentMethod === "CASH" ? Math.max(0, received - total) : 0,
    });
    setIsPaymentConfirmOpen(true);
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
        money_received: paymentMethod === "CASH" ? received : total,
        note,
        customer_name: customerName,
        discount: discountVal,
        status: "COMPLETED"
      };
      
      let res;
      if (currentOrderId) {
        res = await api.put(`/orders/${currentOrderId}`, payload);
      } else {
        res = await api.post("/orders", payload);
      }
      
      resetCart();
      setIsCheckoutOpen(false);
      setCompletedOrder(res);
      success(`Order ${res.order_number || ''} processed successfully!`);
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
        money_received: 0, // Not relevant for pending
        note,
        customer_name: customerName,
        discount: discountVal,
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
    setCurrentOrderId(null);
    setPaymentMethod("CASH");
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
    setDiscount(order.discount ? order.discount.toString() : "");
    setPaymentMethod(order.payment_method || "CASH");
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
              disabled={cart.length === 0}
              onClick={handleProcessPaymentClick}
            >
              Process Payment ({formatIDR(total)})
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
            <Label className="text-xs text-gray-500 uppercase font-bold">Customer</Label>
            <Input 
              placeholder="Customer Name (Optional)..." 
              className="text-sm"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              autoFocus
            />
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
             <Label className="text-xs text-gray-500 uppercase font-bold">Payment Method</Label>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
               {availablePaymentMethods.map(pm => (
                 <button
                   key={pm.value}
                   className={cn(
                     "flex flex-col items-center justify-center p-2 sm:p-3 rounded border text-xs transition-colors h-16 sm:h-20",
                     paymentMethod === pm.value 
                       ? "bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-200" 
                       : "bg-white text-gray-600 hover:bg-gray-50"
                   )}
                   onClick={() => setPaymentMethod(pm.value)}
                 >
                   <pm.icon className="w-5 h-5 mb-1.5 sm:mb-2" />
                   {pm.label}
                 </button>
               ))}
             </div>
          </div>

          {paymentMethod === "CASH" && (
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
              <Input 
                type="number" 
                className="h-10 sm:h-8 w-full sm:w-32 text-right text-base sm:text-sm" 
                placeholder="0"
                value={discount} 
                onChange={e => setDiscount(e.target.value)}
              />
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
  disabled={processing || (paymentMethod === "CASH" && (parseInt(moneyReceived)||0) < total)}
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
                      <Button
                        size="sm"
                        variant="destructive"
                        aria-label={`Cancel ${order.order_number}`}
                        onClick={(e) => handleCancelPendingOrder(e, order)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
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
    </div>
  );
}
