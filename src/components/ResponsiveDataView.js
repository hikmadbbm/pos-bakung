"use client";
import React from "react";
import { cn } from "../lib/utils";
import { Skeleton } from "./ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Inbox } from "lucide-react";

/**
 * ResponsiveDataView component
 * Automatically switches between Table implementation and Grid of Cards based on screen size.
 */
export function ResponsiveDataView({
  data = [],
  columns = [],
  renderCard,
  onRowClick,
  emptyMessage = "No items found",
  loading = false,
  className,
  sortable = true,
  initialSort = { key: null, direction: 'asc' }
}) {
  const [sortConfig, setSortConfig] = React.useState(initialSort);

  // Sorting Logic
  const sortedData = React.useMemo(() => {
    let sortableItems = [...data];
    const { key, direction } = sortConfig;
    if (!key) return sortableItems;

    sortableItems.sort((a, b) => {
      let aValue, bValue;
      const column = columns.find(c => 
        (typeof c.accessor === 'string' && c.accessor === key) || 
        (c.header === key)
      );
      if (!column) return 0;
      const getNestedValue = (obj, path) => {
        if (!path) return undefined;
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
      };
      if (column.sortKey) {
        aValue = getNestedValue(a, column.sortKey);
        bValue = getNestedValue(b, column.sortKey);
      } else if (typeof column.accessor === 'string') {
        aValue = getNestedValue(a, column.accessor);
        bValue = getNestedValue(b, column.accessor);
      } else if (typeof column.accessor === "function") {
        aValue = column.accessor(a);
        bValue = column.accessor(b);
      }
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;
      const aDate = new Date(aValue);
      const bDate = new Date(bValue);
      if (!isNaN(aDate.getTime()) && !isNaN(bDate.getTime()) && typeof aValue !== 'number') {
        return direction === 'asc' ? aDate.getTime() - bDate.getTime() : bDate.getTime() - aDate.getTime();
      }
      const cleanNum = (val) => {
        if (typeof val === 'number') return val;
        if (typeof val !== 'string') return NaN;
        return parseFloat(val.replace(/[^\d.-]/g, ''));
      };
      const aNum = cleanNum(aValue);
      const bNum = cleanNum(bValue);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return direction === 'asc' ? aNum - bNum : bNum - aNum;
      }
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      return direction === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
    return sortableItems;
  }, [data, sortConfig, columns]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  if (loading) {
    return (
      <div className={cn("w-full space-y-4", className)}>
        <div className="lg:hidden space-y-4 p-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-6 rounded-2xl border border-slate-100 bg-white space-y-4">
              <Skeleton className="h-4 w-1/2" />
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden lg:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="bg-slate-50/50 border-b border-slate-100 p-8 flex gap-8">
            {columns.map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-8 border-b border-slate-50 flex gap-8">
              {columns.map((_, j) => (
                <Skeleton key={j} className="h-10 flex-1 rounded-xl" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 sm:p-24 text-slate-500 bg-white/50 rounded-2xl border-2 border-dashed border-slate-100 animate-in fade-in zoom-in duration-700">
        <div className="w-20 h-20 rounded-full bg-slate-50 flex items-center justify-center mb-6 shadow-2xl shadow-slate-200/50 border border-slate-100 relative group">
           <div className="absolute inset-0 bg-emerald-500/5 rounded-full animate-pulse scale-125" />
           <Inbox className="w-10 h-10 text-slate-200 group-hover:scale-110 group-hover:text-emerald-500/40 transition-all duration-500" />
        </div>
        <div className="text-center max-w-sm space-y-3">
           <h3 className="font-[900] text-slate-900 uppercase tracking-tighter italic text-xl">No transactions found</h3>
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-relaxed px-4">
             {emptyMessage || "We couldn't find any records for the selected filters. Try adjusting your search keywords or date range."}
           </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full transition-all duration-500", className)}>
      <div className="lg:hidden space-y-4 p-2">
        {sortedData.map((item, idx) => (
          <div key={item.id || idx} onClick={() => onRowClick?.(item)} className={cn("p-5 rounded-2xl border border-slate-100 shadow-sm bg-white active:scale-[0.99] transition-all", onRowClick && "cursor-pointer")}>
            {renderCard ? renderCard(item) : (
              <div className="space-y-3">
                {columns.map((col, cIdx) => (
                  <div key={cIdx} className="flex justify-between items-center gap-4">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{col.header}</span>
                    <span className={cn("text-sm font-semibold text-slate-800", col.className)}>{typeof col.accessor === "function" ? col.accessor(item) : item[col.accessor]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="hidden lg:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto custom-scrollbar relative">
        <Table className="min-w-[1000px]">
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-slate-100">
              {columns.map((col, idx) => (
                <TableHead key={idx} onClick={() => sortable && col.sortable !== false && requestSort(typeof col.accessor === 'string' ? col.accessor : col.header)} className={cn("text-xs font-bold uppercase tracking-wider py-4 px-8 text-slate-600 transition-colors", sortable && col.sortable !== false && "cursor-pointer hover:bg-slate-100/50 hover:text-slate-900", col.align === "right" && "text-right", col.align === "center" && "text-center", col.className)}>
                  <div className={cn("flex items-center gap-2", col.align === "right" && "justify-end", col.align === "center" && "justify-center")}>
                    {col.header}
                    {sortable && col.sortable !== false && (
                      <div className="text-slate-300">
                        {sortConfig.key === (typeof col.accessor === 'string' ? col.accessor : col.header) ? (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-emerald-500" /> : <ArrowDown className="w-3 h-3 text-emerald-500" />) : (<ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100" />)}
                      </div>
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((item, idx) => (
              <TableRow key={item.id || idx} onClick={() => onRowClick?.(item)} className={cn("hover:bg-white/80 border-slate-50 transition-all group", onRowClick && "cursor-pointer")}>
                {columns.map((col, cIdx) => (
                  <TableCell key={cIdx} className={cn("py-4 px-8 text-sm font-medium text-slate-600 transition-colors group-hover:text-slate-900", col.align === "right" && "text-right", col.align === "center" && "text-center", col.className)}>
                    {typeof col.accessor === "function" ? col.accessor(item) : item[col.accessor]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
