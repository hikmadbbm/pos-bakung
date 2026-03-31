"use client";
import { useEffect, useState, useCallback } from "react";
import { api, getAuth } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { RefreshCw, Printer, Save, CheckCircle, AlertCircle, Activity, BarChart, X, DollarSign, Wallet, Clock, Calendar } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useToast } from "../../../components/ui/use-toast";
import { Textarea } from "../../../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../components/ui/dialog";

export default function CashierReportPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [date, setDate] = useState("");

  // Hydration-safe date initialization
  useEffect(() => {
    setDate(new Date().toISOString().split('T')[0]);
  }, []);

  // Actual counts (for reconciliation)
  const [actualCounts, setActualCounts] = useState({});
  const [reconNotes, setReconNotes] = useState("");
  const [submittingRecon, setSubmittingRecon] = useState(false);
  const [reconHistory, setReconHistory] = useState([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedRecon, setSelectedRecon] = useState(null);

  const loadReport = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    try {
      const res = await api.get(`/analytics/cashier-report?date=${date}`);
      setReport(res);
      
      // Initialize inputs from existing reconciliation or defaults
      const initialCounts = {};
      if (res.reconciliation && res.reconciliation.details) {
        Object.entries(res.reconciliation.details).forEach(([method, data]) => {
          initialCounts[method] = data.actual;
        });
        setReconNotes(res.reconciliation.notes || "");
      } else {
        setActualCounts({});
        setReconNotes("");
      }
      setActualCounts(initialCounts);
    } catch (e) {
      console.error(e);
      error("Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [date, error]);

  const loadReconHistory = useCallback(async () => {
    try {
      const res = await api.get("/analytics/reconciliation-list");
      setReconHistory(res);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (date) {
      loadReport();
      loadReconHistory();
    }
  }, [date, loadReport, loadReconHistory]);

  const handlePrint = () => {
    window.print();
  };

  const handleActualChange = (method, value) => {
    setActualCounts(prev => ({
      ...prev,
      [method]: value
    }));
  };

  const handleSubmitReconciliation = () => {
    if (!report) return;
    setIsConfirmOpen(true);
  };

  const confirmSubmission = async () => {
    setIsConfirmOpen(false);
    setSubmittingRecon(true);
    try {
      const details = {};
      Object.entries(report.paymentMethods).forEach(([method, data]) => {
        if (data.count > 0 || actualCounts[method]) {
           details[method] = {
             system: data.amount,
             actual: parseInt(actualCounts[method]) || 0
           };
        }
      });

      const user = getAuth();
      await api.post("/analytics/reconciliation", {
        date: date,
        details,
        notes: reconNotes,
        submitted_by: user ? (user.username || user.name || "Admin") : "Admin"
      });
      
      success("Daily reconciliation report submitted successfully.");
      loadReport(); 
      loadReconHistory();
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.error || e.message || "Failed to submit reconciliation";
      error(msg);
    } finally {
      setSubmittingRecon(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Cashier Reconciliation</h2>
          <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
            Daily sales validation and financial handover
            <span className="inline-block w-1 h-1 bg-emerald-600 rounded-full" />
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto bg-white/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/60 shadow-sm">
          <Input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            className="w-full md:w-40 h-9 text-xs font-bold border-none bg-transparent focus:ring-0"
          />
          <div className="flex gap-2 w-full md:w-auto pl-2 border-l border-slate-200">
            <Button variant="ghost" size="sm" onClick={loadReport} className="h-9 w-9 p-0 rounded-xl hover:bg-slate-100">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : "text-slate-400"}`} />
            </Button>
            <Button onClick={handlePrint} variant="ghost" size="sm" className="h-9 px-4 rounded-xl font-bold text-xs bg-slate-900 text-white hover:bg-slate-800 transition-all active:scale-95">
              <Printer className="w-4 h-4 mr-2" /> PRINT
            </Button>
          </div>
        </div>
      </div>

      {/* Reconciliation Status Quick List */}
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide print:hidden">
        {(Array.isArray(reconHistory) ? reconHistory : []).map((r) => {
          const isSubmitted = r?.status === "SUBMITTED";
          const rDate = r?.date ? new Date(r.date).toISOString().split('T')[0] : "";
          const isCurrent = rDate === date;
          return (
            <button
              key={r.id}
              onClick={() => setDate(rDate)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider border transition-all whitespace-nowrap shadow-sm active:scale-95",
                isCurrent 
                  ? 'ring-2 ring-emerald-600 ring-offset-2 border-emerald-200' 
                  : 'border-slate-200 hover:border-slate-300',
                isSubmitted 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-100/50' 
                  : 'bg-amber-50 text-amber-700 border-amber-100/50'
              )}
            >
              {isSubmitted ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              <span>{new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
           <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
           <p className="mt-4 text-xs font-black text-slate-400 uppercase tracking-widest">Compiling Data...</p>
        </div>
      ) : !report ? (
        <div className="text-center py-20 glass-card rounded-3xl border-dashed">
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
             <Calendar className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-800">No records found</p>
          <p className="text-xs text-slate-500 mt-1">There is no sales data for {new Date(date).toLocaleDateString()}.</p>
        </div>
      ) : (
        <div className="space-y-10 animate-fade-in">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                <BarChart className="w-12 h-12 text-slate-900" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-3">Gross Sales</p>
              <div className="text-2xl font-black text-slate-900">{formatIDR(report.summary.grossSales)}</div>
              <p className="text-[10px] font-bold text-slate-500 mt-2 bg-slate-100 inline-block px-2 py-0.5 rounded-full">{report.summary.totalOrders} TXNS</p>
            </div>

            <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-emerald-600">
                <DollarSign className="w-12 h-12 text-emerald-600" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-3">Net Revenue</p>
              <div className="text-2xl font-black text-emerald-600">{formatIDR(report.summary.netSales)}</div>
              <p className="text-[10px] font-bold text-emerald-600/60 mt-2 bg-emerald-50 inline-block px-2 py-0.5 rounded-full uppercase">AFTER DISCOUNTS</p>
            </div>

            <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-emerald-600">
                <Wallet className="w-12 h-12" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-3">Expected Cash</p>
              <div className="text-2xl font-black text-emerald-600">{formatIDR(report.cashInDrawer)}</div>
              <p className="text-[10px] font-bold text-emerald-600/60 mt-2 bg-emerald-50 inline-block px-2 py-0.5 rounded-full uppercase">DRAWER TARGET</p>
            </div>

            <div className="glass-card p-6 rounded-3xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-indigo-600">
                <Activity className="w-12 h-12" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-3">Final Revenue</p>
              <div className="text-2xl font-black text-indigo-600">{formatIDR(report.summary.finalRevenue)}</div>
              <p className="text-[10px] font-bold text-indigo-600/60 mt-2 bg-indigo-50 inline-block px-2 py-0.5 rounded-full uppercase">NET - COMM</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-10">
              {/* Payment Method Breakdown */}
              <div className="glass-card rounded-3xl overflow-hidden shadow-xl border-none">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center">
                       <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Payment Reconciliation</h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">SYSTEM vs ACTUAL</span>
                </div>
                <div className="p-0 overflow-x-auto custom-scrollbar">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="text-[10px] font-black uppercase text-slate-500 py-4 px-6">Method</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-4">Count</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-4">System Total</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-4">Actual Count</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-4 px-6">Diff</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(report.paymentMethods || {})
                        .filter(([method, data]) => data.count > 0 || actualCounts[method])
                        .map(([method, data]) => {
                          const actual = parseInt(actualCounts[method]) || 0;
                          const diff = actual - data.amount;
                          return (
                            <TableRow key={method} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                              <TableCell className="font-bold text-slate-900 px-6 py-4 italic">{method}</TableCell>
                              <TableCell className="text-right font-medium text-slate-500">{data.count}</TableCell>
                              <TableCell className="text-right font-black text-slate-900">{formatIDR(data.amount)}</TableCell>
                              <TableCell className="text-right print:hidden">
                                <div className="flex justify-end items-center gap-2">
                                  <div className="relative" >
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300">Rp</span>
                                    <Input 
                                      className="w-32 h-9 text-right font-black text-emerald-600 bg-slate-50 border-slate-200/60 rounded-xl focus:ring-emerald-600/20 pl-7" 
                                      placeholder="0"
                                      type="number"
                                      value={actualCounts[method] || ""}
                                      onChange={(e) => handleActualChange(method, e.target.value)}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className={cn("text-right font-black px-6", diff === 0 ? "text-emerald-600" : "text-rose-600")}>
                                {diff > 0 ? "+" : ""}{formatIDR(diff)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Shift History Section */}
              <div className="glass-card rounded-3xl overflow-hidden shadow-xl border-none">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center">
                       <Clock className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Closed Shift Records</h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">CASHIER LOGS</span>
                </div>
                <div className="p-0 overflow-x-auto custom-scrollbar">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="text-[10px] font-black uppercase text-slate-500 py-4 px-6">Cashier</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-slate-500 py-4">Timeline</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-4">Sales</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-4">Discrepancy</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-4 px-6">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!(report.shifts?.length > 0) ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-12">
                             <p className="text-xs font-bold text-slate-300 uppercase tracking-widest italic">No closed shifts recorded</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        report.shifts.map((s) => (
                          <TableRow key={s.id} className="hover:bg-slate-50/50 transition-colors border-slate-100">
                            <TableCell className="font-bold text-slate-900 px-6 py-4 uppercase">
                              {s.user?.name || s.user?.username || "Unknown"}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-700">
                                  {new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                                  {s.end_time ? new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Active"}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400">{new Date(s.start_time).toLocaleDateString()}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-black text-slate-900">
                              {formatIDR(s.total_sales || 0)}
                            </TableCell>
                            <TableCell className={cn("text-right font-black", (s.discrepancy || 0) === 0 ? "text-emerald-600 font-medium opacity-50" : "text-rose-600")}>
                              {s.discrepancy > 0 ? "+" : ""}{formatIDR(s.discrepancy || 0)}
                            </TableCell>
                            <TableCell className="text-right px-6">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 rounded-xl font-black text-[10px] hover:bg-slate-100"
                                onClick={() => setSelectedRecon({
                                  ...s.reconciliation_data,
                                  date: s.end_time,
                                  submitted_by: s.user?.name || s.user?.username,
                                  total_system: s.expected_cash,
                                  total_actual: s.ending_cash,
                                  discrepancy: s.discrepancy,
                                  notes: s.note,
                                  updated_at: s.end_time
                                })}
                              >
                                REVIEW
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Notes & Submission */}
              <div className="glass-card p-6 rounded-3xl space-y-4 print:hidden">
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                   <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">End of Day Notes</h3>
                </div>
                <Textarea 
                  placeholder="Enter any notes about discrepancies, special orders, or cashier handovers..."
                  className="min-h-[120px] rounded-2xl border-slate-200/60 bg-slate-50/50 focus:ring-emerald-600/10 transition-all font-medium text-sm"
                  value={reconNotes}
                  onChange={(e) => setReconNotes(e.target.value)}
                />
                <div className="flex justify-end pt-2">
                  <Button 
                    onClick={handleSubmitReconciliation} 
                    disabled={submittingRecon}
                    className="w-full md:w-auto gap-3 py-6 px-8 rounded-2xl font-black uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200 active:scale-95 transition-all text-sm"
                  >
                    {submittingRecon ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {submittingRecon ? "Finalizing..." : "Submit Reconciled Report"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-10">
              {/* Sales by Platform */}
              <div className="glass-card rounded-3xl overflow-hidden shadow-xl border-none">
                <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Channel split</h3>
                </div>
                <div className="p-0 overflow-x-auto custom-scrollbar">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="text-[10px] font-black uppercase text-slate-500 py-3 px-6">Source</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-3">Vol</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-3 px-6">Revenue</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.keys(report.platforms || {}).map((p) => (
                        <TableRow key={p} className="hover:bg-slate-50/50 border-slate-50 transition-colors">
                          <TableCell className="text-xs font-bold text-slate-700 px-6 py-3 uppercase">{p}</TableCell>
                          <TableCell className="text-right text-xs font-medium text-slate-500">{report.platforms[p].count}</TableCell>
                          <TableCell className="text-right text-xs font-black text-slate-900 px-6">{formatIDR(report.platforms[p].amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group print:hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600 rounded-full blur-[80px] opacity-20 group-hover:opacity-30 transition-opacity" />
                <h3 className="font-black text-white text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                   CLOSING CHECKLIST
                </h3>
                <ul className="space-y-4">
                  {[
                    "Confirm physical cash in the drawer matches actual count.",
                    "Validate EDC settlements against system payment totals.",
                    "Review reasons for every discrepancy > 0.",
                    "Submit report to lock today's performance data."
                  ].map((text, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-lg bg-emerald-600/20 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <CheckCircle className="w-3 h-3 text-emerald-500" />
                      </div>
                      <span className="text-[11px] font-medium text-slate-400 leading-relaxed italic">{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* History List */}
          <section className="space-y-4 pt-10 border-t border-slate-200/60 print:hidden">
            <div className="flex items-center gap-2 px-1">
              <div className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">SUBMISSION HISTORY</span>
            </div>
            
            <div className="glass-card rounded-3xl overflow-hidden shadow-2xl border-none overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase text-slate-500 py-5 px-6">Business Date</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-5">System Target</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-5">Actual Logged</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-5">Gap</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase text-slate-500 py-5">Status</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-5 px-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!(reconHistory?.length > 0) ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20">
                         <p className="text-xs font-bold text-slate-300 uppercase tracking-widest italic opacity-50">Empty Archive</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    reconHistory?.map((report) => (
                      <TableRow key={report.id} className="hover:bg-slate-50/50 border-slate-100 transition-colors">
                        <TableCell className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900">
                              {new Date(report.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(report.date).getFullYear()}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-slate-500">{formatIDR(report.total_system)}</TableCell>
                        <TableCell className="text-right font-black text-slate-900">{formatIDR(report.total_actual)}</TableCell>
                        <TableCell className={cn("text-right font-black", report.discrepancy === 0 ? "text-emerald-600 opacity-50 font-medium" : "text-rose-600")}>
                          {report.discrepancy > 0 ? "+" : ""}{formatIDR(report.discrepancy)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter bg-emerald-100 text-emerald-700 border border-emerald-200">
                            {report.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right px-6">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-9 px-4 rounded-xl font-black text-[10px] hover:bg-slate-100"
                            onClick={() => setSelectedRecon(report)}
                          >
                            DETAILS
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-emerald-600 p-8 text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
             <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/30">
                <CheckCircle className="w-8 h-8 text-white" />
             </div>
             <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">Final Verification</DialogTitle>
          </div>
          <div className="p-8 space-y-6">
            <p className="text-sm font-bold text-slate-600 leading-relaxed text-center">
              Are you sure you want to finalize the reconciliation for <br/> 
              <span className="text-slate-900 font-black px-2 py-1 bg-slate-100 rounded-lg inline-block mt-2">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>?
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={confirmSubmission} className="w-full py-6 rounded-2xl font-black uppercase tracking-wide bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200">
                YES, SUBMIT REPORT
              </Button>
              <Button variant="ghost" onClick={() => setIsConfirmOpen(false)} className="w-full h-12 rounded-2xl font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest text-[10px]">
                RE-CHECK EDITS
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reconciliation Detail Dialog */}
      <Dialog
        open={!!selectedRecon}
        onOpenChange={(open) => { if (!open) setSelectedRecon(null); }}
      >
        <DialogContent className="max-w-3xl rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90dvh]">
          <div className="p-8 space-y-8 flex-1 overflow-y-auto scrollbar-hide min-h-0">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">ARCHIVE RECORD</p>
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">
                  {selectedRecon ? new Date(selectedRecon.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : ""}
                </h2>
              </div>
              <button onClick={() => setSelectedRecon(null)} className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedRecon && (
              <div className="space-y-10">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest leading-none mb-3">System Total</p>
                    <p className="font-black text-xl text-slate-900">{formatIDR(selectedRecon.total_system)}</p>
                  </div>
                  <div className="p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-100">
                    <p className="text-[10px] text-emerald-600/60 uppercase font-black tracking-widest leading-none mb-3">Actual Count</p>
                    <p className="font-black text-xl text-emerald-600">{formatIDR(selectedRecon.total_actual)}</p>
                  </div>
                  <div className={cn("p-6 rounded-[2rem] border transition-colors shadow-lg shadow-inner", selectedRecon.discrepancy === 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700')}>
                    <p className="text-[10px] uppercase font-black tracking-widest leading-none mb-3 opacity-60 italic">Gap</p>
                    <p className="font-black text-xl">{selectedRecon.discrepancy > 0 ? "+" : ""}{formatIDR(selectedRecon.discrepancy)}</p>
                  </div>
                </div>

                <div className="rounded-[2rem] overflow-hidden border border-slate-100 overflow-x-auto custom-scrollbar">
                  <Table>
                    <TableHeader className="bg-slate-50/80 backdrop-blur-sm">
                      <TableRow>
                        <TableHead className="py-4 px-6 text-[10px] font-black uppercase text-slate-500">Payment Channel</TableHead>
                        <TableHead className="text-right py-4 text-[10px] font-black uppercase text-slate-500">Expected</TableHead>
                        <TableHead className="text-right py-4 text-[10px] font-black uppercase text-slate-500">Captured</TableHead>
                        <TableHead className="text-right py-4 px-6 text-[10px] font-black uppercase text-slate-500">Variance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedRecon.details && Object.entries(selectedRecon.details).map(([method, data]) => {
                        const diff = data.actual - data.system;
                        return (
                          <TableRow key={method} className="border-slate-50 hover:bg-slate-50 transition-colors">
                            <TableCell className="py-4 px-6 font-bold text-slate-900 italic">{method}</TableCell>
                            <TableCell className="text-right py-4 font-medium text-slate-400 text-sm">{formatIDR(data.system)}</TableCell>
                            <TableCell className="text-right py-4 font-black text-slate-900 text-sm">{formatIDR(data.actual)}</TableCell>
                            <TableCell className={cn("text-right py-4 px-6 font-black text-sm", diff === 0 ? "text-emerald-600/40" : "text-rose-600 font-black")}>
                              {diff > 0 ? "+" : ""}{formatIDR(diff)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {selectedRecon.notes && (
                  <div className="bg-amber-50 p-8 rounded-[2rem] border border-amber-100/50 shadow-inner">
                    <span className="font-black text-amber-800 block mb-3 uppercase text-[10px] tracking-widest">SUBMISSION NOTES:</span>
                    <p className="text-slate-700 leading-relaxed font-bold italic text-sm">"{selectedRecon.notes}"</p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-slate-100 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-xs">
                       {(selectedRecon.submitted_by || "X").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Authenticated By</p>
                      <p className="text-sm font-black text-slate-900 uppercase">
                        {selectedRecon.submitted_by || "System Admin"}
                        <span className="ml-2 text-[9px] font-bold text-slate-400 normal-case">{new Date(selectedRecon.updated_at).toLocaleString()}</span>
                      </p>
                    </div>
                  </div>
                  <Button onClick={() => setSelectedRecon(null)} className="rounded-2xl h-12 px-8 font-black uppercase tracking-wider bg-slate-900 hover:bg-slate-800 transition-all active:scale-95">
                    Close Details
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
