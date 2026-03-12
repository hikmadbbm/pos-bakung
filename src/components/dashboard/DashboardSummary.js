"use client";
import React from "react";
import { formatIDR } from "../../lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { DollarSign, Activity, CreditCard, TrendingUp } from "lucide-react";

export default function DashboardSummary({ data, loading = false }) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1,2,3,4].map(i => (
          <Card key={i} className="animate-pulse h-28 bg-gray-50"></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card className="shadow-sm hover:shadow-md transition-shadow border-blue-50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-tight">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900 truncate">{formatIDR(data.revenue)}</div>
          <p className="text-[10px] text-green-600 font-semibold mt-1 bg-green-50 px-2 py-0.5 rounded-full inline-block">Daily Gross Sales</p>
        </CardContent>
      </Card>
      
      <Card className="shadow-sm hover:shadow-md transition-shadow border-blue-50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-tight">COGS</CardTitle>
          <Activity className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900 truncate">{formatIDR(data.cogs)}</div>
          <p className="text-[10px] text-gray-500 mt-1">Raw material usage</p>
        </CardContent>
      </Card>

      <Card className="shadow-sm hover:shadow-md transition-shadow border-orange-50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-tight">Op. Expenses</CardTitle>
          <CreditCard className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900 truncate">{formatIDR(data.expenses)}</div>
          <p className="text-[10px] text-gray-500 mt-1">Fixed Costs + Daily Exp</p>
        </CardContent>
      </Card>

      <Card className="shadow-sm hover:shadow-md transition-shadow border-purple-50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-bold text-gray-500 uppercase tracking-tight">Net Profit</CardTitle>
          <TrendingUp className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold truncate ${data.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatIDR(data.netProfit)}
          </div>
          <p className="text-[10px] text-gray-500 mt-1">Final daily earnings</p>
        </CardContent>
      </Card>
    </div>
  );
}
