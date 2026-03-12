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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Total Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatIDR(data.revenue)}</div>
          <p className="text-xs text-muted-foreground mt-1 text-green-600 font-medium">Daily Gross Sales</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">COGS</CardTitle>
          <Activity className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatIDR(data.cogs)}</div>
          <p className="text-xs text-muted-foreground mt-1">Raw material usage</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Op. Expenses</CardTitle>
          <CreditCard className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatIDR(data.expenses)}</div>
          <p className="text-xs text-muted-foreground mt-1">Fixed Costs + Daily Exp</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">Net Profit</CardTitle>
          <TrendingUp className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${data.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatIDR(data.netProfit)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Final daily earnings</p>
        </CardContent>
      </Card>
    </div>
  );
}
