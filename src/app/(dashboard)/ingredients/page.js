"use client";
import React from "react";
import IngredientManager from "../../../components/IngredientManager";

export default function IngredientListPage() {
  return (
    <div className="max-w-7xl mx-auto py-6 px-4 md:px-0">
      <IngredientManager isStandalone={true} />
    </div>
  );
}
