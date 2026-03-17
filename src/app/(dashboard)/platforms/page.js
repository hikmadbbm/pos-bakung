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
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Platform Management</h2>
          <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
            Configure delivery channels and commission rates
            <span className="inline-block w-1 h-1 bg-emerald-600 rounded-full" />
          </p>
        </div>
        <Button onClick={openCreate} className="h-10 px-6 rounded-2xl font-semibold text-[11px] tracking-tight bg-slate-900 text-white hover:bg-slate-800 shadow-xl active:scale-95 transition-all">
          <Plus className="w-4 h-4 mr-2" /> ADD PLATFORM
        </Button>
      </div>

      <div className="glass-card rounded-[2rem] overflow-hidden shadow-2xl border-none">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="text-[10px] font-black uppercase text-slate-500 py-5 px-6">Name</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-500 py-5">Integration Type</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-slate-500 py-5">Rate (%)</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase text-slate-500 py-5 px-6">Actions</TableHead>
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
                <TableRow key={p.id} className="hover:bg-slate-50/50 border-slate-100 transition-colors group">
                  <TableCell className="font-black text-slate-900 px-6 py-5 uppercase tracking-tight">{p.name}</TableCell>
                  <TableCell>
                    <span className={cn(
                      "inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter shadow-sm",
                      p.type === 'DELIVERY' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                    )}>
                      {p.type}
                    </span>
                  </TableCell>
                  <TableCell className="font-black text-slate-900">{p.commission_rate}%</TableCell>
                  <TableCell className="text-right px-6 space-x-1">
                    {confirmDeleteId === p.id ? (
                      <span className="inline-flex items-center gap-2 bg-rose-50 p-1 rounded-xl border border-rose-100">
                        <span className="text-[9px] font-black text-rose-600 uppercase tracking-tighter ml-2">DELETE?</span>
                        <Button variant="destructive" size="sm" className="h-7 px-3 rounded-lg font-black text-[9px] uppercase hover:bg-rose-700" onClick={() => handleDelete(p.id)}>YES</Button>
                        <Button variant="ghost" size="sm" className="h-7 px-3 rounded-lg font-black text-[9px] uppercase hover:bg-rose-100 text-rose-400" onClick={() => setConfirmDeleteId(null)}>NO</Button>
                      </span>
                    ) : (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-slate-100" onClick={() => openEdit(p)}>
                          <Edit2 className="w-4 h-4 text-slate-400" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-rose-50 group/del" onClick={() => setConfirmDeleteId(p.id)}>
                          <Trash2 className="w-4 h-4 text-slate-300 group-hover/del:text-rose-500" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-600 rounded-full -translate-y-1/2 translate-x-1/2 opacity-20" />
             <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                <Plus className="w-8 h-8 text-white" />
             </div>
             <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight">
               {isEditing ? "Modify Platform" : "Add New Platform"}
             </DialogTitle>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Platform Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-12 rounded-2xl border-slate-200 bg-slate-50 focus:ring-emerald-600/10 transition-all font-bold"
                placeholder="e.g. GoFood"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Type</Label>
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
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Commission Rate (%)</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.commission_rate}
                onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                required
                className="h-12 rounded-2xl border-slate-200 bg-slate-50 focus:ring-emerald-600/10 transition-all font-black text-emerald-600"
                placeholder="20"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button type="button" variant="ghost" className="rounded-2xl h-12 px-8 font-black text-slate-400 uppercase tracking-widest text-[10px]" onClick={() => setIsDialogOpen(false)}>
                Discard
              </Button>
              <Button type="submit" className="rounded-2xl h-12 px-10 font-semibold tracking-tight bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200 active:scale-95 transition-all">
                Save Platform
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
