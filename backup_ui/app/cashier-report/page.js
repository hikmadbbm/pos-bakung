"use client";
import { useEffect, useState, useCallback } from "react";
import { api, getAuth } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { RefreshCw, Printer, Save, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "../../../components/ui/use-toast";
import { Textarea } from "../../../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../components/ui/dialog";

export default function CashierReportPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [date, setDate] = useState("");

  // Hydration-safe date initialization
  useEffect(() => {
    setDate(new Date().toISOString().split('T')[0]);
  }, []);

  // Actual counts (for reconciliation)
  const [actualCounts, setActualCounts] = useState({});
  const [reconNotes, setReconNotes] = useState("");
  const [submittingRecon, setSubmittingRecon] = useState(false);
  const [reconHistory, setReconHistory] = useState([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedRecon, setSelectedRecon] = useState(null);

  const loadReport = useCallback(async () => {
    if (!date) return;
    setLoading(true);
    try {
      const res = await api.get(`/analytics/cashier-report?date=${date}`);
      setReport(res);
      
      // Initialize inputs from existing reconciliation or defaults
      const initialCounts = {};
      if (res.reconciliation && res.reconciliation.details) {
        Object.entries(res.reconciliation.details).forEach(([method, data]) => {
          initialCounts[method] = data.actual;
        });
        setReconNotes(res.reconciliation.notes || "");
      } else {
        setActualCounts({});
        setReconNotes("");
      }
      setActualCounts(initialCounts);
    } catch (e) {
      console.error(e);
      error("Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [date, error]);

  const loadReconHistory = useCallback(async () => {
    try {
      const res = await api.get("/analytics/reconciliation-list");
      setReconHistory(res);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (date) {
      loadReport();
      loadReconHistory();
    }
  }, [date, loadReport, loadReconHistory]);

  const handlePrint = () => {
    window.print();
  };

  const handleActualChange = (method, value) => {
    setActualCounts(prev => ({
      ...prev,
      [method]: value
    }));
  };

  const handleSubmitReconciliation = () => {
    if (!report) return;
    setIsConfirmOpen(true);
  };

  const confirmSubmission = async () => {
    setIsConfirmOpen(false);
    setSubmittingRecon(true);
    try {
      const details = {};
      Object.entries(report.paymentMethods).forEach(([method, data]) => {
        if (data.count > 0 || actualCounts[method]) {
           details[method] = {
             system: data.amount,
             actual: parseInt(actualCounts[method]) || 0
           };
        }
      });

      const user = getAuth();
      await api.post("/analytics/reconciliation", {
        date: date,
        details,
        notes: reconNotes,
        submitted_by: user ? (user.username || user.name || "Admin") : "Admin"
      });
      
      success("Daily reconciliation report submitted successfully.");
      loadReport(); 
      loadReconHistory();
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.error || e.message || "Failed to submit reconciliation";
      error(msg);
    } finally {
      setSubmittingRecon(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cashier Reconciliation</h2>
          <p className="text-sm text-gray-500">Reconcile daily sales and manage history.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <Input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            className="w-full md:w-auto"
          />
          <div className="flex gap-2 w-full md:w-auto">
            <Button variant="outline" onClick={loadReport} className="flex-1 md:flex-none">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button onClick={handlePrint} className="flex-[2] md:flex-none">
              <Printer className="w-4 h-4 mr-2" /> Print Report
            </Button>
          </div>
        </div>
      </div>

      {/* Reconciliation Status Quick List */}
      <div className="flex gap-2 overflow-x-auto pb-2 print:hidden">
        {(Array.isArray(reconHistory) ? reconHistory : []).map((r) => {
          const isSubmitted = r?.status === "SUBMITTED";
          const rDate = r?.date ? new Date(r.date).toISOString().split('T')[0] : "";
          const isCurrent = rDate === date;
          return (
            <button
              key={r.id}
              onClick={() => setDate(rDate)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors whitespace-nowrap ${
                isCurrent ? 'ring-2 ring-blue-500 ring-offset-1' : ''
              } ${
                isSubmitted ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
              }`}
            >
              {isSubmitted ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
              <span>{new Date(r.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading report...</div>
      ) : !report ? (
        <div className="text-center py-10 text-gray-400 border border-dashed rounded-lg py-20 bg-gray-50">
          No data available for {new Date(date).toLocaleDateString()}.
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-500">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Gross Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatIDR(report.summary.grossSales)}</div>
                <p className="text-xs text-gray-500">{report.summary.totalOrders} Orders</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Net Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{formatIDR(report.summary.netSales)}</div>
                <p className="text-xs text-gray-500">After Discounts</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Cash Expectation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{formatIDR(report.cashInDrawer)}</div>
                <p className="text-xs text-gray-500">System Expected</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Final Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{formatIDR(report.summary.finalRevenue)}</div>
                <p className="text-xs text-gray-500">Net - Commission</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Payment Method Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment Reconciliation</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Payment Method</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead className="text-right">System Total</TableHead>
                        <TableHead className="text-right">Actual Count</TableHead>
                        <TableHead className="text-right">Difference</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(report.paymentMethods || {})
                        .filter(([method, data]) => data.count > 0 || actualCounts[method])
                        .map(([method, data]) => {
                          const actual = parseInt(actualCounts[method]) || 0;
                          const diff = actual - data.amount;
                          return (
                            <TableRow key={method}>
                              <TableCell className="font-medium italic">{method}</TableCell>
                              <TableCell className="text-right">{data.count}</TableCell>
                              <TableCell className="text-right font-mono">{formatIDR(data.amount)}</TableCell>
                              <TableCell className="text-right print:hidden">
                                <div className="flex justify-end items-center gap-2">
                                  {actual > 0 && (
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                  )}
                                  <span className="text-[10px] text-gray-400">Rp</span>
                                  <Input 
                                    className="w-28 h-8 text-right font-bold" 
                                    placeholder="0"
                                    type="number"
                                    value={actualCounts[method] || ""}
                                    onChange={(e) => handleActualChange(method, e.target.value)}
                                  />
                                </div>
                              </TableCell>
                              <TableCell className={`text-right font-mono font-bold ${diff !== 0 ? 'text-red-500' : 'text-green-600'}`}>
                                {diff > 0 ? "+" : ""}{formatIDR(diff)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Shift History Section */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle>Shift Records</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cashier</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead className="text-right">Sales</TableHead>
                        <TableHead className="text-right">Discrepancy</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {!(report.shifts?.length > 0) ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-6 text-gray-400">No closed shifts recorded for this day.</TableCell>
                        </TableRow>
                      ) : (
                        report.shifts.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">
                              {s.user?.name || s.user?.username || "Unknown"}
                            </TableCell>
                            <TableCell className="text-xs text-gray-500">
                              {new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                              {s.end_time ? new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Active"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {formatIDR(s.total_sales || 0)}
                            </TableCell>
                            <TableCell className={`text-right font-bold text-xs ${s.discrepancy !== 0 ? "text-red-500" : "text-green-600"}`}>
                              {s.discrepancy > 0 ? "+" : ""}{formatIDR(s.discrepancy || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 text-[10px]"
                                onClick={() => setSelectedRecon({
                                  ...s.reconciliation_data,
                                  date: s.end_time,
                                  submitted_by: s.user?.name || s.user?.username,
                                  total_system: s.expected_cash,
                                  total_actual: s.ending_cash,
                                  discrepancy: s.discrepancy,
                                  notes: s.note,
                                  updated_at: s.end_time
                                })}
                              >
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Notes & Submission */}
              <Card className="print:hidden">
                <CardHeader>
                   <CardTitle>Reconciliation Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea 
                    placeholder="Enter any notes about discrepancies or cashier handovers..."
                    className="min-h-[100px]"
                    value={reconNotes}
                    onChange={(e) => setReconNotes(e.target.value)}
                  />
                  <div className="flex justify-end pt-2">
                    <Button 
                      onClick={handleSubmitReconciliation} 
                      disabled={submittingRecon}
                      className="w-full md:w-auto gap-2 py-6 md:py-2"
                    >
                      <Save className="w-4 h-4" />
                      {submittingRecon ? "Submitting..." : "Submit Reconciliation"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              {/* Sales by Platform */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-bold">Platform Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Platform</TableHead>
                        <TableHead className="text-right text-xs">Orders</TableHead>
                        <TableHead className="text-right text-xs">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.keys(report.platforms || {}).map((p) => (
                        <TableRow key={p}>
                          <TableCell className="text-xs font-medium">{p}</TableCell>
                          <TableCell className="text-right text-xs">{report.platforms[p].count}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{formatIDR(report.platforms[p].amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 print:hidden">
                <h3 className="font-bold text-blue-800 text-sm mb-2">Shift Closing Reminder</h3>
                <ul className="space-y-2 text-xs text-blue-700 font-medium">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>Count physical cash in the drawer.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>Compare EDC settlements per method.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>Provide reasons for any discrepancy.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 mt-0.5 shrink-0" />
                    <span>Submit to lock the daily report.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* History List */}
          <Card className="print:hidden">
            <CardHeader>
               <CardTitle>Recent Reconciliation History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">System Total</TableHead>
                    <TableHead className="text-right">Actual Total</TableHead>
                    <TableHead className="text-right">Difference</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!(reconHistory?.length > 0) ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-gray-400">No history found.</TableCell>
                    </TableRow>
                  ) : (
                    reconHistory?.map((report) => (
                      <TableRow key={report.id}>
                        <TableCell className="font-medium text-xs">
                          {new Date(report.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </TableCell>
                        <TableCell className="text-right text-xs font-mono">{formatIDR(report.total_system)}</TableCell>
                        <TableCell className="text-right text-xs font-mono">{formatIDR(report.total_actual)}</TableCell>
                        <TableCell className={`text-right font-bold text-xs ${report.discrepancy !== 0 ? "text-red-500" : "text-green-600"}`}>
                          {report.discrepancy > 0 ? "+" : ""}{formatIDR(report.discrepancy)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200 uppercase whitespace-nowrap">
                            {report.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 text-xs"
                            onClick={() => setSelectedRecon(report)}
                          >
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              Submit daily reconciliation for **{new Date(date).toLocaleDateString()}**?
              This will finalize the records for this day.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
            <Button onClick={confirmSubmission}>Confirm & Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reconciliation Detail Dialog */}
      <Dialog
        open={!!selectedRecon}
        onOpenChange={(open) => { if (!open) setSelectedRecon(null); }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Reconciliation Detail: {selectedRecon ? new Date(selectedRecon.date).toLocaleDateString() : ""}
            </DialogTitle>
          </DialogHeader>
          {selectedRecon && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">System Total</p>
                  <p className="font-bold text-lg">{formatIDR(selectedRecon.total_system)}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Actual Total</p>
                  <p className="font-bold text-lg text-blue-600">{formatIDR(selectedRecon.total_actual)}</p>
                </div>
                <div className={`p-3 rounded-lg ${selectedRecon.discrepancy !== 0 ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-green-50 text-green-700 border border-green-100'}`}>
                  <p className="text-[10px] uppercase font-bold tracking-wider opacity-75">Discrepancy</p>
                  <p className="font-bold text-lg">{selectedRecon.discrepancy > 0 ? "+" : ""}{formatIDR(selectedRecon.discrepancy)}</p>
                </div>
              </div>

              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader className="bg-gray-50">
                    <TableRow>
                      <TableHead className="py-2">Method</TableHead>
                      <TableHead className="text-right py-2">System Expected</TableHead>
                      <TableHead className="text-right py-2">Actual Counted</TableHead>
                      <TableHead className="text-right py-2">Difference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedRecon.details && Object.entries(selectedRecon.details).map(([method, data]) => {
                      const diff = data.actual - data.system;
                      return (
                        <TableRow key={method}>
                          <TableCell className="py-2 font-medium text-sm italic">{method}</TableCell>
                          <TableCell className="text-right py-2 font-mono text-sm">{formatIDR(data.system)}</TableCell>
                          <TableCell className="text-right py-2 font-mono text-sm font-bold">{formatIDR(data.actual)}</TableCell>
                          <TableCell className={`text-right py-2 font-mono text-sm font-bold ${diff !== 0 ? 'text-red-500' : 'text-green-600'}`}>
                            {diff > 0 ? "+" : ""}{formatIDR(diff)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {selectedRecon.notes && (
                <div className="bg-yellow-50 p-3 rounded-md border border-yellow-105 text-sm">
                  <span className="font-bold text-yellow-800 block mb-1 uppercase text-[10px]">Manager/Cashier Notes:</span>
                  <p className="text-gray-700 leading-relaxed italic">{selectedRecon.notes}</p>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-[10px] text-gray-400 font-medium">
                  Submitted by <span className="text-gray-600 font-bold">{selectedRecon.submitted_by || "Unknown"}</span><br/>
                  on {new Date(selectedRecon.updated_at).toLocaleString()}
                </div>
                <Button onClick={() => setSelectedRecon(null)}>Close Details</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
