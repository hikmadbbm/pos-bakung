"use client";
import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Button } from "./ui/button";
import { LogOut, Clock } from "lucide-react";
import StopShiftModal from "./StopShiftModal";

export default function StopShiftButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasActiveShift, setHasActiveShift] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState("00:00:00");

  const checkShiftStatus = async () => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return;
    
    try {
      const user = JSON.parse(userStr);
      setCurrentUserId(user.id);

      const res = await api.get(`/shifts/current/${user.id}`);
      if (res) {
        setHasActiveShift(true);
        setStartTime(new Date(res.start_time));
      } else {
        setHasActiveShift(false);
        setStartTime(null);
      }
    } catch (e) {
      setHasActiveShift(false);
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

  if (!hasActiveShift) return null;

  return (
    <div className="flex items-center gap-3">
      {/* Timer Display */}
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100 shadow-sm">
        <Clock className="w-4 h-4 animate-pulse" />
        <span className="font-mono font-bold text-sm tracking-widest">{elapsed}</span>
      </div>

      <Button 
        variant="destructive" 
        size="sm" 
        className="hidden lg:flex gap-2 font-bold shadow-sm animate-in fade-in zoom-in duration-300"
        onClick={() => setIsOpen(true)}
      >
        <LogOut className="w-4 h-4" />
        Stop Shift
      </Button>
      
      {/* Mobile Icon Only */}
      <Button 
        variant="destructive" 
        size="icon" 
        className="lg:hidden w-8 h-8 rounded-full shadow-sm"
        onClick={() => setIsOpen(true)}
      >
        <LogOut className="w-4 h-4" />
      </Button>

      <StopShiftModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
        onSuccess={() => {
          setHasActiveShift(false);
          setStartTime(null);
        }}
        currentUserId={currentUserId}
      />
    </div>
  );
}
