import { useState, useCallback } from "react";
import { api } from "../lib/api";

/**
 * Custom hook to manage the POS checkout state and payment processing.
 */
export function useCheckout() {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Checkout Details State
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentMethodId, setPaymentMethodId] = useState(null);
  const [moneyReceived, setMoneyReceived] = useState("");
  const [note, setNote] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [discount, setDiscount] = useState("");
  const [discountType, setDiscountType] = useState("FIXED");

  const resetCheckoutState = useCallback(() => {
    setPaymentMethod("CASH");
    setPaymentMethodId(null);
    setMoneyReceived("");
    setNote("");
    setCustomerName("");
    setDiscount("");
    setDiscountType("FIXED");
  }, []);

  const performCheckout = async ({
    cart,
    total,
    taxRate,
    taxAmount,
    serviceRate,
    serviceAmount,
    selectedPlatform,
    currentOrderId,
    currentPM,
    appliedDiscount,
    discountRate
  }) => {
    if (cart.length === 0 || !selectedPlatform) return null;

    setProcessing(true);
    try {
      const payload = {
        platform_id: selectedPlatform,
        items: cart.map((i) => ({ menu_id: i.menu_id, qty: i.qty, note: i.note })),
        payment_method: paymentMethod,
        payment_method_id: paymentMethodId,
        money_received: currentPM?.type === "CASH" ? Number(moneyReceived) || total : total,
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
      return res;
    } catch (e) {
      console.error("Checkout Hook Error:", e);
      throw e;
    } finally {
      setProcessing(false);
    }
  };

  const savePending = async ({
    cart,
    selectedPlatform,
    currentOrderId,
    appliedDiscount,
    discountRate
  }) => {
    if (cart.length === 0 || !selectedPlatform) return null;

    setProcessing(true);
    try {
      const payload = {
        platform_id: selectedPlatform,
        items: cart.map((i) => ({ menu_id: i.menu_id, qty: i.qty })),
        payment_method: paymentMethod,
        payment_method_id: paymentMethodId,
        money_received: 0,
        note,
        customer_name: customerName,
        discount: appliedDiscount,
        discount_type: discountType,
        discount_rate: discountRate,
        status: "PENDING"
      };

      if (currentOrderId) {
        return await api.put(`/orders/${currentOrderId}`, payload);
      } else {
        return await api.post("/orders", payload);
      }
    } catch (e) {
      console.error("Save Pending Hook Error:", e);
      throw e;
    } finally {
      setProcessing(false);
    }
  };

  return {
    isCheckoutOpen,
    setIsCheckoutOpen,
    processing,
    setProcessing,
    paymentMethod,
    setPaymentMethod,
    paymentMethodId,
    setPaymentMethodId,
    moneyReceived,
    setMoneyReceived,
    note,
    setNote,
    customerName,
    setCustomerName,
    discount,
    setDiscount,
    discountType,
    setDiscountType,
    resetCheckoutState,
    performCheckout,
    savePending
  };
}
