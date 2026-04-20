"use client";
import { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { useToast } from "../../../components/ui/use-toast";
import { Clock, DollarSign, LogOut, CheckCircle2, Users, Settings, Calendar, ClipboardList, Activity } from "lucide-react";
import { cn } from "../../../lib/utils";
import { ResponsiveDataView } from "../../../components/ResponsiveDataView";
import StopShiftModal from "../../../components/StopShiftModal";
import ShiftReportModal from "../../../components/ShiftReportModal";
import { useRouter } from "next/navigation";
import { useTranslation } from "../../../lib/language-context";

export default function ShiftPage() {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const [currentShift, setCurrentShift] = useState(null);
  const [shiftHistory, setShiftHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // For Start Shift
  const [startCash, setStartCash] = useState("");
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  // For End Shift
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportShiftId, setReportShiftId] = useState(null);

  // Ideally get this from Auth Context
  const [mounted, setMounted] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); 

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setCurrentUser(u);
        loadCurrentShift(u.id);
        loadHistory(u.id);
      } catch (e) {
        console.error("Failed to parse user", e);
      }
    } else {
      setLoading(false);
    }
  }, [mounted]);

  const loadCurrentShift = async (userId) => {
    try {
      const res = await api.get(`/shifts/current/${userId}`);
      setCurrentShift(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (userId) => {
    try {
      const res = await api.get(`/shifts/history?userId=${userId}`);
      setShiftHistory(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartShift = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      error(t('shift.login_required'));
      return;
    }
    try {
      const res = await api.post("/shifts/start", {
        user_id: currentUser.id,
        starting_cash: parseInt(startCash)
      });
      setCurrentShift(res.shift);
      success(t('shift.shift_started'));
      
      // Dispatch global event
      window.dispatchEvent(new Event('shift-status-changed'));
      
      loadHistory(currentUser.id);
    } catch (e) {
      console.error(e);
      error(e.response?.data?.error || "Failed to start shift");
    }
  };

  const handleStopShiftSuccess = (shiftId) => {
    setCurrentShift(null);
    if (currentUser) {
      loadHistory(currentUser.id);
      loadCurrentShift(currentUser.id);
    }
    
    // Trigger Report Flow
    if (shiftId) {
      setReportShiftId(shiftId);
      setIsReportOpen(true);
    }
    
    // Dispatch global event
    window.dispatchEvent(new Event('shift-status-changed'));
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">{t('shift.login_required')}</p>
      </div>
    );
  }

  const isOwnShift = currentShift?.user_id === currentUser.id;

  // Pagination Calculation
  const totalPages = Math.ceil(shiftHistory.length / pageSize);
  const paginatedHistory = shiftHistory.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="max-w-[1700px] mx-auto space-y-8 animate-fade-in pb-20 px-4 md:px-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
        <div className="md:flex-1">
          <h2 className="text-xl md:text-3xl font-black tracking-tighter text-slate-900 uppercase italic">{t('shift.title')}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{t('shift.subtitle')}</p>
          </div>
        </div>
        {currentShift && (
          <div className="bg-emerald-50 text-emerald-700 px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-3 border border-emerald-100 shadow-sm md:ml-auto">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {isOwnShift ? t('shift.session_active') + ' ' : `${t('shift.user')}: ${currentShift.user?.username || t('shift.someone')} `}
            | {t('shift.started')} {new Date(currentShift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>

      <div className="space-y-6">
      <div className="space-y-4">
        {/* Unified Top Header Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4 px-8 glass-card rounded-2xl border-none shadow-lg bg-white/50 backdrop-blur-xl">
           {/* Left Sided: Identity Context */}
            <div className="flex items-center gap-5">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-md">
                 <Users className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{t('common.operator')}</span>
                <span className="text-xl font-black text-slate-900 tracking-tight">{currentShift?.user?.username || currentUser.username}</span>
              </div>
           </div>

           {/* Right Sided: Operational Context */}
           <div className="flex items-center gap-5 text-right md:border-l md:border-slate-100 md:pl-8">
              <div className="flex-1">
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-none mb-1.5">{t('shift.operational_tracking')}</p>
                 <div className="flex items-center gap-2.5 justify-end">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-tighter italic">{t('shift.system_live')}</h4>
                 </div>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-sm order-first md:order-last">
                 <Activity className="w-5 h-5" />
              </div>
           </div>
        </div>

        {/* Main Action Hub - FULL WIDTH */}
        <div className="glass-card rounded-[2.5rem] p-0 shadow-2xl border-none bg-white/40 backdrop-blur-2xl overflow-hidden w-full">
          {!currentShift ? (
            <div className="flex flex-col">
              {/* TOP GREEN BANNER */}
              <div className="p-8 lg:p-10 bg-emerald-600 text-white relative flex flex-col md:flex-row justify-between items-center gap-8 border-b border-white/10">
                <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shrink-0 shadow-lg">
                    <Clock className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.4em] mb-1 opacity-70 italic">{t('shift.protocol_ready')}</p>
                    <h4 className="text-3xl font-black tracking-tighter uppercase leading-none italic text-white">
                      {t('shift.initialize_session')}
                    </h4>
                  </div>
                </div>
                
                <div className="text-right md:border-l md:border-white/20 md:pl-8 lg:pl-14 hidden md:block">
                  <p className="text-[10px] text-emerald-100 font-black uppercase tracking-widest mb-1 opacity-60 italic">{t('shift.station_status')}</p>
                  <p className="text-2xl font-black tracking-tight italic">{t('shift.ready_to_sync')}</p>
                </div>
              </div>

              {/* LOWER WHITE SECTION */}
              <div className="p-8 lg:p-10 bg-white flex flex-col md:flex-row items-center justify-between gap-10">
                <div className="flex gap-6 items-center flex-1 max-w-xl">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0 border border-emerald-100 shadow-sm">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                      {t('shift.starting_cash_help')}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleStartShift} className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                  <div className="relative group w-full sm:w-64">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 font-black text-lg group-focus-within:text-emerald-500 transition-colors">Rp</div>
                    <Input 
                      type="number"
                      placeholder="0"
                      className="h-16 pl-14 pr-6 text-xl font-black bg-slate-100/50 border-none focus:ring-8 focus:ring-emerald-500/5 rounded-2xl transition-all font-mono text-slate-900"
                      value={startCash}
                      onChange={(e) => setStartCash(e.target.value)}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="h-16 px-10 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-[0.2em] text-[10px] shadow-xl shadow-emerald-500/10 transition-all active:scale-95 whitespace-nowrap w-full sm:w-auto"
                  >
                    {t('shift.start_shift')}
                  </Button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
               {/* TOP GREEN BANNER */}
               <div className="p-8 lg:p-10 bg-emerald-600 text-white relative flex flex-col md:flex-row justify-between items-center gap-8 border-b border-white/10">
                  <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
                    <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shrink-0 shadow-lg">
                       <Clock className="w-8 h-8 text-white animate-pulse-slow" />
                    </div>
                    <div>
                       <p className="text-emerald-100 text-[10px] font-black uppercase tracking-[0.4em] mb-1 opacity-70 italic">{t('shift.operational_sync')}</p>
                       <h4 className="text-3xl font-black tracking-tighter uppercase leading-none italic text-amber-400">
                          {t('shift.operator_online')}
                       </h4>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8 lg:gap-14 text-center md:border-l md:border-white/20 md:pl-8 lg:pl-14">
                    <div>
                       <p className="text-[10px] text-emerald-100 font-black uppercase tracking-widest mb-1 opacity-60">{t('shift.session_start')}</p>
                       <p className="text-2xl font-black tracking-tight italic">{currentShift?.start_time ? new Date(currentShift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '00:00'}</p>
                    </div>
                    <div>
                       <p className="text-[10px] text-emerald-100 font-black uppercase tracking-widest mb-1 opacity-60">{t('shift.opening_fund')}</p>
                       <p className="text-2xl font-black tracking-tighter italic tabular-nums">{formatIDR(currentShift.starting_cash)}</p>
                    </div>
                  </div>
               </div>

               {/* LOWER WHITE SECTION */}
               <div className="p-8 lg:p-10 bg-white flex flex-col md:flex-row items-center justify-between gap-10">
                  <div className="flex gap-6 items-center flex-1 max-w-2xl">
                     <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center shrink-0 border border-amber-100 shadow-sm">
                        <LogOut className="w-4 h-4 text-amber-500" />
                     </div>
                     <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                        {isOwnShift 
                          ? t('shift.own_shift_stop_help')
                          : t('shift.external_shift_stop_help')
                        }
                     </p>
                  </div>
                  <Button 
                    onClick={() => setIsStopModalOpen(true)} 
                    className="h-16 px-10 rounded-2xl font-black uppercase tracking-[0.2em] bg-slate-900 text-white shadow-2xl shadow-slate-200 hover:scale-[1.03] active:scale-[0.97] transition-all gap-4 text-[10px] shrink-0"
                  >
                    <LogOut className="w-4 h-4" /> {t('shift.end_active_session')}
                  </Button>
               </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* History Table */}
      <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl border-none p-0 text-slate-900">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-black uppercase tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-emerald-600" />
                </div>
                {t('shift.session_history')}
             </h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <ResponsiveDataView
            loading={loading}
            data={paginatedHistory}
            emptyMessage={t('shift.no_records')}
            columns={[
              {
                header: t('shift.start_time'),
                accessor: (shift) => (
                  <span className="font-bold text-slate-700">
                    {new Date(shift.start_time).toLocaleString()}
                  </span>
                ),
                sortKey: "start_time",
                className: "px-8 py-5"
              },
              {
                header: t('shift.end_time'),
                accessor: (shift) => (
                  <span className="font-bold text-slate-400">
                    {shift.end_time ? new Date(shift.end_time).toLocaleString() : "-"}
                  </span>
                ),
                sortKey: "end_time"
              },
              {
                header: t('shift.starting'),
                accessor: (shift) => (
                  <span className="font-black text-slate-400 tabular-nums">
                    {formatIDR(shift.starting_cash)}
                  </span>
                ),
                sortKey: "starting_cash",
                align: "right"
              },
              {
                header: t('shift.ending'),
                accessor: (shift) => (
                  <span className="font-black text-emerald-600 tabular-nums">
                    {shift.ending_cash ? formatIDR(shift.ending_cash) : "-"}
                  </span>
                ),
                sortKey: "ending_cash",
                align: "right"
              },
              {
                header: t('shift.status'),
                accessor: (shift) => (
                  <span className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm whitespace-nowrap",
                    shift.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                  )}>
                    {shift.status}
                  </span>
                ),
                sortKey: "status",
                align: "center",
                className: "px-8"
              }
            ]}
            renderCard={(shift) => (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('shift.start_time')}</p>
                      <p className="font-bold text-slate-700 text-sm">{new Date(shift.start_time).toLocaleString()}</p>
                   </div>
                   <span className={cn(
                    "inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm",
                    shift.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                  )}>
                    {shift.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                   <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">{t('shift.starting')}</p>
                      <p className="font-black text-slate-900 tabular-nums">{formatIDR(shift.starting_cash)}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">{t('shift.ending')}</p>
                      <p className="font-black text-emerald-600 tabular-nums">{shift.ending_cash ? formatIDR(shift.ending_cash) : "-"}</p>
                   </div>
                </div>
                {shift.end_time && (
                  <div className="pt-2">
                     <p className="text-[9px] font-bold text-slate-300 uppercase">{t('shift.end_time')}: {new Date(shift.end_time).toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}
          />
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-8 border-t border-slate-50 bg-slate-50/20 flex flex-col sm:flex-row items-center justify-between w-full gap-6">
            <div className="flex items-center gap-10">
              <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest whitespace-nowrap">
                {t('common.showing')} <span className="text-slate-900">{(currentPage - 1) * pageSize + 1}</span> {t('common.to')} <span className="text-slate-900">{Math.min(currentPage * pageSize, shiftHistory.length)}</span> {t('common.of')} <span className="text-slate-900">{shiftHistory.length}</span> {t('shift.sessions')}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{t('common.per_page')}</span>
                <select 
                  className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer text-slate-600 hover:border-slate-400 transition-all shadow-sm"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                >
                  {[10, 20, 50, 100].map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-9 px-4 rounded-xl border-slate-100 font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30"
              >
                {t('common.previous')}
              </Button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-black transition-all",
                      currentPage === page 
                        ? "bg-slate-900 text-white shadow-xl shadow-slate-200" 
                        : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                    )}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-9 px-4 rounded-xl border-slate-100 font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30"
              >
                {t('common.next')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <StopShiftModal 
        isOpen={isStopModalOpen} 
        onClose={() => setIsStopModalOpen(false)}
        onSuccess={handleStopShiftSuccess}
        currentUserId={currentUser?.id}
      />

      <ShiftReportModal 
        isOpen={isReportOpen}
        shiftId={reportShiftId}
        onFinish={() => {
          setIsReportOpen(false);
          router.push("/");
        }}
      />
    </div>
  );
}
