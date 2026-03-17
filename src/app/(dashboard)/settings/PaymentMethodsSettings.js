"use client";
import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select } from "../../../components/ui/select";
import { useToast } from "../../../components/ui/use-toast";
import { Textarea } from "../../../components/ui/textarea";
import { Plus, Edit2, Trash2, Image as ImageIcon, Check, X, QrCode } from "lucide-react";
import { api } from "../../../lib/api";
import jsQR from "jsqr";

export default function PaymentMethodsSettings() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { success, error } = useToast();
  
  const [formData, setFormData] = useState({
    name: "",
    type: "CASH",
    account_number: "",
    account_name: "",
    description: "",
    imageUrl: "",
    qris_data: "",
    is_active: true,
    display_order: 0
  });
  const [editingId, setEditingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadMethods();
  }, []);

  const loadMethods = async () => {
    setLoading(true);
    try {
      const res = await api.get("/payment-methods");
      setMethods(res);
    } catch (e) {
      console.error(e);
      error("Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "CASH",
      account_number: "",
      account_name: "",
      description: "",
      imageUrl: "",
      qris_data: "",
      is_active: true,
      display_order: methods.length
    });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/payment-methods/${editingId}`, formData);
        success("Payment method updated");
      } else {
        await api.post("/payment-methods", formData);
        success("Payment method created");
      }
      setIsDialogOpen(false);
      loadMethods();
    } catch (e) {
      console.error(e);
      error("Failed to save payment method");
    }
  };

  const handleDelete = async (id) => {
    // Optimistic UI
    const previous = methods;
    setConfirmDeleteId(null);
    setMethods(prev => prev.filter(m => m.id !== id));
    try {
      await api.delete(`/payment-methods/${id}`);
      success("Payment method deleted");
    } catch (e) {
      console.error(e);
      setMethods(previous); // rollback
      error(e?.response?.data?.error || "Failed to delete payment method");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      error("File is too large. Please use an image under 2MB.");
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;
        
        // If type is QRIS, try to extract QR data
        if (formData.type === "QRIS") {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            context.drawImage(img, 0, 0);
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            
            if (code) {
              setFormData(prev => ({ ...prev, imageUrl: base64String, qris_data: code.data }));
              success("QRIS data extracted successfully!");
            } else {
              setFormData(prev => ({ ...prev, imageUrl: base64String }));
              error("Could not find a valid QR code in the image, but image was saved.");
            }
            setUploading(false);
          };
          img.src = base64String;
        } else {
          setFormData({ ...formData, imageUrl: base64String });
          success("Image processed successfully");
          setUploading(false);
        }
      };
      reader.onerror = () => {
        error("Failed to read file");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (e) {
      console.error(e);
      error("Failed to process image");
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Payment Methods</h3>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Method
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">Loading...</TableCell>
                </TableRow>
              ) : methods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-gray-500">No payment methods found</TableCell>
                </TableRow>
              ) : (
                methods.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.display_order}</TableCell>
                    <TableCell>
                      {m.imageUrl ? (
                        <div className="w-10 h-10 rounded border overflow-hidden bg-gray-50">
                          <img src={m.imageUrl} alt={m.name} className="w-full h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded border flex items-center justify-center bg-gray-50 text-gray-400">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{m.name}</TableCell>
                    <TableCell>
                      <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                        {m.type}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-gray-500">
                      {m.account_number && <div>No: {m.account_number}</div>}
                      {m.account_name && <div>Name: {m.account_name}</div>}
                    </TableCell>
                    <TableCell>
                      {m.is_active ? (
                        <span className="flex items-center text-green-600 text-xs">
                          <Check className="w-3 h-3 mr-1" /> Active
                        </span>
                      ) : (
                        <span className="flex items-center text-gray-400 text-xs">
                          <X className="w-3 h-3 mr-1" /> Inactive
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      {confirmDeleteId === m.id ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-xs text-gray-500 mr-1">Delete?</span>
                          <Button variant="destructive" size="sm" className="h-6 px-2 text-xs" onClick={() => handleDelete(m.id)}>Yes</Button>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                        </span>
                      ) : (
                        <>
                          <Button variant="ghost" size="icon" onClick={() => {
                            setFormData({
                              name: m.name,
                              type: m.type,
                              account_number: m.account_number || "",
                              account_name: m.account_name || "",
                              description: m.description || "",
                              imageUrl: m.imageUrl || "",
                              qris_data: m.qris_data || "",
                              is_active: m.is_active,
                              display_order: m.display_order
                            });
                            setEditingId(m.id);
                            setIsDialogOpen(true);
                          }}>
                            <Edit2 className="w-4 h-4 text-emerald-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setConfirmDeleteId(m.id)}>
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
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Payment Method" : "Add Payment Method"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 px-8 py-4">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Name</Label>
                <Input 
                  className="h-11 rounded-xl"
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Bank BCA, QRIS"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Type</Label>
                <Select 
                  className="h-11 rounded-xl"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  options={[
                    { value: "CASH", label: "Cash" },
                    { value: "QRIS", label: "QRIS" },
                    { value: "BANK_TRANSFER", label: "Bank Transfer" },
                    { value: "E_WALLET", label: "E-Wallet" },
                    { value: "OTHER", label: "Other" }
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Account Number (optional)</Label>
                <Input 
                  className="h-11 rounded-xl"
                  value={formData.account_number}
                  onChange={e => setFormData({...formData, account_number: e.target.value})}
                  placeholder="e.g. 12345678"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Account Name (optional)</Label>
                <Input 
                  className="h-11 rounded-xl"
                  value={formData.account_name}
                  onChange={e => setFormData({...formData, account_name: e.target.value})}
                  placeholder="e.g. John Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Description / Instructions</Label>
              <Textarea 
                className="rounded-xl"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Payment instructions..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Image / QR Code</Label>
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <Input 
                    type="file" 
                    accept="image/*" 
                    className="h-11 rounded-xl px-3 py-2 text-xs"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                  {uploading && <p className="text-xs text-emerald-500 mt-1">Uploading...</p>}
                </div>
                {formData.imageUrl && (
                  <div className="w-20 h-20 border-2 border-slate-100 rounded-xl relative bg-slate-50 flex items-center justify-center overflow-hidden">
                    <img src={formData.imageUrl} alt="preview" className="max-w-full max-h-full object-contain" />
                    <button 
                      type="button"
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-lg"
                      onClick={() => setFormData({...formData, imageUrl: ""})}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {formData.type === "QRIS" && (
              <div className="space-y-2 p-4 bg-slate-50 rounded-2xl border border-slate-100 italic">
                <Label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                  <QrCode className="w-4 h-4" /> Base QRIS String
                </Label>
                <div className="flex gap-2">
                  <Textarea 
                    value={formData.qris_data}
                    onChange={e => setFormData({...formData, qris_data: e.target.value})}
                    placeholder="000201010211..."
                    rows={3}
                    className="font-mono text-xs bg-transparent border-none shadow-none focus:ring-0"
                  />
                </div>
                <p className="text-[10px] text-gray-400 font-medium">
                  This string will be used to generate dynamic QR codes with transaction amounts.
                </p>
              </div>
            )}

            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-3">
                <input 
                  type="checkbox" 
                  id="is_active"
                  checked={formData.is_active}
                  onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  className="w-5 h-5 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <Label htmlFor="is_active" className="cursor-pointer font-bold text-slate-700">Active Status</Label>
              </div>
              <div className="flex items-center gap-3 flex-1 justify-end">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Display Order</Label>
                <Input 
                  type="number" 
                  value={formData.display_order}
                  onChange={e => setFormData({...formData, display_order: e.target.value})}
                  className="w-20 h-10 rounded-xl"
                />
              </div>
            </div>

            <DialogFooter className="px-0 mt-8">
              <Button type="button" variant="outline" className="h-12 rounded-xl px-8" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={uploading} className="h-12 rounded-xl px-8 bg-emerald-600 hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-600/20">
                {editingId ? "Update Method" : "Create Method"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
