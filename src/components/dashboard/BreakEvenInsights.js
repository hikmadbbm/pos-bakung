"use client";
import React from "react";
import { formatIDR } from "../../lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export default function BreakEvenInsights({ data, loading = false }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-24 bg-gray-100 rounded-lg animate-pulse"></div>
        <div className="h-24 bg-gray-100 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Card className="bg-orange-50/50 border-orange-100 shadow-sm border-l-4 border-l-orange-400">
        <CardHeader className="pb-1">
          <CardTitle className="text-[10px] font-bold text-orange-800 uppercase tracking-widest">Break-even Point (Daily)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black text-orange-900">
            {formatIDR(data.expenses + data.cogs)}
          </div>
          <p className="text-[10px] text-orange-700/80 mt-1 font-medium italic">
            Target to cover today's COGS & Expenses.
          </p>
        </CardContent>
      </Card>
      <Card className="bg-blue-50/50 border-blue-100 shadow-sm border-l-4 border-l-blue-400">
        <CardHeader className="pb-1">
          <CardTitle className="text-[10px] font-bold text-blue-800 uppercase tracking-widest">Fixed Overhead Share</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-black text-blue-900">
            {formatIDR(data.dailyOverhead || 0)}
          </div>
          <p className="text-[10px] text-blue-700/80 mt-1 font-medium italic">
            Allocated fixed costs (Rent, Salaries, Utilities).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
