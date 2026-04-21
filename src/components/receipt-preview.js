"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Button } from "./ui/button";
import { formatIDR } from "../lib/format";
import { Printer, ChefHat, CheckCircle2, RefreshCcw } from "lucide-react";
import { useToast } from "./ui/use-toast";
import { usePrinter } from "../lib/printer-context";
import { api } from "../lib/api";
import { ESC_POS } from "../lib/printer-commands";
import { processLogo } from "../lib/escpos-image";
import { cn } from "../lib/utils";
import { useTranslation } from "../lib/language-context";

export function ReceiptPreview({ isOpen, onClose, order, config: propConfig, forceCopy = false, receiptOnly = false }) {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const { device, connect, print } = usePrinter();
  const [printingReceipt, setPrintingReceipt] = useState(false);
  const [printingKitchen, setPrintingKitchen] = useState(false);
  const [previewMode, setPreviewMode] = useState("receipt"); // "receipt" or "kitchen"
  const [currentOrder, setCurrentOrder] = useState(order);
  const [storeConfig, setStoreConfig] = useState(propConfig || {
    store_name: "BAKMIE YOU-TJE",
    address: "Jl. Bakung No. 123",
    phone: "0812-3456-7890",
    receipt_footer: "Thank you for visiting!",
    paper_width: 58,
    show_logo: true,
    show_customer: true,
    show_name: true,
    kitchen_enabled: true,
    kitchen_auto_print: false,
    kitchen_copies: 1,
    kitchen_categories: []
  });

  const loadStoreConfig = useCallback(async () => {
    try {
      const res = await api.get("/settings/config");
      if (res) setStoreConfig(prev => ({ ...prev, ...res }));
    } catch (e) {
      console.error("Failed to load store config", e);
    }
  }, []);

  useEffect(() => {
    if (propConfig) {
      setStoreConfig(prev => ({ ...prev, ...propConfig }));
    }
  }, [propConfig]);

  useEffect(() => {
    if (isOpen) {
      if (!propConfig) loadStoreConfig();
      setPreviewMode("receipt");
      setCurrentOrder(order);
    }
  }, [isOpen, loadStoreConfig, propConfig, order]);

  if (!currentOrder) return null;

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  };

  const width = storeConfig.paper_width === 80 ? 47 : 31;

  const handlePrintReceipt = useCallback(async () => {
    if (!print) return;
    setPrintingReceipt(true);
    try {
      let data = ESC_POS.INIT;
      
      if (storeConfig.show_logo && storeConfig.logo_url) {
         try {
           // 1. Fetch logo as blob
           const res = await fetch(storeConfig.logo_url);
           const blob = await res.blob();
           
           // 2. Process using optimized helper (GS v 0 1-bit format)
           const logoBinary = await processLogo(blob, 128);
           
           // 3. Print Header + Logo
           await print(ESC_POS.INIT + ESC_POS.ALIGN_CENTER);
           await print(logoBinary);
           await print(ESC_POS.FEED_PAPER(1));
           
           // Start building the text data after the logo
           data = ""; 
         } catch(e) { 
           console.warn("Logo processing or printing failed", e);
           // Fallback: reset data if logo failed so text still prints
           data = ESC_POS.INIT;
         }
      }
      
      if (storeConfig.show_name !== false) {
        data += ESC_POS.ALIGN_CENTER;
        data += ESC_POS.BOLD_ON;
        data += ESC_POS.DOUBLE_WIDTH_ON;
        const name = storeConfig.store_name || "Bakmie You-Tje";
        data += name + "\n";
        data += ESC_POS.RESET_SIZE;
        data += ESC_POS.BOLD_Off;
      }
      
      data += (storeConfig.address || "") + "\n";
      if (storeConfig.phone) data += `Tel: ${storeConfig.phone}\n`;
      if (storeConfig.instagram) data += `IG: ${storeConfig.instagram}\n`;
      if (storeConfig.whatsapp) data += `WA: ${storeConfig.whatsapp}\n`;
      data += ESC_POS.separator(width);
      
      // Original / Copy Label
      data += ESC_POS.ALIGN_CENTER;
      data += ESC_POS.BOLD_ON;
      data += (forceCopy || currentOrder.print_count > 0) ? `${t('receipt.copy')}\n` : `${t('receipt.original')}\n`;
      data += ESC_POS.BOLD_Off;
      data += ESC_POS.separator(width);
      
      data += ESC_POS.ALIGN_LEFT;
      data += `${t('receipt.ref')}: ${order.order_number}\n`;
      data += `${t('receipt.date')}: ${formatDate(order.date)}\n`;
      if (order.platform?.name) {
        data += `CHANNEL: ${order.platform.name.toUpperCase()}\n`;
      }
      if (storeConfig.show_customer && order.customer_name) {
        data += `${t('common.guest')}: ${order.customer_name}\n`;
      }
      data += ESC_POS.separator(width);
      
      let calculatedSubtotal = 0;
      order.orderItems.forEach(item => {
        const orderPlatId = Number(order.platform_id);
        const menuPriceOnPlatform = item.menu?.prices?.find(p => Number(p.platform_id) === orderPlatId)?.price;
        const unitRefPrice = Math.max(
          menuPriceOnPlatform || 0,
          item.price || 0,
          (order.platform_id ? 0 : (item.menu?.price || 0))
        );
        const refPriceTotal = unitRefPrice * item.qty;

        let itemPromoDiscount = 0;
        let itemPromoNames = [];
        order.orderPromotions?.forEach(op => {
          const pIds = op.promotion?.conditions?.[0]?.productIds || [];
          if (pIds.length > 0 && pIds.includes(item.menu_id)) {
            const totalEligibleItemsQty = order.orderItems
              .filter(oi => pIds.includes(oi.menu_id))
              .reduce((sum, oi) => sum + oi.qty, 0);
            if (totalEligibleItemsQty > 0) {
              itemPromoDiscount += (op.amount / totalEligibleItemsQty) * item.qty;
              if (!itemPromoNames.includes(op.promotion.name)) itemPromoNames.push(op.promotion.name);
            }
          }
        });

        const finalItemPrice = refPriceTotal - itemPromoDiscount;
        calculatedSubtotal += finalItemPrice;

        const itemTypeMark = item.menu?.productType === 'CONSIGNMENT' ? ' (Titipan)' : '';
        data += (item.menu?.name || "Unknown") + itemTypeMark + "\n";
        
        if (itemPromoNames.length > 0) {
          data += `[${itemPromoNames.join(', ')}]\n`;
        }

        if (item.note) {
          data += ESC_POS.ITALIC_ON;
          data += `- ${item.note}\n`;
          data += ESC_POS.ITALIC_OFF;
        }

        const qtyStr = `${item.qty} x ${unitRefPrice.toLocaleString()}`;
        const discMark = itemPromoDiscount > 0 ? ` (${(finalItemPrice/item.qty).toLocaleString()})` : '';
        const qtyPrice = qtyStr + discMark;
        const itemTotal = finalItemPrice.toLocaleString();
        data += ESC_POS.formatTwoColumns(qtyPrice, itemTotal, width);
      });
 
      // General Order Note
      if (order.note) {
        data += ESC_POS.separator(width);
        data += ESC_POS.BOLD_ON + `${t('receipt.notes')}:\n` + ESC_POS.BOLD_Off;
        data += order.note + "\n";
      }
      
      data += ESC_POS.formatTwoColumns(t('receipt.subtotal'), formatIDR(calculatedSubtotal), width);
      
      let finalTotal = calculatedSubtotal;
      
      if (order.service_amount > 0) {
        data += ESC_POS.formatTwoColumns(`${t('receipt.service')} (${order.service_rate || storeConfig.service_charge}%)`, formatIDR(order.service_amount), width);
        finalTotal += order.service_amount;
      } else if (!order.hasOwnProperty('service_amount') && storeConfig.service_charge > 0) {
        // Fallback for old orders
        const serviceAmount = Math.round(order.total * (storeConfig.service_charge / 100));
        data += ESC_POS.formatTwoColumns(`${t('receipt.service')} (${storeConfig.service_charge}%)`, formatIDR(serviceAmount), width);
        finalTotal += serviceAmount;
      }
      
      if (order.tax_amount > 0) {
        data += ESC_POS.formatTwoColumns(`${t('receipt.tax')} (${order.tax_rate || storeConfig.tax_rate}%)`, formatIDR(order.tax_amount), width);
        finalTotal += order.tax_amount;
      } else if (!order.hasOwnProperty('tax_amount') && storeConfig.tax_rate > 0) {
        // Fallback for old orders
        const taxAmount = Math.round(finalTotal * (storeConfig.tax_rate / 100));
        data += ESC_POS.formatTwoColumns(`${t('receipt.tax')} (${storeConfig.tax_rate}%)`, formatIDR(taxAmount), width);
        finalTotal += taxAmount;
      }
 
      if (order.discount > 0) {
        data += ESC_POS.formatTwoColumns(t('receipt.discount'), `-${formatIDR(order.discount)}`, width);
        finalTotal -= order.discount;
      }
      
      data += ESC_POS.BOLD_ON;
      data += ESC_POS.formatTwoColumns(t('receipt.total'), formatIDR(Math.max(0, finalTotal)), width);
      data += ESC_POS.BOLD_Off;
 
      data += ESC_POS.separator(width);
      const isUnpaid = order.status === 'UNPAID';
      const isPlatform = !!order.platform_id;
      const receivedAmount = isUnpaid ? 0 : (isPlatform ? finalTotal : (order.money_received ?? finalTotal));
      const changeAmount = isPlatform ? 0 : Math.max(0, receivedAmount - finalTotal);
      
      if (isUnpaid) {
        data += ESC_POS.formatTwoColumns('TOTAL HUTANG', formatIDR(finalTotal), width);
      } else {
        data += ESC_POS.formatTwoColumns(t('receipt.paid'), formatIDR(receivedAmount), width);
        if (!isPlatform) {
          data += ESC_POS.formatTwoColumns(t('receipt.change'), formatIDR(changeAmount), width);
        }
      }
      
      data += ESC_POS.separator(width);
      data += ESC_POS.ALIGN_CENTER;
      data += (storeConfig.receipt_footer || "Thank you!") + "\n";
      data += ESC_POS.FEED_PAPER(4);
      
      await print(data);
      success(t('common.print_success'));
 
      // Increment print count in DB
      try {
        const updated = await api.post(`/orders/${currentOrder.id}/print`);
        if (updated) setCurrentOrder(updated);
      } catch (e) {
        console.warn("Failed to increment print count", e);
      }
    } catch (e) {
      console.error("Print failed", e);
      error(t('common.print_fail'));
    } finally {
      setPrintingReceipt(false);
    }
  }, [print, storeConfig, currentOrder, order, width, success, error, t, forceCopy]);

  const handlePrintKitchen = useCallback(async () => {
    if (!print || !storeConfig.kitchen_enabled || !order) return;
    setPrintingKitchen(true);
    try {
      let itemsToPrint = order.orderItems || [];
      const kitchenCats = storeConfig.kitchen_categories || [];
      if (kitchenCats.length > 0) {
        itemsToPrint = itemsToPrint.filter(item => 
          kitchenCats.includes(item.menu?.categoryId)
        );
      }

      if (itemsToPrint.length === 0) {
        console.warn(`[Printer] Kitchen Print Aborted: No items matching the selected categories (${kitchenCats.join(',')}) for order ${order.order_number}`);
        return;
      }

      const copies = storeConfig.kitchen_copies || 1;
      for (let i = 0; i < copies; i++) {
        let data = ESC_POS.INIT;
        data += ESC_POS.ALIGN_CENTER;
        data += ESC_POS.DOUBLE_SIZE_ON;
        data += `${t('receipt.kitchen_ticket')}\n`;
        if (copies > 1) data += `COPY ${i + 1}/${copies}\n`;
        data += ESC_POS.RESET_SIZE;
        data += ESC_POS.separator(width);
        
        data += ESC_POS.ALIGN_LEFT;
        data += ESC_POS.BOLD_ON;
        data += `${t('receipt.ref')}: ${order.order_number}\n`;
        data += `${t('receipt.date')}: ${formatDate(order.date)}\n`;
        if (order.customer_name) data += `${t('common.guest')}: ${order.customer_name}\n`;
        data += ESC_POS.BOLD_Off;
        data += ESC_POS.separator(width);
        
        itemsToPrint.forEach(item => {
          data += ESC_POS.DOUBLE_HEIGHT_ON;
          const itemTypeMark = item.menu?.productType === 'CONSIGNMENT' ? ' (Titipan)' : '';
          data += `[ ] ${item.qty} x ${item.menu?.name}${itemTypeMark}\n`;
          data += ESC_POS.RESET_SIZE;
          if (item.note) data += `    -> ${item.note}\n`;
        });
        
        if (order.note) {
          data += ESC_POS.BOLD_ON + `${t('receipt.order_note')}: ` + order.note + ESC_POS.BOLD_Off + "\n";
        }
        
        data += ESC_POS.separator(width);
        data += ESC_POS.FEED_PAPER(4);
        
        await print(data);
      }
      success(t('common.print_success'));
    } catch (e) {
      console.error("Kitchen print failed", e);
      error(t('common.print_fail'));
    } finally {
      setPrintingKitchen(false);
    }
  }, [print, storeConfig.kitchen_enabled, storeConfig.kitchen_copies, storeConfig.kitchen_categories, order, width, success, error, t]);

  const [printState, setPrintState] = useState("IDLE");
  const activeOrderRef = useRef(null);
  
  // Guard refs to prevent double-firing handlers in the same state
  const isExecutingRef = useRef(false);

  useEffect(() => {
    if (!isOpen || !order || order.order_number === "TRX-PREVIEW-999") return;
    if (propConfig && (!storeConfig || !storeConfig.id)) return;

    const orderIdentifier = order.id || order.order_number;

    if (activeOrderRef.current !== orderIdentifier) {
      activeOrderRef.current = orderIdentifier;
      isExecutingRef.current = false;
      setPrintState("START");
    }
  }, [isOpen, order, storeConfig, propConfig]);

  useEffect(() => {
    if (printState === "START") {
      setPrintState(storeConfig.receipt_auto_print ? "RECEIPT" : "DELAY");
    } else if (printState === "RECEIPT" && !isExecutingRef.current) {
      isExecutingRef.current = true;
      console.log(`[Sequence] Executing Receipt Print...`);
      handlePrintReceipt().finally(() => {
        isExecutingRef.current = false;
        setPrintState("DELAY");
      });
    } else if (printState === "DELAY") {
      if (!storeConfig.kitchen_auto_print || !storeConfig.kitchen_enabled) {
        setPrintState("DONE");
        return;
      }
      const delayAmount = (storeConfig.kitchen_delay || 0) * 1000;
      console.log(`[Sequence] Delaying Kitchen Print by ${delayAmount}ms...`);
      const timer = setTimeout(() => {
        setPrintState("KITCHEN");
      }, delayAmount);
      return () => clearTimeout(timer);
    } else if (printState === "KITCHEN" && !isExecutingRef.current) {
      isExecutingRef.current = true;
      console.log(`[Sequence] Executing Kitchen Print...`);
      handlePrintKitchen().finally(() => {
        isExecutingRef.current = false;
        setPrintState("DONE");
      });
    }
  }, [printState, storeConfig, handlePrintReceipt, handlePrintKitchen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-slate-50">
        <div className="bg-emerald-600 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
             <CheckCircle2 className="w-24 h-24 -rotate-12" />
          </div>
          <div className="relative z-10 flex justify-between items-end">
            <div className="space-y-1">
              <h3 className="text-2xl font-black uppercase tracking-tight text-white leading-none">
                {receiptOnly ? `PREVIEW STRUK #${order?.order_number}` : 'CETAK STRUK'}
              </h3>
              <p className="text-xs font-bold text-white/70 uppercase tracking-widest">
                {t('receipt.system_admin')}
              </p>
            </div>
            {!receiptOnly && (
              <div className="flex bg-black/20 p-1 rounded-xl backdrop-blur-md">
                 <button 
                  onClick={() => setPreviewMode("receipt")}
                  className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all", previewMode === "receipt" ? "bg-white text-emerald-600 shadow-lg" : "text-emerald-50")}
                 >POS</button>
                 <button 
                  onClick={() => setPreviewMode("kitchen")}
                  className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all", previewMode === "kitchen" ? "bg-white text-emerald-600 shadow-lg" : "text-emerald-50")}
                 >Kitchen</button>
              </div>
            )}
          </div>
        </div>

        <div className="p-8 space-y-8 bg-white/40 backdrop-blur-xl transition-all duration-500 overflow-y-auto max-h-[80vh] custom-scrollbar">
           {/* Visual Preview of the Ticket */}
           <div className="flex justify-center">
              <div className={cn(
                "bg-white shadow-2xl border border-slate-200 transition-all duration-500 overflow-hidden",
                previewMode === "receipt" ? "w-[280px] rounded-xl" : "w-[300px] rounded-sm border-l-4 border-l-emerald-500"
              )}>
                {previewMode === "receipt" ? (
                    <div className="p-6 font-mono text-xs text-slate-900 space-y-4 animate-in fade-in duration-500 min-h-[400px]">
                      <div className="text-center space-y-2 pb-2">
                        {storeConfig.show_logo && storeConfig.logo_url && (
                          <div className="flex justify-center mb-4">
                            <img src={storeConfig.logo_url} alt="Logo" className="max-w-[120px] max-h-[80px] object-contain filter grayscale contrast-125" />
                          </div>
                        )}
                        {storeConfig.show_name !== false && (
                          <h4 className="font-black text-base leading-tight tracking-tighter">{storeConfig.store_name}</h4>
                        )}
                        <p className="text-[10px] leading-relaxed opacity-80 px-4">{storeConfig.address}</p>
                        {(storeConfig.phone || storeConfig.instagram || storeConfig.whatsapp) && (
                          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[10px] opacity-70 font-black uppercase pt-1">
                            {storeConfig.phone && <span className="flex items-center gap-1">Tel: {storeConfig.phone}</span>}
                            {storeConfig.instagram && <span className="flex items-center gap-1">IG: {storeConfig.instagram}</span>}
                            {storeConfig.whatsapp && <span className="flex items-center gap-1">WA: {storeConfig.whatsapp}</span>}
                          </div>
                        )}
                        <div className="pt-2 text-center">
                          <span className="text-[10px] font-black tracking-widest uppercase opacity-60">
                            *** {(forceCopy || currentOrder.print_count > 0) ? t('receipt.copy') : t('receipt.original')} ***
                          </span>
                        </div>
                      </div>

                      <div className="border-b-[1.5px] border-dashed border-slate-200" />
                      
                      <div className="space-y-1 py-1">
                        <div className="flex justify-between"><span>{t('receipt.ref')}:</span><span className="font-black">{order.order_number}</span></div>
                        <div className="flex justify-between"><span>{t('receipt.date')}:</span><span>{formatDate(order.date)}</span></div>
                        {order.platform?.name && (
                          <div className="flex justify-between"><span className="text-emerald-600 font-black">CHANNEL:</span><span className="font-black text-emerald-600">{order.platform.name.toUpperCase()}</span></div>
                        )}
                        {storeConfig.show_customer && order.customer_name && (
                          <div className="flex justify-between"><span>{t('common.guest').toUpperCase()}:</span><span className="font-black">{order.customer_name}</span></div>
                        )}
                      </div>
                      
                      <div className="border-b-[1.5px] border-dashed border-slate-200" />
                      
                      <div className="space-y-2 py-2">
                        {order.orderItems?.map((item, idx) => {
                           const orderPlatId = Number(order.platform_id);
                           const menuPriceOnPlatform = item.menu?.prices?.find(p => Number(p.platform_id) === orderPlatId)?.price;
                           
                           // If it's a platform order, we should try to find the platform price as the reference
                           // If item.price is ALREADY higher than menuPriceOnPlatform, use item.price as reference (it might be the platform price)
                           const unitRefPrice = Math.max(
                             menuPriceOnPlatform || 0,
                             item.price || 0,
                             (order.platform_id ? 0 : (item.menu?.price || 0))
                           );
                           const refPriceTotal = unitRefPrice * item.qty;

                           let itemPromoDiscount = 0;
                           let itemPromoNames = [];
                           order.orderPromotions?.forEach(op => {
                             const pIds = op.promotion?.conditions?.[0]?.productIds || [];
                             if (pIds.length > 0 && pIds.includes(item.menu_id)) {
                               const totalEligibleItemsQty = order.orderItems
                                 .filter(oi => pIds.includes(oi.menu_id))
                                 .reduce((sum, oi) => sum + oi.qty, 0);
                               if (totalEligibleItemsQty > 0) {
                                 itemPromoDiscount += (op.amount / totalEligibleItemsQty) * item.qty;
                                 if (!itemPromoNames.includes(op.promotion.name)) itemPromoNames.push(op.promotion.name);
                               }
                             }
                           });

                           const finalDisplayPrice = refPriceTotal - itemPromoDiscount;
                           const isDiscounted = itemPromoDiscount > 0;

                           return (
                             <div key={idx} className="space-y-0.5">
                               <p className="font-black leading-tight">
                                 {item.menu?.name} {item.menu?.productType === 'CONSIGNMENT' && <span className="text-amber-600 italic">(Titipan)</span>}
                               </p>
                               {itemPromoNames.length > 0 && (
                                 <p className="text-[7px] font-black uppercase text-emerald-600">[{itemPromoNames.join(', ')}]</p>
                               )}
                               {item.note && <p className="italic text-[8px] opacity-70">- {item.note}</p>}
                               <div className="flex justify-between items-center text-[8px] opacity-80 pt-0.5">
                                 <div className="flex items-center gap-1.5">
                                   <span>{item.qty} x </span>
                                   {isDiscounted ? (
                                      <>
                                        <span className="line-through">{unitRefPrice.toLocaleString()}</span>
                                        <span className="font-bold">{(finalDisplayPrice/item.qty).toLocaleString()}</span>
                                      </>
                                   ) : (
                                      <span>{unitRefPrice.toLocaleString()}</span>
                                   )}
                                 </div>
                                 <span className="font-bold">{finalDisplayPrice.toLocaleString()}</span>
                               </div>
                             </div>
                           );
                        })}
                      </div>
                      
                      <div className="border-b-[1.5px] border-dashed border-slate-200" />
                      
                       <div className="space-y-1.5 py-1">
                         <div className="flex justify-between"><span>{t('receipt.subtotal')}</span><span className="tabular-nums">
                            {(() => {
                               const sub = order.orderItems.reduce((acc, item) => {
                                  const orderPlatId = Number(order.platform_id);
                                  const menuPriceOnPlatform = item.menu?.prices?.find(p => Number(p.platform_id) === orderPlatId)?.price;
                                  const unitRefPrice = menuPriceOnPlatform || item.menu?.price || item.price;
                                  const refPriceTotal = unitRefPrice * item.qty;
                                  let itemPromoDiscount = 0;
                                  order.orderPromotions?.forEach(op => {
                                    const pIds = op.promotion?.conditions?.[0]?.productIds || [];
                                    if (pIds.length > 0 && pIds.includes(item.menu_id)) {
                                      const totalEligibleItemsQty = order.orderItems
                                        .filter(oi => pIds.includes(oi.menu_id))
                                        .reduce((sum, oi) => sum + oi.qty, 0);
                                      if (totalEligibleItemsQty > 0) {
                                        itemPromoDiscount += (op.amount / totalEligibleItemsQty) * item.qty;
                                      }
                                    }
                                  });
                                  return acc + (refPriceTotal - itemPromoDiscount);
                               }, 0);
                               return formatIDR(sub);
                            })()}
                         </span></div>
                        
                        {order.service_amount > 0 ? (
                          <div className="flex justify-between opacity-80">
                            <span>{t('receipt.service')} ({order.service_rate || storeConfig.service_charge}%)</span>
                            <span className="tabular-nums">{formatIDR(order.service_amount)}</span>
                          </div>
                        ) : (!order.hasOwnProperty('service_amount') && storeConfig.service_charge > 0) ? (
                          <div className="flex justify-between opacity-80">
                            <span>{t('receipt.service')} ({storeConfig.service_charge}%)</span>
                            <span className="tabular-nums">{formatIDR(Math.round(order.total * (storeConfig.service_charge / 100)))}</span>
                          </div>
                        ) : null}
                        
                        {order.tax_amount > 0 ? (
                          <div className="flex justify-between opacity-80">
                            <span>{t('receipt.tax')} ({order.tax_rate || storeConfig.tax_rate}%)</span>
                            <span className="tabular-nums">{formatIDR(order.tax_amount)}</span>
                          </div>
                        ) : (!order.hasOwnProperty('tax_amount') && storeConfig.tax_rate > 0) ? (
                          <div className="flex justify-between opacity-80">
                            <span>{t('receipt.tax')} ({storeConfig.tax_rate}%)</span>
                            <span className="tabular-nums">
                              {formatIDR(Math.round((order.total + (storeConfig.service_charge > 0 ? order.total * (storeConfig.service_charge / 100) : 0)) * (storeConfig.tax_rate / 100)))}
                            </span>
                          </div>
                        ) : null}
                        

                        
                        <div className="flex justify-between font-black text-sm pt-3 border-t-[1.5px] border-slate-900/5 mt-2">
                          <span className="tracking-tighter uppercase">{t('receipt.total')}</span>
                          <span className="tabular-nums">
                            {(() => {
                               const sub = order.orderItems.reduce((acc, item) => {
                                  const orderPlatId = Number(order.platform_id);
                                  const menuPriceOnPlatform = item.menu?.prices?.find(p => Number(p.platform_id) === orderPlatId)?.price;
                                  const unitRefPrice = menuPriceOnPlatform || item.menu?.price || item.price;
                                  const refPriceTotal = unitRefPrice * item.qty;
                                  let itemPromoDiscount = 0;
                                  order.orderPromotions?.forEach(op => {
                                    const pIds = op.promotion?.conditions?.[0]?.productIds || [];
                                    if (pIds.length > 0 && pIds.includes(item.menu_id)) {
                                      const totalEligibleItemsQty = order.orderItems
                                        .filter(oi => pIds.includes(oi.menu_id))
                                        .reduce((sum, oi) => sum + oi.qty, 0);
                                      if (totalEligibleItemsQty > 0) {
                                        itemPromoDiscount += (op.amount / totalEligibleItemsQty) * item.qty;
                                      }
                                    }
                                  });
                                  return acc + (refPriceTotal - itemPromoDiscount);
                               }, 0);
                               return formatIDR(sub + (order.service_amount || 0) + (order.tax_amount || 0));
                            })()}
                          </span>
                        </div>
                      </div>

                      <div className="border-b-[1.5px] border-dashed border-slate-200" />
                      
                      <div className="space-y-1 py-1 font-bold">
                        <div className="flex justify-between"><span>{t('receipt.method')}</span><span>{order.payment_method || t('common.cash_label')}</span></div>
                        {order.status === 'UNPAID' ? (
                          <div className="flex justify-between text-rose-600">
                            <span>TOTAL HUTANG</span>
                            <span>{formatIDR(Math.max(0, 
                              order.total + 
                              (order.service_amount || (order.hasOwnProperty('service_amount') ? 0 : Math.round(order.total * (storeConfig.service_charge / 100 || 0)))) + 
                              (order.tax_amount || (order.hasOwnProperty('tax_amount') ? 0 : Math.round((order.total + (order.total * (storeConfig.service_charge / 100 || 0))) * (storeConfig.tax_rate / 100 || 0)))) - 
                              (order.discount || 0)
                            ))}</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex justify-between opacity-80">
                              <span>{t('receipt.paid')}</span>
                              <span>
                                {(() => {
                                  const orderPlatId = Number(order.platform_id);
                                  const sub = order.orderItems.reduce((acc, item) => {
                                    const menuPriceOnPlat = item.menu?.prices?.find(p => Number(p.platform_id) === orderPlatId)?.price;
                                    const unitRef = Math.max(menuPriceOnPlat || 0, item.price || 0, (order.platform_id ? 0 : (item.menu?.price || 0)));
                                    let itemDisc = 0;
                                    order.orderPromotions?.forEach(op => {
                                      const pIds = op.promotion?.conditions?.[0]?.productIds || [];
                                      if (pIds.includes(item.menu_id)) {
                                          const totElig = order.orderItems.filter(oi => pIds.includes(oi.menu_id)).reduce((s, x) => s + x.qty, 0);
                                          if (totElig > 0) itemDisc += (op.amount / totElig) * item.qty;
                                      }
                                    });
                                    return acc + (unitRef * item.qty - itemDisc);
                                  }, 0);
                                  const finalT = sub + (order.service_amount || 0) + (order.tax_amount || 0);
                                  return formatIDR(order.platform_id ? finalT : (order.money_received ?? finalT));
                                })()}
                              </span>
                            </div>
                            <div className="flex justify-between opacity-80 text-emerald-700">
                              <span>{t('receipt.change')}</span>
                              <span>{formatIDR(order.platform_id ? 0 : Math.max(0, (order.money_received ?? 0) - order.total))}</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="text-center pt-6 space-y-2">
                        <div className="border-b-[1.5px] border-dashed border-slate-200" />
                        <p className="opacity-70 italic py-2 text-[10px] leading-relaxed">{storeConfig.receipt_footer}</p>
                        <div className="border-b-[1.5px] border-dashed border-slate-200" />
                        <p className="text-[6px] opacity-20 font-black tracking-[0.3em] pt-1">SEQUENCE BY BAKUNG POS</p>
                      </div>
                    </div>
                ) : (
                  <div className="p-8 font-mono text-sm text-slate-900 space-y-4 bg-white animate-in fade-in slide-in-from-right-4 duration-500 border-2 border-dashed border-slate-100">
                    <div className="text-center pb-2">
                       <h4 className="font-black uppercase tracking-tighter text-xl">{t('receipt.kitchen_ticket')}</h4>
                    </div>
                    
                    <div className="border-b-[1.5px] border-dashed border-slate-200" />
                    
                    <div className="space-y-1">
                       <div className="flex justify-between font-black">
                          <span>{t('receipt.ref')}: {order.order_number}</span>
                       </div>
                       <div className="flex justify-between font-black">
                          <span>{t('receipt.time')}: {new Date(order.date).toLocaleTimeString()}</span>
                       </div>
                       {order.customer_name && (
                         <div className="flex justify-between font-black">
                            <span>{t('common.guest').toUpperCase()}: {order.customer_name}</span>
                         </div>
                       )}
                    </div>

                    <div className="border-b-[1.5px] border-dashed border-slate-200" />

                    <div className="space-y-4 py-2">
                      {order.orderItems?.map((item, idx) => (
                        <div key={idx} className="space-y-1">
                           <div className="font-black text-lg leading-tight tabular-nums uppercase">
                              [ ] {item.qty} x {item.menu?.name} {item.menu?.productType === 'CONSIGNMENT' && <span className="text-amber-600 text-xs italic">(TITIPAN)</span>}
                           </div>
                           {item.note && (
                              <div className="pl-8 font-bold text-xs uppercase opacity-80">
                                -{">"} {item.note}
                              </div>
                           )}
                        </div>
                      ))}
                    </div>
                    
                    <div className="border-t-[1.5px] border-dashed border-slate-200" />
                  </div>
                )}
              </div>
           </div>

           <div className="grid grid-cols-1 gap-4">
              <Button 
                onClick={handlePrintReceipt}
                disabled={printingReceipt}
                className="h-24 rounded-3xl bg-slate-900 hover:bg-black text-white flex items-center justify-between px-8 group transition-all active:scale-[0.98] shadow-xl shadow-slate-900/10"
              >
                <div className="flex items-center gap-6">
                   <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center group-hover:rotate-6 transition-transform">
                      {printingReceipt ? <RefreshCcw className="w-6 h-6 animate-spin" /> : <Printer className="w-7 h-7" />}
                   </div>
                   <div className="text-left">
                      <p className="text-xs font-black text-white/50 uppercase tracking-[0.2em] leading-none mb-1">{t('receipt.pos_hardware')}</p>
                      <p className="text-lg font-black uppercase tracking-widest">{t('receipt.print_receipt')}</p>
                   </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                   <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </Button>

              {!receiptOnly && storeConfig.kitchen_enabled && (
                <Button 
                  onClick={handlePrintKitchen}
                  disabled={printingKitchen}
                  className="h-24 rounded-3xl bg-white border-2 border-slate-100 text-slate-900 hover:bg-slate-50 flex items-center justify-between px-8 group transition-all active:scale-[0.98] shadow-sm"
                >
                  <div className="flex items-center gap-6">
                     <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center group-hover:rotate-6 transition-transform">
                        {printingKitchen ? <RefreshCcw className="w-6 h-6 animate-spin text-emerald-600" /> : <ChefHat className="w-7 h-7 text-emerald-600" />}
                     </div>
                     <div className="text-left">
                        <p className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">{t('receipt.kitchen_queue')}</p>
                        <p className="text-lg font-black uppercase tracking-widest">{t('receipt.print_kitchen')}</p>
                     </div>
                  </div>
                  <div className="flex gap-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                    ))}
                  </div>
                </Button>
              )}
           </div>

            {!receiptOnly && (
              <div className="pt-4 flex flex-col items-center gap-4">
                 <Button 
                   onClick={onClose}
                   className="h-20 w-full rounded-[2rem] bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all"
                 >
                   {t('receipt.new_transaction')}
                 </Button>
                 <button 
                   onClick={onClose}
                   className="text-[11px] font-black text-slate-400 hover:text-slate-700 uppercase tracking-[0.5em] transition-all"
                 >
                   {t('receipt.close_portal')}
                 </button>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
