"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../lib/api";
import { formatIDR } from "../lib/format";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Printer, CheckCircle2, XCircle, Loader2, AppWindow, ArrowRight, Wallet, TrendingUp, AlertTriangle } from "lucide-react";
import { useToast } from "./ui/use-toast";
import { usePrinter } from "../lib/printer-context";
import { ESC_POS } from "../lib/printer-commands";
import { cn } from "../lib/utils";

export default function ShiftReportModal({ isOpen, shiftId, onFinish }) {
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
      const res = await api.get(`/shifts/${shiftId}/report`);
      setReport(res);
      setHasAttempted(true);
    } catch (err) {
      console.error("Report Load Error:", err);
      if (!hasAttempted) {
        error("Failed to load shift report");
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
      data += "LAPORAN PENUTUPAN SHIFT\n";
      data += ESC_POS.BOLD_Off;
      data += ESC_POS.separator(width);

      data += ESC_POS.ALIGN_LEFT;
      data += `ID SHIFT : #${report.shift_id}\n`;
      data += `KASIR    : ${report.operator_name}\n`;
      data += `BUKA     : ${formatDate(report.opening_time)}\n`;
      data += `TUTUP    : ${formatDate(report.closing_time)}\n`;
      data += ESC_POS.separator(width);

      // Opening Cash at the top, separated
      data += ESC_POS.BOLD_ON;
      data += ESC_POS.formatTwoColumns("OPENING CASH:", formatIDR(startingCash), width);
      data += ESC_POS.BOLD_Off;
      data += ESC_POS.separator(width);

      data += ESC_POS.BOLD_ON + "RINCIAN PENDAPATAN\n\n" + ESC_POS.BOLD_Off;

      const printRow = (label, s, a, d) => {
        let r = ESC_POS.BOLD_ON + label + ESC_POS.BOLD_Off + "\n";
        r += ESC_POS.formatTwoColumns("  Sistem :", formatIDR(s), width);
        r += ESC_POS.formatTwoColumns("  Aktual :", formatIDR(a), width);
        r += ESC_POS.formatTwoColumns("  Selisih:", formatIDR(d), width);
        return r + "\n";
      };

      // Only print TUNAI if there were cash sales
      if (hasCashSales) {
        data += printRow("TUNAI", cashSalesExp, cashSalesAct, cashSalesAct - cashSalesExp);
      }

      // Only print non-cash methods that have transactions
      nonCashMethods.forEach(m => {
        data += printRow(m.name.toUpperCase(), m.system, m.actual, m.discrepancy);
      });

      data += ESC_POS.separator(width);
      data += ESC_POS.BOLD_ON;
      data += ESC_POS.formatTwoColumns("GRAND TOTAL:", formatIDR(totalAct), width);
      data += ESC_POS.formatTwoColumns("EXPECTED DRAWER:", formatIDR(startingCash + cashSalesExp), width);
      data += ESC_POS.formatTwoColumns("ACTUAL DRAWER:", formatIDR(cashMethod.actual), width);
      data += ESC_POS.formatTwoColumns("TOTAL SELISIH:", formatIDR(totalDiff), width);
      data += ESC_POS.BOLD_Off;
      data += ESC_POS.separator(width);

      data += ESC_POS.BOLD_ON + "CATATAN/JUSTIFIKASI:\n" + ESC_POS.BOLD_Off;
      data += `"${report.summary.justification || "No notes provided"}"\n`;
      data += ESC_POS.separator(width);

      data += ESC_POS.ALIGN_CENTER;
      data += "TERIMA KASIH\n";
      data += ESC_POS.FEED_PAPER(4);

      const successNotify = await print(data);
      if (successNotify) success("Laporan Berhasil Dicetak");
    } catch (err) {
      console.error(err);
      error("Gagal mencetak laporan");
    } finally {
      setIsPrinting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white flex flex-col max-h-[90dvh]">
        <div className="bg-slate-900 p-8 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Shift Report Data</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Authorized Reconciliation Node</p>
            </div>
            <div className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2",
              connectionStatus === "connected" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            )}>
              <div className={cn("w-1.5 h-1.5 rounded-full", connectionStatus === "connected" ? "bg-emerald-400 animate-pulse" : "bg-rose-400")} />
              {connectionStatus === "connected" ? "Printer Connected" : "Printer Offline"}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 text-slate-300 animate-spin" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregating Sales Matrix...</p>
            </div>
          ) : report && (
            <div className="space-y-10 animate-in fade-in duration-700">
              {/* Operational Summary Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                <div className="bg-emerald-50/40 p-4 sm:p-5 rounded-2xl border border-emerald-100 shadow-sm">
                   <p className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-wider mb-2">Opening Fund</p>
                   <p className="text-sm sm:text-lg font-black text-emerald-700">{formatIDR(startingCash)}</p>
                </div>
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm">
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Total Bills</p>
                   <p className="text-sm sm:text-lg font-black text-slate-800">{report.summary.total_bill_count}</p>
                </div>
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm">
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Avg Ticket</p>
                   <p className="text-sm sm:text-lg font-black text-slate-800">{formatIDR(report.summary.avg_ticket_size)}</p>
                </div>
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm">
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Void Amount</p>
                   <p className="text-sm sm:text-lg font-black text-rose-500">{formatIDR(report.summary.total_void_amount)}</p>
                </div>
                <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-100 shadow-sm col-span-2 lg:col-span-1">
                   <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Net Variance</p>
                   <p className={cn("text-sm sm:text-lg font-black text-slate-800", totalDiff === 0 ? "text-emerald-500" : "text-rose-600")}>
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
                    <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest mb-1">Field Justification Required</h4>
                    <p className="text-xs font-bold text-amber-700/80 italic leading-relaxed">
                      &quot;{report.summary.justification || "Warning: Finalization authorized without detailed note sequence."}&quot;
                    </p>
                  </div>
                </div>
              )}

              {/* Receipt Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                   <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Visual Struc Preview</h3>
                   <div className="flex bg-slate-200 p-1 rounded-lg">
                      <button 
                        onClick={() => setPaperWidth(58)}
                        className={cn("px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all", paperWidth === 58 ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
                      >58mm</button>
                      <button 
                        onClick={() => setPaperWidth(80)}
                        className={cn("px-3 py-1.5 rounded-md text-[9px] font-black uppercase transition-all", paperWidth === 80 ? "bg-white text-slate-900 shadow-sm" : "text-slate-500")}
                      >80mm</button>
                   </div>
                </div>
                
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 font-mono text-[10px] text-slate-800 leading-relaxed overflow-hidden">
                   <div className="text-center space-y-1 pb-4">
                      <p className="font-black text-xs uppercase">{report.store_name}</p>
                      <p className="uppercase opacity-70">Laporan Penutupan Shift</p>
                      <div className="pt-2 border-b border-dashed border-slate-200" />
                   </div>
                   
                   <div className="space-y-1 pb-4">
                      <div className="flex justify-between"><span>SHIFT ID :</span><span className="font-black">#{report.shift_id}</span></div>
                      <div className="flex justify-between uppercase opacity-60"><span>Kasir :</span><span>{report.operator_name}</span></div>
                      <div className="flex justify-between opacity-60"><span>Mulai :</span><span>{formatDate(report.opening_time)}</span></div>
                      <div className="flex justify-between opacity-60"><span>Selesai :</span><span>{formatDate(report.closing_time)}</span></div>
                      <div className="pt-2 border-b border-dashed border-slate-200" />
                   </div>

                   {/* Opening Cash - separated at the top */}
                   <div className="flex justify-between font-black uppercase pb-2">
                      <span>OPENING CASH</span>
                      <span>{formatIDR(startingCash)}</span>
                   </div>
                   <div className="pt-1 border-b border-dashed border-slate-200 mb-4" />

                   <p className="font-black uppercase text-[8px] tracking-widest text-slate-400 pb-2">Rincian Pendapatan (Sales)</p>
                   
                   <div className="space-y-4">
                      {hasCashSales && (
                      <div className="space-y-0.5">
                         <p className="font-black uppercase leading-none pb-1">TUNAI</p>
                         <div className="flex justify-between opacity-60"><span>Sistem :</span><span>{formatIDR(cashSalesExp)}</span></div>
                         <div className="flex justify-between opacity-60"><span>Aktual :</span><span>{formatIDR(cashSalesAct)}</span></div>
                         <div className="flex justify-between font-bold"><span>Selisih:</span><span className={(cashSalesAct-cashSalesExp) === 0 ? "" : "text-rose-500"}>{formatIDR(cashSalesAct-cashSalesExp)}</span></div>
                      </div>
                      )}

                      {nonCashMethods.map((m, idx) => (
                       <div key={idx} className="space-y-0.5">
                          <p className="font-black uppercase leading-none pb-1">{m.name.toUpperCase()}</p>
                          <div className="flex justify-between opacity-60"><span>Sistem :</span><span>{formatIDR(m.system)}</span></div>
                          <div className="flex justify-between opacity-60"><span>Aktual :</span><span>{formatIDR(m.actual)}</span></div>
                          <div className="flex justify-between font-bold"><span>Selisih:</span><span className={m.discrepancy === 0 ? "" : "text-rose-500"}>{formatIDR(m.discrepancy)}</span></div>
                       </div>
                     ))}
                      <div className="pt-2 border-b border-dashed border-slate-200" />
                   </div>

                   <div className="space-y-2 pt-4">
                      <div className="flex justify-between font-black uppercase text-xs">
                         <span>GRAND TOTAL</span>
                         <span>{formatIDR(totalAct)}</span>
                      </div>
                      <div className="flex justify-between font-bold uppercase text-[9px] opacity-70">
                         <span>EXPECTED DRAWER</span>
                         <span>{formatIDR(startingCash + cashSalesExp)}</span>
                      </div>
                      <div className="flex justify-between font-bold uppercase text-[9px] opacity-70">
                         <span>ACTUAL DRAWER</span>
                         <span>{formatIDR(cashMethod.actual)}</span>
                      </div>
                      <div className="flex justify-between font-black uppercase text-[10px]">
                         <span>TOTAL DISCREPANCY</span>
                         <span className={totalDiff === 0 ? "opacity-40" : "text-rose-600"}>{formatIDR(totalDiff)}</span>
                      </div>
                   </div>

                   <div className="mt-6 pt-4 border-t border-dashed border-slate-200 text-center">
                      <p className="text-[7px] font-black tracking-[0.2em] opacity-30">AUTHORIZED SEQUENCE PORTAL</p>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-white border-t border-slate-100 flex-col sm:flex-row gap-3">
          <div className="flex-1 flex gap-2 w-full">
            <Button 
                variant="outline" 
                onClick={connectionStatus === "connected" ? () => {} : connect}
                className="h-11 rounded-xl flex-1 font-black uppercase tracking-widest text-[9px] gap-2 border-slate-200"
                disabled={connectionStatus === "connected"}
            >
              {connectionStatus === "connected" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Printer className="w-3.5 h-3.5" />}
              {connectionStatus === "connected" ? "ACTIVE" : "PAIR"}
            </Button>
            <Button 
                onClick={handlePrint}
                disabled={isPrinting || connectionStatus !== "connected"}
                className="h-11 rounded-xl flex-[1.5] bg-slate-900 hover:bg-black font-black uppercase tracking-widest text-[9px] gap-2 shadow-lg"
            >
              {isPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
              PRINT
            </Button>
          </div>
          <Button 
            onClick={onFinish}
            className="h-11 w-full sm:w-auto px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-[0.1em] text-[10px] shadow-lg shadow-emerald-600/10"
          >
            FINISH <ArrowRight className="w-3.5 h-3.5 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
