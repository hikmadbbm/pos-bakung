"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";
import { BarChart, ShoppingCart, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { cn } from "../../../lib/utils";
import { ResponsiveDataView } from "../../../components/ResponsiveDataView";

export default function ReportsPage() {
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
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20 px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Sales Reports</h2>
          <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-2">
            Analysis of your business performance
            <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full" />
          </p>
        </div>
      </div>
      
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Filters */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 ml-1">From Date</Label>
              <Input 
                type="date" 
                value={from} 
                onChange={(e) => setFrom(e.target.value)} 
                className="h-11 rounded-xl border-slate-100 bg-slate-50 font-bold text-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-600 ml-1">To Date</Label>
              <Input 
                type="date" 
                value={to} 
                onChange={(e) => setTo(e.target.value)} 
                className="h-11 rounded-xl border-slate-100 bg-slate-50 font-bold text-slate-800"
              />
            </div>
            <Button onClick={load} disabled={loading} className="h-11 px-8 rounded-xl bg-slate-900 text-white font-bold text-xs">
              {loading ? "Updating..." : "Update View"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
              {/* Sales Summary */}
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden">
                 <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    Performance Summary
                 </h3>
                  {sales ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-50">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Total Orders</p>
                        <p className="text-xl sm:text-2xl font-bold text-slate-800 tabular-nums">{sales.total_orders}</p>
                      </div>
                      <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-50 overflow-hidden">
                        <p className="text-[9px] font-bold text-emerald-600/60 uppercase tracking-wider mb-1">Gross Revenue</p>
                        <p className="text-lg sm:text-2xl font-bold text-emerald-600 tabular-nums truncate whitespace-nowrap">{formatIDR(sales.revenue)}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 flex items-center justify-center border border-dashed border-slate-100 rounded-xl text-[10px] font-bold text-slate-300 uppercase">No Data</div>
                  )}
              </div>

          {/* Profit Summary */}
          <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm relative overflow-hidden">
             <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
                Profit Analysis
             </h3>
              {profit ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-3 py-2 bg-slate-50 rounded-lg">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Revenue</span>
                    <span className="text-sm font-bold text-slate-700 tabular-nums">{formatIDR(profit.revenue)}</span>
                  </div>
                  <div className="flex justify-between items-center px-3 py-2 bg-rose-50 rounded-lg">
                    <span className="text-[9px] font-bold text-rose-400 uppercase tracking-wider">Cost of Goods</span>
                    <span className="text-sm font-bold text-rose-500 tabular-nums">-{formatIDR(profit.cogs)}</span>
                  </div>
                  <div className="flex justify-between items-center px-4 py-3 bg-slate-900 rounded-xl mt-2">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Net Profit</span>
                    <span className={cn("text-lg font-bold tabular-nums", profit.netProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {formatIDR(profit.netProfit)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center border border-dashed border-slate-100 rounded-xl text-[10px] font-bold text-slate-300 uppercase">No Data</div>
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
                 Best Sellers
              </h3>
          </div>
          <ResponsiveDataView
            loading={loading}
            data={menuPerf}
            emptyMessage="No best sellers found"
            columns={[
              {
                header: "Product Name",
                accessor: (row) => <span className="font-bold text-slate-800 text-sm">{row.name}</span>,
                className: "pl-8"
              },
              {
                header: "Qty Sold",
                accessor: (row) => <span className="font-semibold text-slate-500 tabular-nums">{row.qty}</span>,
                align: "right"
              },
              {
                header: "Gross Rev.",
                accessor: (row) => <span className="font-medium text-slate-400 tabular-nums">{formatIDR(row.revenue)}</span>,
                align: "right"
              },
              {
                header: "Total Profit",
                accessor: (row) => <span className="font-bold text-emerald-600 tabular-nums">{formatIDR(row.profit)}</span>,
                align: "right",
                className: "pr-8"
              }
            ]}
            renderCard={(row) => (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <p className="font-bold text-slate-800 text-base">{row.name}</p>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Sold</p>
                    <p className="font-bold text-slate-800 text-lg tabular-nums tracking-tight">{row.qty}</p>
                  </div>
                </div>
                <div className="flex justify-between items-end border-t border-slate-50 pt-4">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Gross Revenue</p>
                    <p className="font-semibold text-slate-500 text-sm tabular-nums">{formatIDR(row.revenue)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Net Profit</p>
                    <p className="font-bold text-emerald-600 text-base tabular-nums tracking-tight">{formatIDR(row.profit)}</p>
                  </div>
                </div>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  );
}
