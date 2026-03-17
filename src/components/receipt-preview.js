"use client";
import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { formatIDR } from "../lib/format";
import { Printer, Mail, Share2, Download, Smartphone } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { useToast } from "./ui/use-toast";
import { usePrinter } from "../lib/printer-context";
import { api } from "../lib/api";
import { ESC_POS } from "../lib/printer-commands";

export function ReceiptPreview({ isOpen, onClose, order }) {
  const { success, error } = useToast();
  const { device, connect, print } = usePrinter();
  const receiptRef = useRef(null);
  const [printing, setPrinting] = useState(false);
  const [storeConfig, setStoreConfig] = useState({
    store_name: "BAKMIE YOU-TJE",
    address: "Jl. Bakung No. 123, Jakarta",
    phone: "0812-3456-7890",
    receipt_footer: "Thank you for visiting!\nPlease come again."
  });

  const loadStoreConfig = async () => {
    try {
      const res = await api.get("/settings/config");
      if (res) setStoreConfig(res);
    } catch (e) {
      console.error("Failed to load store config", e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStoreConfig();
    }
  }, [isOpen]);

  if (!order) return null;

  const handlePrint = async () => {
    // Bluetooth Thermal Printer Logic (RP58) via Context
    if (print && (device || localStorage.getItem("saved_printer_name"))) {
      try {
        let data = ESC_POS.INIT;
        
        // Header
        data += ESC_POS.ALIGN_CENTER;
        data += ESC_POS.BOLD_ON;
        data += ESC_POS.DOUBLE_WIDTH_ON;
        data += (storeConfig.store_name || "BAKMIE YOU-TJE") + "\n";
        data += ESC_POS.RESET_SIZE;
        data += ESC_POS.BOLD_Off;
        
        data += (storeConfig.address || "") + "\n";
        if (storeConfig.phone) data += `Tel: ${storeConfig.phone}\n`;
        data += ESC_POS.separator();
        
        // Order info
        data += ESC_POS.ALIGN_LEFT;
        data += `Order: ${order.order_number}\n`;
        data += `Date: ${new Date(order.date).toLocaleString()}\n`;
        if (order.customer_name) {
          data += `Customer: ${order.customer_name}\n`;
        }
        data += ESC_POS.separator();
        
        // Items
        order.orderItems.forEach(item => {
          data += `${item.menu?.name}\n`;
          data += ESC_POS.formatTwoColumns(
            `${item.qty} x ${formatIDR(item.price)}`,
            formatIDR(item.qty * item.price)
          );
        });
        
        data += ESC_POS.separator();
        
        // Totals
        data += ESC_POS.formatTwoColumns("Subtotal", formatIDR(order.total));
        if (order.discount > 0) {
          data += ESC_POS.formatTwoColumns("Discount", `-${formatIDR(order.discount)}`);
        }
        
        data += ESC_POS.BOLD_ON;
        data += ESC_POS.formatTwoColumns("TOTAL", formatIDR(Math.max(0, order.total - (order.discount || 0))));
        data += ESC_POS.BOLD_Off;
        
        // Footer
        data += ESC_POS.separator();
        data += ESC_POS.ALIGN_CENTER;
        data += (storeConfig.receipt_footer || "Thank You!") + "\n";
        data += ESC_POS.FEED_PAPER(4);
        
        const result = await print(data);
        if (result) {
          success("Sent to printer!");
          return;
        }
      } catch (e) {
        console.error("Bluetooth print failed", e);
      }
    } else {
       // Try to connect if supported
       if (navigator.bluetooth) {
         try {
           await connect();
           // User needs to click print again after connecting, or we can auto-print but let's keep it simple
           return;
         } catch (e) {
           // Fallback to browser print
         }
       }
    }

    // Browser Print Fallback
    const printContent = receiptRef.current;
    const windowUrl = 'about:blank';
    const uniqueName = new Date();
    const windowName = 'Print' + uniqueName.getTime();
    const printWindow = window.open(windowUrl, windowName, 'left=50000,top=50000,width=0,height=0');
    
    if (printWindow) {
      // Basic styling for receipt
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Receipt</title>
            <style>
              body { font-family: monospace; font-size: 12px; width: 300px; margin: 0; padding: 10px; }
              .text-center { text-align: center; }
              .flex { display: flex; justify-content: space-between; }
              .flex-col { display: flex; flex-direction: column; }
              .items-center { align-items: center; }
              .border-b { border-bottom: 1px dashed #000; margin: 10px 0; }
              .bold { font-weight: bold; }
              .space-y-1 > * + * { margin-top: 0.25rem; }
              .text-xs { font-size: 0.75rem; line-height: 1rem; }
              .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
              .font-bold { font-weight: 700; }
              .text-red-600 { color: #dc2626; }
            </style>
          </head>
          <body>
            ${printContent.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const handleDownloadPDF = async () => {
    if (!receiptRef.current) return;
    try {
      // Create a temporary clone to render without interference
      const original = receiptRef.current;
      const clone = original.cloneNode(true);
      
      // Reset styles on clone to ensure clean capture
      clone.style.transform = "none";
      clone.style.boxShadow = "none";
      clone.style.border = "none";
      clone.style.margin = "0";
      clone.style.position = "fixed";
      clone.style.top = "-9999px";
      clone.style.left = "0";
      clone.style.width = "80mm"; // Force width
      clone.style.backgroundColor = "#ffffff";
      
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, { 
        scale: 4, // Higher scale for better quality
        useCORS: true, 
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      document.body.removeChild(clone);

      const imgData = canvas.toDataURL("image/png");
      
      // Calculate PDF dimensions based on the canvas
      const pdfWidth = 80; // 80mm standard
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const pdfHeight = (imgHeight * pdfWidth) / imgWidth;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [pdfWidth, pdfHeight] // Dynamic height
      });
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt-${order.order_number}.pdf`);
      success("Receipt PDF downloaded!");
    } catch (e) {
      console.error(e);
      error("Failed to generate PDF");
    }
  };

  const handleShareWhatsApp = () => {
    const text = `*RECEIPT POS BAKUNG*\nOrder: ${order.order_number}\nTotal: ${formatIDR(order.total)}\n\nThank you for your order!`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleShareEmail = () => {
    const subject = `Receipt for Order ${order.order_number}`;
    const body = `Thank you for your order!\n\nOrder Number: ${order.order_number}\nTotal: ${formatIDR(order.total)}\nDate: ${new Date(order.date).toLocaleString()}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Receipt Preview</DialogTitle>
        </DialogHeader>
      <div className="flex flex-col items-center space-y-4">
        {/* Receipt Content */}
        <div 
          ref={receiptRef}
          className="bg-white p-4 w-[300px] border border-gray-200 shadow-sm text-xs font-mono"
          style={{ fontFamily: "'Courier New', Courier, monospace" }}
        >
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold">{storeConfig.store_name || "BAKMIE YOU-TJE"}</h2>
            <p className="whitespace-pre-wrap">{storeConfig.address}</p>
            {storeConfig.phone && <p>Tel: {storeConfig.phone}</p>}
          </div>
          
          <div className="border-b border-dashed border-gray-400 my-2"></div>
          
          <div className="flex justify-between">
            <span>{new Date(order.date).toLocaleDateString()}</span>
            <span>{new Date(order.date).toLocaleTimeString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Order #:</span>
            <span>{order.order_number}</span>
          </div>
          <div className="flex justify-between">
            <span>Cashier:</span>
            <span>Admin</span> 
          </div>
          {order.customer_name && (
            <div className="flex justify-between">
              <span>Customer:</span>
              <span>{order.customer_name}</span> 
            </div>
          )}

          <div className="border-b border-dashed border-gray-400 my-2"></div>

          <div className="space-y-1">
            {order.orderItems?.map((item, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="truncate w-32">{item.menu?.name || "Item"}</span>
                <div className="flex gap-2">
                  <span>{item.qty}x</span>
                  <span>{formatIDR(item.price * item.qty)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="border-b border-dashed border-gray-400 my-2"></div>

          <div className="space-y-1 font-bold">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatIDR(order.total)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount</span>
                <span>-{formatIDR(order.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg">
              <span>TOTAL</span>
              <span>{formatIDR(Math.max(0, order.total - (order.discount || 0)))}</span>
            </div>
          </div>

          <div className="border-b border-dashed border-gray-400 my-2"></div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Payment</span>
              <span>{order.payment_method}</span>
            </div>
            {order.payment_method === 'CASH' && (
              <>
                <div className="flex justify-between">
                  <span>Cash</span>
                  <span>{formatIDR(order.money_received)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Change</span>
                  <span>{formatIDR(order.change_amount)}</span>
                </div>
              </>
            )}
          </div>

          <div className="mt-4 text-center whitespace-pre-wrap">
            <p>{storeConfig.receipt_footer}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 w-full">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="w-4 h-4 mr-2" /> Save PDF
          </Button>
          <Button variant="outline" onClick={handleShareWhatsApp}>
            <Smartphone className="w-4 h-4 mr-2" /> WhatsApp
          </Button>
          <Button variant="outline" onClick={handleShareEmail}>
            <Mail className="w-4 h-4 mr-2" /> Email
          </Button>
        </div>
        
        <Button className="w-full mt-2" onClick={onClose}>
          Close & New Order
        </Button>
      </div>
      </DialogContent>
    </Dialog>
  );
}
