"use client";
import React from "react";
import { formatIDR } from "../../lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../ui/table";
import { TrendingUp } from "lucide-react";

export default function TopMenus({ menus = [], loading = false }) {
  if (loading) {
    return <div className="glass-card h-64 animate-pulse bg-slate-50/10 border-slate-100"></div>;
  }

  return (
    <div className="glass-card !p-0 overflow-hidden shadow-2xl border-emerald-100/50">
      <div className="p-6 border-b border-emerald-50 bg-emerald-50/30">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-900">Product Performance Matrix</h3>
        <p className="text-[9px] font-bold text-emerald-700/60 mt-1 uppercase">MENU ITEMS GENERATING MAXIMUM PROFIT YIELD</p>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/30 hover:bg-slate-50/30 border-b border-slate-100">
              <TableHead className="font-black text-[10px] text-slate-400 uppercase tracking-widest py-4 px-6">Product</TableHead>
              <TableHead className="font-black text-[10px] text-slate-400 uppercase tracking-widest py-4 text-right">Volume</TableHead>
              <TableHead className="font-black text-[10px] text-slate-400 uppercase tracking-widest py-4 text-right pr-6">Profit Yield</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {menus.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-20">
                   <div className="flex flex-col items-center gap-3">
                      <TrendingUp className="w-8 h-8 text-emerald-200 opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-300">Awaiting market demand data...</p>
                   </div>
                </TableCell>
              </TableRow>
            ) : (
              menus.map((item) => (
                <TableRow key={item.id} className="group hover:bg-emerald-50/30 transition-all duration-300">
                  <TableCell className="font-black text-xs text-slate-700 px-6 uppercase tracking-tight">{item.name}</TableCell>
                  <TableCell className="text-right text-xs font-bold text-slate-400 group-hover:text-emerald-900 transition-colors uppercase">{item.qty} units</TableCell>
                  <TableCell className="text-right font-black text-sm text-emerald-700 pr-6">
                    {formatIDR(item.profit)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
