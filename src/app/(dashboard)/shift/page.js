
"use client";
import { useState, useEffect } from "react";
import { api } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { useToast } from "../../../components/ui/use-toast";
import { Clock, DollarSign, LogOut, CheckCircle2 } from "lucide-react";
import StopShiftModal from "../../../components/StopShiftModal";

export default function ShiftPage() {
  const { success, error } = useToast();
  const [currentShift, setCurrentShift] = useState(null);
  const [shiftHistory, setShiftHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // For Start Shift
  const [startCash, setStartCash] = useState("");
  
  // For End Shift
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);

  // Ideally get this from Auth Context
  const [currentUser, setCurrentUser] = useState(null); 

  useEffect(() => {
    // Mock user fetch - in real app, useAuth()
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const u = JSON.parse(userStr);
      setCurrentUser(u);
      loadCurrentShift(u.id);
      loadHistory(u.id);
    } else {
      setLoading(false);
    }
  }, []);

  const loadCurrentShift = async (userId) => {
    try {
      const res = await api.get(`/shifts/current/${userId}`);
      setCurrentShift(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (userId) => {
    try {
      const res = await api.get(`/shifts/history?userId=${userId}`);
      setShiftHistory(res);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStartShift = async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      const res = await api.post("/shifts/start", {
        user_id: currentUser.id,
        starting_cash: parseInt(startCash)
      });
      setCurrentShift(res);
      success("Shift started successfully");
      
      // Dispatch global event
      window.dispatchEvent(new Event('shift-status-changed'));
      
      loadHistory(currentUser.id);
    } catch (e) {
      console.error(e);
      error(e.response?.data?.error || "Failed to start shift");
    }
  };

  const handleStopShiftSuccess = () => {
    setCurrentShift(null);
    if (currentUser) {
      loadHistory(currentUser.id);
    }
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Please log in to manage shifts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shift Management</h1>
          <p className="text-sm text-gray-500">Track your work hours and cash handling.</p>
        </div>
        {currentShift && (
          <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Shift Open since {new Date(currentShift.start_time).toLocaleTimeString()}
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Shift Control */}
        <Card>
          <CardHeader>
            <CardTitle>{currentShift ? "End Current Shift" : "Start New Shift"}</CardTitle>
          </CardHeader>
          <CardContent>
            {!currentShift ? (
              <form onSubmit={handleStartShift} className="space-y-4">
                <div className="space-y-2">
                  <Label>Starting Cash (Modal Awal)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">Rp</span>
                    <Input 
                      className="pl-10" 
                      type="number" 
                      required
                      placeholder="0"
                      value={startCash}
                      onChange={(e) => setStartCash(e.target.value)}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">Start Shift</Button>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
                  <div className="flex items-center gap-3 text-blue-800">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">Shift In Progress</p>
                      <p className="text-[10px] opacity-70 uppercase tracking-wider font-bold">Opened at {new Date(currentShift.start_time).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-100">
                    <div>
                      <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight">Starting Cash</p>
                      <p className="text-sm font-bold text-blue-900">{formatIDR(currentShift.starting_cash)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-blue-600 font-bold uppercase tracking-tight">Status</p>
                      <div className="flex items-center justify-end gap-1">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        <p className="text-sm font-bold text-green-700">Active</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                  <p className="text-[10px] text-orange-800 font-black uppercase tracking-widest mb-1">Attention</p>
                  <p className="text-xs text-orange-700 leading-relaxed font-medium">
                    Ending a shift requires **Manager Authorization**. You will need to count the cash in the drawer and reconcile all payment methods.
                  </p>
                </div>

                <Button 
                  onClick={() => setIsStopModalOpen(true)} 
                  variant="destructive" 
                  className="w-full py-6 font-bold shadow-sm shadow-red-200 hover:scale-[1.01] active:scale-[0.99] transition-all gap-2"
                >
                  <LogOut className="w-5 h-5" /> End Shift & Reconcile
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats or Info */}
        <Card>
          <CardHeader>
            <CardTitle>Current Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-500">User</span>
              <span className="font-bold">{currentUser.name}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-500">Role</span>
              <span className="font-bold">{currentUser.role}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-500">Today&apos;s Date</span>
              <span className="font-bold">{new Date().toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Shift History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead className="text-right">Starting Cash</TableHead>
                <TableHead className="text-right">Ending Cash</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {shiftHistory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">No shift history found.</TableCell>
                </TableRow>
              ) : (
                shiftHistory.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell>{new Date(shift.start_time).toLocaleString()}</TableCell>
                    <TableCell>{shift.end_time ? new Date(shift.end_time).toLocaleString() : "-"}</TableCell>
                    <TableCell className="text-right">{formatIDR(shift.starting_cash)}</TableCell>
                    <TableCell className="text-right">{shift.ending_cash ? formatIDR(shift.ending_cash) : "-"}</TableCell>
                    <TableCell className="text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        shift.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {shift.status}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <StopShiftModal 
        isOpen={isStopModalOpen} 
        onClose={() => setIsStopModalOpen(false)}
        onSuccess={handleStopShiftSuccess}
        currentUserId={currentUser?.id}
      />
    </div>
  );
}
