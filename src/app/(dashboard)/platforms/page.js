"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select } from "../../../components/ui/select";
import { Plus, Trash2, Edit2 } from "lucide-react";
import { useToast } from "../../../components/ui/use-toast";

export default function PlatformsPage() {
  const { success, error } = useToast();
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", type: "OFFLINE", commission_rate: "0" });
  const [isEditing, setIsEditing] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  useEffect(() => {
    loadPlatforms();
  }, []);

  const loadPlatforms = async () => {
    try {
      const res = await api.get("/platforms");
      setPlatforms(res);
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
        await api.put(`/platforms/${isEditing}`, formData);
      } else {
        await api.post("/platforms", formData);
      }
      setIsDialogOpen(false);
      resetForm();
      loadPlatforms();
      success(isEditing ? "Platform updated" : "Platform added");
    } catch (e) {
      console.error(e);
      error("Failed to save platform");
    }
  };

  const handleDelete = async (id) => {
    // Optimistic UI
    const previous = platforms;
    setConfirmDeleteId(null);
    setPlatforms(prev => prev.filter(p => p.id !== id));
    try {
      await api.delete(`/platforms/${id}`);
      success("Platform deleted");
    } catch (e) {
      console.error(e);
      setPlatforms(previous); // rollback
      error("Failed to delete platform. It might be in use.");
    }
  };

  const openEdit = (p) => {
    setFormData({ name: p.name, type: p.type, commission_rate: p.commission_rate.toString() });
    setIsEditing(p.id);
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: "", type: "OFFLINE", commission_rate: "0" });
    setIsEditing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Platform Management</h2>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" /> Add Platform
        </Button>
      </div>

      <div className="bg-white rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Commission Rate (%)</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">Loading...</TableCell>
              </TableRow>
            ) : platforms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center">No platforms found.</TableCell>
              </TableRow>
            ) : (
              platforms.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      p.type === 'DELIVERY' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {p.type}
                    </span>
                  </TableCell>
                  <TableCell>{p.commission_rate}%</TableCell>
                  <TableCell className="text-right space-x-2">
                    {confirmDeleteId === p.id ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="text-xs text-gray-500 mr-1">Delete?</span>
                        <Button variant="destructive" size="sm" className="h-6 px-2 text-xs" onClick={() => handleDelete(p.id)}>Yes</Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                      </span>
                    ) : (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(p)}>
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setConfirmDeleteId(p.id)}>
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? "Edit Platform" : "Add New Platform"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Platform Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g. GoFood"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                options={[
                  { value: "OFFLINE", label: "Offline" },
                  { value: "DELIVERY", label: "Delivery" }
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label>Commission Rate (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.commission_rate}
                onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                required
                placeholder="20"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
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
