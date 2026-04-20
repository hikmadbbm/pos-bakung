"use client";
import React from "react";
import { formatIDR } from "../../lib/format";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../ui/table";
import { TrendingUp } from "lucide-react";
import { useTranslation } from "../../lib/language-context";
import { useDarkMode } from "../../lib/dark-mode-context";
import { cn } from "../../lib/utils";

export default function TopMenus({ menus = [], loading = false }) {
  const { t } = useTranslation();
  const { isDark } = useDarkMode();
  const [sortBy, setSortBy] = React.useState("profit"); // "profit" or "qty"

  if (loading) {
    return (
      <div className={cn("h-64 rounded-[1.5rem] animate-pulse", isDark ? "bg-[#161d25]" : "bg-slate-100/50")} />
    );
  }

  const sortedMenus = [...menus].sort((a, b) => b[sortBy] - a[sortBy]);

  return (
    <div className={cn(
      "rounded-[1.5rem] overflow-hidden min-h-[400px] flex flex-col",
      isDark
        ? "bg-[#161d25] border border-[rgba(255,255,255,0.06)]"
        : "bg-white border border-emerald-100/50 shadow-md"
    )}>
      <div className={cn(
        "p-5 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4",
        isDark ? "border-[rgba(255,255,255,0.05)] bg-[#1a2820]/50" : "border-emerald-50 bg-emerald-50/30"
      )}>
        <div>
          <h3 className={cn("text-[10px] font-black uppercase tracking-[0.2em]", isDark ? "text-emerald-400" : "text-emerald-900")}>
            {t("dashboard.performance_matrix")}
          </h3>
          <p className={cn("text-[9px] font-bold mt-0.5 uppercase", isDark ? "text-slate-600" : "text-emerald-700/60")}>
            {sortBy === "profit" ? t("dashboard.profit_yield_desc") : "Sorted by total units sold"}
          </p>
        </div>

        <div className="flex bg-slate-200/50 p-1 rounded-xl">
           {["profit", "qty"].map((mode) => (
             <button
               key={mode}
               onClick={() => setSortBy(mode)}
               className={cn(
                 "px-4 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                 sortBy === mode 
                  ? (isDark ? "bg-emerald-500 text-white shadow-lg" : "bg-white text-slate-900 shadow-sm") 
                  : (isDark ? "text-slate-400 hover:text-slate-200" : "text-slate-400 hover:text-slate-600")
               )}
             >
               {mode === "profit" ? "BY PROFIT" : "BY VOLUME"}
             </button>
           ))}
        </div>
      </div>
      <div className="overflow-x-auto flex-1 h-full">
        <Table>
          <TableHeader>
            <TableRow className={cn("border-b", isDark ? "border-[rgba(255,255,255,0.05)] hover:bg-transparent" : "bg-slate-50/30 hover:bg-slate-50/30 border-slate-100")}>
              <TableHead className={cn("font-black text-[10px] uppercase tracking-widest py-4 px-6", isDark ? "text-slate-600" : "text-slate-400")}>
                {t("dashboard.product")}
              </TableHead>
              <TableHead className={cn("font-black text-[10px] uppercase tracking-widest py-4 text-right", isDark ? "text-slate-600" : "text-slate-400")}>
                {t("dashboard.volume")}
              </TableHead>
              <TableHead className={cn("font-black text-[10px] uppercase tracking-widest py-4 text-right pr-6", isDark ? "text-slate-600" : "text-slate-400")}>
                {t("dashboard.profit_yield")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedMenus.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-20">
                  <div className="flex flex-col items-center gap-3">
                    <TrendingUp className={cn("w-8 h-8 opacity-20", isDark ? "text-emerald-600" : "text-emerald-200")} />
                    <p className={cn("text-[10px] font-black uppercase tracking-widest", isDark ? "text-slate-600" : "text-emerald-300")}>
                      {t("dashboard.awaiting_data")}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              sortedMenus.map((item) => (
                <TableRow
                  key={item.id}
                  className={cn(
                    "group transition-all duration-300",
                    isDark
                      ? "border-b border-[rgba(255,255,255,0.03)] hover:bg-emerald-900/10"
                      : "hover:bg-emerald-50/30"
                  )}
                >
                  <TableCell className={cn("font-black text-xs px-6 uppercase tracking-tight", isDark ? "text-slate-300" : "text-slate-700")}>
                    <div className="flex items-center gap-2">
                       {item.name}
                       {item.type === 'CONSIGNMENT' && (
                         <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 text-[7px] font-black border border-amber-500/20">TITIPAN</span>
                       )}
                    </div>
                  </TableCell>
                  <TableCell className={cn("text-right text-xs font-bold uppercase", isDark ? "text-slate-600 group-hover:text-emerald-400" : "text-slate-400 group-hover:text-emerald-900")}>
                    {item.qty} {t("dashboard.units")}
                  </TableCell>
                  <TableCell className={cn("text-right font-black text-sm pr-6", isDark ? "text-emerald-400" : "text-emerald-700")}>
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
