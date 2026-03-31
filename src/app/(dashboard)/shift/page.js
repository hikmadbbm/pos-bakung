
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
import StopShiftModal from "../../../components/StopShiftModal";

export default function ShiftPage() {
  const { success, error } = useToast();
  const [currentShift, setCurrentShift] = useState(null);
  const [shiftHistory, setShiftHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // For Start Shift
  const [startCash, setStartCash] = useState("");
  
  // For End Shift
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);

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
      if (e.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
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
      if (e.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
  };

  const handleStartShift = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      const res = await api.post("/shifts/start", {
        user_id: currentUser.id,
        starting_cash: parseInt(startCash)
      });
      setCurrentShift(res);
      success("Shift started successfully");
      
      // Dispatch global event
      window.dispatchEvent(new Event('shift-status-changed'));
      
      loadHistory(currentUser.id);
    } catch (e) {
      console.error(e);
      error(e.response?.data?.error || "Failed to start shift");
    }
  };

  const handleStopShiftSuccess = () => {
    setCurrentShift(null);
    if (currentUser) {
      loadHistory(currentUser.id);
    }
    // Refresh current shift to ensure we catch any global changes
    loadCurrentShift(currentUser.id);
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Please log in to manage shifts.</p>
      </div>
    );
  }

  const isOwnShift = currentShift?.user_id === currentUser.id;

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">Shift Management</h2>
          <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
            Track your work hours and cash handling
            <span className="inline-block w-1 h-1 bg-emerald-600 rounded-full" />
          </p>
        </div>
        {currentShift && (
          <div className="bg-emerald-50 text-emerald-700 px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 border border-emerald-100 shadow-sm shadow-emerald-100 animate-pulse">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            {isOwnShift ? 'Your Shift ' : `Shift by ${currentShift.user?.name || 'Someone'} `}
            Active Since {new Date(currentShift.start_time).toLocaleTimeString()}
          </div>
        )}
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Active Shift Control */}
        <div className="glass-card rounded-[2.5rem] p-8 space-y-6 shadow-2xl relative overflow-hidden border-none">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg">
               <Clock className="w-5 h-5 text-white" />
             </div>
             {currentShift ? "Active Session" : "Punch In"}
          </h3>
            {!currentShift ? (
              <form onSubmit={handleStartShift} className="space-y-8">
                <div className="space-y-4">
                  <div className="flex justify-between items-end px-2">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Initial Drawer Fund</Label>
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Security Lock Active</p>
                  </div>
                  <div className="relative group">
                    <div className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-300 font-black text-2xl group-focus-within:text-emerald-500 transition-colors">Rp</div>
                    <Input 
                      type="number"
                      placeholder="0"
                      className="h-24 pl-20 pr-8 text-4xl font-black bg-slate-50 border-none focus:ring-0 rounded-[2rem] transition-all font-mono"
                      value={startCash}
                      onChange={(e) => setStartCash(e.target.value)}
                      required
                    />
                  </div>
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex gap-4 items-start">
                     <div className="p-2 bg-emerald-100 rounded-xl">
                        <DollarSign className="w-4 h-4 text-emerald-600" />
                     </div>
                     <p className="text-[10px] text-slate-500 font-black uppercase leading-relaxed tracking-wider opacity-60 italic">
                       Verify opening liquidity before initializing terminal.
                     </p>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-20 rounded-[2rem] bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-[0.3em] text-sm shadow-2xl shadow-emerald-500/20 transition-all active:scale-95"
                >
                  INITIALIZE SYSTEM
                </Button>
              </form>
            ) : (
              <div className="space-y-8">
                <div className="glass-card p-10 bg-emerald-500/5 border border-emerald-500/10 rounded-[3rem] space-y-10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                  
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="w-20 h-20 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center border border-emerald-100 flex-shrink-0">
                      <Clock className="w-10 h-10 text-emerald-600 animate-pulse-slow" />
                    </div>
                    <div className="flex-1">
                      <p className="text-emerald-500 text-[10px] font-black uppercase tracking-[0.4em] mb-2">Operational Link Active</p>
                      <h4 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none italic">
                        {isOwnShift ? 'OPERATOR: ONLINE' : `BY: ${currentShift.user?.name || 'SYSTEM'}`}
                      </h4>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8 pt-8 border-t border-emerald-500/10 relative z-10">
                    <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">SYSTEM START</p>
                      <p className="text-xl font-black text-slate-800 tracking-tight">{currentShift?.start_time ? new Date(currentShift.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '00:00'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Opening Fund</p>
                      <p className="text-xl font-black text-emerald-600 tracking-tighter italic">{formatIDR(currentShift.starting_cash)}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50/50 p-6 rounded-[1.5rem] border border-amber-100 flex gap-4 shadow-sm shadow-amber-50">
                   <div className="p-2 bg-amber-100 rounded-xl h-fit">
                      <LogOut className="w-4 h-4 text-amber-600" />
                   </div>
                   <div>
                      <p className="text-[10px] text-amber-800 font-black uppercase tracking-widest mb-1">Authorization Required</p>
                      <p className="text-xs text-amber-700 leading-relaxed font-bold">
                        {isOwnShift 
                          ? "Ending a shift requires **Manager Authorization**. You will need to count the cash in the drawer and reconcile all payment methods."
                          : "This shift was started by another user. Ending this shift will require manager override and reconciliation."
                        }
                      </p>
                   </div>
                </div>

                <Button 
                  onClick={() => setIsStopModalOpen(true)} 
                  className="w-full h-16 rounded-[1.5rem] font-black uppercase tracking-widest bg-slate-900 text-white shadow-xl shadow-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all gap-3"
                >
                  <LogOut className="w-5 h-5" /> END SHIFT & RECONCILE
                </Button>
              </div>
            )}
        </div>

        {/* Quick Stats or Info */}
        <div className="glass-card rounded-[2.5rem] p-8 space-y-6 shadow-2xl border-none">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
             <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
               <Activity className="w-5 h-5 text-emerald-600" />
             </div>
             Current Status
          </h3>
          <div className="space-y-3">
            {[
              { label: "Identity", value: currentUser.name, icon: Users },
              { label: "Privilege", value: currentUser.role, icon: Settings },
              { label: "System Date", value: new Date().toLocaleDateString(), icon: Calendar }
            ].map((stat, sIdx) => (
              <div key={sIdx} className="flex justify-between items-center p-5 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:bg-white hover:shadow-sm transition-all duration-300">
                <div className="flex items-center gap-3">
                   <stat.icon className="w-4 h-4 text-slate-400" />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                </div>
                <span className="font-black text-slate-900 uppercase tracking-tight text-sm">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl border-none p-0">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
               <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                 <ClipboardList className="w-5 h-5 text-emerald-600" />
               </div>
               Session History
            </h3>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="text-[10px] font-black uppercase text-slate-500 py-5 px-8">Start Time</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-500 py-5">End Time</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-500 py-5 text-right">Starting</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-500 py-5 text-right">Ending</TableHead>
              <TableHead className="text-center text-[10px] font-black uppercase text-slate-500 py-5 px-8">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shiftHistory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-20">
                   <div className="flex flex-col items-center gap-3 opacity-20">
                      <Clock className="w-12 h-12" />
                      <p className="font-black uppercase tracking-widest text-xs">No records found</p>
                   </div>
                </TableCell>
              </TableRow>
            ) : (
              shiftHistory.map((shift) => (
                <TableRow key={shift.id} className="hover:bg-slate-50/50 border-slate-100 transition-colors">
                  <TableCell className="px-8 py-5 font-bold text-slate-700">{new Date(shift.start_time).toLocaleString()}</TableCell>
                  <TableCell className="font-bold text-slate-400">{shift.end_time ? new Date(shift.end_time).toLocaleString() : "-"}</TableCell>
                  <TableCell className="text-right font-black text-slate-400">{formatIDR(shift.starting_cash)}</TableCell>
                  <TableCell className="text-right font-black text-emerald-600">{shift.ending_cash ? formatIDR(shift.ending_cash) : "-"}</TableCell>
                  <TableCell className="text-center px-8">
                    <span className={cn(
                      "inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm",
                      shift.status === 'OPEN' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                    )}>
                      {shift.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      <StopShiftModal 
        isOpen={isStopModalOpen} 
        onClose={() => setIsStopModalOpen(false)}
        onSuccess={handleStopShiftSuccess}
        currentUserId={currentUser?.id}
      />
    </div>
  );
}

