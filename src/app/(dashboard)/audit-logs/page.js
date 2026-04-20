"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { ResponsiveDataView } from "../../../components/ResponsiveDataView";
import { ShieldCheck, User, Clock, Globe, Info, Search, Filter, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { cn } from "../../../lib/utils";

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const fetchLogs = async (p = 1) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/audit-logs?page=${p}&limit=20`);
      setLogs(res.data);
      setPagination(res.pagination);
      setPage(p);
      // Auto-select first log if none selected
      if (res.data.length > 0 && !selectedLog) {
        setSelectedLog(res.data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSelectLog = (log) => {
    setSelectedLog(log);
    // Smooth scroll to top if needed
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20 px-4 md:px-0">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-rose-50 rounded-xl">
              <ShieldCheck className="w-8 h-8 text-rose-600" />
            </div>
            Audit & Security Logs
          </h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-2 flex items-center gap-2">
            System Activity Monitor
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          </p>
        </div>
        <Button onClick={() => fetchLogs()} variant="outline" className="h-10 rounded-xl border-slate-200 gap-2">
           <Search className="w-4 h-4 cursor-pointer" /> Refresh
        </Button>
      </div>

      {/* --- TOP HEADER DETAIL PANEL (SIMPLIFIED) --- */}
      {selectedLog && (
        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 animate-in slide-in-from-top-4 duration-500 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50" />
          
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 relative z-10">
            {/* Left Column: Humanized Changes */}
            <div className="space-y-6">
               <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                     <Info className="w-5 h-5" />
                  </div>
                  <div>
                     <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Rincian Perubahan</h3>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Apa yang terjadi pada {selectedLog.entity}?</p>
                  </div>
               </div>

               <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 min-h-[140px]">
                  <ul className="space-y-3">
                     {(() => {
                       const details = selectedLog.details;
                       if (!details) return <li className="text-xs text-slate-400 italic">Tidak ada detail tambahan</li>;

                       // Logic to humanize JSON
                       const renderChange = (key, val) => {
                         const labels = {
                           name: "Nama", price: "Harga", cost: "HPP", qty: "Jumlah", 
                           status: "Status", note: "Catatan", categoryId: "ID Kategori",
                           total: "Total", net_revenue: "Pendapatan Bersih", 
                           discount: "Diskon", customer_name: "Nama Pelanggan",
                           before: "Sebelumnya", after: "Sesudah", order_number: "No. Pesanan"
                         };
                         const label = labels[key] || key;
                         
                         if (key === 'before' || key === 'after' || typeof val === 'object') {
                            // Skip complex nested objects if not handled
                            return null;
                         }

                         return (
                            <li key={key} className="flex items-center gap-2 text-xs">
                               <span className="font-bold text-slate-400 uppercase text-[9px] w-24 shrink-0">{label}</span>
                               <span className="font-black text-slate-700">{typeof val === 'number' && val > 1000 ? `Rp${val.toLocaleString()}` : String(val)}</span>
                            </li>
                         );
                       };

                       // Handle Update (Before/After Pattern)
                       if (details.before && details.after) {
                          const changes = [];
                          for (const key in details.after) {
                             if (details.after[key] !== details.before[key] && typeof details.after[key] !== 'object') {
                                changes.push(
                                   <li key={key} className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm flex flex-col gap-1">
                                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Mengubah {key === 'name' ? 'Nama' : key}</span>
                                      <div className="flex items-center gap-2 text-xs">
                                         <span className="text-slate-400 line-through decoration-rose-300">{String(details.before[key])}</span>
                                         <ChevronRight className="w-3 h-3 text-slate-300" />
                                         <span className="font-black text-slate-800">{String(details.after[key])}</span>
                                      </div>
                                   </li>
                                );
                             }
                          }
                          return changes.length > 0 ? changes : <li className="text-xs text-slate-500">Perubahan data teknis / nested</li>;
                       }

                       // Default list for Create/Delete
                       return Object.entries(details).slice(0, 8).map(([k, v]) => renderChange(k, v));
                     })()}
                  </ul>
               </div>

               <div className="flex gap-6 items-center px-2">
                  <div className="flex flex-col">
                     <span className="text-[9px] font-black text-slate-300 uppercase">IP Akses</span>
                     <span className="text-xs font-bold text-slate-600">{selectedLog.ip_address || 'Internal'}</span>
                  </div>
                  <div className="flex flex-col">
                     <span className="text-[9px] font-black text-slate-300 uppercase">ID Entitas</span>
                     <span className="text-xs font-black text-rose-500">#{selectedLog.entity_id}</span>
                  </div>
               </div>
            </div>

            {/* Right Column: Signature */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white relative flex flex-col justify-between shadow-2xl">
               <div className="absolute top-0 right-0 p-8 opacity-10">
                  <ShieldCheck className="w-32 h-32" />
               </div>
               
               <div className="relative z-10 space-y-4">
                  <div>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Operator Terotorisasi</p>
                    <h4 className="text-xl font-black italic tracking-tighter text-white">{selectedLog.user?.name}</h4>
                    <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-1">Role: {selectedLog.user?.role}</p>
                  </div>

                  <div className="pt-4 border-t border-white/5">
                     <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Waktu Kejadian</p>
                     <p className="text-sm font-bold text-slate-200">{new Date(selectedLog.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                  </div>
               </div>

               <div className={cn(
                  "mt-6 rounded-2xl p-4 flex items-center justify-between",
                  selectedLog.action === 'CREATE' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                  selectedLog.action === 'UPDATE' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                  "bg-rose-500/10 text-rose-400 border border-rose-500/20"
               )}>
                  <span className="text-[10px] font-black uppercase tracking-widest">{selectedLog.action} SUKSES</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
               </div>
            </div>
          </div>
        </div>
      )}

      <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl border-none">
        <ResponsiveDataView
          loading={loading}
          data={logs}
          emptyMessage="No activity logs found"
          columns={[
            {
              header: "Time",
              accessor: (row) => (
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 text-sm">
                    {new Date(row.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(row.created_at).toLocaleDateString('id-ID')}
                  </span>
                </div>
              ),
              className: "pl-8"
            },
            {
              header: "User",
               accessor: (row) => (
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-black text-[10px]">
                      {row.user?.name?.substring(0,2).toUpperCase()}
                   </div>
                   <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-sm">{row.user?.name}</span>
                      <span className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">{row.user?.role}</span>
                   </div>
                </div>
              )
            },
            {
              header: "Action",
              accessor: (row) => (
                <span className={cn(
                  "px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest",
                  row.action === 'CREATE' ? "bg-emerald-50 text-emerald-600" :
                  row.action === 'UPDATE' ? "bg-amber-50 text-amber-600" :
                  row.action === 'DELETE' || row.action === 'HARD_DELETE' ? "bg-rose-50 text-rose-600" :
                  "bg-slate-100 text-slate-600"
                )}>
                  {row.action}
                </span>
              )
            },
            {
              header: "Resource",
              accessor: (row) => (
                <span className="text-xs font-bold text-slate-500">
                  {row.entity} <span className="text-slate-300 ml-1">#{row.entity_id}</span>
                </span>
              )
            },
            {
              header: "Details",
              accessor: (row) => (
                <Button 
                  variant={selectedLog?.id === row.id ? "default" : "ghost"}
                  size="sm" 
                  onClick={() => handleSelectLog(row)}
                  className={cn(
                    "h-8 rounded-lg gap-1 border transition-all",
                    selectedLog?.id === row.id 
                      ? "bg-slate-900 text-white border-slate-900" 
                      : "text-slate-400 hover:text-slate-900 border-transparent hover:border-slate-100"
                  )}
                >
                  <Search className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-black uppercase">Inspect</span>
                </Button>
              ),
              align: "right",
              className: "pr-8"
            }
          ]}
          renderCard={(row) => (
             <div className="space-y-4" onClick={() => handleSelectLog(row)}>
                <div className="flex justify-between items-start">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                         <User className="w-5 h-5" />
                      </div>
                      <div>
                         <p className="font-bold text-slate-800">{row.user?.name}</p>
                         <p className="text-[10px] font-black text-rose-500 uppercase">{row.action} • {row.entity}</p>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-slate-300 uppercase">{new Date(row.created_at).toLocaleDateString()}</p>
                      <p className="text-sm font-bold text-slate-800">{new Date(row.created_at).toLocaleTimeString()}</p>
                   </div>
                </div>
                <Button 
                  onClick={() => handleSelectLog(row)}
                  className={cn(
                    "w-full border-none h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    selectedLog?.id === row.id ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  )}
                >
                   {selectedLog?.id === row.id ? "Currently Inspecting" : "Inspect Activity"}
                </Button>
             </div>
          )}
        />
      </div>

      
      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
           <Button 
             disabled={page === 1 || loading} 
             onClick={() => fetchLogs(page - 1)}
             variant="outline"
             className="rounded-xl h-10"
           >
             Previous
           </Button>
           <span className="text-xs font-black text-slate-500 uppercase">Page {page} of {pagination.totalPages}</span>
           <Button 
             disabled={page === pagination.totalPages || loading} 
             onClick={() => fetchLogs(page + 1)}
             variant="outline"
             className="rounded-xl h-10"
           >
             Next
           </Button>
        </div>
      )}
    </div>
  );
}
