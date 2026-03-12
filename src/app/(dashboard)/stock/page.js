"use client";
import React from "react";
import { Layers, Construction } from "lucide-react";

export default function StockPage() {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4">
      <div className="bg-green-50 p-6 rounded-full">
         <Layers className="w-12 h-12 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight">Stock Inventory</h2>
      <p className="text-gray-500 max-w-md">
        The Stock management module is coming soon! You will be able to monitor real-time inventory levels and get restocking alerts.
      </p>
      <div className="flex items-center gap-2 text-orange-600 font-medium bg-orange-50 px-4 py-2 rounded-lg border border-orange-100">
         <Construction className="w-4 h-4" /> Under Development
      </div>
    </div>
  );
}
