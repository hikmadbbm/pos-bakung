"use client";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "selection" ? "Welcome Back" : "Start Shift"}</DialogTitle>
          <DialogDescription>
            {mode === "selection" 
              ? `Hello ${user?.name || 'User'}, how would you like to proceed?`
              : "Please enter the starting cash amount for this shift."}
          </DialogDescription>
        </DialogHeader>

        {mode === "selection" ? (
          <div className="grid gap-4 py-4">
            <Button onClick={handleOpenPOS} size="lg" className="w-full bg-blue-600 hover:bg-blue-700">
              Open POS System
            </Button>
            <Button onClick={handleDashboard} variant="outline" size="lg" className="w-full">
              Continue to Dashboard
            </Button>
          </div>
        ) : (
          <form onSubmit={handleStartShift} className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cash">Starting Cash Amount</Label>
              <Input
                id="cash"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={startingCash}
                onChange={(e) => setStartingCash(e.target.value)}
                disabled={loading}
                min="0.01"
                max="999999.99"
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-end mt-4">
              <Button type="button" variant="ghost" onClick={() => setMode("selection")} disabled={loading}>
                Back
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Starting..." : "Start POS"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
