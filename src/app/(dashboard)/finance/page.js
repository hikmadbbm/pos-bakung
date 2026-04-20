"use client";
import { useState, useEffect } from "react";
import { api, decodeAndValidateJwt } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { useToast } from "../../../components/ui/use-toast";
import { 
  DollarSign, CheckCircle2, AlertCircle, 
  Calendar, Wallet, ArrowDownCircle, ArrowRight, Plus, Trash2, FileText, Smartphone
} from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../components/ui/dialog";
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { ResponsiveDataView } from "../../../components/ResponsiveDataView";
import { useTranslation } from "../../../lib/language-context";
import { cn } from "../../../lib/utils";
import { formatIDR } from "../../../lib/format";

export default function ConsignmentSettlementPage() {
  const { t, language } = useTranslation();
  const { success, error } = useToast();
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ expected: 0, received: 0, outstanding: 0 });
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(null); // ID of the confirming item
  const [filter, setFilter] = useState("ALL");
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);
  const [partners, setPartners] = useState([]);
  const toLocalYYYYMMDD = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const [newEntry, setNewEntry] = useState({
    partnerId: "",
    date: toLocalYYYYMMDD(new Date()),
    amount: 0,
    notes: ""
  });
  const [user, setUser] = useState(null);

  // --- P&L State ---
  const [pnlData, setPnlData] = useState(null);
  const [pnlLoading, setPnlLoading] = useState(true);
  const [pnlRange, setPnlRange] = useState("THIS_MONTH");
  const [detailModal, setDetailModal] = useState({ open: false, type: null });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      const decoded = decodeAndValidateJwt(token);
      setUser(decoded);
    }
    loadData();
    loadPartners();
  }, [filter]);

  useEffect(() => {
    loadPnL();
  }, [pnlRange]);

  const loadPnL = async () => {
    setPnlLoading(true);
    try {
      // Calculate date range based on pnlRange
      const now = new Date();

      if (pnlRange === "TODAY") {
         startStr = toLocalYYYYMMDD(now);
         endStr = startStr;
      } else if (pnlRange === "THIS_MONTH") {
         const year = now.getFullYear();
         const month = String(now.getMonth() + 1).padStart(2, '0');
         startStr = `${year}-${month}-01`;
         endStr = toLocalYYYYMMDD(now);
      } else { 
         // ALL_TIME
         try {
           const earliestRes = await api.get('/orders?limit=1&sort=asc&range=all');
           if (earliestRes && earliestRes.orders?.length > 0) {
             startStr = earliestRes.orders[0].date.split('T')[0];
           } else {
             startStr = "2024-01-01";
           }
         } catch (e) {
           startStr = "2024-01-01";
         }
         endStr = toLocalYYYYMMDD(now);
      }

      const res = await api.get(`/dashboard/insights?from=${startStr}&to=${endStr}`);
      setPnlData(res.summary);
    } catch (e) {
      console.error(e);
      error("Failed to load P&L data");
    } finally {
      setPnlLoading(false);
    }
  };

  const canConfirm = user?.permissions?.includes('finance:confirm') || user?.role === 'OWNER' || user?.role === 'ADMIN';

  const loadPartners = async () => {
    try {
      const res = await api.get('/finance/partners');
      setPartners(res);
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [logsRes, summaryRes] = await Promise.all([
        api.get(`/finance/consignment${filter !== 'ALL' ? `?status=${filter}` : ''}`),
        api.get('/finance/consignment/summary')
      ]);
      setLogs(logsRes);
      setSummary(summaryRes);
    } catch (e) {
      console.error(e);
      error("Failed to load finance data");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action = 'RECEIVE') => {
    setConfirming(id);
    const targetStatus = action === 'RECEIVE' ? 'RECEIVED' : 'NO_SALES';
    try {
      await api.post('/finance/consignment', { ids: [id], action });
      success(action === 'RECEIVE' ? "Payment confirmed" : "Marked as No Sales");
      // Local optimistic update for smoother UX
      setLogs(prev => prev.map(log => 
        log.id === id ? { ...log, status: targetStatus } : log
      ));
      // Reload summary
      const summaryRes = await api.get('/finance/consignment/summary');
      setSummary(summaryRes);
    } catch (e) {
      error("Failed to process transaction");
    } finally {
      setConfirming(null);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this settlement record?")) return;
    
    // Optimistic update
    const previousLogs = [...logs];
    setLogs(prev => prev.filter(log => log.id !== id));
    
    try {
      await api.delete(`/finance/consignment/${id}`);
      success("Settlement record deleted");
      // Summary might need reload
      const summaryRes = await api.get('/finance/consignment/summary');
      setSummary(summaryRes);
    } catch (e) {
      error("Failed to delete record");
      setLogs(previousLogs); // Rollback
    }
  };

  const handleManualSave = async () => {
    if (!newEntry.partnerId || !newEntry.date || newEntry.amount <= 0) {
      error("Please fill all required fields");
      return;
    }

    try {
      await api.post('/finance/consignment', {
        action: 'CREATE_MANUAL',
        data: {
          consignmentId: newEntry.partnerId,
          date: newEntry.date,
          expectedIncome: parseInt(newEntry.amount),
          notes: newEntry.notes
        }
      });
      success("Manual entry created successfully");
      setIsManualDialogOpen(false);
      setNewEntry({
         partnerId: "",
         date: toLocalYYYYMMDD(new Date()),
         amount: 0,
         notes: ""
      });
      loadData();
    } catch (e) {
      error(e.response?.data?.error || "Failed to create manual entry");
    }
  };

  const handleExportPDF = async () => {
    const element = document.getElementById("finance-pnl-report");
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Finance-Report-${pnlRange}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Gagal membuat PDF");
    }
  };

  const handleShareWA = () => {
    if (!pnlData) return;
    let text = `*LAPORAN FINANCE (${pnlRange.replace('_', ' ')})*\n`;
    text += `TOTAL PENDAPATAN (BRUTO): ${formatIDR(pnlData.grossRevenue)}\n`;
    text += `KOMISI PLATFORM: ${formatIDR(pnlData.grossRevenue - pnlData.netRevenue)}\n`;
    text += `HPP (COGS): ${formatIDR(pnlData.cogs)}\n`;
    text += `PENGELUARAN OPS: ${formatIDR(pnlData.expenses)}\n`;
    text += `--------------------------------------\n`;
    text += `*NET PROFIT: ${formatIDR(pnlData.netProfit)}*\n`;
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* --- Profit & Loss Statement (Simple) --- */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-violet-600" /> Let's Talk Profit
            </h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Statement of Cash & Profitability</p>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-xl">
             {["TODAY", "THIS_MONTH", "ALL_TIME"].map((r) => (
               <button
                 key={r}
                 onClick={() => setPnlRange(r)}
                 className={cn(
                   "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                   pnlRange === r ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
                 )}
               >
                 {r.replace("_", " ")}
               </button>
             ))}
           </div>
           <div className="flex gap-2">
             <Button onClick={handleExportPDF} className="bg-blue-600 text-white hover:bg-blue-700 h-8 rounded-lg shadow-sm w-auto px-4 gap-2 text-[10px] uppercase font-bold text-white">
               <FileText className="w-3 h-3" /> PDF
             </Button>
             <Button onClick={handleShareWA} className="bg-emerald-500 text-white hover:bg-emerald-600 h-8 rounded-lg shadow-sm w-auto px-4 gap-2 text-[10px] uppercase font-bold text-white">
               <Smartphone className="w-3 h-3" /> WA
             </Button>
           </div>
        </div>

        {pnlLoading || !pnlData ? (
          <div className="h-32 bg-slate-100/50 animate-pulse rounded-2xl" />
        ) : (
          <div id="finance-pnl-report" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div 
              onClick={() => setDetailModal({ open: true, type: "SALES" })}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group cursor-pointer hover:border-blue-200 transition-all"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-blue-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest relative z-10">Sales (Bruto)</p>
              <h4 className="text-lg sm:text-xl lg:text-2xl font-black text-slate-800 mt-2 relative z-10 tabular-nums leading-none">{formatIDR(pnlData.grossRevenue)}</h4>
            </div>

            <div 
              onClick={() => setDetailModal({ open: true, type: "COMMISSION" })}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group cursor-pointer hover:border-purple-200 transition-all"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest relative z-10">Platform Commission</p>
              <h4 className="text-lg sm:text-xl lg:text-2xl font-black text-purple-600 mt-2 relative z-10 tabular-nums leading-none">{formatIDR(pnlData.grossRevenue - pnlData.netRevenue)}</h4>
            </div>
            
            <div 
              onClick={() => setDetailModal({ open: true, type: "COGS" })}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group cursor-pointer hover:border-amber-200 transition-all"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest relative z-10">COGS (HPP)</p>
              <h4 className="text-lg sm:text-xl lg:text-2xl font-black text-amber-700 mt-2 relative z-10 tabular-nums leading-none">{formatIDR(pnlData.cogs)}</h4>
            </div>

            <div 
              onClick={() => setDetailModal({ open: true, type: "EXPENSES" })}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group cursor-pointer hover:border-rose-200 transition-all"
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-rose-50 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest relative z-10">Expenses</p>
              <h4 className="text-lg sm:text-xl lg:text-2xl font-black text-rose-600 mt-2 relative z-10 tabular-nums leading-none">{formatIDR(pnlData.expenses)}</h4>
            </div>

            <div 
              onClick={() => setDetailModal({ open: true, type: "NET_PROFIT" })}
              className={cn(
                "p-6 rounded-2xl border shadow-sm relative overflow-hidden group cursor-pointer hover:shadow-lg transition-all",
                pnlData.netProfit >= 0 ? "bg-emerald-50 border-emerald-100 hover:border-emerald-300" : "bg-rose-50 border-rose-100 hover:border-rose-300"
              )}
            >
              <div className={cn(
                "absolute top-0 right-0 w-24 h-24 rounded-bl-full -mr-12 -mt-12 transition-transform group-hover:scale-150",
                pnlData.netProfit >= 0 ? "bg-emerald-100/50" : "bg-rose-100/50"
              )} />
              <p className={cn(
                "text-[10px] font-bold uppercase tracking-widest relative z-10",
                pnlData.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"
              )}>Net Profit</p>
              <h4 className={cn(
                "text-lg sm:text-xl lg:text-2xl font-black mt-2 relative z-10 tabular-nums leading-none",
                pnlData.netProfit >= 0 ? "text-emerald-900" : "text-rose-900"
              )}>{formatIDR(pnlData.netProfit)}</h4>
            </div>
          </div>
        )}
      </div>

      {/* --- Detail Breakdown Modal --- */}
      <Dialog open={detailModal.open} onOpenChange={(val) => setDetailModal({ ...detailModal, open: val })}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-black tracking-tight uppercase italic flex items-center gap-3">
               <AlertCircle className="w-6 h-6 text-violet-600" />
               {detailModal.type?.replace("_", " ")} BREAKDOWN
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
             <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-xl mb-4">
                <Calendar className="w-4 h-4 text-slate-500" />
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                   Periode: {pnlData?.range?.from ? new Date(pnlData.range.from).toLocaleDateString('id-ID', {day:'2-digit', month:'2-digit', year:'numeric'}) : 'Loading...'} — {pnlData?.range?.to ? new Date(new Date(pnlData.range.to).getTime() - 1000).toLocaleDateString('id-ID', {day:'2-digit', month:'2-digit', year:'numeric'}) : 'Today'}
                </p>
             </div>

             {detailModal.type === "SALES" && (
                <div className="space-y-4">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Revenue Contributors</p>
                   {pnlData?.topMenus?.slice(0, 10).map((m, idx) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                         <div>
                            <p className="text-xs font-black text-slate-800">{m.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">{m.qty} unit terjual</p>
                         </div>
                         <p className="text-sm font-black text-slate-900 tabular-nums">{formatIDR(m.profit + (m.qty * (m.cost || 1)))}</p>
                      </div>
                   ))}
                </div>
             )}

             {detailModal.type === "COMMISSION" && (
                <div className="space-y-4">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Commission by Platform</p>
                   {pnlData?.paymentDistribution?.map((p, idx) => {
                      const comm = p._sum.total - p._sum.net_revenue;
                      return (
                        <div key={idx} className="flex justify-between items-center p-4 bg-purple-50 rounded-2xl border border-purple-100">
                           <p className="text-xs font-black text-purple-900 uppercase">{p.payment_method || "Offline"}</p>
                           <p className="text-sm font-black text-purple-700 tabular-nums">{formatIDR(comm > 0 ? comm : (p._sum.total * 0.2))}</p>
                        </div>
                      );
                   })}
                   <p className="text-[9px] text-slate-400 italic">*Jika Rp 0, berarti belum ada data komisi tercatat atau transaksi offline.</p>
                </div>
             )}

             {detailModal.type === "COGS" && (
                <div className="space-y-4">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Cost Contributors (Bahan Baku)</p>
                   {pnlData?.topMenus?.filter(m => m.type !== 'CONSIGNMENT').slice(0, 10).map((m, idx) => (
                      <div key={idx} className="flex justify-between items-center p-4 bg-amber-50 rounded-2xl border border-amber-100">
                         <p className="text-xs font-black text-amber-900">{m.name}</p>
                         <p className="text-sm font-black text-amber-700 tabular-nums">{formatIDR(m.qty * (m.cost || (m.profit / 2)))}</p>
                      </div>
                   ))}
                </div>
             )}

             {detailModal.type === "EXPENSES" && (
                <div className="space-y-4">
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Operating Expenses (Biaya Belanja)</p>
                      {pnlData?.expenseBreakdown?.length > 0 ? pnlData.expenseBreakdown.map((e, idx) => (
                         <div key={idx} className="flex justify-between items-center p-4 bg-rose-50 rounded-2xl border border-rose-100 mb-2">
                            <p className="text-xs font-black text-rose-900 uppercase">{e.category}</p>
                            <p className="text-sm font-black text-rose-700 tabular-nums">{formatIDR(e.amount)}</p>
                         </div>
                      )) : <p className="text-xs text-slate-400 italic p-4">Tidak ada pengeluaran belanja tercatat.</p>}
                   </div>
                   <div className="pt-4 border-t border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Fixed Overhead (Gaji/Sewa/Internet)</p>
                      <div className="p-4 bg-slate-900 text-white rounded-2xl shadow-lg">
                         <div className="flex justify-between items-center mb-1">
                            <p className="text-xs font-black uppercase tracking-widest">Alokasi Tetap</p>
                            <p className="text-sm font-black tabular-nums text-emerald-400">{formatIDR(pnlData?.dailyOverhead)}</p>
                         </div>
                         <p className="text-[8px] font-medium text-slate-400">
                            Dihitung berdasarkan proporsi hari yang berjalan ({formatIDR(pnlData?.dailyOverhead / Math.max(1, pnlData?.days))} per hari)
                         </p>
                      </div>
                   </div>
                </div>
             )}

             {detailModal.type === "NET_PROFIT" && (
                <div className="space-y-6">
                   <div className="p-6 bg-slate-900 text-white rounded-[2rem] shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-10"><DollarSign className="w-20 h-20" /></div>
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4">Final Calculation</p>
                      <div className="space-y-3">
                         <div className="flex justify-between text-xs font-bold text-white/60">
                            <span>Total Net Revenue</span>
                            <span>{formatIDR(pnlData.netRevenue)}</span>
                         </div>
                         <div className="flex justify-between text-xs font-bold text-white/60">
                            <span>Total Consignment Fee</span>
                            <span className="text-emerald-400">+ {formatIDR(pnlData.consignmentIncome)}</span>
                         </div>
                         <div className="flex justify-between text-xs font-bold text-white/60">
                            <span>Operating Expenses</span>
                            <span className="text-rose-400">- {formatIDR(pnlData.expenses)}</span>
                         </div>
                         <div className="h-px bg-white/10 my-2" />
                         <div className="flex justify-between text-lg font-black text-white">
                            <span>NET PROFIT</span>
                            <span className={pnlData.netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}>
                               {formatIDR(pnlData.netProfit)}
                            </span>
                         </div>
                      </div>
                   </div>
                   <p className="text-[9px] text-slate-400 text-center uppercase font-black tracking-widest">This report represents financial health for the selected period.</p>
                </div>
             )}
          </div>

          <DialogFooter className="mt-8">
             <Button 
               onClick={() => setDetailModal({ open: false, type: null })}
               className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest shadow-xl"
             >
                Close Breakdown
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="w-full h-px bg-slate-200/60 my-4" />

      {/* --- Consignment Settlement Tracking --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic flex items-center gap-3">
               <Wallet className="w-8 h-8 text-emerald-600" />
               Finance
            </h1>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Consignment Settlement & Payment Tracking</p>
          </div>
        {canConfirm && (
          <button 
            onClick={() => setIsManualDialogOpen(true)}
            className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:bg-black shadow-lg active:scale-95 transition-all group"
          >
            <Plus className="w-6 h-6 transition-transform group-hover:rotate-90" />
          </button>
        )}
        </div>

        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
            {["ALL", "PENDING", "RECEIVED", "NO_SALES"].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={cn(
                  "px-6 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                  filter === s ? "bg-white text-slate-900 shadow-md" : "text-slate-400 hover:text-slate-600"
                )}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
        </div>
      </div>

      {/* Summary Cards - Specific to User Request */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-[2rem] p-8 bg-white border-2 border-slate-100/50 shadow-xl group hover:border-emerald-100 transition-all">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
            <DollarSign className="w-3 h-3" /> Total Expected
          </p>
          <h4 className="text-3xl font-black text-slate-900 tabular-nums">{formatIDR(summary.expected)}</h4>
        </div>

        <div className="glass-card rounded-[2rem] p-8 bg-emerald-50 border-2 border-emerald-100 shadow-xl group hover:bg-emerald-100/30 transition-all">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-3 h-3" /> Total Received
          </p>
          <h4 className="text-3xl font-black text-emerald-900 tabular-nums">{formatIDR(summary.received)}</h4>
        </div>

        <div className="glass-card rounded-[2rem] p-8 bg-rose-50 border-2 border-rose-100 shadow-xl group hover:bg-rose-100/30 transition-all">
          <p className="text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
            <AlertCircle className="w-3 h-3" /> Outstanding
          </p>
          <h4 className="text-3xl font-black text-rose-900 tabular-nums">{formatIDR(summary.outstanding)}</h4>
        </div>
      </div>

      {/* Table Section */}
      <ResponsiveDataView 
        data={logs}
        loading={loading}
        columns={[
          { 
            header: "Date", 
            accessor: (log) => new Date(log.date).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            sortKey: 'date'
          },
          { 
            header: "Product", 
            accessor: (log) => `${log.consignment?.partnerName} — ${log.consignment?.menu?.name}`,
            className: "font-black"
          },
          { 
            header: "Status", 
            accessor: (log) => (
              log.status === 'RECEIVED' ? (
                <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100">
                  RECEIVED
                </span>
              ) : log.status === 'NO_SALES' ? (
                <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 border border-amber-100">
                  NO SALES
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100">
                  PENDING
                </span>
              )
            ),
            sortKey: 'status'
          },
          { 
            header: "Amount", 
            accessor: (log) => formatIDR(log.expectedIncome),
            align: "right",
            className: "tabular-nums",
            sortKey: 'expectedIncome'
          },
          { 
            accessor: (log) => (
              <div className="flex justify-end items-center gap-3">
                {log.status === 'PENDING' ? (
                  canConfirm ? (
                    <div className="flex gap-2">
                       <Button 
                        onClick={() => handleAction(log.id, 'NO_SALES')}
                        disabled={confirming === log.id}
                        variant="ghost"
                        className="h-10 px-4 rounded-xl text-rose-500 font-bold text-[9px] uppercase tracking-widest hover:bg-rose-50"
                      >
                        No Sales
                      </Button>
                      <Button 
                        onClick={() => handleAction(log.id, 'RECEIVE')}
                        disabled={confirming === log.id}
                        className="h-10 px-6 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                      >
                        {confirming === log.id ? "..." : "Mark as Received"}
                      </Button>
                    </div>
                  ) : (
                    <span className="text-[10px] font-black uppercase text-slate-300 italic tracking-widest pr-4">ReadOnly</span>
                  )
                ) : log.status === 'NO_SALES' ? (
                  <div className="flex items-center gap-2 text-amber-500 font-bold text-sm pr-4">
                     <AlertCircle className="w-4 h-4" /> <span>NO SALES</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm pr-4">
                     <CheckCircle2 className="w-5 h-5" /> <span>✓</span>
                  </div>
                )}

                {canConfirm && (
                  <button 
                    onClick={() => handleDelete(log.id)}
                    className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                    title="Delete Settlement"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ),
            align: "right"
          }
        ]}
        emptyMessage="No settlement data for this period"
      />

      {/* Manual Entry Dialog */}
      <Dialog open={isManualDialogOpen} onOpenChange={setIsManualDialogOpen}>
         <DialogContent className="sm:max-w-[500px] gap-6 rounded-[2rem] border-none shadow-2xl p-10">
            <DialogHeader>
               <DialogTitle className="text-2xl font-black tracking-tight uppercase italic flex items-center gap-3 italic">
                  <Plus className="w-6 h-6 text-emerald-600" />
                  Manual Entry
               </DialogTitle>
            </DialogHeader>

            <div className="space-y-6 py-4">
               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Partner / Product</Label>
                  <Select 
                    onValueChange={(val) => setNewEntry({...newEntry, partnerId: val})} 
                    onChange={(e) => setNewEntry({...newEntry, partnerId: e.target.value})}
                    value={newEntry.partnerId}
                    className="h-14 rounded-2xl border-none bg-slate-100/50 font-black text-xs px-6"
                  >
                    <option value="" disabled>Select Partner</option>
                    {partners.map(p => (
                       <option key={p.id} value={p.id}>
                          {p.partnerName} ({p.menu?.name})
                       </option>
                    ))}
                  </Select>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</Label>
                     <Input 
                        type="date"
                        value={newEntry.date}
                        onChange={(e) => setNewEntry({...newEntry, date: e.target.value})}
                        className="h-14 rounded-2xl border-none bg-slate-100/50 font-black text-xs px-6"
                     />
                  </div>
                  <div className="space-y-3">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Amount (Expecting)</Label>
                     <Input 
                        type="number"
                        placeholder="0"
                        value={newEntry.amount}
                        onChange={(e) => setNewEntry({...newEntry, amount: e.target.value})}
                        className="h-14 rounded-2xl border-none bg-slate-100/50 font-black text-xs px-6"
                     />
                  </div>
               </div>

               <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notes (Optional)</Label>
                  <Input 
                     placeholder="Additional information..."
                     value={newEntry.notes}
                     onChange={(e) => setNewEntry({...newEntry, notes: e.target.value})}
                     className="h-14 rounded-2xl border-none bg-slate-100/50 font-black text-xs px-6"
                  />
               </div>
            </div>

            <DialogFooter className="gap-3 sm:justify-start">
               <Button 
                  onClick={handleManualSave}
                  className="flex-1 h-14 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
               >
                  Save Settlement
               </Button>
               <Button 
                  variant="ghost"
                  onClick={() => setIsManualDialogOpen(false)}
                  className="h-14 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
               >
                  Cancel
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
}
