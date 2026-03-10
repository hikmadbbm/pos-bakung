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
import { Plus } from "lucide-react";
import { useToast } from "../ui/use-toast";

const categoryOptions = [
  { value: "RAW_MATERIAL", label: "Raw Material" },
  { value: "OPERATIONAL", label: "Operational" },
  { value: "PACKAGING", label: "Packaging" },
  { value: "OTHERS", label: "Others" },
];

export default function DailyExpenses() {
  const { success, error } = useToast();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ item: "", category: "RAW_MATERIAL", amount: "" });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/expenses", formData);
      setIsDialogOpen(false);
      setFormData({ item: "", category: "RAW_MATERIAL", amount: "" });
      loadExpenses();
      success("Expense added successfully");
    } catch (e) {
      console.error(e);
      error("Failed to save expense");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Daily Expenses Log</h2>
          <p className="text-sm text-gray-500">Track day-to-day operational spending.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">No expenses found.</TableCell>
              </TableRow>
            ) : (
              expenses.map((ex) => (
                <TableRow key={ex.id}>
                  <TableCell>{new Date(ex.date).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">{ex.item}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
                      {categoryOptions.find(c => c.value === ex.category)?.label || ex.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{formatIDR(ex.amount)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
