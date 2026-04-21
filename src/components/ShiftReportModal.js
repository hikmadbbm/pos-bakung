"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../lib/api";
import { formatIDR } from "../lib/format";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Printer, CheckCircle2, XCircle, Loader2, AppWindow, ArrowRight, Wallet, TrendingUp, AlertTriangle, FileText, Smartphone } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { useToast } from "./ui/use-toast";
import { usePrinter } from "../lib/printer-context";
import { ESC_POS } from "../lib/printer-commands";
import { cn } from "../lib/utils";

import { useTranslation } from "../lib/language-context";

export default function ShiftReportModal({ isOpen, shiftId, onFinish }) {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const { connectionStatus, print, connect } = usePrinter();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [paperWidth, setPaperWidth] = useState(58);
  const [isPrinting, setIsPrinting] = useState(false);

  const loadReport = useCallback(async () => {
    if (!shiftId || loading) return;
    setLoading(true);
    try {
      const res = await api.get(`/shifts/report?shiftId=${shiftId}`);
      setReport(res);
      setHasAttempted(true);
    } catch (err) {
      console.error("Report Load Error:", err);
      if (!hasAttempted) {
        error(t('shift_report.load_fail'));
        setHasAttempted(true);
      }
    } finally {
      setLoading(false);
    }
  }, [shiftId, hasAttempted]);

  useEffect(() => {
    if (isOpen && shiftId && !report && !hasAttempted && !loading) {
      localStorage.setItem("is_viewing_report", "true");
      loadReport();
    }
    return () => {
      if (!isOpen) {
        localStorage.removeItem("is_viewing_report");
      }
    };
  }, [isOpen, shiftId, report, hasAttempted, loading, loadReport]);

  useEffect(() => {
    if (!isOpen) {
      setHasAttempted(false);
      setReport(null);
      localStorage.removeItem("is_viewing_report");
    }
  }, [isOpen, shiftId]);

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // --- Dynamic payment method logic ---
  const methods = report?.reconciliation?.methodBreakdown || [];
  const isCashName = (name) => ['CASH', 'TUNAI'].includes(name.toUpperCase());
  const activeMethods = methods.filter(m => m.system > 0 || m.actual > 0);

  const cashMethod = activeMethods.find(m => isCashName(m.name)) || { system: 0, actual: 0, discrepancy: 0 };
  const nonCashMethods = activeMethods.filter(m => !isCashName(m.name));

  const startingCash = report?.summary?.starting_cash || 0;

  // Cash Sales = total cash in drawer - opening cash
  const cashSalesExp = Math.max(0, cashMethod.system - startingCash);
  const cashSalesAct = Math.max(0, cashMethod.actual - startingCash);
  const hasCashSales = cashSalesExp > 0 || cashSalesAct > 0;

  // Grand Total = pure sales only (no opening cash)
  const totalExp = cashSalesExp + nonCashMethods.reduce((a, c) => a + c.system, 0);
  const totalAct = cashSalesAct + nonCashMethods.reduce((a, c) => a + c.actual, 0);
  const totalDiff = totalAct - totalExp;

  const totalCashExpenses = report?.summary?.total_cash_expenses || 0;
  const expenseList = report?.summary?.expenses || [];

  const handlePrint = async () => {
    if (!print || !report) return;
    setIsPrinting(true);
    try {
      const width = paperWidth === 80 ? 47 : 31;
      let data = ESC_POS.INIT;
      data += ESC_POS.ALIGN_CENTER;
      data += ESC_POS.BOLD_ON;
      data += ESC_POS.DOUBLE_WIDTH_ON;
      data += `${report.store_name}\n`;
      data += ESC_POS.RESET_SIZE;
      data += `${t('shift_report.report_title_print')}\n`;
      data += ESC_POS.BOLD_Off;
      data += ESC_POS.separator(width);

      data += ESC_POS.ALIGN_LEFT;
      data += `ID SHIFT : #${report.shift_id}\n`;
      data += `KASIR    : ${report.operator_name}\n`;
      data += `${t('shift.started').toUpperCase()}     : ${formatDate(report.opening_time)}\n`;
      data += `${t('shift.stop').toUpperCase()}    : ${formatDate(report.closing_time)}\n`;
      data += ESC_POS.separator(width);

      // Opening Cash at the top, separated
      data += ESC_POS.BOLD_ON;
      data += ESC_POS.formatTwoColumns("OPENING CASH:", formatIDR(startingCash), width);
      data += ESC_POS.BOLD_Off;
      data += ESC_POS.separator(width);

      data += ESC_POS.BOLD_ON + t('shift_report.revenue_details').toUpperCase() + "\n\n" + ESC_POS.BOLD_Off;

      const printRow = (label, s, a, d) => {
        let r = ESC_POS.BOLD_ON + label + ESC_POS.BOLD_Off + "\n";
        r += ESC_POS.formatTwoColumns("  Sistem :", formatIDR(s), width);
        r += ESC_POS.formatTwoColumns("  Aktual :", formatIDR(a), width);
        r += ESC_POS.formatTwoColumns("  Selisih:", formatIDR(d), width);
        return r + "\n";
      };

      // Only print TUNAI if there were cash sales
      if (hasCashSales) {
        data += printRow(t('shift_report.cash_label'), cashSalesExp, cashSalesAct, cashSalesAct - cashSalesExp);
      }

      // Only print non-cash methods that have transactions
      nonCashMethods.forEach(m => {
        data += printRow(m.name.toUpperCase(), m.system, m.actual, m.discrepancy);
      });

      if (totalCashExpenses > 0) {
        data += ESC_POS.BOLD_ON + "EXPENSES (PENGELUARAN KAS):\n" + ESC_POS.BOLD_Off;
        expenseList.forEach(e => {
          data += ESC_POS.formatTwoColumns(`  ${e.item}`, `(${formatIDR(e.amount)})`, width);
        });
        data += ESC_POS.formatTwoColumns("TOTAL EXPENSES:", formatIDR(totalCashExpenses), width);
        data += "\n";
      }

      data += ESC_POS.separator(width);
      data += ESC_POS.BOLD_ON;
      data += ESC_POS.formatTwoColumns(`${t('shift_report.grand_total')}:`, formatIDR(totalAct), width);
      data += ESC_POS.formatTwoColumns(`${t('shift_report.expected_drawer')}:`, formatIDR(startingCash + cashSalesExp), width);
      data += ESC_POS.formatTwoColumns(`${t('shift_report.actual_drawer')}:`, formatIDR(cashMethod.actual), width);
      data += ESC_POS.formatTwoColumns(`${t('shift_report.total_discrepancy')}:`, formatIDR(totalDiff), width);
      data += ESC_POS.BOLD_Off;
      data += ESC_POS.separator(width);

      data += ESC_POS.BOLD_ON + "CATATAN/JUSTIFIKASI:\n" + ESC_POS.BOLD_Off;
      data += `"${report.summary.justification || "No notes provided"}"\n`;
      data += ESC_POS.separator(width);

      data += ESC_POS.ALIGN_CENTER;
      data += "TERIMA KASIH\n";
      data += ESC_POS.FEED_PAPER(4);

      const successNotify = await print(data);
      if (successNotify) success(t('shift_report.print_success'));
    } catch (err) {
      console.error(err);
      error(t('shift_report.print_fail'));
    } finally {
      setIsPrinting(false);
    }
  };

  const handleExportPDF = async () => {
    const element = document.getElementById("shift-receipt-preview");
    if (!element) return;
    
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdfWidth = 80; // Standard 80mm receipt format
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [pdfWidth, pdfHeight]
      });
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Shift-Report-${report.shift_id}.pdf`);
      success("PDF Berhasil Dibuat");
    } catch (e) {
      error("Gagal Memuat PDF");
    }
  };

  const handleShareWA = () => {
    let text = `*LAPORAN SHIFT ${report.store_name}*\n`;
    text += `SHIFT ID: #${report.shift_id}\n`;
    text += `KASIR: ${report.operator_name}\n`;
    text += `BUKA: ${formatDate(report.opening_time)}\n`;
    text += `TUTUP: ${formatDate(report.closing_time)}\n`;
    text += `--------------------------\n`;
    text += `GRAND TOTAL AKTUAL: ${formatIDR(totalAct)}\n`;
    if (totalCashExpenses > 0) {
      text += `PENYELUARAN KAS: ${formatIDR(totalCashExpenses)}\n`;
    }
    text += `OPENING CASH: ${formatIDR(startingCash)}\n`;
    text += `TOTAL SELISIH: ${formatIDR(totalDiff)}\n`;
    
    if (totalDiff !== 0) {
      text += `\n*CATATAN:*\n${report.summary.justification || "-"}`;
    }
    
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onFinish()}>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white flex flex-col max-h-[90dvh]">
        <div className="bg-slate-900 p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight text-yellow-500">{t('shift_report.title')}</h2>
              <p className="text-xs font-bold text-white uppercase tracking-widest mt-1">{t('shift_report.subtitle')}</p>
            </div>
            <div className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2",
              connectionStatus === "connected" ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full", connectionStatus === "connected" ? "bg-emerald-400 animate-pulse" : "bg-rose-400")} />
              {connectionStatus === "connected" ? t('shift_report.printer_connected') : t('shift_report.printer_offline')}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-slate-400 animate-spin" />
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{t('shift_report.aggregating')}</p>
            </div>
          ) : report && (
            <div className="space-y-10 animate-in fade-in duration-700">
              {/* Operational Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="bg-emerald-50/40 p-4 rounded-2xl border border-emerald-100 shadow-sm flex flex-col justify-center min-w-0">
                   <p className="text-[10px] font-bold text-emerald-700/80 uppercase tracking-widest mb-1 truncate">{t('shift_report.opening_fund')}</p>
                   <p className="text-sm font-black text-emerald-800 whitespace-nowrap leading-none">{formatIDR(startingCash)}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center min-w-0">
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 truncate">Total Bills</p>
                   <p className="text-sm font-black text-slate-800 whitespace-nowrap leading-none">{report.summary.total_bill_count}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center min-w-0">
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 truncate">{t('shift_report.avg_ticket')}</p>
                   <p className="text-sm font-black text-slate-800 whitespace-nowrap leading-none">{formatIDR(report.summary.avg_ticket_size)}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center min-w-0">
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 truncate">Void Amount</p>
                   <p className="text-sm font-black text-rose-600 whitespace-nowrap leading-none">{formatIDR(report.summary.total_void_amount)}</p>
                </div>
                <div className="bg-rose-50/40 p-4 rounded-2xl border border-rose-100 shadow-sm flex flex-col justify-center min-w-0">
                   <p className="text-[10px] font-bold text-rose-700/80 uppercase tracking-widest mb-1 truncate">Expenses (Cash)</p>
                   <p className="text-sm font-black text-rose-800 whitespace-nowrap leading-none">{formatIDR(totalCashExpenses)}</p>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center min-w-0 col-span-2 sm:col-span-1">
                   <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1 truncate">{t('shift_report.net_variance')}</p>
                   <p className={cn("text-sm font-black whitespace-nowrap leading-none", totalDiff === 0 ? "text-emerald-500" : "text-rose-600")}>
                     {totalDiff > 0 ? "+" : ""}{formatIDR(totalDiff)}
                   </p>
                </div>
              </div>

              {/* Security Alert if discrepancy exists */}
              {totalDiff !== 0 && (
                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-900 uppercase tracking-widest mb-1">{t('shift_report.justification_required')}</h4>
                    <p className="text-sm font-bold text-amber-800 italic leading-relaxed">
                      &quot;{report.summary.justification || t('shift_report.default_warning')}&quot;
                    </p>
                  </div>
                </div>
              )}

              {/* Receipt Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                   <h3 className="text-xs font-black text-slate-600 uppercase tracking-[0.2em]">{t('shift_report.visual_preview')}</h3>
                   <div className="flex bg-slate-200 p-1 rounded-lg">
                      <button 
                        onClick={() => setPaperWidth(58)}
                        className={cn("px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all", paperWidth === 58 ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
                      >58mm</button>
                      <button 
                        onClick={() => setPaperWidth(80)}
                        className={cn("px-3 py-1.5 rounded-md text-[10px] font-black uppercase transition-all", paperWidth === 80 ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
                      >80mm</button>
                   </div>
                </div>
                
                <div id="shift-receipt-preview" className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 font-mono text-xs text-slate-900 leading-relaxed overflow-hidden">
                   <div className="text-center space-y-1 pb-4">
                      <p className="font-black text-xs uppercase">{report.store_name}</p>
                      <p className="uppercase opacity-70">{t('shift_report.report_title_print')}</p>
                      <div className="pt-2 border-b border-dashed border-slate-200" />
                   </div>
                   
                   <div className="space-y-1 pb-4">
                      <div className="flex justify-between"><span>SHIFT ID :</span><span className="font-black">#{report.shift_id}</span></div>
                      <div className="flex justify-between uppercase opacity-80"><span>{t('common.cashier')} :</span><span>{report.operator_name}</span></div>
                      <div className="flex justify-between opacity-80"><span>{t('shift.started')} :</span><span>{formatDate(report.opening_time)}</span></div>
                      <div className="flex justify-between opacity-80"><span>{t('shift.stop')} :</span><span>{formatDate(report.closing_time)}</span></div>
                      <div className="pt-2 border-b border-dashed border-slate-200" />
                   </div>

                   {/* Opening Cash - separated at the top */}
                   <div className="flex justify-between font-black uppercase pb-2">
                      <span>OPENING CASH</span>
                      <span>{formatIDR(startingCash)}</span>
                   </div>
                   <div className="pt-1 border-b border-dashed border-slate-200 mb-4" />

                   <p className="font-black uppercase text-[10px] tracking-widest text-slate-500 pb-2">{t('shift_report.revenue_details')}</p>
                   
                   <div className="space-y-4">
                      {hasCashSales && (
                      <div className="space-y-0.5">
                         <p className="font-black uppercase leading-none pb-1">{t('shift_report.cash_label')}</p>
                         <div className="flex justify-between opacity-80"><span>{t('shift_report.system_label')} :</span><span>{formatIDR(cashSalesExp)}</span></div>
                         <div className="flex justify-between opacity-80"><span>{t('shift_report.actual_label')} :</span><span>{formatIDR(cashSalesAct)}</span></div>
                         <div className="flex justify-between font-bold"><span>{t('shift_report.diff_label')}:</span><span className={(cashSalesAct-cashSalesExp) === 0 ? "" : "text-rose-600"}>{formatIDR(cashSalesAct-cashSalesExp)}</span></div>
                      </div>
                      )}

                      {nonCashMethods.map((m, idx) => (
                       <div key={idx} className="space-y-0.5">
                          <p className="font-black uppercase leading-none pb-1">{m.name.toUpperCase()}</p>
                          <div className="flex justify-between opacity-80"><span>{t('shift_report.system_label')} :</span><span>{formatIDR(m.system)}</span></div>
                          <div className="flex justify-between opacity-80"><span>{t('shift_report.actual_label')} :</span><span>{formatIDR(m.actual)}</span></div>
                          <div className="flex justify-between font-bold"><span>{t('shift_report.diff_label')}:</span><span className={m.discrepancy === 0 ? "" : "text-rose-600"}>{formatIDR(m.discrepancy)}</span></div>
                       </div>
                      ))}

                      {totalCashExpenses > 0 && (
                        <div className="pt-2">
                           <p className="font-black uppercase text-[10px] tracking-widest text-rose-500 pb-2">EXPENSES (PENGELUARAN KAS)</p>
                           {expenseList.map((e, idx) => (
                             <div key={idx} className="flex justify-between opacity-80 py-0.5">
                                <span>- {e.item}</span>
                                <span>({formatIDR(e.amount)})</span>
                             </div>
                           ))}
                           <div className="flex justify-between font-bold pt-1 border-t border-dotted border-slate-100">
                              <span>TOTAL EXPENSES :</span>
                              <span>{formatIDR(totalCashExpenses)}</span>
                           </div>
                        </div>
                      )}
                      
                      <div className="pt-2 border-b border-dashed border-slate-200" />
                   </div>

                   <div className="space-y-2 pt-4">
                      <div className="flex justify-between font-black uppercase text-xs">
                         <span>{t('shift_report.grand_total')}</span>
                         <span>{formatIDR(totalAct)}</span>
                      </div>
                      <div className="flex justify-between font-bold uppercase text-[10px] opacity-80">
                         <span>{t('shift_report.expected_drawer')}</span>
                         <span>{formatIDR(startingCash + cashSalesExp)}</span>
                      </div>
                      <div className="flex justify-between font-bold uppercase text-[10px] opacity-80">
                         <span>{t('shift_report.actual_drawer')}</span>
                         <span>{formatIDR(cashMethod.actual)}</span>
                      </div>
                      <div className="flex justify-between font-black uppercase text-xs">
                         <span>{t('shift_report.total_discrepancy')}</span>
                         <span className={totalDiff === 0 ? "opacity-50" : "text-rose-700"}>{formatIDR(totalDiff)}</span>
                      </div>
                   </div>

                   <div className="mt-6 pt-4 border-t border-dashed border-slate-200 text-center">
                      <p className="text-[10px] font-black tracking-[0.2em] opacity-50">{t('shift_report.authorized_sequence')}</p>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-white border-t border-slate-100 flex-row flex-wrap sm:flex-nowrap gap-2 items-center justify-between">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
                variant="outline" 
                onClick={connectionStatus === "connected" ? () => {} : connect}
                className="h-10 rounded-xl px-3 font-black uppercase tracking-widest text-[9px] gap-2 border-slate-200"
                disabled={connectionStatus === "connected"}
            >
              {connectionStatus === "connected" ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <Printer className="w-3 h-3" />}
              {connectionStatus === "connected" ? "ACTIVE" : t('shift_report.pair')}
            </Button>
            <Button 
                onClick={handlePrint}
                disabled={isPrinting || connectionStatus !== "connected"}
                className="h-10 rounded-xl px-4 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[9px] gap-2 shadow-sm"
            >
              {isPrinting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Printer className="w-3 h-3" />}
              {t('shift_report.print')}
            </Button>
          </div>

          <div className="flex gap-2 w-full sm:w-auto justify-center">
            <Button 
                onClick={handleExportPDF}
                className="h-10 w-full sm:w-auto rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm border-none text-[9px] font-black"
                variant="outline"
            >
              <FileText className="w-3.5 h-3.5 mr-1" /> PDF
            </Button>
            <Button 
                onClick={handleShareWA}
                className="h-10 w-full sm:w-auto rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm border-none text-[9px] font-black"
                variant="outline"
            >
              <Smartphone className="w-3.5 h-3.5 mr-1" /> WA
            </Button>
          </div>

          <Button 
            onClick={onFinish}
            className="h-10 w-full sm:w-auto px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-[0.1em] text-[10px] shadow-md shadow-emerald-600/10"
          >
            {t('common.finish').toUpperCase()} <ArrowRight className="w-3 h-3 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
