"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from "recharts";
import { TrendingUp, PieChart as PieChartIcon, Lightbulb, Calendar, AlertTriangle } from "lucide-react";

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState("intelligence");
  const [intelligenceData, setIntelligenceData] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("thisMonth"); // today, last7, last30, thisMonth, custom
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      let qs = "";
      if (range === "custom") {
        qs = `?from=${from}&to=${to}`;
      } else {
        const today = new Date();
        let f = new Date();
        let t = new Date();

        if (range === "today") {
          // f is today
        } else if (range === "last7") {
          f.setDate(today.getDate() - 7);
        } else if (range === "last30") {
          f.setDate(today.getDate() - 30);
        } else if (range === "thisMonth") {
          f.setDate(1);
        }
        
        const fStr = f.toISOString().split('T')[0];
        const tStr = t.toISOString().split('T')[0];
        qs = `?from=${fStr}&to=${tStr}`;
      }

      const [intel, forecast] = await Promise.all([
        api.get(`/analytics/menu-intelligence${qs}`),
        api.get("/analytics/demand-forecast") // Forecast always uses last 7 days from now
      ]);
      setIntelligenceData(intel);
      setForecastData(forecast);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [range, from, to]);

  if (loading) return <div className="flex items-center justify-center h-full">Loading AI Insights...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">AI Business Intelligence</h2>
          <p className="text-sm text-gray-500">Data-driven insights for your business.</p>
        </div>
        
        <div className="flex items-center gap-4">
          {activeTab === "intelligence" && (
            <div className="flex items-center gap-2">
              <select 
                value={range} 
                onChange={(e) => setRange(e.target.value)}
                className="text-sm border rounded-md px-2 py-1.5 bg-white shadow-sm"
              >
                <option value="today">Today</option>
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="thisMonth">This Month</option>
                <option value="custom">Custom Range</option>
              </select>

              {range === "custom" && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                  <input 
                    type="date" 
                    value={from} 
                    onChange={(e) => setFrom(e.target.value)}
                    className="text-sm border rounded-md px-2 py-1"
                  />
                  <span className="text-gray-400">-</span>
                  <input 
                    type="date" 
                    value={to} 
                    onChange={(e) => setTo(e.target.value)}
                    className="text-sm border rounded-md px-2 py-1"
                  />
                </div>
              )}
            </div>
          )}

          <div className="flex bg-white rounded-lg p-1 border shadow-sm">
            <button
              onClick={() => setActiveTab("intelligence")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === "intelligence" ? "bg-blue-600 text-white shadow" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <PieChartIcon className="w-4 h-4 inline-block mr-2" /> Menu Intelligence
            </button>
            <button
              onClick={() => setActiveTab("forecast")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${
                activeTab === "forecast" ? "bg-blue-600 text-white shadow" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <TrendingUp className="w-4 h-4 inline-block mr-2" /> Demand Forecast
            </button>
          </div>
        </div>
      </div>

      {activeTab === "intelligence" ? (
        <MenuIntelligence data={intelligenceData} />
      ) : (
        <DemandForecast data={forecastData} />
      )}
    </div>
  );
}

function MenuIntelligence({ data }) {
  if (!data) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case "STAR MENU": return "bg-green-100 text-green-800 border-green-200";
      case "PROFITABLE MENU": return "bg-blue-100 text-blue-800 border-blue-200";
      case "LOW MARGIN MENU": return "bg-orange-100 text-orange-800 border-orange-200";
      case "UNDERPERFORMING MENU": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const chartData = data.data.map(m => ({
    name: m.name,
    profit: m.net_profit,
    qty: m.total_qty
  })).sort((a, b) => b.profit - a.profit);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Profit Generator</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.insights.topProfitable[0]?.name}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Net Profit: {formatIDR(data.insights.topProfitable[0]?.net_profit)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Qty / Menu</CardTitle>
            <PieChartIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.thresholds.avgQty.toFixed(1)} portions</div>
            <p className="text-xs text-muted-foreground mt-1">Benchmark for Star Menus</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profit Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.insights.lowMargin.length + data.insights.lowSelling.length} items</div>
            <p className="text-xs text-muted-foreground mt-1">Requiring operational review</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profitability Chart */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Menu Profitability Analysis</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" hide />
                <YAxis tickFormatter={(val) => `Rp${val / 1000}k`} />
                <Tooltip 
                  formatter={(val) => formatIDR(val)}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Legend />
                <Bar dataKey="profit" name="Net Profit" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.profit > data.thresholds.avgProfit ? '#2563eb' : '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI Insights Panel */}
        <Card className="lg:col-span-1 bg-blue-50 border-blue-100 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-800">
              <Lightbulb className="w-5 h-5 mr-2" /> AI Smart Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-blue-900 uppercase tracking-wider">Top 5 Star Performers</h4>
              <div className="grid grid-cols-1 gap-2">
                {data.insights.topProfitable.map(m => (
                  <div key={m.id} className="flex justify-between items-center bg-white p-2 rounded border border-blue-100">
                    <span className="text-sm font-medium">{m.name}</span>
                    <span className="text-xs font-bold text-green-600">{formatIDR(m.net_profit)}</span>
                  </div>
                ))}
              </div>
            </div>

            {data.insights.lowMargin.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-orange-900 uppercase tracking-wider">Low Margin Alerts</h4>
                <p className="text-xs text-orange-800">High volume but low profit. Consider adjusting prices or costs.</p>
                <div className="flex flex-wrap gap-2">
                  {data.insights.lowMargin.map(m => (
                    <span key={m.id} className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-[10px] font-bold uppercase">
                      {m.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.insights.lowSelling.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-red-900 uppercase tracking-wider">Underperforming Menus</h4>
                <p className="text-xs text-red-800">Rarely sold. Candidates for removal to simplify inventory.</p>
                <div className="flex flex-wrap gap-2">
                  {data.insights.lowSelling.map(m => (
                    <span key={m.id} className="px-2 py-1 bg-red-100 text-red-700 rounded text-[10px] font-bold uppercase">
                      {m.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle>Menu Performance Detail</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Menu Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Qty Sold</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Net Profit</TableHead>
                <TableHead className="text-right text-orange-600">Alloc. Overhead</TableHead>
                <TableHead className="text-right font-bold">True Profit</TableHead>
                <TableHead className="text-center">Classification</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.data.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-xs text-gray-500">{m.category}</TableCell>
                  <TableCell className="text-right">{m.total_qty}</TableCell>
                  <TableCell className="text-right">{formatIDR(m.total_revenue)}</TableCell>
                  <TableCell className="text-right font-semibold text-blue-600">{formatIDR(m.net_profit)}</TableCell>
                  <TableCell className="text-right text-orange-600 text-xs italic">{formatIDR(m.allocatedOverhead)}</TableCell>
                  <TableCell className="text-right font-black">{formatIDR(m.profitAfterOverhead)}</TableCell>
                  <TableCell className="text-center">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(m.status)}`}>
                      {m.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function DemandForecast({ data }) {
  if (!data || data.length === 0) return <div className="p-10 text-center text-gray-500">No historical data for forecasting yet.</div>;

  const chartData = data.map(m => ({
    name: m.name,
    tomorrow: m.predictedTomorrow,
    avg: m.avgDailySales
  })).sort((a, b) => b.tomorrow - a.tomorrow).slice(0, 10);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top 10 Predicted Demand (Tomorrow)</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey="tomorrow" name="Predicted Tomorrow" fill="#2563eb" radius={[0, 4, 4, 0]} />
                <Bar dataKey="avg" name="7-Day Average" fill="#94a3b8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 bg-green-50 border-green-100">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              <Calendar className="w-5 h-5 mr-2" /> Prep Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-xs text-green-700">Recommended preparation based on predicted demand + 10% safety buffer.</p>
              <div className="space-y-3">
                {data.sort((a, b) => b.predictedTomorrow - a.predictedTomorrow).slice(0, 8).map(m => (
                  <div key={m.id} className="flex justify-between items-center border-b border-green-200 pb-2 last:border-0">
                    <div>
                      <div className="text-sm font-bold text-gray-900">{m.name}</div>
                      <div className="text-[10px] text-gray-500">7d Avg: {m.avgDailySales}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-green-700">{m.recommendedPrep}</div>
                      <div className="text-[10px] text-green-600">Portions</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-white rounded border border-green-200">
                <h5 className="text-xs font-bold text-gray-700 flex items-center mb-1">
                  <Lightbulb className="w-3 h-3 mr-1 text-yellow-500" /> AI Logic
                </h5>
                <p className="text-[10px] text-gray-600 leading-tight">
                  Calculated using 7-day Moving Average: <br/>
                  <code>predicted = sum(last_7_days) / 7</code> <br/>
                  <code>prep = ceil(predicted * 1.1)</code>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Forecast Details (Next 7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Menu Item</TableHead>
                <TableHead className="text-right">7-Day Avg</TableHead>
                <TableHead className="text-right text-blue-600">Tomorrow Pred.</TableHead>
                <TableHead className="text-right text-green-600">Recommend Prep</TableHead>
                <TableHead className="text-right">Next 7 Days Pred.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell className="text-right">{m.avgDailySales}</TableCell>
                  <TableCell className="text-right font-bold text-blue-600">{m.predictedTomorrow}</TableCell>
                  <TableCell className="text-right font-bold text-green-600">{m.recommendedPrep}</TableCell>
                  <TableCell className="text-right">{m.predictedNext7Days}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
