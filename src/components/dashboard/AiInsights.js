"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Sparkles, CheckCircle, ArrowDownRight, AlertTriangle, Info, Activity } from "lucide-react";

export default function AiInsights({ insights = [], loading = false }) {
  if (loading) {
    return (
      <Card className="bg-indigo-50/50 border-indigo-100 animate-pulse">
        <div className="h-32"></div>
      </Card>
    );
  }

  return (
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
          <div key={idx} className="bg-white/80 p-3 rounded-lg border border-indigo-100 flex gap-3 items-start shadow-sm hover:shadow-md transition-shadow">
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
  );
}
