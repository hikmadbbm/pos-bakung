"use client";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Lock } from "lucide-react";

export function PinDialog({ isOpen, onClose, onVerify, title = "Enter PIN" }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setPin("");
      setError("");
      setLoading(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pin) {
      setError("Please enter a PIN");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // For now, we are just passing the PIN to the parent to handle verification
      // Or we can verify it here if we had a dedicated verification endpoint
      // Let's pass it up to keep this component dumb or semi-smart
      await onVerify(pin);
      // Parent should handle closing on success
    } catch (err) {
      setError(err.message || "Invalid PIN");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="text-center space-y-2">
            <div className="bg-emerald-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
              <Lock className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm text-gray-500">
              Authorization required. Please enter your PIN to proceed.
            </p>
          </div>

          <div className="space-y-2">
            <Input 
              type="password" 
              inputMode="numeric"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ""));
                setError("");
              }}
              placeholder="••••"
              className="text-center text-4xl tracking-[0.3em] h-16 w-full font-black bg-slate-50 border-2 border-slate-200 focus:border-emerald-500 rounded-2xl text-slate-900"
              maxLength={6}
              autoFocus
            />
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onClose(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={loading || pin.length < 1}>
              {loading ? "Verifying..." : "Confirm"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
