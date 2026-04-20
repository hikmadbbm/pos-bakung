import { useState, useCallback, useMemo, useEffect } from "react";

/**
 * Custom hook to manage the POS cart state and calculations.
 */
export function useCart(taxRate = 0, serviceRate = 0) {
  // Initialize from sessionStorage to handle page refreshes
  const [cart, setCart] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("pos_cart");
      try {
        return saved ? JSON.parse(saved) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  // Persist cart to sessionStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pos_cart", JSON.stringify(cart));
    }
  }, [cart]);

  const generateCartItemId = useCallback(() => Math.random().toString(36).substr(2, 9), []);

  const addToCart = useCallback((menu, currentPrice) => {
    setCart((prev) => {
      // Find item with same menu_id and EMPTY note
      const existing = prev.find((item) => item.menu_id === menu.id && (!item.note || item.note.trim() === ""));
      if (existing) {
        return prev.map((item) =>
          item.cartItemId === existing.cartItemId ? { ...item, qty: item.qty + 1, price: currentPrice } : item
        );
      }
      return [...prev, { 
        cartItemId: generateCartItemId(),
        menu_id: menu.id, 
        name: menu.name, 
        price: currentPrice, 
        qty: 1, 
        note: "", 
        categoryId: menu.categoryId,
        categoryType: menu.category?.type || "FOOD"
      }];
    });
  }, [generateCartItemId]);

  const updateQty = useCallback((cartItemId, delta) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.cartItemId === cartItemId) {
          const newQty = Math.max(0, item.qty + delta);
          return { ...item, qty: newQty };
        }
        return item;
      }).filter((item) => item.qty > 0)
    );
  }, []);

  const updateItemNotes = useCallback((cartItemId, newNote) => {
    setCart(prev => {
      const itemToUpdate = prev.find(i => i.cartItemId === cartItemId);
      if (!itemToUpdate) return prev;

      const updatedCart = prev.map(item => 
        item.cartItemId === cartItemId ? { ...item, note: newNote } : item
      );

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
  }, []);

  const resetCart = useCallback(() => {
    setCart([]);
  }, []);

  // Calculations
  const subtotal = useMemo(() => cart.reduce((acc, item) => acc + item.price * item.qty, 0), [cart]);
  
  const calculateTotal = useCallback((discount = 0, discountType = "FIXED", promoDiscount = 0) => {
    const dVal = Number(discount) || 0;
    const appliedManualDiscount = discountType === "PERCENT" 
      ? Math.round(subtotal * (dVal / 100)) 
      : dVal;
    
    const appliedDiscount = appliedManualDiscount + (Number(promoDiscount) || 0);
    
    const amountAfterDiscount = Math.max(0, subtotal - appliedDiscount);
    const taxAmount = Math.round(amountAfterDiscount * (taxRate / 100));
    const serviceAmount = Math.round(amountAfterDiscount * (serviceRate / 100));
    const total = amountAfterDiscount + taxAmount + serviceAmount;

    return {
      subtotal,
      appliedDiscount,
      amountAfterDiscount,
      taxAmount,
      serviceAmount,
      total
    };
  }, [subtotal, taxRate, serviceRate]);

  return {
    cart,
    setCart,
    addToCart,
    updateQty,
    updateItemNotes,
    resetCart,
    subtotal,
    calculateTotal,
    generateCartItemId
  };
}
