"use client";
import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Label } from "recharts";

export default function ProjectProgress({ percentage = 41, title = "Business Performance" }) {
  const data = [
    { name: "Completed", value: percentage },
    { name: "Remaining", value: 100 - percentage },
  ];

  const COLORS = ["#166534", "#E2E8F0"]; // Emerald 800 and Slate 200

  return (
    <div className="glass-card p-8 flex flex-col h-full">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</h3>
      </div>
      
      <div className="flex-1 min-h-[220px] relative mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="80%"
              startAngle={180}
              endAngle={0}
              innerRadius={80}
              outerRadius={110}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={COLORS[0]} />
              <Cell fill={COLORS[1]} />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        <div className="absolute inset-x-0 bottom-[20%] flex flex-col items-center justify-center">
          <span className="text-5xl font-black text-slate-900 tracking-tighter">{percentage}%</span>
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Target Yield</span>
        </div>
      </div>

      <div className="flex justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-800" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Achieved</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-tight">Pending</span>
        </div>
      </div>
    </div>
  );
}
