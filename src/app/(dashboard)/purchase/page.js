"use client";
import React from "react";
import { Package, Construction } from "lucide-react";

export default function PurchasePage() {
  return (
    <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-4">
      <div className="bg-blue-50 p-6 rounded-full">
         <Package className="w-12 h-12 text-blue-600" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight">Purchase Module</h2>
      <p className="text-gray-500 max-w-md">
        The Purchase module is coming soon! This section will allow you to record and track ingredient procurement from suppliers.
      </p>
      <div className="flex items-center gap-2 text-orange-600 font-medium bg-orange-50 px-4 py-2 rounded-lg border border-orange-100">
         <Construction className="w-4 h-4" /> Under Development
      </div>
    </div>
  );
}
