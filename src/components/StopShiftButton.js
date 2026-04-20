"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { Button } from "./ui/button";
import { LogOut, Clock, StopCircle } from "lucide-react";
import StopShiftModal from "./StopShiftModal";
import PinVerificationModal from "./PinVerificationModal";
import { useToast } from "./ui/use-toast";
import { useTranslation } from "../lib/language-context";
import ShiftReportModal from "./ShiftReportModal";
import { useRouter } from "next/navigation";

export default function StopShiftButton({ mode = "full" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasActiveShift, setHasActiveShift] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [manager, setManager] = useState(null);
  const [activeShift, setActiveShift] = useState(null);
  const [elapsed, setElapsed] = useState("00:00:00");
  const { error } = useToast();
  const { t } = useTranslation();
  const router = useRouter();
  const [reportShiftId, setReportShiftId] = useState(null);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const isOwnShift = activeShift?.user_id === currentUserId;

  const checkShiftStatus = async () => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    
    try {
      const user = JSON.parse(userStr);
      setCurrentUserId(user.id);

      const res = await api.get(`/shifts/current/${user.id}`);
      if (res) {
        setHasActiveShift(true);
        setActiveShift(res);
        setStartTime(new Date(res.start_time));
      } else {
        setHasActiveShift(false);
        setActiveShift(null);
        setStartTime(null);
      }
    } catch (e) {
      console.error(e);
      setHasActiveShift(false);
      setActiveShift(null);
      setStartTime(null);
    }
  };

  useEffect(() => {
    checkShiftStatus();
    
    // Listen for global shift events
    const handleShiftChange = () => checkShiftStatus();
    window.addEventListener('shift-status-changed', handleShiftChange);

    const handleRemoteTrigger = () => {
       setIsAuthOpen(true);
    };
    window.addEventListener('trigger-stop-shift', handleRemoteTrigger);

    // Poll every minute to keep status updated
    const interval = setInterval(checkShiftStatus, 60000);
    
    return () => {
      window.removeEventListener('shift-status-changed', handleShiftChange);
      window.removeEventListener('trigger-stop-shift', handleRemoteTrigger);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!startTime) return;

    const updateTimer = () => {
      const now = new Date();
      const diff = Math.max(0, now - startTime); // in ms
      
      const seconds = Math.floor((diff / 1000) % 60);
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const hours = Math.floor(diff / (1000 * 60 * 60));

      const fmt = (n) => n.toString().padStart(2, "0");
      setElapsed(`${fmt(hours)}:${fmt(minutes)}:${fmt(seconds)}`);
    };

    updateTimer(); // Initial call
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [startTime]);

  const handleStopShiftSuccess = useCallback((shiftId) => {
    setHasActiveShift(false);
    setActiveShift(null);
    setStartTime(null);
    window.dispatchEvent(new Event('shift-status-changed'));
    
    // Trigger Report Flow
    if (shiftId) {
      setReportShiftId(shiftId);
      setIsReportOpen(true);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleAuthSubmit = useCallback(async (pin) => {
    try {
      const res = await api.post("/auth/verify-manager", { pin });
      setManager(res.manager);
      setIsAuthOpen(false);
      setIsOpen(true);
    } catch (err) {
      throw new Error(err.response?.data?.error || "Incorrect Manager PIN");
    }
  }, []);

  return (
    <>
      {hasActiveShift && mode !== "action" && (
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Timer Display */}
          <div 
            className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 shadow-sm transition-all"
            title={!isOwnShift ? `${t('shift.active_shift_prefix')}: ${activeShift?.user?.name || t('shift.personnel')}` : t('shift.active_shift_help')}
          >
            <Clock className="w-3.5 h-3.5 sm:w-4 h-4 animate-pulse" />
            <span className="font-mono font-black text-[11px] sm:text-sm tracking-widest">{elapsed}</span>
          </div>

          {mode === "full" && (
            <Button 
              variant="destructive" 
              size="icon" 
              className="p-2.5 lg:p-3 h-auto w-auto aspect-square rounded-xl lg:rounded-2xl shadow-lg shadow-rose-500/20 animate-in fade-in zoom-in duration-300 transition-all hover:scale-110 active:scale-90 bg-rose-600 hover:bg-rose-700 border-none shrink-0"
              onClick={() => setIsAuthOpen(true)}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          )}
        </div>
      )}

      {hasActiveShift && mode === "action" && (
          <button
              className="flex items-center w-full px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
              role="menuitem"
              onClick={() => setIsAuthOpen(true)}
          >
              <StopCircle className="mr-3 h-4 w-4 text-red-500" />
              <span className="font-bold">{isOwnShift ? t('shift.stop_shift') : t('shift.end_external_shift')}</span>
          </button>
      )}

      <StopShiftModal 
        isOpen={isOpen} 
        onClose={handleCloseModal}
        onSuccess={handleStopShiftSuccess}
        onReauthorize={() => setIsAuthOpen(true)}
        currentUserId={activeShift?.user_id || currentUserId}
        authorizedManager={manager}
      />

      <PinVerificationModal 
        open={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSubmit={handleAuthSubmit}
        title={isOwnShift ? t('shift.stop_shift_security') : t('shift.admin_shift_override')}
        subtitle={isOwnShift ? t('shift.verification_required') : `${t('shift.ending_shift_for')} ${activeShift?.user?.name || t('shift.personnel')}`}
      />

      <ShiftReportModal 
        isOpen={isReportOpen}
        shiftId={reportShiftId}
        onFinish={() => {
          setIsReportOpen(false);
          router.push("/");
        }}
      />
    </>
  );
}
