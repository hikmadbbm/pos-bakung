"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Clock, Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import { useTranslation } from "../../lib/language-context";

export default function TimeTracker() {
  const { t } = useTranslation();
  const [time, setTime] = useState(0);
  const [isShiftActive, setIsShiftActive] = useState(false);
  const [loading, setLoading] = useState(true);

  const [shiftOwner, setShiftOwner] = useState(null);

  const checkShift = useCallback(async () => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return;
      
      const user = JSON.parse(userStr);
      const res = await api.get(`/shifts/current/${user.id}`);
      
      if (res && res.status === 'OPEN') {
        const startTime = new Date(res.start_time).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        
        setIsShiftActive(true);
        setTime(elapsed);
        setShiftOwner(res.user?.name || res.user?.username || t('common.personnel'));
      } else {
        setIsShiftActive(false);
        setTime(0);
        setShiftOwner(null);
      }
    } catch (e) {
      console.error("TimeTracker: Error fetching shift", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkShift();

    const handleShiftChange = () => checkShift();
    window.addEventListener('shift-status-changed', handleShiftChange);
    return () => window.removeEventListener('shift-status-changed', handleShiftChange);
  }, [checkShift]);

  useEffect(() => {
    let interval = null;
    if (isShiftActive) {
      interval = setInterval(() => {
        setTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isShiftActive]);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-5 lg:p-6 bg-slate-900 border border-slate-800 shadow-2xl rounded-[2rem] text-white flex flex-col h-full relative overflow-hidden group min-h-[160px]">
      <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
        <Clock className="w-12 h-12" />
      </div>
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em]">{t('dashboard.management_cycle')}</h3>
          {isShiftActive && shiftOwner && (
            <div className="text-[8px] font-bold text-emerald-400/40 uppercase tracking-widest text-right">
              {t('dashboard.active_personnel').replace('%{name}', shiftOwner)}
            </div>
          )}
        </div>
        
        <div className="flex-1 flex flex-col items-center justify-center">
          {loading ? (
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          ) : (
            <>
              <div className="text-4xl font-black tracking-tighter tabular-nums mb-1 drop-shadow-lg">
                {formatTime(time)}
              </div>
              <p className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest">
                {t('dashboard.elapsed_time')}
              </p>
            </>
          )}
        </div>

        <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/5">
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{t('dashboard.shift_status')}</span>
          <div className="flex items-center gap-2">
            {isShiftActive ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">{t('dashboard.active')}</span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{t('dashboard.inactive')}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
