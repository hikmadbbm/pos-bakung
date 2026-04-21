"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { formatIDR } from "../lib/format";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { AlertTriangle, CheckCircle, Lock, Calculator, ArrowRight, ArrowLeft, RefreshCcw } from "lucide-react";
import { useToast } from "./ui/use-toast";
import { cn } from "../lib/utils";
import { useTranslation } from "../lib/language-context";

const getDenominations = (t) => [
  { value: 100000, label: "Rp 100.000" },
  { value: 50000, label: "Rp 50.000" },
  { value: 20000, label: "Rp 20.000" },
  { value: 10000, label: "Rp 10.000" },
  { value: 5000, label: "Rp 5.000" },
  { value: 2000, label: "Rp 2.000" },
  { value: 1000, label: "Rp 1.000" },
  { value: 500, label: `${t('shift.coins')} (500)` },
  { value: 200, label: `${t('shift.coins')} (200)` },
  { value: 100, label: `${t('shift.coins')} (100)` },
];

export default function StopShiftModal({ isOpen, onClose, onSuccess, onReauthorize, currentUserId, authorizedManager }) {
  const { t } = useTranslation(["shift", "common", "shift_report", "orders", "reports"]);
  const { success, error, confirm } = useToast();
  const [step, setStep] = useState("SALES"); // sales, cash, non-cash, review
  const [loading, setLoading] = useState(false);
  
  // Summary State
  const [shiftSummary, setShiftSummary] = useState(null);
  const [nonCashActuals, setNonCashActuals] = useState({}); // { pmId: amount }
  const [counts, setCounts] = useState({});
  const [totalCashCounted, setTotalCashCounted] = useState(0);
  const [note, setNote] = useState("");
  const [internalManager, setInternalManager] = useState(null);
  const [verificationPin, setVerificationPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const DENOMINATIONS = getDenominations(t);

  // Sync prop to internal state to survive parent re-renders better
  useEffect(() => {
    if (authorizedManager) {
      setInternalManager(authorizedManager);
    }
  }, [authorizedManager]);

  const loadSummary = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const summaryRes = await api.get(`/shifts/summary?id=${currentUserId}`);
      setShiftSummary(summaryRes.summary);
      // Only set step to SALES if we don't have a summary yet (initial load)
      setStep(prev => prev === "" ? "SALES" : prev);
    } catch (err) {
      console.error(err);
      error(`${t('shift_report.load_fail')}: ${err.message}`);
      onClose();
    } finally {
      setLoading(false);
    }
  }, [currentUserId, error, onClose, t]);

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
      if (!shiftSummary) {
        error(t('shift.no_sales_data'));
        setLoading(false);
        return;
      }
      
      // Resolve manager from the authorization step
      const currentManager = internalManager || authorizedManager;
      
      if (!currentManager) {
        error(t('orders.verification_required'));
        if (onReauthorize) onReauthorize();
        setLoading(false);
        return;
      }
      
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
        manager: currentManager.username,
        timestamp: new Date().toISOString()
      };
      
      const res = await api.post("/shifts/end", {
        id: shiftSummary.id,
        user_id: currentUserId,
        ending_cash: totalCashCounted,
        total_sales: totalActualSales,
        expected_cash: shiftSummary.expectedCash,
        discrepancy: totalDiscrepancy,
        note: note,
        cash_breakdown: counts,
        reconciliation_data: reconciliationData
      });

      success(`${t('shift.authorize_success')}. ${t('reports.total_orders')}: ${formatIDR(totalActualSales)}`);
      window.dispatchEvent(new Event('shift-status-changed'));
      
      // Use the actual shift ID from the API response
      if (onSuccess) onSuccess(res.id); 
      onClose();
    } catch (err) {
      console.error(err);
      error(`Failed to End Shift: ${err.response?.data?.error || err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  const handleVerifyingSubmit = async () => {
    if (!verificationPin) {
      error(t('orders.verification_required'));
      return;
    }
    
    setVerifying(true);
    try {
      const res = await api.post("/auth/verify-manager", { pin: verificationPin });
      setInternalManager(res.manager);
      success(t('shift.authorize_success'));
      // Small timeout to let state propagate before we trigger final submit if they want
    } catch (err) {
      error(err.response?.data?.error || "Incorrect Manager PIN");
    } finally {
      setVerifying(false);
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
          title: t('shift.cancel_rec_title'),
          message: t('shift.cancel_rec_msg'),
          confirmText: t('shift.yes_cancel'),
          cancelText: t('shift.no_continue'),
          variant: "destructive"
        });
        
        if (!confirmed) return;
        onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="sm:max-w-2xl p-0 overflow-hidden flex flex-col max-h-[90dvh]"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2 text-emerald-600">
             <Calculator className="w-5 h-5 text-red-600" /> {t('shift.reconciliation_title')}
          </DialogTitle>
          <DialogDescription>
            {step === 'SALES' && t('shift.review_sales')}
            {step === 'CASH' && t('shift.count_cash')}
            {step === 'NON_CASH' && t('shift.input_non_cash')}
            {step === 'REVIEW' && t('shift.final_review')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-2">
          {step === "SALES" && shiftSummary && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="bg-gray-50 p-3 flex-1 sm:p-4 rounded-xl border text-center flex flex-col justify-center min-h-[90px]">
                  <Label className="text-gray-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1">{t('shift.total_sales_title')}</Label>
                  <p className="text-lg sm:text-xl lg:text-2xl font-black text-slate-900 leading-tight break-all sm:break-normal">{formatIDR(shiftSummary.totalSales)}</p>
                </div>
                <div className="bg-rose-50 p-3 sm:p-4 rounded-xl border border-rose-100 text-center flex flex-col justify-center min-h-[90px]">
                  <Label className="text-rose-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1">Expenses (Cash)</Label>
                  <p className="text-lg sm:text-xl lg:text-2xl font-black text-rose-700 leading-tight break-all sm:break-normal">{formatIDR(shiftSummary.totalCashExpenses || 0)}</p>
                </div>
                <div className="bg-emerald-50 p-3 sm:p-4 rounded-xl border border-emerald-100 text-center flex flex-col justify-center min-h-[90px] col-span-2 lg:col-span-1">
                  <Label className="text-emerald-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1">{t('shift.cash_expected_title')}</Label>
                  <p className="text-lg sm:text-xl lg:text-2xl font-black text-emerald-700 leading-tight break-all sm:break-normal">{formatIDR(shiftSummary.expectedCash)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest">{t('shift.payment_method_title')}</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase tracking-widest">{t('shift.amount_title')}</TableHead>
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

              {shiftSummary.paylaterOrders && shiftSummary.paylaterOrders.length > 0 && (
                <div className="space-y-3 mt-6">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{t('shift.paylater_title') || "Pending Kasbon / Paylater"}</Label>
                    <span className="px-2 py-0.5 bg-rose-50 text-rose-500 rounded-full text-[9px] font-bold border border-rose-100">{shiftSummary.paylaterOrders.length} {t('common.items')}</span>
                  </div>
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1 scrollbar-hide">
                    {shiftSummary.paylaterOrders.map(order => (
                      <div key={order.id} className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between gap-4 group hover:border-emerald-200 transition-all">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-xs truncate">{order.customer_name || "Customer"}</p>
                          <p className="text-[9px] font-medium text-slate-400">{new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {formatIDR(order.total - order.discount)}</p>
                        </div>
                        <div className="flex gap-1 items-center">
                          <Select 
                            className="h-9 w-36 text-[10px] font-black uppercase tracking-widest rounded-lg"
                            value=""
                            onChange={async (e) => {
                              const val = e.target.value;
                              if (!val) return;
                              try {
                                setLoading(true);
                                await api.put(`/orders/${order.id}`, { payment_method_id: val });
                                success(t('shift.order_settled') || "Order payment updated");
                                await loadSummary();
                              } catch (err) {
                                error(err.message || "Failed to update order");
                              } finally {
                                setLoading(false);
                              }
                            }}
                          >
                            <option value="">{t('shift.settle_via') || "Settle via..."}</option>
                            {shiftSummary.availablePaymentMethods.filter(pm => pm.type !== 'PAY_LATER').map(pm => (
                                <option key={pm.id} value={pm.id}>{pm.name}</option>
                            ))}
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => onClose()} className="flex-1 h-12 rounded-xl font-bold">{t('common.cancel')}</Button>
                <Button onClick={() => setStep("CASH")} className="flex-[2] h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-lg shadow-emerald-600/20">
                  {t('shift.next_cash_count')} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === "CASH" && (
            <div className="space-y-6 py-2">
              <div className="bg-emerald-950 p-5 sm:p-6 rounded-2xl text-white flex justify-between items-center gap-4 sm:gap-8 shadow-xl">
                <div className="min-w-0 flex-1">
                  <Label className="text-emerald-400 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">{t('shift.cash_counted_title')}</Label>
                  <p className="text-xl sm:text-3xl font-black tracking-tight truncate leading-tight">{formatIDR(totalCashCounted)}</p>
                </div>
                <div className="text-right shrink-0">
                  <Label className="text-emerald-500/40 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">{t('shift.expected_title')}</Label>
                  <p className="text-sm sm:text-lg font-bold opacity-50 leading-tight">{formatIDR(shiftSummary.expectedCash)}</p>
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
                  <ArrowLeft className="w-4 h-4" /> {t('common.back')}
                </Button>
                <Button onClick={() => setStep("NON_CASH")} className="flex-[2] h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-lg shadow-emerald-600/20">
                  {t('shift.next_non_cash')} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {step === "NON_CASH" && (
            <div className="space-y-6 py-2">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-emerald-500" />
                  {t('shift.verify_nominal_help')}
                </p>
              </div>

              <div className="space-y-3">
                {shiftSummary.methodTotals.filter(m => m.type !== 'CASH' && m.count > 0).map(mt => (
                  <div key={mt.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 border border-slate-100 rounded-2xl hover:border-emerald-200 bg-white transition-all shadow-sm">
                    <div className="flex-1">
                      <Label className="text-sm font-black text-slate-800 uppercase tracking-tight">{mt.name}</Label>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{t('shift.expected_title')}: {formatIDR(mt.systemAmount)}</p>
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
                    {t('shift.no_non_cash')}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep("CASH")} className="flex-1 h-12 rounded-xl font-bold gap-2">
                   <ArrowLeft className="w-4 h-4" /> {t('common.back')}
                </Button>
                <Button onClick={() => setStep("REVIEW")} className="flex-[2] h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-lg shadow-emerald-600/20">
                  {t('shift.next_final_review')} <ArrowRight className="w-4 h-4" />
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
                      <TableHead className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('shift.method_label')}</TableHead>
                      <TableHead className="text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">{t('shift.diff_label')}</TableHead>
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
                             <p className="text-[9px] font-medium text-slate-400">{t('shift.actual_label')}: {formatIDR(actual)}</p>
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
                      <p className="text-xs font-black text-rose-900 uppercase tracking-tight">{t('shift.security_variance_title')}</p>
                      <p className="text-[10px] font-medium text-rose-700 mt-1 leading-relaxed">
                        {t('shift.security_variance_desc')}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">{t('shift.operational_justification')}</Label>
                <textarea 
                  className="w-full min-h-[100px] p-4 text-sm font-medium border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-300"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={hasDiscrepancy() ? t('shift.discrepancy_placeholder') : t('shift.notes_placeholder_rec')}
                  required={hasDiscrepancy()}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                 <Button 
                   variant="outline" 
                   onClick={() => setStep("NON_CASH")} 
                   className="h-14 rounded-2xl font-bold flex-1"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> {t('shift.adjust_values')}
                </Button>
                
                {!(internalManager || authorizedManager) ? (
                  <div className="flex-[2] flex gap-2">
                    <Input 
                      type="password"
                      inputMode="numeric"
                      placeholder={t('shift.manager_pin')}
                      value={verificationPin}
                      onChange={(e) => setVerificationPin(e.target.value)}
                      className="h-14 rounded-2xl border-2 border-slate-200 focus:border-emerald-500 font-bold text-center tracking-[0.5em]"
                    />
                    <Button 
                      onClick={handleVerifyingSubmit} 
                      disabled={verifying || !verificationPin}
                      className="h-14 px-6 rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest shadow-xl"
                    >
                      {verifying ? <RefreshCcw className="w-4 h-4 animate-spin" /> : t('shift.verify')}
                    </Button>
                  </div>
                ) : (
                  <Button 
                    onClick={handleFinalSubmit} 
                    disabled={loading || (hasDiscrepancy() && !note.trim())}
                    className={cn(
                      "h-14 rounded-2xl font-black uppercase tracking-widest text-sm flex-[2] shadow-xl transition-all active:scale-95 gap-2",
                      hasDiscrepancy() ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20 text-white" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 text-white"
                    )}
                  >
                    {loading ? <RefreshCcw className="w-5 h-5 animate-spin" /> : t('shift.authorize_close')} <CheckCircle className="w-5 h-5" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
