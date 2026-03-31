"use client";
import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select } from "../../../components/ui/select";
import { useToast } from "../../../components/ui/use-toast";
import { Textarea } from "../../../components/ui/textarea";
import { Plus, Edit2, Trash2, Image as ImageIcon, Check, X, QrCode, CreditCard } from "lucide-react";
import { api } from "../../../lib/api";
import jsQR from "jsqr";
import { ResponsiveDataView } from "../../../components/ResponsiveDataView";
import { cn } from "../../../lib/utils";

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
        success("Payment method added");
      }
      setIsDialogOpen(false);
      loadMethods();
    } catch (e) {
      console.error(e);
      error("Failed to save payment method");
    }
  };

  const handleDelete = async (id) => {
    const previous = methods;
    setConfirmDeleteId(null);
    setMethods(prev => prev.filter(m => m.id !== id));
    try {
      await api.delete(`/payment-methods/${id}`);
      success("Payment method deleted");
    } catch (e) {
      console.error(e);
      setMethods(previous);
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
              success("QRIS data extracted!");
            } else {
              setFormData(prev => ({ ...prev, imageUrl: base64String }));
              error("Image uploaded, but no QR code found.");
            }
            setUploading(false);
          };
          img.src = base64String;
        } else {
          setFormData({ ...formData, imageUrl: base64String });
          success("Image uploaded");
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
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">Payment Methods</h3>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Manage Cash, QRIS, and Bank Transfers</p>
        </div>
        <Button onClick={() => { resetForm(); setIsDialogOpen(true); }} className="w-full md:w-auto h-12 px-8 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">
          <Plus className="w-4 h-4 mr-2" /> New Method
        </Button>
      </div>

      <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl border-none p-0">
        <ResponsiveDataView
          loading={loading}
          data={methods}
          emptyMessage="No payment methods found"
          columns={[
            {
              header: "Order",
              accessor: (m) => <span className="font-mono text-slate-400 font-black">#{m.display_order}</span>,
              className: "pl-10 w-20"
            },
            {
              header: "Icon",
              accessor: (m) => (
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden">
                  {m.imageUrl ? (
                    <img src={m.imageUrl} alt={m.name} className="w-full h-full object-contain p-1" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-slate-300" />
                  )}
                </div>
              ),
              className: "w-24"
            },
            {
              header: "Name",
              accessor: (m) => (
                <div className="font-black text-slate-900 uppercase tracking-tight">
                  <p className="text-base">{m.name}</p>
                  <p className="text-[9px] text-slate-400 font-bold tracking-widest mt-1 uppercase">{m.type.replace('_', ' ')}</p>
                </div>
              )
            },
            {
              header: "Details",
              accessor: (m) => (
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                  {m.account_number && <div>{m.account_number}</div>}
                  {m.account_name && <div className="text-slate-400">{m.account_name}</div>}
                </div>
              )
            },
            {
              header: "Status",
              accessor: (m) => (
                <span className={cn(
                  "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                  m.is_active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                )}>
                  {m.is_active ? "ACTIVE" : "INACTIVE"}
                </span>
              )
            },
            {
              header: "Actions",
              accessor: (m) => (
                <div className="flex justify-end gap-2 pr-10">
                   <Button variant="ghost" size="icon" className="h-10 w-10 text-emerald-400 hover:bg-emerald-50 rounded-xl" onClick={() => {
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
                      <Edit2 className="w-4 h-4" />
                   </Button>
                   <Button variant="ghost" size="icon" className="h-10 w-10 text-rose-400 hover:bg-rose-50 rounded-xl" onClick={() => setConfirmDeleteId(m.id)}>
                      <Trash2 className="w-4 h-4" />
                   </Button>
                </div>
              ),
              align: "right"
            }
          ]}
          renderCard={(m) => (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0 border border-slate-800">
                    {m.imageUrl ? (
                      <img src={m.imageUrl} alt={m.name} className="w-full h-full object-contain p-2" />
                    ) : (
                      <CreditCard className="w-7 h-7 text-white opacity-20" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 uppercase tracking-tight text-lg leading-tight">{m.name}</h4>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded mt-1 inline-block">
                       {m.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                   <span className={cn(
                      "px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest",
                      m.is_active ? "text-emerald-600 bg-emerald-50" : "text-slate-400 bg-slate-50"
                   )}>
                      {m.is_active ? "ACTIVE" : "INACTIVE"}
                   </span>
                   <p className="mt-2 text-[10px] font-black text-slate-300 uppercase tracking-widest tabular-nums font-mono">#{m.display_order}</p>
                </div>
              </div>

              {(m.account_number || m.account_name) && (
                <div className="p-4 rounded-xl bg-slate-50 space-y-1">
                   {m.account_number && <p className="text-[11px] font-black text-slate-900 tracking-wider font-mono">{m.account_number}</p>}
                   {m.account_name && <p className="text-[9px] font-bold text-slate-400 uppercase">{m.account_name}</p>}
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-slate-50">
                <Button variant="outline" className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase" onClick={() => {
                   setFormData({...m});
                   setEditingId(m.id);
                   setIsDialogOpen(true);
                }}>Edit</Button>
                <Button variant="ghost" className="h-12 w-12 rounded-xl text-rose-500 hover:bg-rose-50" onClick={() => setConfirmDeleteId(m.id)}>
                   <Trash2 className="w-4.5 h-4.5" />
                </Button>
              </div>
            </div>
          )}
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-[2.5rem] bg-white border-none shadow-2xl flex flex-col max-h-[90dvh]">
          <div className="bg-slate-900 p-10 text-white relative overflow-hidden text-center shrink-0">
             <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-600 rounded-full -translate-y-1/2 translate-x-1/2 opacity-20 blur-3xl" />
             <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/20">
                <CreditCard className="w-8 h-8 text-white" />
             </div>
             <DialogTitle className="text-3xl font-black uppercase tracking-tight relative z-10">{editingId ? "Edit Method" : "New Method"}</DialogTitle>
             <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mt-3 relative z-10">Payment Gateway Details</p>
          </div>

          <form onSubmit={handleSubmit} className="p-10 space-y-8 bg-white flex-1 overflow-y-auto min-h-0 scrollbar-hide">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Name</Label>
                <Input required className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-base uppercase" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Bank BCA, QRIS" />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type</Label>
                <select 
                  className="w-full h-14 rounded-2xl bg-slate-50 border border-slate-100 font-black text-[11px] uppercase tracking-widest px-6 appearance-none cursor-pointer"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                >
                  <option value="CASH">Cash</option>
                  <option value="QRIS">QRIS</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="E_WALLET">E-Wallet</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Number</Label>
                <Input className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-base font-mono" value={formData.account_number} onChange={e => setFormData({...formData, account_number: e.target.value})} placeholder="e.g. 12345678" />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Name</Label>
                <Input className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-base uppercase" value={formData.account_name} onChange={e => setFormData({...formData, account_name: e.target.value})} placeholder="e.g. John Doe" />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Payment Instructions</Label>
              <Textarea className="rounded-2xl bg-slate-50 border-slate-100 p-6 font-bold text-sm uppercase min-h-[100px]" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Enter payment instructions for the customer..." />
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logo / QR Code</Label>
              <div className="p-6 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center gap-6">
                 {formData.imageUrl ? (
                    <div className="relative group">
                       <img src={formData.imageUrl} alt="preview" className="w-40 h-40 object-contain bg-white rounded-xl shadow-lg p-2" />
                       <button 
                          type="button"
                          className="absolute -top-3 -right-3 bg-rose-500 text-white rounded-full p-2 shadow-xl opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100"
                          onClick={() => setFormData({...formData, imageUrl: "", qris_data: ""})}
                       >
                          <X className="w-4 h-4" />
                       </button>
                    </div>
                 ) : (
                    <div className="flex flex-col items-center gap-4 text-center py-4">
                       <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-lg border border-slate-100">
                          <ImageIcon className="w-8 h-8 text-slate-300" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Upload Payment Logo</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-1">Recommended for QRIS & Bank Transfers</p>
                       </div>
                    </div>
                 )}
                 <Input type="file" accept="image/*" onChange={handleFileUpload} disabled={uploading} className="hidden" id="pm-file" />
                 <Button type="button" variant="outline" asChild className="h-12 px-8 rounded-xl bg-white border-slate-200 text-slate-900 font-black text-[9px] uppercase tracking-widest shadow-sm hover:bg-slate-50">
                    <label htmlFor="pm-file" className="cursor-pointer">{uploading ? "PROCCESSING..." : "SELECT IMAGE"}</label>
                 </Button>
              </div>
            </div>

            {formData.type === "QRIS" && (
              <div className="space-y-4 p-8 rounded-[2rem] bg-emerald-50 border border-emerald-100 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center gap-3">
                   <QrCode className="w-6 h-6 text-emerald-600" />
                   <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-800">QRIS Data</Label>
                </div>
                <Textarea value={formData.qris_data} onChange={e => setFormData({...formData, qris_data: e.target.value})} placeholder="000201010211..." rows={4} className="font-mono text-xs bg-white border-emerald-200 p-4 rounded-xl shadow-inner" />
                <p className="text-[9px] font-bold text-emerald-600 uppercase leading-relaxed">Used to generate dynamic QR codes for payments. Usually extracted automatically from uploaded QR image.</p>
              </div>
            )}

            <div className="flex flex-col md:flex-row items-center gap-8 pt-6 border-t border-slate-50">
              <div className="flex items-center gap-4">
                 <button 
                   type="button"
                   onClick={() => setFormData({...formData, is_active: !formData.is_active})}
                   className={cn(
                     "w-12 h-6 rounded-full transition-all relative flex items-center px-1",
                     formData.is_active ? "bg-emerald-500" : "bg-slate-200"
                   )}
                 >
                   <div className={cn("w-4 h-4 bg-white rounded-full shadow-lg transition-all", formData.is_active ? "translate-x-6" : "translate-x-0")} />
                 </button>
                 <Label className="text-[10px] font-black uppercase tracking-widest text-slate-900">Active Status</Label>
              </div>
              <div className="flex-1 flex justify-end items-center gap-4">
                 <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Display Order</Label>
                 <Input type="number" value={formData.display_order} onChange={e => setFormData({...formData, display_order: e.target.value})} className="w-24 h-12 rounded-xl bg-slate-50 border-slate-100 font-black text-center" />
              </div>
            </div>

            <DialogFooter className="pt-6 gap-6">
              <Button type="button" variant="ghost" className="h-14 px-10 rounded-2xl font-black text-[10px] uppercase text-slate-400" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={uploading} className="h-14 px-12 rounded-2xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest shadow-2xl">Save Method</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
