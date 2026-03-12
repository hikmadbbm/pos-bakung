"use client";
import React from "react";
import IngredientManager from "../../../components/IngredientManager";

export default function IngredientListPage() {
  return (
    <div className="max-w-6xl mx-auto py-6">
      <IngredientManager isStandalone={true} />
    </div>
  );
}
