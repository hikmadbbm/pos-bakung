"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { Button } from "../../../components/ui/button";
import { BarChart, ShoppingCart } from "lucide-react";
import { cn } from "../../../lib/utils";

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
    <div className="space-y-10 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">General Reports</h2>
          <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
            Historical sales and profit analysis
            <span className="inline-block w-1 h-1 bg-emerald-600 rounded-full" />
          </p>
        </div>
      </div>
      
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Filters */}
        <div className="glass-card rounded-[2.5rem] p-8 shadow-2xl border-none">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-6 items-end">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Range Start</Label>
              <Input 
                type="date" 
                value={from} 
                onChange={(e) => setFrom(e.target.value)} 
                className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:ring-emerald-600/10 transition-all font-bold"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Range End</Label>
              <Input 
                type="date" 
                value={to} 
                onChange={(e) => setTo(e.target.value)} 
                className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 focus:ring-emerald-600/10 transition-all font-bold"
              />
            </div>
            <Button onClick={load} disabled={loading} className="h-12 px-10 rounded-2xl font-black uppercase tracking-wider bg-slate-900 text-white hover:bg-slate-800 shadow-xl active:scale-95 transition-all">
              {loading ? "FETCHING..." : "APPLY FILTER"}
            </Button>
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Sales Summary */}
          <div className="glass-card rounded-[2.5rem] p-8 space-y-6 shadow-2xl border-none relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-full -translate-y-1/2 translate-x-1/2" />
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                Sales Summary
             </h3>
              {sales ? (
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Orders</p>
                    <p className="text-4xl font-black text-slate-900 tracking-tighter">{sales.total_orders}</p>
                  </div>
                  <div className="p-6 bg-emerald-50/30 rounded-2xl border border-emerald-100/50">
                    <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">Total Revenue</p>
                    <p className="text-3xl font-black text-emerald-600 tracking-tighter">{formatIDR(sales.revenue)}</p>
                  </div>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl text-[10px] font-black text-slate-300 uppercase tracking-widest">No Sales Data</div>
              )}
          </div>

          {/* Profit Summary */}
          <div className="glass-card rounded-[2.5rem] p-8 space-y-6 shadow-2xl border-none relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -translate-y-1/2 translate-x-1/2" />
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                Profitability
             </h3>
              {profit ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue</span>
                    <span className="font-black text-slate-700">{formatIDR(profit.revenue)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-rose-50/50 rounded-2xl border border-rose-100/30">
                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">COGS (HPP)</span>
                    <span className="font-black text-rose-500">-{formatIDR(profit.cogs)}</span>
                  </div>
                  <div className="flex justify-between items-center p-6 bg-slate-900 rounded-[1.5rem] shadow-xl shadow-slate-200 mt-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Profit</span>
                    <span className={cn("text-xl font-black tracking-tight", profit.netProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {formatIDR(profit.netProfit)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl text-[10px] font-black text-slate-300 uppercase tracking-widest">No Profit Data</div>
              )}
          </div>
        </div>

        {/* Menu Performance */}
        <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl border-none p-0">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                 <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                   <BarChart className="w-5 h-5 text-emerald-600" />
                 </div>
                 Product Affinity
              </h3>
          </div>
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="text-[10px] font-black uppercase text-slate-500 py-5 px-8">Menu Item</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500 py-5 text-right">Sold</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500 py-5 text-right">Revenue</TableHead>
                <TableHead className="text-[10px] font-black uppercase text-slate-500 py-5 text-right px-8">Gross Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!(menuPerf?.length > 0) ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-20">
                     <div className="flex flex-col items-center gap-3 opacity-20">
                        <ShoppingCart className="w-12 h-12" />
                        <p className="font-black uppercase tracking-widest text-xs">No records found</p>
                     </div>
                  </TableCell>
                </TableRow>
              ) : (
                menuPerf?.map((row) => (
                  <TableRow key={row.menu_id} className="hover:bg-slate-50/50 border-slate-100 transition-colors">
                    <TableCell className="px-8 py-5 font-black text-slate-900 uppercase tracking-tight">{row.name}</TableCell>
                    <TableCell className="text-right font-bold text-slate-600">{row.qty}</TableCell>
                    <TableCell className="text-right font-medium text-slate-400">{formatIDR(row.revenue)}</TableCell>
                    <TableCell className="text-right font-black text-emerald-600 px-8">
                      {formatIDR(row.profit)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
