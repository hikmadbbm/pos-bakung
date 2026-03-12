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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card className="bg-orange-50 border-orange-100 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-orange-800 uppercase tracking-wider">Break-even Point (Daily)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-orange-900">
            {formatIDR(data.expenses + data.cogs)}
          </div>
          <p className="text-[10px] text-orange-700 mt-1">
            Revenue needed today to cover all costs (COGS + Expenses + Fixed).
          </p>
        </CardContent>
      </Card>
      <Card className="bg-blue-50 border-blue-100 shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-bold text-blue-800 uppercase tracking-wider">Fixed Overhead Share</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-xl font-bold text-blue-900">
            {formatIDR(data.dailyOverhead)}
          </div>
          <p className="text-[10px] text-blue-700 mt-1">
            Allocated fixed costs for today (Rent, Salaries, etc.)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
