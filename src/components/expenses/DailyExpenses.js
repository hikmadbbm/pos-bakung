"use client";
import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { formatIDR } from "../../lib/format";
import { Button } from "../ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select } from "../ui/select";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { useToast } from "../ui/use-toast";

const categoryOptions = [
  { value: "RAW_MATERIAL", label: "Raw Material" },
  { value: "OPERATIONAL", label: "Operational" },
  { value: "PACKAGING", label: "Packaging" },
  { value: "OTHERS", label: "Others" },
];

const emptyForm = { 
  item: "", 
  category: "RAW_MATERIAL", 
  amount: "", 
  date: new Date().toISOString().split('T')[0] // Default to today (YYYY-MM-DD)
};

export default function DailyExpenses() {
  const { success, error } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dialog state — null = add new, number = editing that id
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  // Inline delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = async () => {
    try {
      const res = await api.get("/expenses");
      setExpenses(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  /* ── helpers ── */
  const openAdd = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const openEdit = (ex) => {
    setEditingId(ex.id);
    setFormData({ 
      item: ex.item, 
      category: ex.category, 
      amount: String(ex.amount),
      date: new Date(ex.date).toISOString().split('T')[0]
    });
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
  };

  /* ── CRUD ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const updated = await api.put(`/expenses/${editingId}`, formData);
        setExpenses(prev => prev.map(ex => ex.id === editingId ? { ...ex, ...updated } : ex));
        success("Expense updated successfully");
      } else {
        const created = await api.post("/expenses", formData);
        setExpenses(prev => [created, ...prev]);
        success("Expense added successfully");
      }
      closeDialog();
    } catch (e) {
      console.error(e);
      error(editingId ? "Failed to update expense" : "Failed to save expense");
    }
  };

  const handleDelete = async (id) => {
    // Optimistic UI
    const previous = expenses;
    setConfirmDeleteId(null);
    setExpenses(prev => prev.filter(ex => ex.id !== id));
    try {
      await api.delete(`/expenses/${id}`);
      success("Expense deleted");
    } catch (e) {
      console.error(e);
      setExpenses(previous); // rollback
      error("Failed to delete expense");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Daily Expenses Log</h2>
          <p className="text-sm text-gray-500">Track day-to-day operational spending.</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4 mr-2" /> Add Expense
        </Button>
      </div>

      <div className="bg-white rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-400 py-8">No expenses found.</TableCell>
              </TableRow>
            ) : (
              expenses.map((ex) => (
                <TableRow key={ex.id}>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(ex.date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                  </TableCell>
                  <TableCell className="font-medium">{ex.item}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                      {categoryOptions.find(c => c.value === ex.category)?.label || ex.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{formatIDR(ex.amount)}</TableCell>
                  <TableCell className="text-right">
                    {confirmDeleteId === ex.id ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-xs text-gray-500 mr-1">Delete?</span>
                        <Button variant="destructive" size="sm" className="h-6 px-2 text-xs" onClick={() => handleDelete(ex.id)}>Yes</Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                      </span>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(ex)}>
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setConfirmDeleteId(ex.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Expense" : "Add New Expense"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Expense Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input
                value={formData.item}
                onChange={(e) => setFormData({ ...formData, item: e.target.value })}
                required
                placeholder="e.g. 5kg Flour"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                options={categoryOptions}
              />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                placeholder="50000"
              />
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <Button type="button" variant="outline" onClick={closeDialog}>
                Cancel
              </Button>
              <Button type="submit">{editingId ? "Update" : "Save"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
