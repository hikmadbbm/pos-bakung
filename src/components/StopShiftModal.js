"use client";
import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { formatIDR } from "../lib/format";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { AlertTriangle, CheckCircle, Lock, Calculator, ArrowRight, ArrowLeft } from "lucide-react";
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

export default function StopShiftModal({ isOpen, onClose, onSuccess, currentUserId }) {
  const { success, error } = useToast();
  const [step, setStep] = useState("AUTH"); // auth, sales, cash, non-cash, review
  const [loading, setLoading] = useState(false);
  
  // Auth State
  const [managerPin, setManagerPin] = useState("");
  const [manager, setManager] = useState(null);

  // Summary State
  const [shiftSummary, setShiftSummary] = useState(null);
  const [nonCashActuals, setNonCashActuals] = useState({}); // { pmId: amount }
  const [counts, setCounts] = useState({});
  const [totalCashCounted, setTotalCashCounted] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep("AUTH");
      setManagerPin("");
      setCounts({});
      setNonCashActuals({});
      setTotalCashCounted(0);
      setNote("");
    }
  }, [isOpen]);

  useEffect(() => {
    let total = 0;
    Object.entries(counts).forEach(([val, qty]) => {
      total += parseInt(val) * (parseInt(qty) || 0);
    });
    setTotalCashCounted(total);
  }, [counts]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-manager", { pin: managerPin });
      setManager(res.manager);
      
      const summaryRes = await api.get(`/shifts/summary/${currentUserId}`);
      setShiftSummary(summaryRes.summary);
      
      setStep("SALES");
    } catch (err) {
      console.error(err);
      error(`Authentication Failed: ${err.response?.data?.error || err.message || "Invalid manager credentials"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      if (!shiftSummary) return;
      
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
        manager: manager.username,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-blue-600">
             <Calculator className="w-5 h-5 text-red-600" /> Shift Reconciliation
          </DialogTitle>
          <DialogDescription>
            {step === 'AUTH' && "Manager authorization required."}
            {step === 'SALES' && "Review shift sales summary."}
            {step === 'CASH' && "Count cash in drawer."}
            {step === 'NON_CASH' && "Input non-cash nominals."}
            {step === 'REVIEW' && "Final reconciliation review."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-2">
          {step === "AUTH" && (
            <form onSubmit={handleAuth} className="space-y-4 py-4">
              <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
                <p className="text-sm text-yellow-800 flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Authorized personnel only.
                </p>
              </div>
              <div className="space-y-4">
                <Label className="text-center block text-lg font-bold">Enter Manager PIN</Label>
                <div className="flex justify-center">
                  <Input 
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={managerPin} 
                    onChange={e => setManagerPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="••••••"
                    className="text-center text-3xl tracking-[1em] h-16 w-full max-w-[250px] font-bold"
                    required 
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">Cancel</Button>
                <Button type="submit" disabled={loading || managerPin.length < 4} className="w-full sm:w-auto">
                  {loading ? "Verifying..." : "Authorize"}
                </Button>
              </DialogFooter>
            </form>
          )}

          {step === "SALES" && shiftSummary && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg border text-center">
                  <Label className="text-gray-500 uppercase text-[10px] font-bold">Total Sales</Label>
                  <p className="text-2xl font-bold text-gray-900">{formatIDR(shiftSummary.totalSales)}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-center">
                  <Label className="text-blue-600 uppercase text-[10px] font-bold">Cash Expected</Label>
                  <p className="text-2xl font-bold text-blue-700">{formatIDR(shiftSummary.expectedCash)}</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="text-right">Count</TableHead>
                    <TableHead className="text-right">Expected</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftSummary.methodTotals.map(mt => (
                    <TableRow key={mt.id}>
                      <TableCell className="font-medium">{mt.name} <span className="text-[10px] text-gray-400">({mt.type})</span></TableCell>
                      <TableCell className="text-right">{mt.count}</TableCell>
                      <TableCell className="text-right font-mono">{formatIDR(mt.systemAmount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => setStep("AUTH")}>Back</Button>
                <Button onClick={() => setStep("CASH")} className="gap-2">
                  Next: Cash Count <ArrowRight className="w-4 h-4" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "CASH" && (
            <div className="space-y-4 py-2">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between items-center">
                <div>
                  <Label className="text-blue-600 text-xs font-bold uppercase">Cash Counted</Label>
                  <p className="text-2xl font-bold text-blue-700">{formatIDR(totalCashCounted)}</p>
                </div>
                <div className="text-right">
                  <Label className="text-gray-500 text-xs font-bold uppercase">Expected</Label>
                  <p className="text-lg font-medium text-gray-600">{formatIDR(shiftSummary.expectedCash)}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-x-6 gap-y-3 max-h-[350px] overflow-y-auto pr-2">
                {DENOMINATIONS.map((denom) => (
                  <div key={denom.value} className="flex items-center gap-3">
                    <Label className="text-xs text-gray-500 w-24 shrink-0">{denom.label}</Label>
                    <Input 
                      type="number" 
                      min="0"
                      placeholder="0"
                      value={counts[denom.value] || ""}
                      onChange={(e) => setCounts({...counts, [denom.value]: e.target.value})}
                      className="text-right h-8"
                    />
                  </div>
                ))}
              </div>

              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => setStep("SALES")} className="gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button onClick={() => setStep("NON_CASH")} className="gap-2">
                  Next: Non-Cash <ArrowRight className="w-4 h-4" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "NON_CASH" && (
            <div className="space-y-4 py-2">
              <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 mb-4">
                <p className="text-xs text-purple-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Input final nominal received for each non-cash method.
                </p>
              </div>

              <div className="space-y-4">
                {shiftSummary.methodTotals.filter(m => m.type !== 'CASH').map(mt => (
                  <div key={mt.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 border rounded-lg hover:bg-gray-50 bg-white">
                    <div className="flex-1">
                      <Label className="font-bold text-gray-800">{mt.name}</Label>
                      <p className="text-xs text-gray-500">Expected: {formatIDR(mt.systemAmount)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-400">Rp</span>
                      <Input 
                        type="number"
                        placeholder="0"
                        className="w-full sm:w-40 text-right font-bold"
                        value={nonCashActuals[mt.id] || ""}
                        onChange={(e) => setNonCashActuals({...nonCashActuals, [mt.id]: e.target.value})}
                      />
                    </div>
                  </div>
                ))}
                
                {shiftSummary.methodTotals.filter(m => m.type !== 'CASH').length === 0 && (
                  <div className="text-center py-10 text-gray-400 border rounded-lg border-dashed">
                    No non-cash transactions in this shift.
                  </div>
                )}
              </div>

              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => setStep("CASH")} className="gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button onClick={() => setStep("REVIEW")} className="gap-2">
                  Next: Final Review <ArrowRight className="w-4 h-4" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {step === "REVIEW" && (
            <div className="space-y-6 py-2">
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Diff</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shiftSummary.methodTotals.map(mt => {
                      const system = mt.type === 'CASH' ? shiftSummary.expectedCash : mt.systemAmount;
                      const actual = mt.type === 'CASH' ? totalCashCounted : (Number(nonCashActuals[mt.id]) || 0);
                      const diff = actual - system;
                      return (
                        <TableRow key={mt.id}>
                          <TableCell className="font-medium text-xs">{mt.name}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{formatIDR(system)}</TableCell>
                          <TableCell className="text-right font-mono text-xs font-bold text-blue-600">{formatIDR(actual)}</TableCell>
                          <TableCell className={cn(
                            "text-right font-mono text-xs font-bold",
                            diff === 0 ? "text-green-600" : "text-red-500"
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
                <div className="bg-red-50 p-4 rounded-lg border border-red-200 animate-pulse">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-red-800">Variance Detected!</p>
                      <p className="text-xs text-red-700 mt-1">Please provide a reason for the discrepancy before closing the shift.</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs text-gray-500 uppercase font-bold">Reconciliation Note</Label>
                <textarea 
                  className="w-full min-h-[80px] p-3 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={hasDiscrepancy() ? "Explain the discrepancy here (REQUIRED)..." : "Notes about this shift (optional)..."}
                  required={hasDiscrepancy()}
                />
              </div>

              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => setStep("NON_CASH")} className="gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button 
                  onClick={handleFinalSubmit} 
                  disabled={loading || (hasDiscrepancy() && !note.trim())}
                  className={cn("gap-2", hasDiscrepancy() ? "bg-red-600 hover:bg-red-700" : "")}
                >
                  {loading ? "Closing Shift..." : "Finish & Close Shift"} <CheckCircle className="w-4 h-4" />
                </Button>
              </DialogFooter>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
