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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">Sales Reports</h2>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
            Analysis of your business performance
            <span className="inline-block w-1.5 h-1.5 bg-emerald-600 rounded-full" />
          </p>
        </div>
      </div>
      
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* Filters */}
        <div className="glass-card rounded-[2.5rem] p-6 md:p-8 shadow-2xl border-none">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-6 items-end">
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">From</Label>
              <Input 
                type="date" 
                value={from} 
                onChange={(e) => setFrom(e.target.value)} 
                className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-black"
              />
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">To</Label>
              <Input 
                type="date" 
                value={to} 
                onChange={(e) => setTo(e.target.value)} 
                className="h-14 rounded-2xl border-slate-100 bg-slate-50 font-black"
              />
            </div>
            <Button onClick={load} disabled={loading} className="h-14 px-10 rounded-2xl font-black uppercase tracking-wider bg-slate-900 text-white hover:bg-black shadow-xl active:scale-95 transition-all">
              {loading ? "Update..." : "Update"}
            </Button>
          </div>
        </div>

        <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
          {/* Sales Summary */}
          <div className="glass-card rounded-[2.5rem] p-8 space-y-6 shadow-2xl border-none relative overflow-hidden bg-white">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600/5 rounded-full -translate-y-1/2 translate-x-1/2" />
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                Total Sales
             </h3>
              {sales ? (
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Orders</p>
                    <p className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">{sales.total_orders}</p>
                  </div>
                  <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">Revenue</p>
                    <p className="text-3xl font-black text-emerald-600 tracking-tighter tabular-nums">{formatIDR(sales.revenue)}</p>
                  </div>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl text-[10px] font-black text-slate-300 uppercase tracking-widest">No Data</div>
              )}
          </div>

          {/* Profit Summary */}
          <div className="glass-card rounded-[2.5rem] p-8 space-y-6 shadow-2xl border-none relative overflow-hidden bg-white">
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full -translate-y-1/2 translate-x-1/2" />
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
                Earnings
             </h3>
              {profit ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Revenue</span>
                    <span className="font-black text-slate-700 tabular-nums">{formatIDR(profit.revenue)}</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-rose-50 rounded-2xl border border-rose-100">
                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Cost of Goods</span>
                    <span className="font-black text-rose-500 tabular-nums">-{formatIDR(profit.cogs)}</span>
                  </div>
                  <div className="flex justify-between items-center p-6 bg-slate-900 rounded-[1.5rem] shadow-xl mt-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net Earnings</span>
                    <span className={cn("text-xl font-black tracking-tight tabular-nums", profit.netProfit >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {formatIDR(profit.netProfit)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-100 rounded-2xl text-[10px] font-black text-slate-300 uppercase tracking-widest">No Data</div>
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
                header: "Product",
                accessor: (row) => <span className="font-black text-slate-900 uppercase tracking-tight">{row.name}</span>,
                className: "pl-10"
              },
              {
                header: "Qty",
                accessor: (row) => <span className="font-bold text-slate-600 tabular-nums">{row.qty}</span>,
                align: "right"
              },
              {
                header: "Revenue",
                accessor: (row) => <span className="font-medium text-slate-400 tabular-nums">{formatIDR(row.revenue)}</span>,
                align: "right"
              },
              {
                header: "Profit",
                accessor: (row) => <span className="font-black text-emerald-600 tabular-nums">{formatIDR(row.profit)}</span>,
                align: "right",
                className: "pr-10"
              }
            ]}
            renderCard={(row) => (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <p className="font-black text-slate-900 uppercase tracking-tight text-lg">{row.name}</p>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Sold</p>
                    <p className="font-black text-slate-900 text-xl tabular-nums tracking-tighter">{row.qty}</p>
                  </div>
                </div>
                <div className="flex justify-between items-end border-t border-slate-50 pt-4">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Revenue</p>
                    <p className="font-bold text-slate-400 text-sm tabular-nums">{formatIDR(row.revenue)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Profit</p>
                    <p className="font-black text-emerald-600 text-lg tabular-nums tracking-tighter">{formatIDR(row.profit)}</p>
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
