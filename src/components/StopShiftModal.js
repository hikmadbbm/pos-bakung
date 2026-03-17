"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { formatIDR } from "../lib/format";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { AlertTriangle, CheckCircle, Lock, Calculator, ArrowRight, ArrowLeft, RefreshCcw } from "lucide-react";
import { useToast } from "./ui/use-toast";
import { cn } from "@/lib/utils";

const DENOMINATIONS = [
  { value: 100000, label: "Rp 100.000" },
  { value: 50000, label: "Rp 50.000" },
  { value: 20000, label: "Rp 20.000" },
  { value: 10000, label: "Rp 10.000" },
  { value: 5000, label: "Rp 5.000" },
  { value: 2000, label: "Rp 2.000" },
  { value: 1000, label: "Rp 1.000" },
  { value: 500, label: "Coins (500)" },
  { value: 200, label: "Coins (200)" },
  { value: 100, label: "Coins (100)" },
];

export default function StopShiftModal({ isOpen, onClose, onSuccess, currentUserId, authorizedManager }) {
  const { success, error, confirm } = useToast();
  const [step, setStep] = useState("SALES"); // sales, cash, non-cash, review
  const [loading, setLoading] = useState(false);
  
  // Summary State
  const [shiftSummary, setShiftSummary] = useState(null);
  const [nonCashActuals, setNonCashActuals] = useState({}); // { pmId: amount }
  const [counts, setCounts] = useState({});
  const [totalCashCounted, setTotalCashCounted] = useState(0);
  const [note, setNote] = useState("");

  const loadSummary = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const summaryRes = await api.get(`/shifts/summary/${currentUserId}`);
      setShiftSummary(summaryRes.summary);
      // Only set step to SALES if we don't have a summary yet (initial load)
      setStep(prev => prev === "" ? "SALES" : prev);
    } catch (err) {
      console.error(err);
      error(`Failed to load shift summary: ${err.message}`);
      onClose();
    } finally {
      setLoading(false);
    }
  }, [currentUserId, error, onClose]);

  useEffect(() => {
    if (isOpen) {
      setCounts({});
      setNonCashActuals({});
      setTotalCashCounted(0);
      setNote("");
      setStep("SALES"); // Force reset to first step ONLY when isOpen changes from false to true
      loadSummary();
    }
  }, [isOpen]); // Only trigger when isOpen changes

  // Separate effect for re-fetching summary if user changes but modal stays open (rare)
  useEffect(() => {
    if (isOpen && currentUserId) {
      loadSummary();
    }
  }, [currentUserId, loadSummary, isOpen]);

  useEffect(() => {
    let total = 0;
    Object.entries(counts).forEach(([val, qty]) => {
      total += parseInt(val) * (parseInt(qty) || 0);
    });
    setTotalCashCounted(total);
  }, [counts]);

  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      if (!shiftSummary || !authorizedManager) return;
      
      const actualCashSales = totalCashCounted - shiftSummary.startingCash;
      const actualNonCashSales = shiftSummary.methodTotals
        .filter(mt => mt.type !== 'CASH')
        .reduce((acc, mt) => acc + (Number(nonCashActuals[mt.id]) || 0), 0);
      
      const totalActualSales = actualCashSales + actualNonCashSales;

      const totalExpectedSales = shiftSummary.totalSales;
      const totalDiscrepancy = totalActualSales - totalExpectedSales;

      const reconciliationData = {
        methodBreakdown: shiftSummary.methodTotals.map(mt => {
          const actual = mt.type === 'CASH' ? totalCashCounted : (Number(nonCashActuals[mt.id]) || 0);
          const system = mt.type === 'CASH' ? shiftSummary.expectedCash : mt.systemAmount;
          return {
            id: mt.id,
            name: mt.name,
            type: mt.type,
            system,
            actual,
            discrepancy: actual - system
          };
        }),
        manager: authorizedManager.username,
        timestamp: new Date().toISOString()
      };
      
      await api.post("/shifts/end", {
        user_id: currentUserId,
        ending_cash: totalCashCounted,
        total_sales: totalActualSales,
        expected_cash: shiftSummary.expectedCash,
        discrepancy: totalDiscrepancy,
        note: note,
        cash_breakdown: counts,
        reconciliation_data: reconciliationData
      });

      success(`Shift Ended Successfully. Total Sales: ${formatIDR(totalActualSales)}`);
      window.dispatchEvent(new Event('shift-status-changed'));
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      error(`Failed to End Shift: ${err.response?.data?.error || err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const hasDiscrepancy = () => {
    if (!shiftSummary) return false;
    const cashDiff = totalCashCounted - shiftSummary.expectedCash;
    if (cashDiff !== 0) return true;

    return shiftSummary.methodTotals.some(mt => {
      if (mt.type === 'CASH') return false;
      const actual = Number(nonCashActuals[mt.id]) || 0;
      return actual !== mt.systemAmount;
    });
  };

  const handleClose = async (openState) => {
    // If user is trying to close the modal
    if (!openState) {
        const confirmed = await confirm({
          title: "Cancel Reconciliation?",
          message: "Are you sure you want to cancel? All progress will be lost.",
          confirmText: "Yes, Cancel",
          cancelText: "No, Continue",
          variant: "destructive"
        });
        
        if (!confirmed) return;
        onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-emerald-600">
             <Calculator className="w-5 h-5 text-red-600" /> Shift Reconciliation
          </DialogTitle>
          <DialogDescription>
            {step === 'SALES' && "Review shift sales summary."}
            {step === 'CASH' && "Count cash in drawer."}
            {step === 'NON_CASH' && "Input non-cash nominals."}
            {step === 'REVIEW' && "Final reconciliation review."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-2">
          {step === "SALES" && shiftSummary && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border text-center">
                  <Label className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Total Sales</Label>
                  <p className="text-2xl font-black text-slate-900 mt-1">{formatIDR(shiftSummary.totalSales)}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 text-center">
                  <Label className="text-emerald-600 text-[10px] font-bold uppercase tracking-widest">Cash Expected</Label>
                  <p className="text-2xl font-black text-emerald-700 mt-1">{formatIDR(shiftSummary.expectedCash)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">Payment Method</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shiftSummary.methodTotals.filter(mt => mt.count > 0).map(mt => (
                      <TableRow key={mt.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-bold text-slate-700">
                           {mt.name} <span className="text-[9px] font-medium text-slate-400 ml-1">{mt.type}</span>
                        </TableCell>
                        <TableCell className="text-right font-black text-slate-900">{formatIDR(mt.systemAmount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => onClose()} className="flex-1 h-12 rounded-xl font-bold">Cancel</Button>
                <Button onClick={() => setStep("CASH")} className="flex-[2] h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold gap-2 shadow-lg shadow-emerald-600/20">
                  Next: Cash Count <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === "CASH" && (
            <div className="space-y-6 py-2">
              <div className="bg-emerald-950 p-6 rounded-2xl text-white flex justify-between items-center shadow-xl">
                <div>
                  <Label className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em]">Cash Counted</Label>
                  <p className="text-3xl font-black tracking-tight">{formatIDR(totalCashCounted)}</p>
                </div>
                <div className="text-right">
                  <Label className="text-emerald-500/50 text-[10px] font-black uppercase tracking-[0.2em]">Expected</Label>
                  <p className="text-lg font-bold opacity-60">{formatIDR(shiftSummary.expectedCash)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 max-h-[350px] overflow-y-auto pr-2 scrollbar-hide">
                {DENOMINATIONS.map((denom) => (
                  <div key={denom.value} className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-100 focus-within:border-emerald-500 transition-colors">
                    <div className="w-24 shrink-0 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none pl-2">{denom.label}</div>
                    <Input 
                      type="number" 
                      min="0"
                      inputMode="numeric"
                      placeholder="0"
                      value={counts[denom.value] || ""}
                      onChange={(e) => setCounts({...counts, [denom.value]: e.target.value})}
                      className="text-right h-10 font-black text-lg bg-white border-none focus:ring-0"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep("SALES")} className="flex-1 h-12 rounded-xl font-bold gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button onClick={() => setStep("NON_CASH")} className="flex-[2] h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold gap-2 shadow-lg shadow-emerald-600/20">
                  Next: Non-Cash <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === "NON_CASH" && (
            <div className="space-y-6 py-2">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-emerald-500" />
                  Verify final nominal for online/third-party platforms
                </p>
              </div>

              <div className="space-y-3">
                {shiftSummary.methodTotals.filter(m => m.type !== 'CASH' && m.count > 0).map(mt => (
                  <div key={mt.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border border-slate-100 rounded-2xl hover:border-emerald-200 bg-white transition-all shadow-sm">
                    <div className="flex-1">
                      <Label className="text-sm font-black text-slate-800 uppercase tracking-tight">{mt.name}</Label>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Expected: {formatIDR(mt.systemAmount)}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 focus-within:border-emerald-500 transition-colors">
                      <span className="text-xs font-black text-slate-300">Rp</span>
                      <Input 
                        type="number"
                        inputMode="numeric"
                        placeholder="0"
                        className="w-full sm:w-40 text-right font-black text-lg bg-transparent border-none focus:ring-0"
                        value={nonCashActuals[mt.id] || ""}
                        onChange={(e) => setNonCashActuals({...nonCashActuals, [mt.id]: e.target.value})}
                      />
                    </div>
                  </div>
                ))}
                
                {shiftSummary.methodTotals.filter(m => m.type !== 'CASH' && m.count > 0).length === 0 && (
                  <div className="text-center py-16 text-slate-300 font-black uppercase tracking-[0.2em] border-2 border-dashed border-slate-100 rounded-3xl">
                    No Non-Cash Activity
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep("CASH")} className="flex-1 h-12 rounded-xl font-bold gap-2">
                   <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button onClick={() => setStep("REVIEW")} className="flex-[2] h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-bold gap-2 shadow-lg shadow-emerald-600/20">
                  Next: Final Review <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === "REVIEW" && (
            <div className="space-y-6 py-2">
              <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Method</TableHead>
                      <TableHead className="text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Diff</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shiftSummary.methodTotals.filter(mt => mt.count > 0).map(mt => {
                      const system = mt.type === 'CASH' ? shiftSummary.expectedCash : mt.systemAmount;
                      const actual = mt.type === 'CASH' ? totalCashCounted : (Number(nonCashActuals[mt.id]) || 0);
                      const diff = actual - system;
                      return (
                        <TableRow key={mt.id} className="hover:bg-slate-50/50">
                          <TableCell>
                             <p className="font-bold text-slate-700 text-sm">{mt.name}</p>
                             <p className="text-[9px] font-medium text-slate-400">Actual: {formatIDR(actual)}</p>
                          </TableCell>
                          <TableCell className={cn(
                            "text-right font-black text-sm",
                            diff === 0 ? "text-emerald-600" : "text-rose-500"
                          )}>
                            {diff > 0 ? "+" : ""}{formatIDR(diff)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {hasDiscrepancy() && (
                <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-6 h-6 text-rose-500 shrink-0" />
                    <div>
                      <p className="text-xs font-black text-rose-900 uppercase tracking-tight">Security Variance Detected</p>
                      <p className="text-[10px] font-medium text-rose-700 mt-1 leading-relaxed">
                        The current drawer balance does not match the system record. Personnel must provide a valid justification before session termination.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Operational Justification</Label>
                <textarea 
                  className="w-full min-h-[100px] p-4 text-sm font-medium border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={hasDiscrepancy() ? "Explain the discrepancy here (REQUIRED)..." : "Notes about this shift (optional)..."}
                  required={hasDiscrepancy()}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                   variant="outline" 
                   onClick={() => setStep("NON_CASH")} 
                   className="h-14 rounded-2xl font-bold flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Adjust Values
                </Button>
                <Button 
                  onClick={handleFinalSubmit} 
                  disabled={loading || (hasDiscrepancy() && !note.trim())}
                  className={cn(
                    "h-14 rounded-2xl font-black uppercase tracking-widest text-sm flex-[2] shadow-xl transition-all active:scale-95 gap-2",
                    hasDiscrepancy() ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                  )}
                >
                  {loading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : "Authorize & Close Shift"} <CheckCircle className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
