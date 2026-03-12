"use client";

import React, { useState, useEffect } from "react";
import { Search, Plus, Edit2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./ui/table";
import { useToast } from "./ui/use-toast";
import { api } from "../lib/api";
import { formatIDR } from "../lib/format";

export default function IngredientManager({ isStandalone = false }) {
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", unit: "", cost_per_unit: 0 });
  const { success, error } = useToast();

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    try {
      const data = await api.get("/ingredients");
      setIngredients(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await api.put(`/ingredients/${editing.id}`, form);
        success("Ingredient updated");
      } else {
        await api.post("/ingredients", form);
        success("Ingredient added");
      }
      setEditing(null);
      setIsAdding(false);
      loadIngredients();
    } catch (e) {
      error("Error saving ingredient");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure?")) return;
    try {
      await api.delete(`/ingredients/${id}`);
      loadIngredients();
    } catch (e) {
      error("Could not delete. Ingredient might be in use.");
    }
  };

  const filtered = ingredients.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div>Loading ingredients...</div>;

  return (
    <div className="space-y-4">
      {isStandalone && (
         <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Ingredient Master</h2>
         </div>
      )}
      {/* Search & Add Header */}
      {!isAdding && !editing && (
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              placeholder="Search ingredients..." 
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => { setIsAdding(true); setForm({ name: "", unit: "", cost_per_unit: 0 }); }} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Add Ingredient
          </Button>
        </div>
      )}

      {/* Add/Edit Form Card */}
      {(isAdding || editing) && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-lg">{editing ? "Edit Ingredient" : "New Ingredient"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input placeholder="e.g. Flour" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit</label>
                <Input placeholder="e.g. kg, gr, pcs" value={form.unit} onChange={(e) => setForm({...form, unit: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Cost / Unit</label>
                <Input type="number" value={form.cost_per_unit} onChange={(e) => setForm({...form, cost_per_unit: e.target.value})} />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => { setEditing(null); setIsAdding(false); }}>Cancel</Button>
            <Button onClick={handleSave} className="bg-blue-600">Save Ingredient</Button>
          </CardFooter>
        </Card>
      )}

      {/* Ingredient List */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ingredient Name</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Cost / Unit</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.name}</TableCell>
                <TableCell>{i.unit}</TableCell>
                <TableCell className="text-right">{formatIDR(i.cost_per_unit)}</TableCell>
                <TableCell className="text-right space-x-2">
                  <Button variant="ghost" size="sm" onClick={() => { setEditing(i); setForm({ name: i.name, unit: i.unit, cost_per_unit: i.cost_per_unit }); }}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(i.id)} className="text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="md:hidden space-y-3">
        {filtered.map(i => (
          <Card key={i.id} className="p-4 flex justify-between items-center">
            <div>
              <div className="font-bold">{i.name}</div>
              <div className="text-xs text-gray-500">{i.unit} • {formatIDR(i.cost_per_unit)} / unit</div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditing(i); setForm({ name: i.name, unit: i.unit, cost_per_unit: i.cost_per_unit }); }}>
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDelete(i.id)} className="text-red-500">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
