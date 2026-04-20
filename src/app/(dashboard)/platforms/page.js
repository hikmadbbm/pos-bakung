"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Plus, Trash2, Edit2, Globe } from "lucide-react";
import { useToast } from "../../../components/ui/use-toast";
import { ResponsiveDataView } from "../../../components/ResponsiveDataView";
import { useTranslation } from "../../../lib/language-context";
import { cn } from "../../../lib/utils";

export default function PlatformsPage() {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", type: "OFFLINE", commission_rate: "0", additional_fee: "0" });
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
      success(t(isEditing ? 'platforms.channel_updated' : 'platforms.channel_added'));
    } catch (e) {
      console.error(e);
      error(t('platforms.fail_save'));
    }
  };

  const handleDelete = async (id) => {
    const previous = platforms;
    setConfirmDeleteId(null);
    setPlatforms(prev => prev.filter(p => p.id !== id));
    try {
      await api.delete(`/platforms/${id}`);
      success(t('platforms.channel_deleted'));
    } catch (e) {
      console.error(e);
      setPlatforms(previous);
      error(t('platforms.fail_delete'));
    }
  };

  const openEdit = (p) => {
    setFormData({ 
      name: p.name, 
      type: p.type, 
      commission_rate: p.commission_rate.toString(),
      additional_fee: (p.additional_fee || 0).toString()
    });
    setIsEditing(p.id);
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({ name: "", type: "OFFLINE", commission_rate: "0", additional_fee: "0" });
    setIsEditing(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20 px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 print:hidden pb-2">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase italic">{t('platforms.title')}</h2>
          <div className="flex items-center gap-2.5 mt-2">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{t('platforms.subtitle')}</p>
          </div>
        </div>
        <Button 
          onClick={openCreate} 
          className="w-full md:w-auto h-14 px-10 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] bg-slate-900 text-white hover:bg-black shadow-2xl shadow-slate-200 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4 mr-3" /> {t('platforms.add_channel')}
        </Button>
      </div>

      <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl border-none p-0 animate-in fade-in duration-700">
        <ResponsiveDataView
          loading={loading}
          data={platforms}
          emptyMessage={t('platforms.no_channels')}
          columns={[
            {
              header: t('platforms.channel_name'),
              accessor: (p) => (
                <div className="py-2">
                  <span className="font-black text-slate-900 uppercase tracking-tight text-base group-hover:text-indigo-600 transition-colors">
                    {p.name}
                  </span>
                </div>
              ),
              className: "pl-10"
            },
            {
              header: t('common.category'),
              accessor: (p) => (
                <span className={cn(
                  "inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shadow-sm border whitespace-nowrap",
                  p.type === 'DELIVERY' 
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                )}>
                  {p.type === 'DELIVERY' ? t('platforms.online_delivery') : t('platforms.direct')}
                </span>
              )
            },
            {
              header: t('platforms.commission_rate'),
              accessor: (p) => (
                <div className="flex flex-col">
                  <span className="font-black text-slate-900 text-xl tabular-nums tracking-tighter">
                    {p.commission_rate}<span className="text-[10px] ml-1 text-slate-300 font-bold">%</span>
                  </span>
                  {p.additional_fee > 0 && (
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                      + IDR {p.additional_fee.toLocaleString()} {t('platforms.additional_fee')}
                    </span>
                  )}
                </div>
              )
            },
            {
              header: t('common.actions'),
              accessor: (p) => (
                confirmDeleteId === p.id ? (
                  <div className="flex flex-col items-end gap-2 pr-2">
                     <div className="flex gap-2 bg-rose-50 p-2 rounded-2xl border border-rose-100 shadow-xl shadow-rose-100/50">
                        <Button variant="destructive" size="sm" className="h-9 px-5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 active:scale-95" onClick={() => handleDelete(p.id)}>{t('common.delete')}</Button>
                        <Button variant="ghost" size="sm" className="h-9 px-5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-100 text-rose-500" onClick={() => setConfirmDeleteId(null)}>{t('common.cancel')}</Button>
                     </div>
                  </div>
                ) : (
                  <div className="flex justify-end gap-2 pr-2">
                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-[1.25rem] hover:bg-slate-100 hover:shadow-xl transition-all active:scale-90" onClick={() => openEdit(p)}>
                      <Edit2 className="w-4.5 h-4.5 text-slate-400 group-hover:text-slate-900" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-12 w-12 rounded-[1.25rem] hover:bg-rose-50 hover:shadow-xl group/del transition-all active:scale-90" onClick={() => setConfirmDeleteId(p.id)}>
                      <Trash2 className="w-4.5 h-4.5 text-slate-300 group-hover/del:text-rose-500" />
                    </Button>
                  </div>
                )
              ),
              align: "right",
              className: "pr-10"
            }
          ]}
          renderCard={(p) => (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl">
                      <Globe className="w-6 h-6" />
                   </div>
                   <div>
                    <p className="font-black text-slate-900 uppercase tracking-tight text-lg">{p.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                      {p.type === 'DELIVERY' ? t('platforms.online_delivery') : t('platforms.direct')}
                    </p>
                   </div>
                </div>
                <div className="flex flex-col items-end">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('platforms.commission')}</p>
                   <p className="font-black text-indigo-600 text-xl tracking-tighter tabular-nums">{p.commission_rate}<span className="text-xs ml-0.5">%</span></p>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-50">
                <Button variant="outline" className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase" onClick={() => openEdit(p)}>{t('common.edit')}</Button>
                <Button variant="ghost" className="h-12 w-12 rounded-xl text-rose-500 hover:bg-rose-50" onClick={() => setConfirmDeleteId(p.id)}><Trash2 className="w-4.5 h-4.5" /></Button>
              </div>
            </div>
          )}
        />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden bg-white animate-in zoom-in-95 duration-300">
          <div className="bg-slate-900 p-10 text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600 rounded-full -translate-y-1/2 translate-x-1/2 opacity-20 blur-3xl" />
             <DialogTitle className="text-3xl font-black text-white uppercase tracking-tight relative z-10">
               {isEditing ? t('platforms.edit_channel') : t('platforms.new_channel')}
             </DialogTitle>
             <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mt-3 relative z-10">{t('platforms.config')}</p>
          </div>

          <form onSubmit={handleSubmit} className="p-10 space-y-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('platforms.channel_name')}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-base"
                placeholder="e.g. GOFOOD / GRABFOOD"
              />
            </div>
            
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('platforms.channel_type')}</Label>
              <select
                className="w-full h-14 rounded-2xl bg-slate-50 border border-slate-100 font-black text-[11px] uppercase tracking-widest px-6"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="OFFLINE">{t('platforms.in_store')}</option>
                <option value="ONLINE">{t('platforms.online')}</option>
                <option value="DELIVERY">{t('platforms.online_delivery')}</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                  {t('platforms.commission_rate')}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.commission_rate}
                    onChange={(e) => setFormData({ ...formData, commission_rate: e.target.value })}
                    required
                    className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-xl pl-12 text-indigo-700"
                  />
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-300 font-black text-base">%</span>
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                  {t('platforms.additional_fee')}
                </Label>
                <Input
                  type="number"
                  value={formData.additional_fee}
                  onChange={(e) => setFormData({ ...formData, additional_fee: e.target.value })}
                  required
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-lg text-slate-900"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-6 pt-6 border-t border-slate-50">
              <Button type="button" variant="ghost" className="h-14 px-10 rounded-2xl font-black text-[10px] uppercase text-slate-400" onClick={() => setIsDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" className="h-14 px-12 rounded-2xl font-black bg-slate-900 text-white">{t('platforms.save_channel')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
