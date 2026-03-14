"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { Button } from "../../../components/ui/button";

export default function ReportsPage() {
  // General Reports State
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sales, setSales] = useState(null);
  const [profit, setProfit] = useState(null);
  const [menuPerf, setMenuPerf] = useState([]);
  const [loading, setLoading] = useState(false);

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

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">General Reports</h1>
      </div>
      
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input 
                  type="date" 
                  value={from} 
                  onChange={(e) => setFrom(e.target.value)} 
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input 
                  type="date" 
                  value={to} 
                  onChange={(e) => setTo(e.target.value)} 
                  className="w-full"
                />
              </div>
              <Button onClick={load} disabled={loading} className="w-full">
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
                {!(menuPerf?.length > 0) ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">No data found.</TableCell>
                  </TableRow>
                ) : (
                  menuPerf?.map((row) => (
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
    </div>
  );
}
