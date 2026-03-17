"use client";
import { useState } from "react";
import PinVerificationModal from "../../components/PinVerificationModal";
import StopShiftModal from "../../components/StopShiftModal";
import { Button } from "../../components/ui/button";

export default function PreviewPage() {
  const [pinOpen, setPinOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);

  const mockManager = {
    username: "admin_test",
    name: "Mock Admin"
  };

  return (
    <div className="p-20 space-y-8 flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <h1 className="text-4xl font-black text-slate-900 tracking-tighter">UI Preview Scratchpad</h1>
      
      <div className="flex gap-4">
        <Button 
          onClick={() => setPinOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 h-16 px-8 rounded-2xl font-bold shadow-xl shadow-emerald-600/20"
        >
          Preview PIN Modal
        </Button>

        <Button 
          onClick={() => setShiftOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 h-16 px-8 rounded-2xl font-bold shadow-xl shadow-slate-900/20"
        >
          Preview Stop Shift Modal
        </Button>
      </div>

      <PinVerificationModal 
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        onSubmit={async (pin) => {
          console.log("PIN Submitted:", pin);
          return new Promise(resolve => setTimeout(resolve, 2000));
        }}
        title="Stop Shift Security"
        subtitle="Verification required to end shift"
      />

      <StopShiftModal 
        isOpen={shiftOpen}
        onClose={() => setShiftOpen(false)}
        currentUserId="mock-user-123"
        authorizedManager={mockManager}
        onSuccess={() => console.log("Shift success")}
      />
    </div>
  );
}
