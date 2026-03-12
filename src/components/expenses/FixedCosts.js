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
import { Plus, Trash2, Edit2, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { useToast } from "../ui/use-toast";

const frequencyOptions = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
];

export default function FixedCosts() {
  const { success, error } = useToast();
  const [fixedCosts, setFixedCosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", amount: "", frequency: "MONTHLY" });
  const [isEditing, setIsEditing] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    loadFixedCosts();
  }, []);

  const loadFixedCosts = async () => {
    try {
      const res = await api.get("/fixed-costs");
      setFixedCosts(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        const updated = await api.put(`/fixed-costs/${isEditing}`, formData);
        setFixedCosts(prev => prev.map(ex => ex.id === isEditing ? { ...ex, ...updated } : ex));
        success("Fixed cost updated");
      } else {
        const created = await api.post("/fixed-costs", formData);
        setFixedCosts(prev => [created, ...prev]);
        success("Fixed cost added");
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (e) {
      console.error(e);
      error("Failed to save fixed cost");
    }
  };

  const handleDelete = async (id) => {
    const previous = fixedCosts;
    setConfirmDeleteId(null);
    setFixedCosts(prev => prev.filter(fc => fc.id !== id));
    try {
      await api.delete(`/fixed-costs/${id}`);
      success("Fixed cost deleted");
    } catch (e) {
      console.error(e);
      setFixedCosts(previous);
      error("Failed to delete fixed cost");
    }
  };

  const openEdit = (fc) => {
    setFormData({ name: fc.name, amount: fc.amount.toString(), frequency: fc.frequency });
    setIsEditing(fc.id);
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: "", amount: "", frequency: "MONTHLY" });
    setIsEditing(null);
  };

  const calculateDailyTotal = () => {
    return fixedCosts.reduce((acc, fc) => {
      if (fc.frequency === "DAILY") return acc + fc.amount;
      if (fc.frequency === "WEEKLY") return acc + fc.amount / 7;
      if (fc.frequency === "MONTHLY") return acc + fc.amount / 30;
      return acc;
    }, 0);
  };

  const calculateMonthlyTotal = () => {
    return calculateDailyTotal() * 30;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Fixed Overhead Costs</h2>
          <p className="text-sm text-gray-500">Manage recurring business costs like rent, salaries, and utilities.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Add Fixed Cost
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-blue-50 border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-800 uppercase tracking-wider">Estimated Daily Overhead</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{formatIDR(calculateDailyTotal())}</div>
            <p className="text-xs text-blue-700 mt-1 italic flex items-center">
              <Info className="w-3 h-3 mr-1" /> This amount is automatically deducted from daily profit.
            </p>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-800 uppercase tracking-wider">Estimated Monthly Overhead</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{formatIDR(calculateMonthlyTotal())}</div>
            <p className="text-xs text-purple-700 mt-1 italic flex items-center">
              <Info className="w-3 h-3 mr-1" /> Total fixed burden per month.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead>Cost Name</TableHead>
              <TableHead>Frequency</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right text-blue-600">Daily Impact</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-gray-400 italic">Loading fixed costs...</TableCell>
              </TableRow>
            ) : fixedCosts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-gray-400 italic">No fixed costs recorded yet.</TableCell>
              </TableRow>
            ) : (
              fixedCosts.map((fc) => {
                let daily = 0;
                if (fc.frequency === "DAILY") daily = fc.amount;
                else if (fc.frequency === "WEEKLY") daily = fc.amount / 7;
                else if (fc.frequency === "MONTHLY") daily = fc.amount / 30;

                return (
                  <TableRow key={fc.id} className="hover:bg-gray-50/50 transition-colors">
                    <TableCell className="font-semibold text-gray-900">{fc.name}</TableCell>
                    <TableCell>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 border text-gray-700">
                        {fc.frequency}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatIDR(fc.amount)}</TableCell>
                    <TableCell className="text-right text-blue-600 font-bold">{formatIDR(daily)}</TableCell>
                    <TableCell className="text-right">
                      {confirmDeleteId === fc.id ? (
                        <span className="inline-flex items-center justify-end gap-1 w-full">
                          <span className="text-xs text-gray-500 mr-1">Delete?</span>
                          <Button variant="destructive" size="sm" className="h-6 px-2 text-xs" onClick={() => handleDelete(fc.id)}>Yes</Button>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600" onClick={() => openEdit(fc)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600" onClick={() => setConfirmDeleteId(fc.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Fixed Cost" : "Add Fixed Cost"}</DialogTitle>
          </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Cost Name</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g. Shop Rent, Internet, Employee Salary"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                options={frequencyOptions}
              />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {isEditing ? "Update Cost" : "Add Cost"}
            </Button>
          </div>
        </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
