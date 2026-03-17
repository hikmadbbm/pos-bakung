"use client";
import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Lock, Delete, RefreshCcw, X, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * PinVerificationModal - A specialized, minimal, production-grade modal for POS PIN entry.
 * Built for touch environments with large targets and high contrast.
 * 
 * Props:
 * @param {boolean} open - Controls visibility
 * @param {function} onClose - Called when user cancels or ESC is pressed
 * @param {function} onSubmit - Called with the 6-digit PIN string. Should return a promise.
 * @param {string} title - Main modal title
 * @param {string} subtitle - Secondary descriptive text
 */
export default function PinVerificationModal({ 
  open, 
  onClose, 
  onSubmit, 
  title = "Enter PIN to End Shift",
  subtitle = "Manager authorization required" 
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  // Reset state on open/close
  useEffect(() => {
    if (open) {
      setPin("");
      setError("");
      setLoading(false);
      setIsShaking(false);
    }
  }, [open]);

  const handleKeyPress = useCallback((val) => {
    if (loading) return;
    setError("");
    
    if (val === "CLEAR") {
      setPin("");
      return;
    }
    
    if (val === "DELETE") {
      setPin(prev => prev.slice(0, -1));
      return;
    }
    
    if (pin.length < 6) {
      const newPin = pin + val;
      setPin(newPin);
      
      // Optional: Auto-submit at 6 digits
      // if (newPin.length === 6) handleSubmit(newPin);
    }
  }, [pin, loading]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (pin.length < 4 || loading) return; // Support smaller pins if needed, but usually 4-6

    setLoading(true);
    setError("");
    
    try {
      await onSubmit(pin);
    } catch (err) {
      setError(err.message || "Invalid PIN");
      setIsShaking(true);
      setPin(""); // Reset after error for security
      setTimeout(() => setIsShaking(false), 500);
    } finally {
      setLoading(false);
    }
  };

  // Keyboard support
  useEffect(() => {
    if (!open) return;
    
    const onKeyDown = (e) => {
      if (e.key >= "0" && e.key <= "9") handleKeyPress(e.key);
      if (e.key === "Backspace") handleKeyPress("DELETE");
      if (e.key === "Escape") onClose();
      if (e.key === "Enter") handleSubmit();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, handleKeyPress, onClose]);

  const KeypadButton = ({ value, label, className = "" }) => (
    <button
      type="button"
      onClick={() => handleKeyPress(value)}
      disabled={loading}
      className={cn(
        "h-16 rounded-2xl flex items-center justify-center text-xl font-black transition-all active:scale-90",
        "bg-slate-50 border border-slate-100 text-slate-700 hover:bg-slate-100 hover:border-slate-200",
        "disabled:opacity-50 disabled:active:scale-100",
        className
      )}
      aria-label={label || value.toString()}
    >
      {label || value}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={(val) => !loading && onClose(val)}>
      <DialogContent className="max-w-sm p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white flex flex-col max-h-[95vh]">
        {/* Header Section */}
        <div className="bg-emerald-600 p-8 text-white relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <Lock className="w-24 h-24 -rotate-12" />
          </div>
          <div className="relative z-10 space-y-2 text-center">
            <h3 className="text-xl font-black tracking-tight">{title}</h3>
            <p className="text-[10px] items-center justify-center flex gap-1 font-bold text-emerald-100 uppercase tracking-widest leading-none">
              <Lock className="w-2.5 h-2.5" /> {subtitle}
            </p>
          </div>
        </div>

        {/* Content Section */}
        <div className={cn("p-8 space-y-8 bg-white transition-transform flex-1 overflow-y-auto", isShaking && "animate-shake")}>
          {/* PIN Display Units */}
          <div className="flex justify-center gap-3">
            {[...Array(6)].map((_, i) => (
              <div 
                key={i}
                className={cn(
                  "w-10 h-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-200",
                  pin.length === i ? "border-emerald-500 bg-emerald-50/30 ring-4 ring-emerald-50" : 
                  pin.length > i ? "border-slate-200 bg-slate-50" : "border-slate-100 bg-transparent"
                )}
              >
                {pin.length > i ? (
                  <div className="w-3 h-3 rounded-full bg-slate-900 animate-in zoom-in-50 duration-200" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                )}
              </div>
            ))}
          </div>

          {/* Error Message */}
          <div className="min-h-[20px] text-center">
            {error && (
              <p className="text-xs font-black text-rose-500 uppercase tracking-wider animate-in fade-in slide-in-from-top-1">
                {error}
              </p>
            )}
          </div>

          {/* Numeric Keypad Grid */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <KeypadButton key={num} value={num.toString()} />
            ))}
            <KeypadButton 
               value="CLEAR" 
               label={<RefreshCcw className="w-5 h-5 text-rose-500" />} 
               className="bg-rose-50 border-rose-100 hover:bg-rose-100 active:bg-rose-200"
            />
            <KeypadButton value="0" />
            <KeypadButton 
               value="DELETE" 
               label={<Delete className="w-6 h-6 text-slate-400" />} 
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-4">
             <Button
                onClick={() => handleSubmit()}
                disabled={pin.length < 4 || loading}
                className={cn(
                  "h-16 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl transition-all active:scale-95",
                  "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                )}
             >
                {loading ? (
                  <RefreshCcw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" /> Verify Personnel
                  </>
                )}
             </Button>
             
             <button
               type="button"
               disabled={loading}
               onClick={() => onClose()}
               className="h-10 text-[10px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-[0.2em] transition-colors"
             >
               Dismiss Modal
             </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
