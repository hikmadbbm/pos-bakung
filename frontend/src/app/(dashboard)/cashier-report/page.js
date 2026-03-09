"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { Banknote, CreditCard, Smartphone, Wallet, RefreshCw, Printer } from "lucide-react";
import { useToast } from "../../../components/ui/use-toast";

export default function CashierReportPage() {
  const { success, error } = useToast();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Actual counts (for reconciliation)
  const [actualCounts, setActualCounts] = useState({
    CASH: "",
    QRIS: "",
    DEBIT: "",
    CREDIT: "",
    TRANSFER: ""
    // Dynamic keys for platforms will be added
  });

  useEffect(() => {
    loadReport();
  }, [date, loadReport]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/analytics/cashier-report?date=${date}`);
      setReport(res);
    } catch (e) {
      console.error(e);
      error("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getDifference = (method) => {
    if (!report) return 0;
    const systemAmount = report.paymentMethods[method]?.amount || 0;
    const actualAmount = parseInt(actualCounts[method]) || 0;
    return actualAmount - systemAmount;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Cashier Report</h2>
          <p className="text-sm text-gray-500">Reconcile daily sales and close shift.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)}
            className="w-auto"
          />
          <Button variant="outline" onClick={loadReport}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print Report
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading report...</div>
      ) : !report ? (
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
                <CardTitle className="text-sm font-medium text-gray-500">Cash in Drawer</CardTitle>
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

          {/* Reconciliation Table */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Reconciliation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Method</TableHead>
                      <TableHead className="text-right">System Total</TableHead>
                      <TableHead className="text-right w-32 md:w-40 print:hidden">Actual Count</TableHead>
                      <TableHead className="text-right print:hidden">Difference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.keys(report.paymentMethods).map((method) => {
                      const data = report.paymentMethods[method];
                      const diff = getDifference(method);
                      if (data.count === 0 && !actualCounts[method]) return null;

                      return (
                        <TableRow key={method}>
                          <TableCell className="font-medium">{method}</TableCell>
                          <TableCell className="text-right">{formatIDR(data.amount)}</TableCell>
                          <TableCell className="print:hidden p-1">
                            <Input 
                              type="number" 
                              className="text-right h-8 w-full" 
                              placeholder="0"
                              value={actualCounts[method]}
                              onChange={(e) => setActualCounts({...actualCounts, [method]: e.target.value})}
                            />
                          </TableCell>
                          <TableCell className={`text-right font-bold print:hidden ${diff === 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {diff === 0 ? "MATCH" : formatIDR(diff)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-gray-50 font-bold">
                      <TableCell>TOTAL</TableCell>
                      <TableCell className="text-right">{formatIDR(report.summary.netSales)}</TableCell>
                      <TableCell className="print:hidden"></TableCell>
                      <TableCell className="print:hidden"></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Platform Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales by Platform</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Platform</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.keys(report.platforms).map((p) => (
                      <TableRow key={p}>
                        <TableCell>{p}</TableCell>
                        <TableCell className="text-right">{report.platforms[p].count}</TableCell>
                        <TableCell className="text-right">{formatIDR(report.platforms[p].amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="bg-blue-50 p-6 rounded-lg border border-blue-100 print:hidden">
              <h3 className="font-bold text-blue-800 mb-2">Shift Closing Checklist</h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-blue-700">
                <li>Count cash in drawer and verify against &quot;Cash in Drawer&quot; amount.</li>
                <li>Check EDC settlement for Debit/Credit totals.</li>
                <li>Verify QRIS settlement report.</li>
                <li>Ensure all delivery orders are completed.</li>
                <li>Print this report for physical records.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
