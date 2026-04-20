"use client";

import React, { useState, useEffect } from "react";
import { 
  Clock, Calendar, Power, Save, Plus, Trash2, 
  RefreshCw, ChevronRight, ArrowRight
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/use-toast";
import { useTranslation } from "@/lib/language-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const DAYS = [
  { id: "1", label: "M" },
  { id: "2", label: "T" },
  { id: "3", label: "W" },
  { id: "4", label: "T" },
  { id: "5", label: "F" },
  { id: "6", label: "S" },
  { id: "0", label: "S" },
];

export default function OperationalSettingsPage() {
  const { t } = useTranslation();
  const { success, error, info } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  
  const [data, setData] = useState({
    is_open: true,
    business_hours: {},
    special_closures: []
  });
  const [currentStatus, setCurrentStatus] = useState(null);

  // Modal states
  const [editingDay, setEditingDay] = useState(null); 
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  
  // Bulk Selection States
  const [bulkSelectedDays, setBulkSelectedDays] = useState(["1", "2", "3", "4", "5", "6", "0"]);
  const [bulkOpen, setBulkOpen] = useState("11:00");
  const [bulkClose, setBulkClose] = useState("22:00");
  const [bulkIsClosed, setBulkIsClosed] = useState(false);

  // Special Hour states
  const [showSpecialHoursModal, setShowSpecialHoursModal] = useState(false);
  const [newSpecialHour, setNewSpecialHour] = useState({ 
    startDate: "", 
    endDate: "", 
    note: "", 
    isClosed: true 
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.get("/settings/status");
      setData({
        is_open: res.is_open,
        business_hours: res.business_hours || {},
        special_closures: res.special_closures || []
      });
      setCurrentStatus(res.current);
    } catch (e) {
      error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  // Helper to save data and refresh status
  const saveData = async (updatedData) => {
    setIsSaving(true);
    try {
      await api.put("/settings/status", updatedData);
      success("Changes saved automatically");
      const res = await api.get("/settings/status");
      setCurrentStatus(res.current);
    } catch (e) {
      error("Auto-save failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleInstantToggle = async () => {
    const newStatus = !data.is_open;
    setIsToggling(true);
    try {
      await api.put("/settings/status", { is_open: newStatus });
      setData(prev => ({ ...prev, is_open: newStatus }));
      success(`Store is now ${newStatus ? 'OPEN' : 'CLOSED'}`);
      const res = await api.get("/settings/status");
      setCurrentStatus(res.current);
    } catch (e) {
      error("Failed to update status");
    } finally {
      setIsToggling(false);
    }
  };

  const daysLabels = {
    "1": "Monday", "2": "Tuesday", "3": "Wednesday", "4": "Thursday", "5": "Friday", "6": "Saturday", "0": "Sunday"
  };

  const applyBulkEdit = () => {
    if (bulkSelectedDays.length === 0) return error("Select at least one day");
    
    const newHours = { ...data.business_hours };
    bulkSelectedDays.forEach(day => {
      newHours[day] = { 
        open: bulkOpen, 
        close: bulkClose, 
        closed: bulkIsClosed 
      };
    });

    const updated = { ...data, business_hours: newHours };
    setData(updated);
    setShowBulkEdit(false);
    saveData(updated);
  };

  const updateDaySingle = (dayId, open, close, closed) => {
    const newHours = { ...data.business_hours };
    newHours[dayId] = { open, close, closed };
    const updated = { ...data, business_hours: newHours };
    setData(updated);
    setEditingDay(null);
    saveData(updated);
  };

  const removeClosure = (idx) => {
    const newClosures = [...data.special_closures];
    newClosures.splice(idx, 1);
    const updated = { ...data, special_closures: newClosures };
    setData(updated);
    saveData(updated);
  };

  const toggleBulkDay = (id) => {
    setBulkSelectedDays(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  if (loading) return <div className="p-20 text-center animate-pulse tracking-widest uppercase font-black text-[10px] text-slate-400">Initializing...</div>;

  return (
    <div className="max-w-6xl mx-auto pb-40 animate-fade-in relative px-4 md:px-8">
       {/* Header */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-xl shadow-emerald-200">
                <Clock className="w-6 h-6" />
             </div>
             <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">Operational Hours</h1>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-0.5">Bakmie You-Tje Merchant Control</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
             <div className="px-4 py-2">
                <p className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Global Status</p>
                <div className="flex items-center gap-2">
                   <p className="text-xs font-black text-slate-900 mt-0.5 uppercase tracking-tighter">{data.is_open ? "LIVE/OPEN" : "STORE CLOSED"}</p>
                   {isSaving && <RefreshCw className="w-3 h-3 animate-spin text-emerald-500" />}
                </div>
             </div>
             <button 
               onClick={handleInstantToggle}
               className={cn(
                 "w-14 h-8 rounded-full transition-all flex items-center p-1 cursor-pointer relative",
                 data.is_open ? "bg-emerald-500" : "bg-slate-300",
                 isToggling && "opacity-50 pointer-events-none shadow-inner"
               )}
             >
                <div className={cn(
                   "w-6 h-6 bg-white rounded-full shadow-lg transition-all transform",
                   data.is_open ? "translate-x-6" : "translate-x-0"
                )} />
             </button>
          </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 space-y-6">
             <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/40 overflow-hidden border border-slate-50">
                <div className="p-8 border-b border-slate-50 bg-slate-50/10 flex justify-between items-center text-sm">
                   <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">Merchant Schedule</h3>
                   <button onClick={() => setShowBulkEdit(true)} className="flex items-center gap-2 text-emerald-600 font-bold uppercase tracking-widest hover:bg-emerald-50 px-4 py-2 rounded-xl transition-all border border-emerald-100 shadow-sm text-[9px]">
                      <Plus className="w-3.5 h-3.5 mr-1"/> Edit Multiple Days
                   </button>
                </div>

                <div className="divide-y divide-slate-50">
                   {["1", "2", "3", "4", "5", "6", "0"].map(day => {
                      const h = data.business_hours[day] || { open: "08:00", close: "22:00", closed: false };
                      return (
                         <div 
                           key={day} 
                           onClick={() => setEditingDay({ dayId: day, label: daysLabels[day], ...h })}
                           className="flex items-center justify-between p-7 hover:bg-emerald-50/30 active:bg-emerald-50 transition-all cursor-pointer group"
                         >
                            <span className="font-black text-slate-800 text-sm tracking-tight">{daysLabels[day]}</span>
                            <div className="flex items-center gap-4">
                               <span className={cn(
                                  "text-sm font-black tracking-tight",
                                  h.closed ? "text-rose-500 bg-rose-50 px-3 py-1 rounded-full text-[10px]" : "text-emerald-600"
                               )}>
                                  {h.closed ? "CLOSED" : `${h.open} - ${h.close}`}
                               </span>
                               <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-emerald-500 transition-all" />
                            </div>
                         </div>
                      );
                   })}
                </div>
             </div>
          </div>

          <div className="lg:col-span-5 space-y-8">
             <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10 text-sm">
                   <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400 mb-6">Real-time Override</p>
                   <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-2 text-white">
                      {currentStatus?.isOpen ? "Business is Open" : "Store is Closed"}
                   </h2>
                   <p className="text-xs font-medium text-slate-300 leading-relaxed mb-6">
                      {currentStatus?.reason || "System logic active"}
                   </p>
                   <button 
                     onClick={handleInstantToggle}
                     disabled={isToggling}
                     className={cn(
                       "w-full py-5 rounded-2xl font-black text-xs uppercase tracking-[0.3em] transition-all active:scale-95",
                       currentStatus?.isOpen ? "bg-rose-500 hover:bg-rose-600 shadow-xl shadow-rose-500/20" : "bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20"
                     )}
                   >
                      {currentStatus?.isOpen ? "Force Close Now" : "Re-open Right Now"}
                   </button>
                </div>
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
             </div>

             <div className="space-y-6">
                <div className="flex items-center justify-between px-2 text-sm">
                   <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">Special Closures</h3>
                   <button onClick={() => setShowSpecialHoursModal(true)} className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-all">
                      <Plus className="w-5 h-5"/>
                   </button>
                </div>

                <div className="space-y-4">
                   {data.special_closures.map((c, idx) => (
                      <div key={idx} className="bg-white p-6 rounded-[2rem] border border-slate-100 flex items-center justify-between shadow-sm hover:shadow-md transition-all group">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-all text-sm">
                               <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                               <p className="text-sm font-black text-slate-800">{c.note || "Special Closure"}</p>
                               <div className="flex items-center gap-2 mt-1">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                    {c.startDate ? new Date(c.startDate).toLocaleDateString('id-ID', { day:'numeric', month:'short' }) : (c.date ? new Date(c.date).toLocaleDateString('id-ID', { day:'numeric', month:'short' }) : '---')}
                                  </p>
                                  {c.endDate && c.endDate !== c.startDate && (
                                     <>
                                       <ArrowRight className="w-2.5 h-2.5 text-slate-300" />
                                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                         {new Date(c.endDate).toLocaleDateString('id-ID', { day:'numeric', month:'short' })}
                                       </p>
                                     </>
                                  )}
                               </div>
                            </div>
                         </div>
                         <button onClick={() => removeClosure(idx)} className="text-slate-200 hover:text-rose-500 transition-colors">
                            <Trash2 className="w-5 h-5" />
                         </button>
                      </div>
                   ))}
                </div>
             </div>
          </div>
       </div>

       {/* Single Day Editor Modal */}
       <Dialog open={!!editingDay} onOpenChange={(o) => !o && setEditingDay(null)}>
          <DialogContent className="max-w-xs p-8 rounded-[3rem] border-none shadow-2xl text-sm">
             {editingDay && (
               <>
                 <DialogHeader>
                    <DialogTitle className="text-xl font-black uppercase italic tracking-tighter text-slate-900">{editingDay.label}</DialogTitle>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Daily Availability</p>
                 </DialogHeader>
                 <div className="space-y-8 py-6">
                    <div className="p-6 bg-slate-50 rounded-[2rem] flex items-center justify-between">
                       <span className="text-xs font-black text-slate-500 uppercase tracking-tight">Status</span>
                       <button 
                         onClick={() => setEditingDay({...editingDay, closed: !editingDay.closed})}
                         className={cn(
                           "px-6 py-2 rounded-full text-[10px] font-black uppercase transition-all shadow-sm",
                           editingDay.closed ? "bg-rose-500 text-white" : "bg-emerald-500 text-white"
                         )}
                       >
                          {editingDay.closed ? "CLOSED" : "OPEN"}
                       </button>
                    </div>
                    {!editingDay.closed && (
                       <div className="space-y-6 animate-in fade-in slide-in-from-top-2">
                          <div className="space-y-2">
                             <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Open Time</label>
                             <input type="time" value={editingDay.open} onChange={e => setEditingDay({...editingDay, open: e.target.value})} className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 font-black text-lg text-slate-800 outline-none" />
                          </div>
                          <div className="space-y-2">
                             <label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Close Time</label>
                             <input type="time" value={editingDay.close} onChange={e => setEditingDay({...editingDay, close: e.target.value})} className="w-full h-14 bg-slate-50 border-none rounded-2xl px-6 font-black text-lg text-slate-800 outline-none" />
                          </div>
                       </div>
                    )}
                 </div>
                 <div className="flex gap-2">
                    <Button variant="ghost" className="rounded-2xl flex-1 h-14 text-[10px] uppercase font-black" onClick={() => setEditingDay(null)}>Cancel</Button>
                    <Button className="rounded-2xl flex-1 h-14 text-[10px] uppercase font-black bg-emerald-600 text-white shadow-xl" onClick={() => updateDaySingle(editingDay.dayId, editingDay.open, editingDay.close, editingDay.closed)}>Update Day</Button>
                 </div>
               </>
             )}
          </DialogContent>
       </Dialog>

       {/* Bulk Editor Modal */}
       <Dialog open={showBulkEdit} onOpenChange={setShowBulkEdit}>
          <DialogContent className="max-w-md p-0 overflow-hidden rounded-[3rem] border-none shadow-2xl bg-white text-sm">
             <div className="p-10 pb-6">
                <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">SELECT DAYS & TIME</h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Multi-day Availability</p>
             </div>
             
             <div className="p-10 pt-0 space-y-10">
                <div className="flex justify-between items-center gap-2">
                   {DAYS.map((d) => (
                      <div 
                        key={d.id}
                        onClick={() => toggleBulkDay(d.id)}
                        className={cn(
                          "w-11 h-11 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all font-bold text-sm",
                          bulkSelectedDays.includes(d.id) 
                            ? "bg-white border-emerald-600 text-emerald-600 shadow-xl shadow-emerald-100" 
                            : "bg-slate-50 border-transparent text-slate-400"
                        )}
                      >
                         {d.label}
                      </div>
                   ))}
                </div>

                <div className="p-8 bg-slate-50 rounded-[2.5rem] space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Shop Availability</p>
                    <div className="grid grid-cols-2 gap-4">
                       <div 
                         onClick={() => bulkSelectedDays.length > 0 && setBulkIsClosed(false)}
                         className={cn(
                           "flex justify-between items-center p-5 rounded-2xl cursor-pointer border-2 transition-all",
                           !bulkIsClosed ? "bg-white border-emerald-500 shadow-lg shadow-emerald-500/10" : "border-transparent bg-slate-100/40"
                         )}
                       >
                          <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Open</span>
                          <div className={cn("w-5 h-5 rounded-full border-[3px] flex items-center justify-center", !bulkIsClosed ? "border-emerald-500 bg-emerald-500" : "border-slate-300")}>
                             {!bulkIsClosed && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                       </div>
                       
                       <div 
                         onClick={() => bulkSelectedDays.length > 0 && setBulkIsClosed(true)}
                         className={cn(
                           "flex justify-between items-center p-5 rounded-2xl cursor-pointer border-2 transition-all",
                           bulkIsClosed ? "bg-white border-emerald-500 shadow-lg shadow-emerald-500/10" : "border-transparent bg-slate-100/40"
                         )}
                       >
                          <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">Closed</span>
                          <div className={cn("w-5 h-5 rounded-full border-[3px] flex items-center justify-center", bulkIsClosed ? "border-emerald-500 bg-emerald-500" : "border-slate-300")}>
                             {bulkIsClosed && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </div>
                       </div>
                    </div>
                </div>

                {!bulkIsClosed && (
                   <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Open At</label>
                           <input type="time" value={bulkOpen} onChange={e => setBulkOpen(e.target.value)} className="w-full h-16 bg-slate-50 border border-slate-100 rounded-3xl px-8 font-black text-lg text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all" />
                        </div>
                        <div className="space-y-3">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Close At</label>
                           <input type="time" value={bulkClose} onChange={e => setBulkClose(e.target.value)} className="w-full h-16 bg-slate-50 border border-slate-100 rounded-3xl px-8 font-black text-lg text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all" />
                        </div>
                      </div>
                   </div>
                )}

                <div className="flex gap-4 pt-4">
                   <Button variant="ghost" onClick={() => setShowBulkEdit(false)} className="flex-1 h-16 rounded-[1.5rem] text-slate-400 font-black text-[10px] uppercase tracking-widest">Discard</Button>
                   <Button onClick={applyBulkEdit} className="flex-1 h-16 rounded-[1.5rem] bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-emerald-200">Confirm & Save</Button>
                </div>
             </div>
          </DialogContent>
       </Dialog>

       {/* Special Hours Modal */}
       <Dialog open={showSpecialHoursModal} onOpenChange={setShowSpecialHoursModal}>
          <DialogContent className="max-w-md p-0 overflow-hidden rounded-[3rem] border-none shadow-2xl bg-white text-sm">
             <div className="p-10 pb-6">
                <h3 className="text-2xl font-black text-slate-900 italic uppercase tracking-tighter">Schedule Special Hour</h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Holiday or temporary closure</p>
             </div>
             
             <div className="p-10 pt-0 space-y-10">
                <div className="space-y-3">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Description</label>
                   <input placeholder="e.g. Chinese New Year" className="w-full h-16 bg-slate-50 border border-slate-100 rounded-3xl px-8 font-bold text-slate-800 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all text-sm" value={newSpecialHour.note} onChange={e => setNewSpecialHour({...newSpecialHour, note: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Date From</label>
                      <input type="date" className="w-full h-16 bg-slate-50 border border-slate-100 rounded-3xl px-6 font-black text-slate-800 outline-none text-xs" value={newSpecialHour.startDate} onChange={e => setNewSpecialHour(prev => ({ ...prev, startDate: e.target.value, endDate: prev.endDate < e.target.value ? e.target.value : prev.endDate }))} />
                   </div>
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Date To</label>
                      <input type="date" className="w-full h-16 bg-slate-50 border border-slate-100 rounded-3xl px-6 font-black text-slate-800 outline-none text-xs" value={newSpecialHour.endDate} min={newSpecialHour.startDate} onChange={e => setNewSpecialHour({...newSpecialHour, endDate: e.target.value})} />
                   </div>
                </div>

                <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">Availability</label>
                    <div className="p-6 bg-slate-50 rounded-[2.5rem] space-y-3">
                       <div onClick={() => setNewSpecialHour({...newSpecialHour, isClosed: true})} className={cn("flex justify-between items-center p-6 rounded-2xl cursor-pointer border-2 transition-all", newSpecialHour.isClosed ? "bg-white border-emerald-500 shadow-xl shadow-emerald-100/50" : "border-transparent bg-slate-100/20")}>
                          <span className="text-sm font-black text-slate-800">Closed all day</span>
                          <div className={cn("w-6 h-6 rounded-full border-[3px] flex items-center justify-center transition-all", newSpecialHour.isClosed ? "border-emerald-500 bg-emerald-500" : "border-slate-300")}>
                             {newSpecialHour.isClosed && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                       </div>
                       <div onClick={() => setNewSpecialHour({...newSpecialHour, isClosed: false})} className={cn("flex justify-between items-center p-6 rounded-2xl cursor-pointer border-2 transition-all", !newSpecialHour.isClosed ? "bg-white border-emerald-500 shadow-xl shadow-emerald-100/50" : "border-transparent bg-slate-100/20")}>
                          <span className="text-sm font-black text-slate-800">Open</span>
                          <div className={cn("w-6 h-6 rounded-full border-[3px] flex items-center justify-center transition-all", !newSpecialHour.isClosed ? "border-emerald-500 bg-emerald-500" : "border-slate-300")}>
                             {!newSpecialHour.isClosed && <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                       </div>
                    </div>
                </div>

                <Button onClick={() => { 
                   if (!newSpecialHour.startDate) return error("Please select start date"); 
                   const updated = {...data, special_closures: [...data.special_closures, { ...newSpecialHour, endDate: newSpecialHour.endDate || newSpecialHour.startDate }]};
                   setData(updated);
                   saveData(updated);
                   setNewSpecialHour({ startDate: "", endDate: "", note: "", isClosed: true }); 
                   setShowSpecialHoursModal(false); 
                }} className="w-full h-16 bg-slate-900 hover:bg-black text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl transition-all active:scale-95 mt-4">Confirm & Save</Button>
             </div>
          </DialogContent>
       </Dialog>
    </div>
  );
}
