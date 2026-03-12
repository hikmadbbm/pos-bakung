import React from "react";
import { formatIDR } from "../../lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Sparkles, CheckCircle, ArrowDownRight, AlertTriangle, Info, Activity } from "lucide-react";

export default function AiInsights({ insights = [], loading = false, data }) {
  // Use insights from API but allow local additions/fallbacks
  const displayInsights = [...insights];
  
  // If we have data but no overhead insight, add it manually
  if (data && data.dailyOverhead > 0 && !displayInsights.some(i => i.title?.includes('overhead'))) {
    displayInsights.push({
      type: 'neutral',
      title: 'Fixed overhead applied',
      message: `Daily overhead allocation is ${formatIDR(data.dailyOverhead)} today.`,
    });
  }

  if (loading) {
    return (
      <Card className="bg-indigo-50/50 border-indigo-100 animate-pulse h-48 shadow-none"></Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 border-indigo-100 shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-indigo-50/50 bg-white/50">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
          <CardTitle className="text-xl font-bold text-indigo-900 tracking-tight">AI Business Analyst</CardTitle>
        </div>
        <CardDescription className="text-indigo-700/80 font-medium">
          Smart insights generated based on your real-time performance.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 md:p-6 bg-transparent">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {displayInsights.map((insight, idx) => (
            <div key={idx} className="bg-white/95 p-4 rounded-xl border border-indigo-100/50 flex gap-4 items-start shadow-sm hover:shadow-md hover:border-indigo-300 transition-all duration-300 group">
              <div className={`mt-0.5 p-2.5 rounded-xl shrink-0 ${
                insight.type === 'positive' ? 'bg-green-100 text-green-600' :
                insight.type === 'negative' ? 'bg-red-100 text-red-600' :
                insight.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                {insight.type === 'positive' && <CheckCircle className="w-5 h-5" />}
                {insight.type === 'negative' && <ArrowDownRight className="w-5 h-5" />}
                {insight.type === 'warning' && <AlertTriangle className="w-5 h-5" />}
                {insight.type === 'info' && <Info className="w-5 h-5" />}
                {insight.type === 'neutral' && <Activity className="w-5 h-5" />}
                {insight.type === 'action' && <Sparkles className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-gray-900 group-hover:text-indigo-900 transition-colors">{insight.title}</h4>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed line-clamp-2 md:line-clamp-none italic md:not-italic">{insight.message}</p>
              </div>
            </div>
          ))}
          {displayInsights.length === 0 && (
            <div className="col-span-full py-8 text-center bg-white/50 rounded-xl border border-dashed border-indigo-200">
              <p className="text-sm text-gray-500 italic">No specific insights available at the moment. Keep selling!</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
