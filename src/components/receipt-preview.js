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
import { cn } from "../lib/utils";

export function ReceiptPreview({ isOpen, onClose, order, config: propConfig }) {
  const { success, error } = useToast();
  const { device, connect, print } = usePrinter();
  const [printingReceipt, setPrintingReceipt] = useState(false);
  const [printingKitchen, setPrintingKitchen] = useState(false);
  const [previewMode, setPreviewMode] = useState("receipt"); // "receipt" or "kitchen"
  const [storeConfig, setStoreConfig] = useState({
    store_name: "BAKMIE YOU-TJE",
    address: "Jl. Bakung No. 123, Jakarta",
    phone: "0812-3456-7890",
    receipt_footer: "Thank you for visiting!",
    paper_width: 58,
    show_logo: false,
    show_customer: true,
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
    }
  }, [isOpen, loadStoreConfig, propConfig]);

  if (!order) return null;

  const width = storeConfig.paper_width === 80 ? 47 : 31;

  const handlePrintReceipt = async () => {
    if (!print) return;
    setPrintingReceipt(true);
    try {
      let data = ESC_POS.INIT;
      
      if (storeConfig.show_logo && storeConfig.logo_url) {
         try {
           const imgData = await new Promise((resolve) => {
             const img = new Image();
             img.crossOrigin = "Anonymous";
             img.onload = () => {
               const canvas = document.createElement("canvas");
               const ctx = canvas.getContext("2d");
               const maxWidth = storeConfig.paper_width === 80 ? 576 : 384; 
               let w = img.width;
               let h = img.height;
               if (w > maxWidth) {
                 h = Math.round((h * maxWidth) / w);
                 w = maxWidth;
               }
               w = Math.floor(w / 8) * 8; 
               canvas.width = w;
               canvas.height = h;
               ctx.fillStyle = "white";
               ctx.fillRect(0, 0, w, h);
               ctx.drawImage(img, 0, 0, w, h);
               
               const pixels = ctx.getImageData(0, 0, w, h).data;
               let str = '\x1D\x76\x30\x00' + String.fromCharCode((w/8)%256, Math.floor((w/8)/256), h%256, Math.floor(h/256));
               for (let y = 0; y < h; y++) {
                 for (let x = 0; x < w / 8; x++) {
                   let byte = 0;
                   for (let b = 0; b < 8; b++) {
                     const idx = (y * w + (x * 8 + b)) * 4;
                     const lum = 0.299 * pixels[idx] + 0.587 * pixels[idx+1] + 0.114 * pixels[idx+2];
                     if (pixels[idx+3] > 128 && lum < 128) byte |= (1 << (7 - b));
                   }
                   str += String.fromCharCode(byte);
                 }
               }
               resolve(str);
             };
             img.onerror = () => resolve("");
             img.src = storeConfig.logo_url;
           });
           
           if (imgData) {
              data += ESC_POS.ALIGN_CENTER;
              data += imgData;
              data += ESC_POS.FEED_PAPER(1);
           }
         } catch(e) { console.warn("Logo failed", e); }
      }
      
      data += ESC_POS.ALIGN_CENTER;
      data += ESC_POS.BOLD_ON;
      data += ESC_POS.DOUBLE_WIDTH_ON;
      data += (storeConfig.store_name || "BAKMIE YOU-TJE") + "\n";
      data += ESC_POS.RESET_SIZE;
      data += ESC_POS.BOLD_Off;
      
      data += (storeConfig.address || "") + "\n";
      if (storeConfig.phone) data += `Tel: ${storeConfig.phone}\n`;
      if (storeConfig.instagram) data += `IG: ${storeConfig.instagram}\n`;
      if (storeConfig.whatsapp) data += `WA: ${storeConfig.whatsapp}\n`;
      data += ESC_POS.separator(width);
      
      data += ESC_POS.ALIGN_LEFT;
      data += `REF: ${order.order_number}\n`;
      data += `DATE: ${new Date(order.date).toLocaleString()}\n`;
      if (storeConfig.show_customer && order.customer_name) {
        data += `GUEST: ${order.customer_name}\n`;
      }
      data += ESC_POS.separator(width);
      
      order.orderItems.forEach(item => {
        const line = `${item.qty}x ${item.menu?.name}`;
        data += ESC_POS.formatTwoColumns(line, formatIDR(item.qty * item.price), width);
      });
      
      data += ESC_POS.separator(width);
      
      data += ESC_POS.formatTwoColumns("Subtotal", formatIDR(order.total), width);
      
      let finalTotal = order.total;
      
      if (storeConfig.service_charge > 0) {
        const serviceAmount = Math.round(order.total * (storeConfig.service_charge / 100));
        data += ESC_POS.formatTwoColumns(`Service (${storeConfig.service_charge}%)`, formatIDR(serviceAmount), width);
        finalTotal += serviceAmount;
      }
      
      if (storeConfig.tax_rate > 0) {
        const taxAmount = Math.round(finalTotal * (storeConfig.tax_rate / 100));
        data += ESC_POS.formatTwoColumns(`Tax (${storeConfig.tax_rate}%)`, formatIDR(taxAmount), width);
        finalTotal += taxAmount;
      }

      if (order.discount > 0) {
        data += ESC_POS.formatTwoColumns("Discount", `-${formatIDR(order.discount)}`, width);
        finalTotal -= order.discount;
      }
      
      data += ESC_POS.BOLD_ON;
      data += ESC_POS.formatTwoColumns("TOTAL", formatIDR(Math.max(0, finalTotal)), width);
      data += ESC_POS.BOLD_Off;
      
      data += ESC_POS.separator(width);
      data += ESC_POS.ALIGN_CENTER;
      data += (storeConfig.receipt_footer || "THANK YOU!") + "\n";
      data += ESC_POS.FEED_PAPER(4);
      
      await print(data);
      success("Receipt printed");
    } catch (e) {
      console.error("Print failed", e);
      error("Printer communication failed");
    } finally {
      setPrintingReceipt(false);
    }
  };

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
        return;
      }

      const copies = storeConfig.kitchen_copies || 1;
      for (let i = 0; i < copies; i++) {
        let data = ESC_POS.INIT;
        data += ESC_POS.ALIGN_CENTER;
        data += ESC_POS.DOUBLE_SIZE_ON;
        data += "KITCHEN TICKET\n";
        if (copies > 1) data += `COPY ${i + 1}/${copies}\n`;
        data += ESC_POS.RESET_SIZE;
        data += ESC_POS.separator(width);
        
        data += ESC_POS.ALIGN_LEFT;
        data += ESC_POS.BOLD_ON;
        data += `REF: ${order.order_number}\n`;
        data += `TIME: ${new Date(order.date).toLocaleTimeString()}\n`;
        if (order.customer_name) data += `GUEST: ${order.customer_name}\n`;
        data += ESC_POS.BOLD_Off;
        data += ESC_POS.separator(width);
        
        itemsToPrint.forEach(item => {
          data += ESC_POS.DOUBLE_HEIGHT_ON;
          data += `[ ] ${item.qty} x ${item.menu?.name}\n`;
          data += ESC_POS.RESET_SIZE;
          if (order.note) data += `    * ${order.note}\n`;
        });
        
        data += ESC_POS.separator(width);
        data += ESC_POS.FEED_PAPER(4);
        
        await print(data);
      }
      success("Kitchen ticket sent");
    } catch (e) {
      console.error("Kitchen print failed", e);
      error("Kitchen printer failed");
    } finally {
      setPrintingKitchen(false);
    }
  }, [print, storeConfig.kitchen_enabled, storeConfig.kitchen_copies, storeConfig.kitchen_categories, order, width, success, error]);

  useEffect(() => {
    if (isOpen && storeConfig.kitchen_auto_print && storeConfig.kitchen_enabled && order && order.order_number !== "TRX-PREVIEW-999") {
      handlePrintKitchen();
    }
  }, [isOpen, storeConfig.kitchen_auto_print, storeConfig.kitchen_enabled, order, handlePrintKitchen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-slate-50">
        <div className="bg-emerald-600 p-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10">
             <CheckCircle2 className="w-24 h-24 -rotate-12" />
          </div>
          <div className="relative z-10 flex justify-between items-end">
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tight">Sequence Success</h3>
              <p className="text-[10px] font-bold text-emerald-100 uppercase tracking-widest">Topology Visualization Node</p>
            </div>
            <div className="flex bg-black/20 p-1 rounded-xl backdrop-blur-md">
               <button 
                onClick={() => setPreviewMode("receipt")}
                className={cn("px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all", previewMode === "receipt" ? "bg-white text-emerald-600 shadow-lg" : "text-emerald-50")}
               >POS</button>
               <button 
                onClick={() => setPreviewMode("kitchen")}
                className={cn("px-4 py-2 rounded-lg text-[9px] font-black uppercase transition-all", previewMode === "kitchen" ? "bg-white text-emerald-600 shadow-lg" : "text-emerald-50")}
               >Kitchen</button>
            </div>
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
                    <div className="p-6 font-mono text-[10px] text-slate-800 space-y-4 animate-in fade-in duration-500 min-h-[400px]">
                      <div className="text-center space-y-2 pb-2">
                        {storeConfig.show_logo && storeConfig.logo_url && (
                          <div className="flex justify-center mb-4">
                            <img src={storeConfig.logo_url} alt="Logo" className="max-w-[120px] max-h-[80px] object-contain filter grayscale contrast-125" />
                          </div>
                        )}
                        <h4 className="font-black text-base uppercase leading-tight tracking-tighter">{storeConfig.store_name}</h4>
                        <p className="text-[7.5px] leading-relaxed opacity-60 px-4">{storeConfig.address}</p>
                        {(storeConfig.phone || storeConfig.instagram || storeConfig.whatsapp) && (
                          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-[7px] opacity-50 font-black uppercase pt-1">
                            {storeConfig.phone && <span className="flex items-center gap-1">Tel: {storeConfig.phone}</span>}
                            {storeConfig.instagram && <span className="flex items-center gap-1">IG: {storeConfig.instagram}</span>}
                            {storeConfig.whatsapp && <span className="flex items-center gap-1">WA: {storeConfig.whatsapp}</span>}
                          </div>
                        )}
                      </div>

                      <div className="border-b-[1.5px] border-dashed border-slate-200" />
                      
                      <div className="space-y-1 py-1">
                        <div className="flex justify-between"><span>REF:</span><span className="font-black">{order.order_number}</span></div>
                        <div className="flex justify-between"><span>DATE:</span><span>{new Date(order.date).toLocaleString()}</span></div>
                        {storeConfig.show_customer && order.customer_name && (
                          <div className="flex justify-between"><span>GUEST:</span><span className="font-black">{order.customer_name}</span></div>
                        )}
                      </div>
                      
                      <div className="border-b-[1.5px] border-dashed border-slate-200" />
                      
                      <div className="space-y-2 py-2">
                        {order.orderItems?.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-start gap-4">
                            <p className="font-black uppercase flex-1 leading-tight">{item.qty}x {item.menu?.name}</p>
                            <span className="font-black text-[10px] tabular-nums whitespace-nowrap">{formatIDR(item.qty * item.price)}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="border-b-[1.5px] border-dashed border-slate-200" />
                      
                      <div className="space-y-1.5 py-1">
                        <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{formatIDR(order.total)}</span></div>
                        
                        {storeConfig.service_charge > 0 && (
                          <div className="flex justify-between opacity-70">
                            <span>Service ({storeConfig.service_charge}%)</span>
                            <span className="tabular-nums">{formatIDR(Math.round(order.total * (storeConfig.service_charge / 100)))}</span>
                          </div>
                        )}
                        
                        {storeConfig.tax_rate > 0 && (
                          <div className="flex justify-between opacity-70">
                            <span>Tax ({storeConfig.tax_rate}%)</span>
                            <span className="tabular-nums">
                              {formatIDR(Math.round((order.total + (storeConfig.service_charge > 0 ? order.total * (storeConfig.service_charge / 100) : 0)) * (storeConfig.tax_rate / 100)))}
                            </span>
                          </div>
                        )}
                        
                        {order.discount > 0 && (
                          <div className="flex justify-between font-bold">
                            <span>Discount</span>
                            <span className="tabular-nums">-{formatIDR(order.discount)}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between font-black text-sm pt-3 border-t-[1.5px] border-slate-900/5 mt-2">
                          <span className="tracking-tighter uppercase">TOTAL</span>
                          <span className="tabular-nums">{formatIDR(Math.max(0, 
                            order.total + 
                            Math.round(order.total * (storeConfig.service_charge / 100 || 0)) + 
                            Math.round((order.total + (order.total * (storeConfig.service_charge / 100 || 0))) * (storeConfig.tax_rate / 100 || 0)) - 
                            (order.discount || 0)
                          ))}</span>
                        </div>
                      </div>

                      <div className="text-center pt-6 space-y-2">
                        <div className="border-b-[1.5px] border-dashed border-slate-200" />
                        <p className="opacity-40 italic py-2 text-[8px] leading-relaxed uppercase">{storeConfig.receipt_footer}</p>
                        <div className="border-b-[1.5px] border-dashed border-slate-200" />
                        <p className="text-[6px] opacity-20 font-black tracking-[0.3em] pt-1">SEQUENCE BY BAKUNG POS</p>
                      </div>
                    </div>
                ) : (
                  <div className="p-8 font-mono text-sm text-slate-900 space-y-4 bg-white animate-in fade-in slide-in-from-right-4 duration-500 border-2 border-dashed border-slate-100">
                    <div className="text-center pb-2">
                       <h4 className="font-black uppercase tracking-tighter text-xl">KITCHEN TICKET</h4>
                    </div>
                    
                    <div className="border-b-[1.5px] border-dashed border-slate-200" />
                    
                    <div className="space-y-1">
                       <div className="flex justify-between font-black">
                          <span>REF: {order.order_number}</span>
                       </div>
                       <div className="flex justify-between font-black">
                          <span>TIME: {new Date(order.date).toLocaleTimeString()}</span>
                       </div>
                       {order.customer_name && (
                         <div className="flex justify-between font-black">
                            <span>GUEST: {order.customer_name}</span>
                         </div>
                       )}
                    </div>

                    <div className="border-b-[1.5px] border-dashed border-slate-200" />

                    <div className="space-y-4 py-2">
                      {order.orderItems?.map((item, idx) => (
                        <div key={idx} className="space-y-1">
                           <div className="font-black text-lg leading-tight tabular-nums uppercase">
                              [ ] {item.qty} x {item.menu?.name}
                           </div>
                           {order.note && (
                              <div className="pl-8 font-bold text-xs uppercase opacity-80">
                                * {order.note}
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
                      <p className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] leading-none mb-1">POS Hardware</p>
                      <p className="text-lg font-black uppercase tracking-widest">Print Receipt</p>
                   </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                   <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </Button>

              {storeConfig.kitchen_enabled && (
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
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Kitchen Queue</p>
                        <p className="text-lg font-black uppercase tracking-widest">Print Kitchen</p>
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

           <div className="pt-4 flex flex-col items-center gap-4">
              <Button 
                onClick={onClose}
                className="h-20 w-full rounded-[2rem] bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-[0.3em] shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all"
              >
                New Transaction
              </Button>
              <button 
                onClick={onClose}
                className="text-[10px] font-black text-slate-300 hover:text-slate-600 uppercase tracking-[0.5em] transition-all"
              >
                Close Portal
              </button>
           </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
