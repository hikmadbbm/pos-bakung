"use client";
import { useEffect, useState, useCallback } from "react";
import { api, getAuth } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { RefreshCw, Printer, Save, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { useToast } from "../../../components/ui/use-toast";
import { Textarea } from "../../../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../components/ui/dialog";

export default function ReportsPage() {
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  
  // General Reports State
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sales, setSales] = useState(null);
  const [profit, setProfit] = useState(null);
  const [menuPerf, setMenuPerf] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cashier Report State
  const [cashierDate, setCashierDate] = useState(new Date().toISOString().split('T')[0]);
  const [cashierReport, setCashierReport] = useState(null);
  const [loadingCashier, setLoadingCashier] = useState(false);
  const [actualCounts, setActualCounts] = useState({}); // { CASH: 100000, ... }
  const [reconNotes, setReconNotes] = useState("");
  const [submittingRecon, setSubmittingRecon] = useState(false);
  const [reconHistory, setReconHistory] = useState([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedRecon, setSelectedRecon] = useState(null);

  useEffect(() => {
    if (activeTab === "general") load();
    if (activeTab === "cashier") {
      loadCashierReport();
      loadReconHistory();
    }
  }, [activeTab, load, loadCashierReport, loadReconHistory]);

  useEffect(() => {
    if (activeTab === "cashier") loadCashierReport();
  }, [cashierDate, activeTab, loadCashierReport]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = (from || to) ? `?from=${from || ""}&to=${to || ""}` : "";
      const [s, p, m] = await Promise.all([
        api.get(`/reports/sales${qs}`),
        api.get(`/reports/profit${qs}`),
        api.get(`/reports/menu-performance${qs}`)
      ]);
      setSales(s);
      setProfit(p);
      setMenuPerf(m);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  const loadReconHistory = useCallback(async () => {
    try {
      const res = await api.get("/analytics/reconciliation-list");
      setReconHistory(res);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadCashierReport = useCallback(async () => {
    setLoadingCashier(true);
    try {
      const res = await api.get(`/analytics/cashier-report?date=${cashierDate}`);
      setCashierReport(res);
      
      // Initialize inputs from existing reconciliation or defaults
      const initialCounts = {};
      if (res.reconciliation && res.reconciliation.details) {
        // If already submitted, load saved values
        Object.entries(res.reconciliation.details).forEach(([method, data]) => {
          initialCounts[method] = data.actual;
        });
        setReconNotes(res.reconciliation.notes || "");
      } else {
        // Reset if no report
        setActualCounts({});
        setReconNotes("");
      }
      setActualCounts(initialCounts);
    } catch (e) {
      console.error(e);
      error("Failed to load cashier report");
    } finally {
      setLoadingCashier(false);
    }
  }, [cashierDate, error]);

  const handleActualChange = (method, value) => {
    setActualCounts(prev => ({
      ...prev,
      [method]: value
    }));
  };

  const handleSubmitReconciliation = () => {
    if (!cashierReport) return;
    setIsConfirmOpen(true);
  };

  const confirmSubmission = async () => {
    setIsConfirmOpen(false);
    setSubmittingRecon(true);
    try {
      // Construct details object
      const details = {};
      Object.entries(cashierReport.paymentMethods).forEach(([method, data]) => {
        // Only include active methods or methods with input
        if (data.count > 0 || actualCounts[method]) {
           details[method] = {
             system: data.amount,
             actual: parseInt(actualCounts[method]) || 0
           };
        }
      });

      const user = getAuth();
      await api.post("/analytics/reconciliation", {
        date: cashierDate,
        details,
        notes: reconNotes,
        submitted_by: user ? (user.username || user.name || "Admin") : "Admin"
      });
      
      success("Daily reconciliation report submitted successfully.");
      loadCashierReport(); // Reload to show submitted state
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Reports & Analytics</h1>
      </div>
      
      <div className="flex space-x-2 border-b overflow-x-auto">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "general" 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("general")}
        >
          General Reports
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "cashier" 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("cashier")}
        >
          Cashier Report
        </button>
      </div>

      {activeTab === "general" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Filters */}
          <Card>
        <CardContent className="pt-6">
          <div className="flex items-end gap-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Input 
                type="date" 
                value={from} 
                onChange={(e) => setFrom(e.target.value)} 
              />
            </div>
            <div className="space-y-2">
              <Label>To Date</Label>
              <Input 
                type="date" 
                value={to} 
                onChange={(e) => setTo(e.target.value)} 
              />
            </div>
            <Button onClick={load} disabled={loading}>
              {loading ? "Loading..." : "Apply Filter"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Sales Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sales ? (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Orders</span>
                  <span className="font-bold">{sales.total_orders}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Revenue</span>
                  <span className="font-bold text-green-600">{formatIDR(sales.revenue)}</span>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400">No data</div>
            )}
          </CardContent>
        </Card>

        {/* Profit Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Profit Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {profit ? (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-500">Revenue</span>
                  <span className="font-medium">{formatIDR(profit.revenue)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">COGS</span>
                  <span className="font-medium text-red-500">-{formatIDR(profit.cogs)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">Gross Profit</span>
                  <span className="font-bold">{formatIDR(profit.grossProfit)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 mt-2">
                  <span className="font-bold">Net Profit</span>
                  <span className={`font-bold ${profit.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatIDR(profit.netProfit)}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Menu Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Menu Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Menu Item</TableHead>
                <TableHead className="text-right">Qty Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {menuPerf.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">No data found.</TableCell>
                </TableRow>
              ) : (
                menuPerf.map((row) => (
                  <TableRow key={row.menu_id}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right">{row.qty}</TableCell>
                    <TableCell className="text-right">{formatIDR(row.revenue)}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {formatIDR(row.profit)}
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

      {activeTab === "cashier" && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 print:hidden">
            <div>
              <h2 className="text-lg font-bold tracking-tight">Daily Cashier Reconciliation</h2>
              <p className="text-sm text-gray-500">Reconcile daily sales and close shift.</p>
            </div>
            <div className="flex items-center gap-2">
              <Input 
                type="date" 
                value={cashierDate} 
                onChange={(e) => setCashierDate(e.target.value)}
                className="w-auto"
              />
              <Button variant="outline" onClick={loadCashierReport}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button onClick={() => window.print()}>
                <Printer className="w-4 h-4 mr-2" /> Print Report
              </Button>
            </div>
          </div>
          
          {/* Reconciliation Status List */}
          <div className="flex gap-2 overflow-x-auto pb-2 print:hidden">
            {reconHistory.map((r) => {
              const isSubmitted = r.status === "SUBMITTED";
              const rDate = new Date(r.date).toISOString().split('T')[0];
              const isCurrent = rDate === cashierDate;
              return (
                <button
                  key={r.id}
                  onClick={() => setCashierDate(rDate)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
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

          {loadingCashier ? (
            <div className="text-center py-10 text-gray-400">Loading report...</div>
          ) : !cashierReport ? (
            <div className="text-center py-10 text-gray-400">No data available.</div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Gross Sales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatIDR(cashierReport.summary.grossSales)}</div>
                    <p className="text-xs text-gray-500">{cashierReport.summary.totalOrders} Orders</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Net Sales</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatIDR(cashierReport.summary.netSales)}</div>
                    <p className="text-xs text-gray-500">After Discounts</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Cash in Drawer</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{formatIDR(cashierReport.cashInDrawer)}</div>
                    <p className="text-xs text-gray-500">System Calculated</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500">Commission</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{formatIDR(cashierReport.summary.totalCommission)}</div>
                    <p className="text-xs text-gray-500">Platform Fees</p>
                  </CardContent>
                </Card>
              </div>

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
                      {Object.entries(cashierReport.paymentMethods)
                        .filter(([method, data]) => data.count > 0 || actualCounts[method])
                        .map(([method, data]) => {
                          const actual = parseInt(actualCounts[method]) || 0;
                          const diff = actual - data.amount;
                          return (
                            <TableRow key={method}>
                              <TableCell className="font-medium">{method}</TableCell>
                              <TableCell className="text-right">{data.count}</TableCell>
                              <TableCell className="text-right">{formatIDR(data.amount)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end items-center gap-2">
                                  {parseInt(actualCounts[method]) > 0 && (
                                    <Button 
                                      size="icon" 
                                      variant="ghost" 
                                      className="h-6 w-6 text-green-600 hover:text-green-700 hover:bg-green-50"
                                      title="Verify Count"
                                      onClick={() => success(`Verified: ${method} amount confirmed at ${formatIDR(parseInt(actualCounts[method]))}`)}
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </Button>
                                  )}
                                  <span className="text-xs text-gray-400">Rp</span>
                                  <Input 
                                    className="w-32 h-8 text-right" 
                                    placeholder="0"
                                    type="number"
                                    value={actualCounts[method] || ""}
                                    onChange={(e) => handleActualChange(method, e.target.value)}
                                  />
                                </div>
                              </TableCell>
                              <TableCell className={`text-right font-mono ${diff !== 0 ? 'text-red-500 font-bold' : 'text-green-600'}`}>
                                {diff > 0 ? "+" : ""}{formatIDR(diff)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Notes & Submit */}
              <Card>
                <CardHeader>
                   <CardTitle>Reconciliation Notes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea 
                    placeholder="Enter any notes about discrepancies or shift details..."
                    value={reconNotes}
                    onChange={(e) => setReconNotes(e.target.value)}
                  />
                  <div className="flex justify-end pt-2">
                    <Button 
                      onClick={handleSubmitReconciliation} 
                      disabled={submittingRecon}
                      className="w-full md:w-auto"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {submittingRecon ? "Submitting..." : "Submit Reconciliation"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* History List */}
              <Card>
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
                        <TableHead className="text-right">Discrepancy</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reconHistory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-gray-400">No history found.</TableCell>
                        </TableRow>
                      ) : (
                        reconHistory.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell className="font-medium">
                              {new Date(report.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                            </TableCell>
                            <TableCell className="text-right">{formatIDR(report.total_system)}</TableCell>
                            <TableCell className="text-right">{formatIDR(report.total_actual)}</TableCell>
                            <TableCell className={`text-right font-bold ${report.discrepancy !== 0 ? "text-red-500" : "text-green-600"}`}>
                              {report.discrepancy > 0 ? "+" : ""}{formatIDR(report.discrepancy)}
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                                {report.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setSelectedRecon(report)}
                              >
                                View
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
        </div>
      )}

      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Submission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-600">
              Submit daily reconciliation? This will lock the report for today ({new Date(cashierDate).toLocaleDateString()}).
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
                Cancel
              </Button>
              <Button onClick={confirmSubmission}>
                Confirm
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reconciliation Detail Dialog */}
      <Dialog
        open={!!selectedRecon}
        onOpenChange={(open) => {
          if (!open) setSelectedRecon(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Reconciliation Details: {selectedRecon ? new Date(selectedRecon.date).toLocaleDateString() : ""}
            </DialogTitle>
          </DialogHeader>
          {selectedRecon && (
            <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase">System Total</p>
                <p className="font-bold text-lg">{formatIDR(selectedRecon.total_system)}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 uppercase">Actual Total</p>
                <p className="font-bold text-lg">{formatIDR(selectedRecon.total_actual)}</p>
              </div>
              <div className={`p-3 rounded-lg ${selectedRecon.discrepancy !== 0 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                <p className="text-xs uppercase opacity-75">Discrepancy</p>
                <p className="font-bold text-lg">{selectedRecon.discrepancy > 0 ? "+" : ""}{formatIDR(selectedRecon.discrepancy)}</p>
              </div>
            </div>

            <div className="border rounded-md overflow-hidden overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-2">Method</TableHead>
                    <TableHead className="text-right py-2">System</TableHead>
                    <TableHead className="text-right py-2">Actual</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedRecon.details && Object.entries(selectedRecon.details).map(([method, data]) => (
                    <TableRow key={method}>
                      <TableCell className="py-2 font-medium">{method}</TableCell>
                      <TableCell className="text-right py-2">{formatIDR(data.system)}</TableCell>
                      <TableCell className="text-right py-2">{formatIDR(data.actual)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {selectedRecon.notes && (
              <div className="bg-yellow-50 p-3 rounded-md border border-yellow-100 text-sm">
                <span className="font-bold text-yellow-800 block mb-1">Notes:</span>
                <p className="text-yellow-900">{selectedRecon.notes}</p>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t">
              <div className="text-xs text-gray-400">
                Submitted by {selectedRecon.submitted_by || "Unknown"}<br/>
                on {new Date(selectedRecon.updated_at).toLocaleString()}
              </div>
              <Button onClick={() => setSelectedRecon(null)}>Close</Button>
            </div>
          </div>
        )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
