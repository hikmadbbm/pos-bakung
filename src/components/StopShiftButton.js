"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { Button } from "./ui/button";
import { LogOut, Clock } from "lucide-react";
import StopShiftModal from "./StopShiftModal";
import PinVerificationModal from "./PinVerificationModal";
import { useToast } from "./ui/use-toast";

export default function StopShiftButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasActiveShift, setHasActiveShift] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [manager, setManager] = useState(null);
  const [activeShift, setActiveShift] = useState(null);
  const [elapsed, setElapsed] = useState("00:00:00");
  const { error } = useToast();

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
      if (e.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
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

    // Poll every minute to keep status updated
    const interval = setInterval(checkShiftStatus, 60000);
    
    return () => {
      window.removeEventListener('shift-status-changed', handleShiftChange);
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

  const handleStopShiftSuccess = useCallback(() => {
    setHasActiveShift(false);
    setActiveShift(null);
    setStartTime(null);
    window.dispatchEvent(new Event('shift-status-changed'));
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

  if (!hasActiveShift) return null;

  const isOwnShift = activeShift?.user_id === currentUserId;

  return (
    <div className="flex items-center gap-3">
      {/* Timer Display */}
      <div 
        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-100 shadow-sm"
        title={!isOwnShift ? `Active Shift: ${activeShift?.user?.name || 'Personnel'}` : 'Your Active Shift'}
      >
        <Clock className="w-3.5 h-3.5 sm:w-4 h-4 animate-pulse" />
        <span className="font-mono font-bold text-[10px] sm:text-sm tracking-widest">{elapsed}</span>
      </div>

      <Button 
        variant="destructive" 
        size="sm" 
        className="hidden sm:flex lg:flex gap-2 font-bold shadow-sm animate-in fade-in zoom-in duration-300"
        onClick={() => setIsAuthOpen(true)}
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden lg:inline">{isOwnShift ? 'Stop Shift' : 'End External Shift'}</span>
        <span className="lg:hidden">Stop</span>
      </Button>
      
      {/* Mobile Icon Only */}
      <Button 
        variant="destructive" 
        size="icon" 
        className="sm:hidden w-8 h-8 rounded-full shadow-sm"
        onClick={() => setIsAuthOpen(true)}
      >
        <LogOut className="w-4 h-4" />
      </Button>

      <StopShiftModal 
        isOpen={isOpen} 
        onClose={handleCloseModal}
        onSuccess={handleStopShiftSuccess}
        currentUserId={activeShift?.user_id}
        authorizedManager={manager}
      />

      <PinVerificationModal 
        open={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSubmit={handleAuthSubmit}
        title={isOwnShift ? "Stop Shift Security" : "Admin Shift Override"}
        subtitle={isOwnShift ? "Verification required to end shift" : `Ending shift for ${activeShift?.user?.name || 'Personnel'}`}
      />
    </div>
  );
}
