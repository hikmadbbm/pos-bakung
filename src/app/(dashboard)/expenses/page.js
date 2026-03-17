"use client";
import { useState } from "react";
import DailyExpenses from "../../../components/expenses/DailyExpenses";
import FixedCosts from "../../../components/expenses/FixedCosts";
import { cn } from "../../../lib/utils";

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState("daily");

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Expenses & Costs</h2>
        
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("daily")}
              className={cn(
                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                activeTab === "daily"
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              Daily Expenses
            </button>
            <button
              onClick={() => setActiveTab("fixed")}
              className={cn(
                "whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors",
                activeTab === "fixed"
                  ? "border-emerald-500 text-emerald-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              Fixed Overhead
            </button>
          </nav>
        </div>
      </div>

      <div className="mt-6">
        {activeTab === "daily" ? <DailyExpenses /> : <FixedCosts />}
      </div>
    </div>
  );
}
