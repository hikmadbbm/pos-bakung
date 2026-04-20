"use client";
import { useEffect, useState, useCallback } from "react";
import { api, getAuth } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { RefreshCw, Printer, Save, CheckCircle, AlertCircle, Activity, BarChart, X, DollarSign, Wallet, Clock, Calendar, FileText, ShoppingBag, ArrowRight } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useToast } from "../../../components/ui/use-toast";
import { Textarea } from "../../../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../components/ui/dialog";
import ShiftReportModal from "../../../components/ShiftReportModal";
import { useTranslation } from "../../../lib/language-context";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function CashierReportPage() {
  const { t } = useTranslation();
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
      error(t('cashier_logs.save_fail'));
    } finally {
      setLoading(false);
    }
  }, [date, error, t]);

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

  const handlePrint = async () => {
    const reportElement = document.getElementById('cashier-report-content');
    if (!reportElement) {
      window.print();
      return;
    }

    try {
      setLoading(true);
      // Temporary shift for clean export
      reportElement.classList.add('exporting-pdf');
      
      const canvas = await html2canvas(reportElement, {
        scale: 2, // High resolution
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        windowWidth: 1200, // Consistent width for export
        onclone: (clonedDoc) => {
          // Force visibility of print-only elements and hide UI elements in the clone
          const printHidden = clonedDoc.querySelectorAll('.print\\:hidden');
          printHidden.forEach(el => el.style.visibility = 'hidden');
          printHidden.forEach(el => el.style.display = 'none');
          
          const printBlock = clonedDoc.querySelectorAll('.print\\:block');
          printBlock.forEach(el => el.style.display = 'block');
          
          const reportContent = clonedDoc.getElementById('cashier-report-content');
          if (reportContent) {
            reportContent.style.padding = '40px';
          }
        }
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      // Handle multiple pages if height exceeds A4
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `LOG_KASIR_${date || 'REPORT'}.pdf`;
      pdf.save(fileName);
      success(t('common.print_success'));
    } catch (err) {
      console.error("PDF Export Error:", err);
      error(t('common.print_fail'));
      window.print(); // Fallback
    } finally {
      reportElement.classList.remove('exporting-pdf');
      setLoading(false);
    }
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
        submitted_by: user ? (user.username || user.name || t('common.admin')) : t('common.admin')
      });
      
      success(t('cashier_logs.save_success'));
      loadReport(); 
      loadReconHistory();
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.error || e.message || t('cashier_logs.save_fail');
      error(msg);
    } finally {
      setSubmittingRecon(false);
    }
  };
  // Print-specific view component
  const PrintHeader = () => (
    <div className="hidden print:block mb-8 border-b-2 border-slate-900 pb-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black uppercase italic tracking-tighter">BAKMIE YOU-TJE</h1>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mt-1">{t('cashier_logs.title')}</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t('common.date')}</p>
          <p className="text-sm font-black text-slate-900">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div id="cashier-report-content" className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-20 px-4 md:px-0">
      <PrintHeader />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 print:hidden">
        <div>
          <h2 className="text-2xl md:text-4xl font-black tracking-tighter text-slate-900 uppercase italic">{t('cashier_logs.title')}</h2>
          <div className="flex items-center gap-2.5 mt-1 md:mt-2">
            <span className="flex h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{t('cashier_logs.subtitle')}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex-1 md:flex-none flex items-center gap-3 bg-white/50 backdrop-blur-xl px-4 h-12 md:h-16 rounded-2xl md:rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/20 group">
             <Calendar className="w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
             <input 
               type="date" 
               value={date} 
               onChange={(e) => setDate(e.target.value)}
               className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest text-slate-900 min-w-[120px]"
             />
             <div className="w-px h-6 bg-slate-100 mx-1" />
             <button onClick={loadReport} className="text-slate-300 hover:text-emerald-500 transition-colors">
                <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
             </button>
          </div>
          <Button onClick={handlePrint} className="h-12 md:h-16 px-8 rounded-2xl md:rounded-3xl bg-slate-900 text-white hover:bg-black font-black text-[10px] uppercase tracking-widest shadow-2xl transition-all active:scale-95 shrink-0">
            <Printer className="w-4 h-4 mr-3" /> Export PDF / {t('common.print')}
          </Button>
        </div>
      </div>

      {/* Info Box: Why this page? */}
      <div className="bg-emerald-50/50 border border-emerald-100/50 p-6 rounded-3xl flex flex-col md:flex-row items-start md:items-center gap-5 print:hidden">
        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-emerald-100">
           <AlertCircle className="w-6 h-6 text-emerald-600" />
        </div>
        <div>
           <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest mb-1">{t('cashier_logs.workflow_info_title')}</h4>
           <p className="text-[11px] text-emerald-700/70 font-medium leading-relaxed">
             {t('cashier_logs.workflow_info_desc')}
           </p>
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
           <p className="mt-4 text-xs font-black text-slate-400 uppercase tracking-widest">{t('pos.syncing')}</p>
        </div>
      ) : !report ? (
        <div className="text-center py-20 glass-card rounded-3xl border-dashed">
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
             <Calendar className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-sm font-bold text-slate-800">{t('common.no_records')}</p>
          <p className="text-xs text-slate-500 mt-1">{t('common.no_data_for')} {new Date(date).toLocaleDateString()}.</p>
        </div>
      ) : (
        <div className="space-y-10 animate-fade-in">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20 relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">< ShoppingBag className="w-5 h-5" /></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{report.summary.totalOrders} {t('common.transactions')}</span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{t('reports.gross_revenue')}</p>
              <div className="text-xl md:text-2xl font-black text-slate-900 tabular-nums">{formatIDR(report.summary.grossSales)}</div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20 relative overflow-hidden group border-b-4 border-b-emerald-500">
               <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500"><Activity className="w-5 h-5" /></div>
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{t('reports.revenue')}</span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{t('reports.net_revenue')}</p>
              <div className="text-xl md:text-2xl font-black text-emerald-600 tabular-nums">{formatIDR(report.summary.netSales)}</div>
            </div>

            <div className="bg-slate-900 p-6 rounded-[2rem] shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-emerald-400"><DollarSign className="w-5 h-5" /></div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{t('common.system')}</span>
              </div>
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-1">{t('cashier_logs.total_cash')}</p>
              <div className="text-xl md:text-2xl font-black text-white tabular-nums">{formatIDR(report.cashInDrawer)}</div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20 relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400"><ArrowRight className="w-5 h-5" /></div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('common.final')}</span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{t('common.settled')}</p>
              <div className="text-xl md:text-2xl font-black text-slate-900 tabular-nums">{formatIDR(report.summary.finalRevenue)}</div>
            </div>
          </div>
          
          {/* Print Summary Table */}
          <div className="hidden print:block border-2 border-slate-900 rounded-3xl p-10 space-y-8 bg-slate-50/50 mb-12">
             <div className="grid grid-cols-3 gap-12">
                <div className="space-y-6">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">{t('reports.performance_summary')}</p>
                   <div className="space-y-3">
                      <div className="flex justify-between text-xs">
                         <span className="font-bold text-slate-500">{t('reports.gross_revenue')}</span>
                         <span className="font-black tabular-nums">{formatIDR(report.summary.grossSales)}</span>
                      </div>
                      <div className="flex justify-between text-xs pt-2 border-t border-slate-100">
                         <span className="font-bold text-slate-900 font-black uppercase tracking-tighter">{t('reports.net_revenue')}</span>
                         <span className="font-black text-emerald-600 text-sm tabular-nums">{formatIDR(report.summary.netSales)}</span>
                      </div>
                   </div>
                </div>
                <div className="space-y-6">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">{t('common.system')}</p>
                   <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-500">{t('cashier_logs.total_cash')}</span>
                      <span className="font-black tabular-nums">{formatIDR(report.cashInDrawer)}</span>
                   </div>
                </div>
                <div className="space-y-6 text-right">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">{t('common.final')}</p>
                   <div className="flex flex-col items-end">
                      <span className="text-[8px] font-bold text-slate-400 uppercase mb-1">{t('common.settled')}</span>
                      <span className="text-2xl font-black text-slate-900 leading-tight tabular-nums">{formatIDR(report.summary.finalRevenue)}</span>
                   </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-10">
              {/* Payment Method Breakdown */}
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center rotate-3">
                       <Wallet className="w-6 h-6 text-emerald-400 -rotate-3" />
                    </div>
                    <div>
                       <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{t('cashier_logs.payment_validation')}</h3>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{t('cashier_logs.physical_input')}</p>
                    </div>
                  </div>
                </div>
                <div className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-none">
                        <TableHead className="text-[9px] font-black uppercase text-slate-400 py-4 px-8 tracking-widest">{t('common.method')}</TableHead>
                        <TableHead className="text-right text-[9px] font-black uppercase text-slate-400 py-4 tracking-widest">{t('common.system')}</TableHead>
                        <TableHead className="text-right text-[9px] font-black uppercase text-slate-400 py-4 tracking-widest">{t('common.actual')} ({t('common.input')})</TableHead>
                        <TableHead className="text-right text-[9px] font-black uppercase text-slate-400 py-4 px-8 tracking-widest">{t('common.variance')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(report.paymentMethods || {})
                        .filter(([method, data]) => data.count > 0 || actualCounts[method])
                        .map(([method, data]) => {
                          const actual = parseInt(actualCounts[method]) || 0;
                          const diff = actual - data.amount;
                          return (
                            <TableRow key={method} className="hover:bg-slate-50/50 transition-all border-slate-50 group">
                              <TableCell className="px-8 py-5">
                                 <div className="flex flex-col">
                                    <span className="font-black text-slate-900 uppercase text-xs tracking-tight italic">{method}</span>
                                    <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{data.count} {t('common.transactions')}</span>
                                 </div>
                              </TableCell>
                              <TableCell className="text-right font-black text-slate-400 text-xs tabular-nums">{formatIDR(data.amount)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end items-center">
                                  <div className="relative group-focus-within:scale-105 transition-transform print:hidden" >
                                    <Input 
                                      className="w-32 h-12 text-right font-black text-slate-900 bg-slate-50 border-none rounded-xl focus:ring-4 focus:ring-emerald-500/10 px-4 text-sm" 
                                      placeholder="0"
                                      type="number"
                                      value={actualCounts[method] || ""}
                                      onChange={(e) => handleActualChange(method, e.target.value)}
                                    />
                                  </div>
                                  <span className="hidden print:block font-black text-slate-900 text-xs">{formatIDR(actual)}</span>
                                </div>
                              </TableCell>
                              <TableCell className={cn("text-right font-black px-8 text-xs tabular-nums", diff === 0 ? "text-emerald-500/30" : diff > 0 ? "text-blue-500" : "text-rose-500")}>
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
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/20 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center -rotate-3">
                       <Clock className="w-6 h-6 text-white rotate-3" />
                    </div>
                    <div>
                       <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{t('cashier_logs.shift_data')}</h3>
                       <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{t('cashier_logs.recap_from_stop')}</p>
                    </div>
                  </div>
                </div>
                <div className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-none">
                        <TableHead className="text-[9px] font-black uppercase text-slate-400 py-4 px-8">{t('common.cashier')}</TableHead>
                        <TableHead className="text-[9px] font-black uppercase text-slate-400 py-4">{t('common.timeline')}</TableHead>
                        <TableHead className="text-right text-[9px] font-black uppercase text-slate-400 py-4">{t('common.system')}</TableHead>
                        <TableHead className="text-right text-[9px] font-black uppercase text-slate-400 py-4">{t('common.settled')}</TableHead>
                        <TableHead className="text-right text-[9px] font-black uppercase text-slate-400 py-4 px-8">{t('common.view_detail')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!(report.shifts?.length > 0) ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-16">
                             <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] italic">{t('cashier_logs.no_closed_shifts')}</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        report.shifts.map((s) => (
                          <TableRow key={s.id} className="hover:bg-slate-50/50 transition-all border-slate-50 group">
                            <TableCell className="px-8 py-5">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-[10px] uppercase">{(s.user?.name || "K").charAt(0)}</div>
                                  <span className="font-black text-slate-900 uppercase text-xs tracking-tight italic">{s.user?.name || s.user?.username || t('common.unknown')}</span>
                               </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">
                                  {new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                                  {s.end_time ? new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : t('common.active')}
                                </span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase">{new Date(s.start_time).toLocaleDateString()}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-black text-slate-400 text-xs tabular-nums">
                              {formatIDR(s.total_sales || 0)}
                            </TableCell>
                            <TableCell className="text-right font-black text-slate-900 text-xs tabular-nums">
                              {formatIDR(s.ending_cash || 0)}
                            </TableCell>
                            <TableCell className="text-right px-8">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-9 px-4 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-sm border border-slate-100"
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
                                {t('common.view_detail')}
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
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/20 space-y-6 print:hidden">
                <div className="flex items-center gap-3">
                   <div className="w-2 h-2 bg-slate-900 rounded-full" />
                   <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">{t('cashier_logs.finalize_notes')}</h3>
                </div>
                <Textarea 
                  placeholder={t('cashier_logs.notes_placeholder')}
                  className="min-h-[120px] rounded-2xl border-none bg-slate-50/50 focus:ring-4 focus:ring-emerald-500/10 transition-all font-bold text-xs p-5 placeholder:italic placeholder:font-medium"
                  value={reconNotes}
                  onChange={(e) => setReconNotes(e.target.value)}
                />
                <div className="flex justify-end pt-2">
                  <Button 
                    onClick={handleSubmitReconciliation} 
                    disabled={submittingRecon}
                    className="w-full h-16 rounded-[1.25rem] font-black uppercase tracking-widest bg-slate-900 text-white hover:bg-black shadow-2xl shadow-slate-400 transition-all active:scale-95 text-[11px]"
                  >
                    {submittingRecon ? t('cashier_logs.saving_data') : t('cashier_logs.save_lock_report')}
                  </Button>
                </div>
              </div>

                 <div className="hidden print:block bg-slate-50 p-6 rounded-3xl border border-slate-100">
                   <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">{t('cashier_logs.finalize_notes')}</h3>
                   <div className="text-sm font-bold text-slate-700 italic border-l-4 border-slate-200 pl-6 py-2">
                     {reconNotes || "-"}
                   </div>
                 </div>
              </div>

            <div className="space-y-10">
              {/* Sales by Platform */}
              <div className="glass-card rounded-3xl overflow-hidden shadow-xl border-none">
                <div className="p-6 border-b border-slate-100 bg-slate-50/30">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{t('cashier_logs.channel_split')}</h3>
                </div>
                <div className="p-0 overflow-x-auto custom-scrollbar">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow>
                        <TableHead className="text-[10px] font-black uppercase text-slate-500 py-3 px-6">{t('common.source')}</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-3">{t('common.vol')}</TableHead>
                        <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-3 px-6">{t('reports.revenue')}</TableHead>
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
                   {t('cashier_logs.closing_checklist')}
                </h3>
                <ul className="space-y-4">
                  {[
                    t('cashier_logs.checklist_1'),
                    t('cashier_logs.checklist_2'),
                    t('cashier_logs.checklist_3'),
                    t('cashier_logs.checklist_4')
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
              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{t('cashier_logs.submission_history')}</span>
            </div>
            
            <div className="glass-card rounded-3xl overflow-hidden shadow-2xl border-none overflow-x-auto custom-scrollbar">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow>
                    <TableHead className="text-[10px] font-black uppercase text-slate-500 py-5 px-6">{t('cashier_logs.business_date')}</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-5">{t('cashier_logs.system_target')}</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-5">{t('cashier_logs.actual_logged')}</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-5">{t('cashier_logs.gap')}</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase text-slate-500 py-5">{t('common.status')}</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-5 px-6">{t('common.view_detail')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!(reconHistory?.length > 0) ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-20">
                         <p className="text-xs font-bold text-slate-300 uppercase tracking-widest italic opacity-50">{t('shift.no_records')}</p>
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
                            {t('common.view_detail')}
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
             <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">{t('cashier_logs.final_verification')}</DialogTitle>
          </div>
          <div className="p-8 space-y-6">
            <p className="text-sm font-bold text-slate-600 leading-relaxed text-center">
              {t('cashier_logs.confirm_finalize')} <br/> 
              <span className="text-slate-900 font-black px-2 py-1 bg-slate-100 rounded-lg inline-block mt-2">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>?
            </p>
            <div className="flex flex-col gap-3">
              <Button onClick={confirmSubmission} className="w-full py-6 rounded-2xl font-black uppercase tracking-wide bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-200">
                {t('cashier_logs.submit_yes')}
              </Button>
              <Button variant="ghost" onClick={() => setIsConfirmOpen(false)} className="w-full h-12 rounded-2xl font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest text-[10px]">
                {t('cashier_logs.re_check')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reconciliation Detail Dialog */}
      <Dialog
        open={!!selectedRecon}
        onOpenChange={(open) => { 
          if (!open) { 
            setSelectedRecon(null); 
            setShiftsForDate([]); 
          } 
        }}
      >
        <DialogContent className="max-w-3xl rounded-[2rem] sm:rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90dvh]">
          <div className="p-5 sm:p-8 space-y-6 sm:space-y-8 flex-1 overflow-y-auto scrollbar-hide min-h-0">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{t('cashier_logs.archive_record')}</p>
                <h2 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tighter uppercase">
                  {selectedRecon ? new Date(selectedRecon.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : ""}
                </h2>
              </div>
            </div>

            {selectedRecon && (
              <div className="space-y-10">
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="p-2 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100 text-center">
                    <p className="text-[7px] sm:text-[9px] text-slate-400 uppercase font-bold tracking-wide mb-1">{t('common.system')}</p>
                    <p className="font-black text-[10px] sm:text-sm text-slate-900 break-all leading-tight">{formatIDR(selectedRecon.total_system)}</p>
                  </div>
                  <div className="p-2 sm:p-4 bg-emerald-50/50 rounded-xl sm:rounded-2xl border border-emerald-100 text-center">
                    <p className="text-[7px] sm:text-[9px] text-emerald-600/60 uppercase font-bold tracking-wide mb-1">{t('common.actual')}</p>
                    <p className="font-black text-[10px] sm:text-sm text-emerald-600 break-all leading-tight">{formatIDR(selectedRecon.total_actual)}</p>
                  </div>
                  <div className={cn("p-2 sm:p-4 rounded-xl sm:rounded-2xl border text-center", selectedRecon.discrepancy === 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700')}>
                    <p className="text-[7px] sm:text-[9px] uppercase font-bold tracking-wide mb-1 opacity-60">{t('cashier_logs.gap')}</p>
                    <p className="font-black text-[10px] sm:text-sm break-all leading-tight">{selectedRecon.discrepancy > 0 ? "+" : ""}{formatIDR(selectedRecon.discrepancy)}</p>
                  </div>
                </div>

                {selectedRecon.details && Object.keys(selectedRecon.details).length > 0 && (
                <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-slate-100 overflow-x-auto custom-scrollbar">
                  <Table>
                    <TableHeader className="bg-slate-50/80 backdrop-blur-sm">
                      <TableRow>
                        <TableHead className="py-3 px-3 sm:px-6 text-[9px] font-black uppercase text-slate-500">{t('common.channel')}</TableHead>
                        <TableHead className="text-right py-3 px-2 text-[9px] font-black uppercase text-slate-500">{t('common.expected')}</TableHead>
                        <TableHead className="text-right py-3 px-2 text-[9px] font-black uppercase text-slate-500">{t('common.captured')}</TableHead>
                        <TableHead className="text-right py-3 px-3 sm:px-6 text-[9px] font-black uppercase text-slate-500">{t('common.variance')}</TableHead>
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
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('cashier_logs.shift_reprint_title')}</span>
                  </div>
                  <div className="space-y-3">
                    {shiftsForDate.map((shift) => (
                      <div key={shift.id} className="flex items-center justify-between gap-3 p-4 sm:p-5 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-[10px] sm:text-xs shrink-0">
                            {(shift.user?.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-black text-slate-900 uppercase truncate">{shift.user?.name || shift.user?.username || t('common.staff')}</p>
                            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 truncate">
                              {new Date(shift.start_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} - {shift.end_time ? new Date(shift.end_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : t('common.active')}
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
                          <Printer className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> {t('common.print')}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                )}

                {selectedRecon.notes && (
                  <div className="bg-amber-50 p-5 sm:p-8 rounded-xl sm:rounded-2xl border border-amber-100/50">
                    <span className="font-black text-amber-800 block mb-3 uppercase text-[10px] tracking-widest">{t('cashier_logs.submission_notes')}:</span>
                    <p className="text-slate-700 leading-relaxed font-bold italic text-sm">&quot;{selectedRecon.notes}&quot;</p>
                  </div>
                )}

                <div className="flex items-center gap-3 pt-6 border-t border-slate-100">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-[10px] shrink-0">
                     {(selectedRecon.submitted_by || "X").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">{t('cashier_logs.submitted_by')}</p>
                    <p className="text-xs font-black text-slate-900 uppercase">
                      {selectedRecon.submitted_by || t('common.system_admin')}
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

