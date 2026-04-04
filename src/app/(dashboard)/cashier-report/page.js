"use client";
import { useEffect, useState, useCallback } from "react";
import { api, getAuth } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { RefreshCw, Printer, Save, CheckCircle, AlertCircle, Activity, BarChart, X, DollarSign, Wallet, Clock, Calendar, FileText } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useToast } from "../../../components/ui/use-toast";
import { Textarea } from "../../../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../components/ui/dialog";
import ShiftReportModal from "../../../components/ShiftReportModal";

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
  const [shiftsForDate, setShiftsForDate] = useState([]);
  const [reportShiftId, setReportShiftId] = useState(null);
  const [isShiftReportOpen, setIsShiftReportOpen] = useState(false);

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

  // Load shifts for a specific recon date
  const loadShiftsForDate = useCallback(async (dateStr) => {
    try {
      const res = await api.get(`/shifts/history?date=${dateStr}`);
      setShiftsForDate(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
      setShiftsForDate([]);
    }
  }, []);

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Cashier Reconciliation</h2>
          <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2">
            Daily sales validation and financial handover
            <span className="inline-block w-1 h-1 bg-emerald-500 rounded-full" />
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-100 shadow-sm">
          <Input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            className="w-36 h-9 text-xs font-bold border-none bg-transparent focus:ring-0 cursor-pointer"
          />
          <div className="h-4 w-px bg-slate-100 mx-1" />
          <Button variant="ghost" size="sm" onClick={loadReport} className="h-8 w-8 p-0 rounded-lg">
            <RefreshCw className={cn("w-3.5 h-3.5", loading ? "animate-spin text-emerald-600" : "text-slate-400")} />
          </Button>
          <Button onClick={handlePrint} className="h-8 px-4 rounded-lg bg-slate-900 text-white hover:bg-black font-bold text-[10px] transition-all">
            <Printer className="w-3.5 h-3.5 mr-2" /> PRINT
          </Button>
        </div>
      </div>

      {/* Reconciliation Status Quick List */}
      <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar print:hidden">
        {(Array.isArray(reconHistory) ? reconHistory : []).map((r) => {
          const isSubmitted = r?.status === "SUBMITTED";
          const rDate = r?.date ? new Date(r.date).toISOString().split('T')[0] : "";
          const isCurrent = rDate === date;
          return (
            <button
              key={r.id}
              onClick={() => setDate(rDate)}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all whitespace-nowrap active:scale-95",
                isCurrent 
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500/10' 
                  : 'border-slate-100 bg-white text-slate-500 hover:border-slate-200',
                isSubmitted 
                  ? '' 
                  : 'bg-amber-50/50 text-amber-700 border-amber-100/30'
              )}
            >
              <div className={cn("w-1.5 h-1.5 rounded-full", isSubmitted ? "bg-emerald-500" : "bg-amber-500")} />
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Gross Sales</p>
              <div className="text-lg sm:text-xl font-bold text-slate-800 tabular-nums truncate whitespace-nowrap">{formatIDR(report.summary.grossSales)}</div>
              <p className="text-[8px] font-semibold text-slate-400 mt-2 bg-slate-50 w-fit px-2 py-0.5 rounded-full">{report.summary.totalOrders} Trans.</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Net Revenue</p>
              <div className="text-lg sm:text-xl font-bold text-emerald-600 tabular-nums truncate whitespace-nowrap">{formatIDR(report.summary.netSales)}</div>
              <p className="text-[8px] font-semibold text-emerald-600/60 mt-2 bg-emerald-50 w-fit px-2 py-0.5 rounded-full uppercase">Net Disc.</p>
            </div>

            <div className="bg-emerald-900 p-5 rounded-2xl shadow-sm relative overflow-hidden group">
              <p className="text-[9px] font-bold text-emerald-300 uppercase tracking-wider mb-2">Expected Cash</p>
              <div className="text-lg sm:text-xl font-bold text-white tabular-nums truncate whitespace-nowrap">{formatIDR(report.cashInDrawer)}</div>
              <p className="text-[8px] font-semibold text-emerald-300/60 mt-2 bg-white/10 w-fit px-2 py-0.5 rounded-full uppercase">Drawer</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Final Revenue</p>
              <div className="text-lg sm:text-xl font-bold text-slate-800 tabular-nums truncate whitespace-nowrap">{formatIDR(report.summary.finalRevenue)}</div>
              <p className="text-[8px] font-semibold text-slate-400/60 mt-2 bg-slate-50 w-fit px-2 py-0.5 rounded-full uppercase">Net - Comm</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-10">
              {/* Payment Method Breakdown */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center">
                       <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">Payment Validation</h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">SYSTEM vs ACTUAL</span>
                </div>
                <div className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/30">
                      <TableRow>
                        <TableHead className="text-[9px] font-bold uppercase text-slate-400 py-3 px-6">Method</TableHead>
                        <TableHead className="text-right text-[9px] font-bold uppercase text-slate-400 py-3">Count</TableHead>
                        <TableHead className="text-right text-[9px] font-bold uppercase text-slate-400 py-3">System</TableHead>
                        <TableHead className="text-right text-[9px] font-bold uppercase text-slate-400 py-3">Actual</TableHead>
                        <TableHead className="text-right text-[9px] font-bold uppercase text-slate-400 py-3 px-6">Gap</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(report.paymentMethods || {})
                        .filter(([method, data]) => data.count > 0 || actualCounts[method])
                        .map(([method, data]) => {
                          const actual = parseInt(actualCounts[method]) || 0;
                          const diff = actual - data.amount;
                          return (
                            <TableRow key={method} className="hover:bg-slate-50/30 transition-colors border-slate-50">
                              <TableCell className="font-bold text-slate-800 px-6 py-3 text-xs italic">{method}</TableCell>
                              <TableCell className="text-right font-medium text-slate-400 text-xs">{data.count}</TableCell>
                              <TableCell className="text-right font-bold text-slate-800 text-xs">{formatIDR(data.amount)}</TableCell>
                              <TableCell className="text-right print:hidden">
                                <div className="flex justify-end items-center gap-2">
                                  <div className="relative" >
                                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-400">Rp</span>
                                    <Input 
                                      className="w-28 h-8 text-right font-bold text-emerald-600 bg-slate-50 border-slate-100 rounded-lg focus:ring-emerald-500/10 pl-6 text-xs" 
                                      placeholder="0"
                                      type="number"
                                      value={actualCounts[method] || ""}
                                      onChange={(e) => handleActualChange(method, e.target.value)}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className={cn("text-right font-bold px-6 text-xs", diff === 0 ? "text-emerald-600" : "text-rose-500")}>
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
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                       <Clock className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">Shift Records</h3>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">CASHIER LOGS</span>
                </div>
                <div className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/30">
                      <TableRow>
                        <TableHead className="text-[9px] font-bold uppercase text-slate-400 py-3 px-6">Cashier</TableHead>
                        <TableHead className="text-[9px] font-bold uppercase text-slate-400 py-3">Timeline</TableHead>
                        <TableHead className="text-right text-[9px] font-bold uppercase text-slate-400 py-3">Sales</TableHead>
                        <TableHead className="text-right text-[9px] font-bold uppercase text-slate-400 py-3">Delta</TableHead>
                        <TableHead className="text-right text-[9px] font-bold uppercase text-slate-400 py-3 px-6">Review</TableHead>
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
                          <TableRow key={s.id} className="hover:bg-slate-50/30 transition-colors border-slate-50">
                            <TableCell className="font-bold text-slate-800 px-6 py-3 uppercase text-[10px]">
                              {s.user?.name || s.user?.username || "Unknown"}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-700">
                                  {new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                                  {s.end_time ? new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Active"}
                                </span>
                                <span className="text-[8px] font-medium text-slate-400">{new Date(s.start_time).toLocaleDateString()}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-800 text-xs">
                              {formatIDR(s.total_sales || 0)}
                            </TableCell>
                            <TableCell className={cn("text-right font-bold text-xs", (s.discrepancy || 0) === 0 ? "text-emerald-600 opacity-50" : "text-rose-500")}>
                              {s.discrepancy > 0 ? "+" : ""}{formatIDR(s.discrepancy || 0)}
                            </TableCell>
                            <TableCell className="text-right px-6">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 px-3 rounded-lg font-bold text-[9px] hover:bg-slate-50 border border-slate-100"
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
                                VIEW
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
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 print:hidden">
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                   <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Handover Notes</h3>
                </div>
                <Textarea 
                  placeholder="Enter any notes about discrepancies, special orders, or cashier handovers..."
                  className="min-h-[100px] rounded-xl border-slate-100 bg-slate-50/50 focus:ring-emerald-500/10 transition-all font-medium text-xs"
                  value={reconNotes}
                  onChange={(e) => setReconNotes(e.target.value)}
                />
                <div className="flex justify-end pt-2">
                  <Button 
                    onClick={handleSubmitReconciliation} 
                    disabled={submittingRecon}
                    className="w-full md:w-auto h-11 px-8 rounded-xl font-bold uppercase tracking-wider bg-slate-900 text-white hover:bg-black transition-all text-xs"
                  >
                    {submittingRecon ? "Processing..." : "Finalize Reconciliation"}
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
                            onClick={() => {
                              setSelectedRecon(report);
                              const rDate = report.date ? new Date(report.date).toISOString().split('T')[0] : "";
                              if (rDate) loadShiftsForDate(rDate);
                            }}
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
        onOpenChange={(open) => { if (!open) { setSelectedRecon(null); setShiftsForDate([]); } }}
      >
        <DialogContent className="max-w-3xl rounded-[2rem] sm:rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90dvh]">
          <div className="p-5 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto scrollbar-hide min-h-0">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">ARCHIVE RECORD</p>
                <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tighter uppercase">
                  {selectedRecon ? new Date(selectedRecon.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : ""}
                </h2>
              </div>
              <button onClick={() => { setSelectedRecon(null); setShiftsForDate([]); }} className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedRecon && (
              <div className="space-y-10">
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="p-2 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100 text-center">
                    <p className="text-[7px] sm:text-[9px] text-slate-400 uppercase font-bold tracking-wide mb-1">System</p>
                    <p className="font-black text-[10px] sm:text-sm text-slate-900 break-all leading-tight">{formatIDR(selectedRecon.total_system)}</p>
                  </div>
                  <div className="p-2 sm:p-4 bg-emerald-50/50 rounded-xl sm:rounded-2xl border border-emerald-100 text-center">
                    <p className="text-[7px] sm:text-[9px] text-emerald-600/60 uppercase font-bold tracking-wide mb-1">Actual</p>
                    <p className="font-black text-[10px] sm:text-sm text-emerald-600 break-all leading-tight">{formatIDR(selectedRecon.total_actual)}</p>
                  </div>
                  <div className={cn("p-2 sm:p-4 rounded-xl sm:rounded-2xl border text-center", selectedRecon.discrepancy === 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700')}>
                    <p className="text-[7px] sm:text-[9px] uppercase font-bold tracking-wide mb-1 opacity-60">Gap</p>
                    <p className="font-black text-[10px] sm:text-sm break-all leading-tight">{selectedRecon.discrepancy > 0 ? "+" : ""}{formatIDR(selectedRecon.discrepancy)}</p>
                  </div>
                </div>

                {selectedRecon.details && Object.keys(selectedRecon.details).length > 0 && (
                <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-slate-100 overflow-x-auto custom-scrollbar">
                  <Table>
                    <TableHeader className="bg-slate-50/80 backdrop-blur-sm">
                      <TableRow>
                        <TableHead className="py-3 px-3 sm:px-6 text-[9px] font-black uppercase text-slate-500">Channel</TableHead>
                        <TableHead className="text-right py-3 px-2 text-[9px] font-black uppercase text-slate-500">Expected</TableHead>
                        <TableHead className="text-right py-3 px-2 text-[9px] font-black uppercase text-slate-500">Captured</TableHead>
                        <TableHead className="text-right py-3 px-3 sm:px-6 text-[9px] font-black uppercase text-slate-500">Variance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(selectedRecon.details).map(([method, data]) => {
                        const diff = (data.actual || 0) - (data.system || 0);
                        return (
                          <TableRow key={method} className="border-slate-50 hover:bg-slate-50 transition-colors">
                            <TableCell className="py-3 px-3 sm:px-6 font-bold text-slate-900 uppercase text-xs">{method}</TableCell>
                            <TableCell className="text-right py-3 px-2 font-medium text-slate-400 text-xs">{formatIDR(data.system || 0)}</TableCell>
                            <TableCell className="text-right py-3 px-2 font-black text-slate-900 text-xs">{formatIDR(data.actual || 0)}</TableCell>
                            <TableCell className={cn("text-right py-3 px-3 sm:px-6 font-black text-xs", diff === 0 ? "text-emerald-600/40" : "text-rose-600")}>
                              {diff > 0 ? "+" : ""}{formatIDR(diff)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                )}

                {shiftsForDate.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shift Reports - Reprint</span>
                  </div>
                  <div className="space-y-3">
                    {shiftsForDate.map((shift) => (
                      <div key={shift.id} className="flex items-center justify-between gap-3 p-4 sm:p-5 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-[10px] sm:text-xs shrink-0">
                            {(shift.user?.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-black text-slate-900 uppercase truncate">{shift.user?.name || shift.user?.username || "Staff"}</p>
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 truncate">
                              {new Date(shift.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {shift.end_time ? new Date(shift.end_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : "Active"}
                              {" | "}Opening: {formatIDR(shift.starting_cash)}
                            </p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          className="h-8 sm:h-9 px-3 sm:px-4 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-[9px] sm:text-[10px] uppercase tracking-wider gap-1.5 shadow-lg active:scale-95 transition-all shrink-0"
                          onClick={() => {
                            setReportShiftId(shift.id);
                            setIsShiftReportOpen(true);
                          }}
                        >
                          <Printer className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> REPRINT
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                )}

                {selectedRecon.notes && (
                  <div className="bg-amber-50 p-5 sm:p-8 rounded-xl sm:rounded-2xl border border-amber-100/50">
                    <span className="font-black text-amber-800 block mb-3 uppercase text-[10px] tracking-widest">SUBMISSION NOTES:</span>
                    <p className="text-slate-700 leading-relaxed font-bold italic text-sm">&quot;{selectedRecon.notes}&quot;</p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-6 border-t border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-[10px] shrink-0">
                     {(selectedRecon.submitted_by || "X").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">Submitted By</p>
                    <p className="text-xs font-black text-slate-900 uppercase">
                      {selectedRecon.submitted_by || "System Admin"}
                      <span className="ml-1 text-[8px] font-bold text-slate-400 normal-case">{new Date(selectedRecon.updated_at).toLocaleString()}</span>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ShiftReportModal 
        isOpen={isShiftReportOpen}
        shiftId={reportShiftId}
        onFinish={() => {
          setIsShiftReportOpen(false);
          setReportShiftId(null);
        }}
      />
    </div>
  );
}

