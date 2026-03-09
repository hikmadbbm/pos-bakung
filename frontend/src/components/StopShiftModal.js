"use client";
import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { formatIDR } from "../lib/format";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { AlertTriangle, CheckCircle, Lock, Calculator } from "lucide-react";
import { useToast } from "./ui/use-toast";

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
  const [step, setStep] = useState("AUTH"); // AUTH, COUNT, SUMMARY
  const [loading, setLoading] = useState(false);
  
  // Auth State
  const [managerCreds, setManagerCreds] = useState({ username: "", password: "" });
  const [manager, setManager] = useState(null);

  // Count State
  const [counts, setCounts] = useState({});
  const [totalCounted, setTotalCounted] = useState(0);

  // Summary State
  const [shiftSummary, setShiftSummary] = useState(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep("AUTH");
      setManagerCreds({ username: "", password: "" });
      setCounts({});
      setTotalCounted(0);
      setNote("");
      // Fetch summary in background or wait until auth? 
      // Better wait until auth to prevent leaking info? 
      // Or fetch now to have it ready? Let's wait until auth.
    }
  }, [isOpen]);

  useEffect(() => {
    // Auto-calculate total
    let total = 0;
    Object.entries(counts).forEach(([val, qty]) => {
      total += parseInt(val) * (parseInt(qty) || 0);
    });
    setTotalCounted(total);
  }, [counts]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/verify-manager", managerCreds);
      setManager(res.manager);
      
      // Fetch shift summary
      const summaryRes = await api.get(`/shifts/summary/${currentUserId}`);
      setShiftSummary(summaryRes.summary);
      
      setStep("COUNT");
    } catch (err) {
      console.error(err);
      error(`Authentication Failed: ${err.response?.data?.error || err.message || "Invalid manager credentials"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCountSubmit = () => {
    setStep("SUMMARY");
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      if (!shiftSummary) return;
      
      const discrepancy = totalCounted - shiftSummary.expectedCash;
      
      await api.post("/shifts/end", {
        user_id: currentUserId,
        ending_cash: totalCounted,
        total_sales: shiftSummary.totalCashSales,
        expected_cash: shiftSummary.expectedCash,
        discrepancy: discrepancy,
        note: note,
        cash_breakdown: counts
      });

      success(`Shift Ended Successfully. Final Cash: ${formatIDR(totalCounted)}`);
      
      // Dispatch global event
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
             <AlertTriangle className="w-5 h-5" /> Stop Shift & Reconciliation
          </DialogTitle>
          <DialogDescription>
            Mandatory end-of-shift procedure. Requires manager approval.
          </DialogDescription>
        </DialogHeader>

        {step === "AUTH" && (
          <form onSubmit={handleAuth} className="space-y-4 py-4">
            <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200 mb-4">
              <p className="text-sm text-yellow-800 flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Manager authorization required to stop shift.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Manager Username</Label>
              <Input 
                value={managerCreds.username} 
                onChange={e => setManagerCreds({...managerCreds, username: e.target.value})}
                required 
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input 
                type="password"
                value={managerCreds.password} 
                onChange={e => setManagerCreds({...managerCreds, password: e.target.value})}
                required 
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Verifying..." : "Authorize"}
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "COUNT" && (
          <div className="space-y-4 py-2">
            <div className="flex justify-between items-center bg-gray-50 p-3 rounded border">
              <span className="text-sm font-medium">Starting Cash</span>
              <span className="font-mono">{shiftSummary ? formatIDR(shiftSummary.startingCash) : "-"}</span>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2">
              {DENOMINATIONS.map((denom) => (
                <div key={denom.value} className="space-y-1">
                  <Label className="text-xs text-gray-500">{denom.label}</Label>
                  <div className="relative">
                    <Input 
                      type="number" 
                      min="0"
                      placeholder="Qty"
                      value={counts[denom.value] || ""}
                      onChange={(e) => setCounts({...counts, [denom.value]: e.target.value})}
                      className="text-right text-base sm:text-sm"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between items-center">
              <span className="font-bold text-blue-900">Total Counted:</span>
              <span className="text-xl font-bold text-blue-700">{formatIDR(totalCounted)}</span>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("AUTH")}>Back</Button>
              <Button onClick={handleCountSubmit} disabled={totalCounted === 0}>Next: Review</Button>
            </DialogFooter>
          </div>
        )}

        {step === "SUMMARY" && shiftSummary && (
          <div className="space-y-6 py-2">
            <div className="grid gap-4 border p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">System Expected Cash</span>
                <span className="font-bold">{formatIDR(shiftSummary.expectedCash)}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-400 pl-4">
                <span>(Start: {formatIDR(shiftSummary.startingCash)} + Sales: {formatIDR(shiftSummary.totalCashSales)})</span>
              </div>
              <div className="border-t my-2"></div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Actual Counted Cash</span>
                <span className="font-bold text-blue-600">{formatIDR(totalCounted)}</span>
              </div>
              <div className="border-t my-2"></div>
              <div className="flex justify-between items-center">
                <span className="font-bold">Discrepancy</span>
                <span className={`font-bold text-lg ${
                  (totalCounted - shiftSummary.expectedCash) === 0 ? "text-green-600" : "text-red-600"
                }`}>
                  {formatIDR(totalCounted - shiftSummary.expectedCash)}
                </span>
              </div>
            </div>

            {(totalCounted - shiftSummary.expectedCash) !== 0 && (
              <div className="bg-red-50 p-3 rounded border border-red-200 text-sm text-red-800 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-bold">Variance Detected!</p>
                  <p>Please recount or provide a reason for the discrepancy below.</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notes / Reason for Variance</Label>
              <Input 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Required if there is a discrepancy..."
                required={(totalCounted - shiftSummary.expectedCash) !== 0}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("COUNT")}>Back to Count</Button>
              <Button 
                onClick={handleFinalSubmit} 
                disabled={loading || ((totalCounted - shiftSummary.expectedCash) !== 0 && !note.trim())}
                variant={(totalCounted - shiftSummary.expectedCash) !== 0 ? "destructive" : "default"}
              >
                {loading ? "Submitting..." : "Confirm & Stop Shift"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
