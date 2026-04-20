"use client";
import { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { useToast } from "../../../components/ui/use-toast";
import { 
  DollarSign, Clock, CheckCircle2, AlertCircle, 
  ArrowRight, Calendar, Search, Filter,
  TrendingUp, Wallet, ArrowDownCircle
} from "lucide-react";
import { useTranslation } from "../../../lib/language-context";
import { cn } from "../../../lib/utils";
import { formatCurrency } from "../../../lib/format";

export default function FinanceSettings() {
  const { t, language } = useTranslation();
  const { success, error } = useToast();
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ expected: 0, received: 0, outstanding: 0 });
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    loadData();
  }, [filter]);

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

  const handleConfirm = async (id) => {
    setConfirming(true);
    try {
      await api.post('/finance/consignment', { ids: [id], action: 'RECEIVE' });
      success("Payment confirmed");
      loadData();
    } catch (e) {
      error("Failed to confirm payment");
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card rounded-[2.5rem] p-8 border-none shadow-xl bg-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-110" />
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center mb-6 shadow-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Expected Income</p>
            <h4 className="text-3xl font-black text-slate-900 tabular-nums">{formatCurrency(summary.expected)}</h4>
            <div className="flex items-center gap-2 mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              <TrendingUp className="w-3 h-3" /> Potential Accrual
            </div>
          </div>
        </div>

        <div className="glass-card rounded-[2.5rem] p-8 border-none shadow-xl bg-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-110" />
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center mb-6 shadow-lg">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-1">Received Cash</p>
            <h4 className="text-3xl font-black text-slate-900 tabular-nums">{formatCurrency(summary.received)}</h4>
            <div className="flex items-center gap-2 mt-4 text-[9px] font-bold text-emerald-500 uppercase tracking-wider">
              <Wallet className="w-3 h-3" /> Cash in Hand
            </div>
          </div>
        </div>

        <div className="glass-card rounded-[2.5rem] p-8 border-none shadow-xl bg-slate-900 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 transition-transform group-hover:scale-110" />
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center mb-6 shadow-lg">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <p className="text-[10px] font-black text-rose-300 uppercase tracking-[0.2em] mb-1">Outstanding</p>
            <h4 className="text-3xl font-black text-white tabular-nums">{formatCurrency(summary.outstanding)}</h4>
            <div className="flex items-center gap-2 mt-4 text-[9px] font-bold text-rose-300/50 uppercase tracking-wider">
              <ArrowDownCircle className="w-3 h-3" /> Awaiting Settlement
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="glass-card rounded-[2.5rem] overflow-hidden border-none shadow-2xl bg-white">
        <div className="p-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-50">
          <div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">Partner Settlements</h3>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Manage daily consignment income</p>
          </div>
          
          <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
             {["ALL", "PENDING", "RECEIVED"].map((s) => (
               <button
                 key={s}
                 onClick={() => setFilter(s)}
                 className={cn(
                   "px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                   filter === s ? "bg-white text-slate-900 shadow-md" : "text-slate-400 hover:text-slate-600"
                 )}
               >
                 {s}
               </button>
             ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-10 py-6 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Date</th>
                <th className="px-6 py-6 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Partner / Product</th>
                <th className="px-6 py-6 text-left text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                <th className="px-6 py-6 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">Expected</th>
                <th className="px-10 py-6 text-right text-[9px] font-black uppercase tracking-widest text-slate-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-10 py-8"><div className="h-4 bg-slate-100 rounded-lg w-full" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                   <td colSpan={5} className="px-10 py-20 text-center">
                      <div className="flex flex-col items-center gap-4 opacity-20">
                         <Calendar className="w-12 h-12 text-slate-900" />
                         <p className="text-[10px] font-black uppercase tracking-widest">No records found</p>
                      </div>
                   </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/30 transition-colors group">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                          <Calendar className="w-5 h-5 text-slate-400" />
                        </div>
                        <span className="text-[11px] font-black text-slate-900 tabular-nums">
                          {new Date(log.date).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <div className="font-black text-slate-900 uppercase tracking-tight text-xs">
                        {log.consignment?.partnerName}
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 italic">{log.consignment?.menu?.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                        log.status === 'RECEIVED' ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100 animate-pulse"
                      )}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-6 text-right">
                      <span className="text-xs font-black text-slate-900 tabular-nums">{formatCurrency(log.expectedIncome)}</span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      {log.status === 'PENDING' ? (
                        <Button 
                          onClick={() => handleConfirm(log.id)}
                          disabled={confirming}
                          className="h-10 px-6 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-[9px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                        >
                          Mark as Received
                        </Button>
                      ) : (
                        <div className="flex justify-end items-center gap-2 text-emerald-500 font-black text-[9px] uppercase tracking-widest pr-4">
                           <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
