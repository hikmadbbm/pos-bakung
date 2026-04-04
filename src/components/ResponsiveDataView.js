"use client";
import React from "react";
import { cn } from "../lib/utils";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./ui/table";

/**
 * ResponsiveDataView component
 * Automatically switches between Table implementation and Grid of Cards based on screen size.
 * 
 * @param {Array} data - The array of items to display
 * @param {Array} columns - Column definitions: { header: string, accessor: string|function, className: string, align: 'left'|'right'|'center' }
 * @param {Function} renderCard - Custom renderer for the mobile card view (optional, fallback to key-value pairs)
 * @param {Function} onRowClick - Optional row click handler
 * @param {string} emptyMessage - Message to show when data is empty
 * @param {boolean} loading - Loading state
 */
export function ResponsiveDataView({
  data = [],
  columns = [],
  renderCard,
  onRowClick,
  emptyMessage = "No items found",
  loading = false,
  className,
}) {
  if (loading) {
    return (
      <div className="space-y-4 p-4 lg:p-0">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
        <p className="font-semibold text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn("w-full transition-all duration-500", className)}>
      {/* Mobile Card View (hidden on lg) */}
      <div className="lg:hidden space-y-4 p-2">
        {data.map((item, idx) => (
          <div 
            key={item.id || idx} 
            onClick={() => onRowClick?.(item)}
            className={cn(
              "p-5 rounded-2xl border border-slate-100 shadow-sm bg-white active:scale-[0.99] transition-all",
              onRowClick && "cursor-pointer"
            )}
          >
            {renderCard ? (
              renderCard(item)
            ) : (
              <div className="space-y-3">
                {columns.map((col, cIdx) => (
                  <div key={cIdx} className="flex justify-between items-center gap-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{col.header}</span>
                    <span className={cn("text-sm font-semibold text-slate-800", col.className)}>
                      {typeof col.accessor === "function" ? col.accessor(item) : item[col.accessor]}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop/Tablet Table View (hidden on mobile) */}
      <div className="hidden lg:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto custom-scrollbar relative">
        <Table className="min-w-[1000px]">
          <TableHeader className="bg-slate-50/50">
            <TableRow className="hover:bg-transparent border-slate-100">
              {columns.map((col, idx) => (
                <TableHead 
                  key={idx} 
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider py-4 px-8 text-slate-500",
                    col.align === "right" && "text-right",
                    col.align === "center" && "text-center",
                    col.className
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item, idx) => (
              <TableRow 
                key={item.id || idx}
                onClick={() => onRowClick?.(item)}
                className={cn(
                  "hover:bg-white/80 border-slate-50 transition-all group",
                  onRowClick && "cursor-pointer"
                )}
              >
                {columns.map((col, cIdx) => (
                  <TableCell 
                    key={cIdx} 
                    className={cn(
                      "py-4 px-8 text-sm font-medium text-slate-600 transition-colors group-hover:text-slate-900",
                      col.align === "right" && "text-right",
                      col.align === "center" && "text-center",
                      col.className
                    )}
                  >
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
