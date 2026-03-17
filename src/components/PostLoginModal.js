"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";

import { User, Calculator, Rocket, ArrowRight, ArrowLeft } from "lucide-react";
import { cn } from "../lib/utils";

export default function PostLoginModal({ isOpen, user, onClose }) {
  const router = useRouter();
  const [mode, setMode] = useState("selection"); // selection, input
  const [startingCash, setStartingCash] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDashboard = () => {
    if (onClose) onClose();
    router.push("/dashboard");
  };

  const handleOpenPOS = () => {
    setMode("input");
  };

  const handleStartShift = async (e) => {
    e.preventDefault();
    setError("");
    
    // Validation
    const amount = parseFloat(startingCash);
    if (isNaN(amount) || amount < 0.01 || amount > 999999.99) {
      setError("Amount must be between 0.01 and 999,999.99");
      return;
    }
    
    // Regex for 2 decimal places max
    if (!/^\d+(\.\d{1,2})?$/.test(startingCash)) {
       setError("Maximum 2 decimal places allowed");
       return;
    }

    setLoading(true);
    try {
      await api.post("/shifts/start", {
        user_id: user.id,
        starting_cash: amount
      });
      
      // Dispatch global event to update UI
      window.dispatchEvent(new Event('shift-status-changed'));
      
      if (onClose) onClose();
      router.push("/orders");
    } catch (err) {
      // If shift already open, just proceed
      if (err.response?.data?.error?.includes("already has an open shift")) {
          // Dispatch global event to update UI even if it failed but we consider it success (already open)
          window.dispatchEvent(new Event('shift-status-changed'));
          if (onClose) onClose();
          router.push("/orders");
      } else {
          setError(err.response?.data?.error || "Failed to start shift");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-2xl">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-8 text-white relative overflow-hidden">
           {/* Abstract Background Shapes */}
           <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
           <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-emerald-400/20 rounded-full blur-2xl" />
           
           <div className="relative z-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 shadow-xl">
                 {mode === "selection" ? (
                   <User className="w-8 h-8 text-white" />
                 ) : (
                   <Calculator className="w-8 h-8 text-white" />
                 )}
              </div>
              <DialogTitle className="text-2xl font-black tracking-tight text-white mb-1">
                 {mode === "selection" ? "Welcome Back!" : "Start New Shift"}
              </DialogTitle>
              <DialogDescription className="text-emerald-50/80 font-medium">
                {mode === "selection" 
                  ? `Authenticated as ${user?.name || 'User'}`
                  : "Initialize your register to begin sales"}
              </DialogDescription>
           </div>
        </div>

        <div className="p-8 bg-white">
          {mode === "selection" ? (
            <div className="space-y-4">
              <p className="text-sm font-bold text-slate-500 uppercase tracking-widest text-center mb-6">Choose workspace</p>
              
              <button 
                onClick={handleOpenPOS}
                className="w-full flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-emerald-500 hover:bg-emerald-50 transition-all group text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 group-hover:scale-110 transition-transform">
                  <Rocket className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-800 uppercase tracking-tight">Open POS System</p>
                  <p className="text-xs text-slate-400 font-medium">Access order processing & sales</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </button>

              <button 
                onClick={handleDashboard}
                className="w-full flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-800 text-white flex items-center justify-center shadow-lg shadow-slate-800/20 group-hover:scale-110 transition-transform">
                  <Calculator className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-slate-800 uppercase tracking-tight">Management Dashboard</p>
                  <p className="text-xs text-slate-400 font-medium">Reports, Inventory & Settings</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleStartShift} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="cash" className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Starting Register Cash</Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-300">Rp</span>
                  <Input
                    id="cash"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    autoFocus
                    className="pl-12 h-14 rounded-2xl border-2 border-slate-100 focus:border-emerald-500 ring-0 focus:ring-4 focus:ring-emerald-500/10 transition-all font-black text-xl"
                    value={startingCash}
                    onChange={(e) => setStartingCash(e.target.value)}
                    disabled={loading}
                    min="0.01"
                    max="999999.99"
                  />
                </div>
                {error && <p className="text-xs font-bold text-red-500 mt-1 ml-1 flex items-center gap-1">
                  <span className="w-1 h-1 bg-red-500 rounded-full" /> {error}
                </p>}
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 transition-all active:scale-95"
                >
                  {loading ? "Initializing..." : "Launch POS Terminal"}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setMode("selection")} 
                  disabled={loading}
                  className="rounded-xl font-bold text-slate-400"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back to Selection
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
