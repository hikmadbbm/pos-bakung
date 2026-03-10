"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { ArrowUpRight, ArrowDownRight, DollarSign, CreditCard, Activity, TrendingUp, Sparkles, AlertTriangle, Info, CheckCircle } from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const res = await api.get("/dashboard/insights");
      setData(res.summary);
      setInsights(res.insights);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading dashboard...</div>;
  if (!data) return <div className="p-8 text-center text-red-500">Failed to load data</div>;

  return (
    <div className="space-y-6">
      {/* AI Assistant Section */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <CardTitle className="text-lg font-bold text-indigo-900">AI Business Analyst</CardTitle>
          </div>
          <CardDescription className="text-indigo-700">
            Smart insights generated based on your real-time performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {insights.map((insight, idx) => (
            <div key={idx} className="bg-white/80 p-3 rounded-lg border border-indigo-100 flex gap-3 items-start shadow-sm">
              <div className={`mt-0.5 p-1.5 rounded-full ${
                insight.type === 'positive' ? 'bg-green-100 text-green-600' :
                insight.type === 'negative' ? 'bg-red-100 text-red-600' :
                insight.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                {insight.type === 'positive' && <CheckCircle className="w-4 h-4" />}
                {insight.type === 'negative' && <ArrowDownRight className="w-4 h-4" />}
                {insight.type === 'warning' && <AlertTriangle className="w-4 h-4" />}
                {insight.type === 'info' && <Info className="w-4 h-4" />}
                {insight.type === 'neutral' && <Activity className="w-4 h-4" />}
                {insight.type === 'action' && <Sparkles className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-900">{insight.title}</h4>
                <p className="text-sm text-gray-600">{insight.message}</p>
              </div>
            </div>
          ))}
          {insights.length === 0 && (
            <p className="text-sm text-gray-500 italic">No specific insights available at the moment. Keep selling!</p>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatIDR(data.revenue)}</div>
            <p className="text-xs text-muted-foreground mt-1 text-green-600 font-medium">
              Daily Gross Sales
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              COGS
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatIDR(data.cogs)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Raw material usage
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Op. Expenses
            </CardTitle>
            <CreditCard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatIDR(data.expenses)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Fixed Costs + Daily Exp
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Net Profit
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${data.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatIDR(data.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Final daily earnings
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Break-even & Overhead Insights */}
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

      {/* Top Performing Menu */}
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Top Performing Menu Items</CardTitle>
          <CardDescription>
            Menu items generating the most profit today.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Menu Name</TableHead>
                <TableHead className="text-right">Qty Sold</TableHead>
                <TableHead className="text-right">Total Profit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.topMenus.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No sales yet today.
                  </TableCell>
                </TableRow>
              ) : (
                data.topMenus.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">{item.qty}</TableCell>
                    <TableCell className="text-right font-bold text-green-600">
                      {formatIDR(item.profit)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
