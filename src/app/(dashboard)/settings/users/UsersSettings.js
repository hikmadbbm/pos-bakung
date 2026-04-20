"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "../../../../lib/api";
import { Button } from "../../../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../../components/ui/dialog";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Select } from "../../../../components/ui/select";
import { useToast } from "../../../../components/ui/use-toast";
import { Plus, Edit2, Trash2, Key, UserCircle, Lock } from "lucide-react";
import { ResponsiveDataView } from "../../../../components/ResponsiveDataView";
import { cn } from "../../../../lib/utils";
import { useTranslation } from "../../../../lib/language-context";

export default function UsersSettings() {
  const { t, language } = useTranslation();
  const { success, error } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isResetPassOpen, setIsResetPassOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }
  }, []);
  
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "CASHIER",
    pin: "",
    phone_number: "",
    employee_id: "",
    notes: ""
  });

  const [resetPassData, setResetPassData] = useState({ id: null, newPassword: "" });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      setUsers(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleOpenDialog = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        name: user.name,
        username: user.username,
        email: user.email,
        password: "",
        role: user.role,
        pin: "",
        phone_number: user.phone_number || "",
        employee_id: user.employee_id || "",
        notes: user.notes || ""
      });
    } else {
      setEditingUser(null);
      setFormData({
        name: "",
        username: "",
        email: "",
        password: "",
        role: "CASHIER",
        pin: "",
        phone_number: "",
        employee_id: "",
        notes: ""
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, formData);
        success(t('users.success_update'));
      } else {
        await api.post("/users", formData);
        success(t('users.success_add'));
      }
      setIsDialogOpen(false);
      loadUsers();
    } catch (e) {
      console.error(e);
      error(e.response?.data?.error || t('users.fail_save'));
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPassData.newPassword) return;
    try {
      await api.post(`/users/${resetPassData.id}/reset-password`, { 
        newPassword: resetPassData.newPassword 
      });
      success(t('users.success_reset'));
      setIsResetPassOpen(false);
      setResetPassData({ id: null, newPassword: "" });
    } catch (e) {
      console.error(e);
      error(t('users.fail_reset'));
    }
  };

  const handleDisableUser = async (user) => {
    try {
      await api.put(`/users/${user.id}`, { 
        status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' 
      });
      loadUsers();
      success(`${t('users.status')} ${user.status === 'ACTIVE' ? t('common.offline') : t('common.online')}`);
    } catch (e) {
      console.error(e);
      error(t('common.update_fail'));
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      success(t('users.success_delete') || 'User deleted successfully');
      setIsDeleteDialogOpen(false);
      setDeleteTarget(null);
      loadUsers();
    } catch (e) {
      console.error(e);
      error(t('common.delete_fail') || 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">{t('users.title')}</h3>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">{t('users.subtitle')}</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="w-full md:w-auto h-12 px-8 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">
          <Plus className="w-4 h-4 mr-2" /> {t('users.new_staff')}
        </Button>
      </div>

      <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl border-none p-0">
        <ResponsiveDataView
          loading={loading}
          data={users}
          emptyMessage={t('users.no_staff')}
          columns={[
            {
              header: t('users.name'),
              accessor: (user) => (
                <div className="font-black text-slate-900 uppercase tracking-tight">
                  <p className="text-base">{user.name}</p>
                  <p className="text-[9px] text-slate-400 font-bold tracking-widest mt-1 uppercase">{t(`users.roles.${user.role.toLowerCase()}`) || user.role}</p>
                </div>
              ),
              sortKey: "name",
              className: "pl-10"
            },
            {
              header: t('users.username'),
              accessor: (user) => <span className="text-slate-500 font-bold">{user.username}</span>,
              sortKey: "username"
            },
            {
              header: t('users.role'),
              accessor: (user) => (
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                  user.role === 'OWNER' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                  user.role === 'MANAGER' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  'bg-slate-50 text-slate-600 border-slate-100'
                }`}>
                  {t(`users.roles.${user.role.toLowerCase()}`) || user.role}
                </span>
              ),
              sortKey: "role"
            },
            {
              header: t('users.status'),
              accessor: (user) => (
                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                  user.status === 'ACTIVE' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'
                }`}>
                  {user.status}
                </span>
              ),
              sortKey: "status"
            },
            {
              header: t('users.last_active'),
              accessor: (user) => (
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  {user.last_login ? new Date(user.last_login).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : t('users.never')}
                </span>
              ),
              sortKey: "last_login"
            },
            {
              header: t('common.actions'),
              sortable: false,
              accessor: (user) => {
                const isTargetOwner = user.role === 'OWNER';
                
                return (
                  <div className="flex justify-end gap-2 pr-10">
                     <Button 
                       variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:bg-slate-100 rounded-xl" 
                       onClick={() => handleOpenDialog(user)}
                       disabled={isTargetOwner && currentUser?.id !== user.id}
                     >
                        <Edit2 className="w-4 h-4" />
                     </Button>
                     <Button 
                       variant="ghost" size="icon" className="h-10 w-10 text-orange-400 hover:bg-orange-50 rounded-xl" 
                       onClick={() => {
                          setResetPassData({ id: user.id, newPassword: "" });
                          setIsResetPassOpen(true);
                       }}
                       disabled={isTargetOwner && currentUser?.id !== user.id}
                     >
                        <Key className="w-4 h-4" />
                     </Button>
                     <Button 
                       variant="ghost" size="icon" className={cn("h-10 w-10 rounded-xl", user.status === 'ACTIVE' ? "text-slate-400 hover:bg-slate-50" : "text-rose-500 hover:bg-rose-50")} 
                       onClick={() => handleDisableUser(user)}
                       disabled={isTargetOwner}
                     >
                        {user.status === 'ACTIVE' ? <Key className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                     </Button>
                     <Button 
                       variant="ghost" size="icon" className="h-10 w-10 text-rose-500 hover:bg-rose-50 rounded-xl" 
                       onClick={() => {
                          setDeleteTarget(user);
                          setIsDeleteDialogOpen(true);
                       }}
                       disabled={isTargetOwner}
                     >
                        <Trash2 className="w-4 h-4" />
                     </Button>
                  </div>
                );
              },
              align: "right"
            }
          ]}
          renderCard={(user) => (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center shrink-0">
                    <UserCircle className="w-7 h-7 text-white opacity-20" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-900 uppercase tracking-tight text-lg leading-tight">{user.name}</h4>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded mt-1 inline-block">
                       {t(`users.roles.${user.role.toLowerCase()}`) || user.role}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                    user.role === 'OWNER' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                    user.role === 'MANAGER' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                    'bg-slate-50 text-slate-600 border-slate-100'
                  }`}>
                    {user.role}
                  </span>
                  <div className="mt-2 text-[8px] font-black text-slate-400 uppercase tracking-widest tabular-nums">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString(language === 'id' ? 'id-ID' : 'en-GB') : t('users.never')}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-50">
                <Button variant="outline" className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase" onClick={() => handleOpenDialog(user)}>{t('common.edit')}</Button>
                <Button variant="outline" className="h-12 w-12 rounded-xl text-orange-500" onClick={() => {
                    setResetPassData({ id: user.id, newPassword: "" });
                    setIsResetPassOpen(true);
                }}><Key className="w-4.5 h-4.5" /></Button>
                 <Button variant="outline" className={cn("h-12 w-12 rounded-xl", user.status === 'ACTIVE' ? "text-slate-500" : "text-rose-500")} onClick={() => handleDisableUser(user)}>
                    {user.status === 'ACTIVE' ? <Key className="w-4.5 h-4.5" /> : <Lock className="w-4.5 h-4.5" />}
                 </Button>
                 <Button variant="ghost" className="h-12 w-12 rounded-xl text-rose-500 hover:bg-rose-50" onClick={() => {
                    setDeleteTarget(user);
                    setIsDeleteDialogOpen(true);
                 }}>
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
                <UserCircle className="w-8 h-8 text-white" />
             </div>
             <DialogTitle className="text-3xl font-black uppercase tracking-tight relative z-10 text-white">{editingUser ? t('users.edit_staff') : t('users.new_staff')}</DialogTitle>
             <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mt-3 relative z-10">{t('common.profile')}</p>
          </div>

          <form onSubmit={handleSubmit} className="p-10 space-y-8 bg-white flex-1 overflow-y-auto min-h-0 scrollbar-hide">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/70 ml-1">{t('users.name')}</Label>
                <Input required className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-base focus:ring-4 focus:ring-slate-900/5 transition-all" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder={t('users.name')} />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/70 ml-1">Employee ID</Label>
                <Input className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-base focus:ring-4 focus:ring-slate-900/5 transition-all" value={formData.employee_id} onChange={(e) => setFormData({...formData, employee_id: e.target.value})} placeholder="Ex: EMP-001" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/70 ml-1">{t('users.username')}</Label>
                <Input required className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-base focus:ring-4 focus:ring-slate-900/5 transition-all" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} placeholder="username" />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/70 ml-1">Role</Label>
                <div className="relative">
                  <select 
                    className="w-full h-14 rounded-2xl bg-slate-50 border border-slate-100 font-black text-[11px] uppercase tracking-widest px-6 appearance-none cursor-pointer focus:ring-4 focus:ring-slate-900/5 transition-all"
                    value={formData.role} 
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="ADMIN">{t('users.roles.admin') || 'ADMIN'}</option>
                    <option value="MANAGER">{t('users.roles.manager') || 'MANAGER'}</option>
                    <option value="CASHIER">{t('users.roles.cashier') || 'CASHIER'}</option>
                    <option value="KITCHEN">{t('users.roles.kitchen') || 'KITCHEN'}</option>
                    <option value="WAITER">{t('users.roles.waiter') || 'WAITER'}</option>
                    <option value="STAFF">{t('users.roles.staff') || 'STAFF'}</option>
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-black">↓</div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/70 ml-1">Email</Label>
              <Input type="email" className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-base focus:ring-4 focus:ring-slate-900/5 transition-all" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="email@example.com" />
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/70 ml-1">Phone Number (WhatsApp)</Label>
              <Input className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-base focus:ring-4 focus:ring-slate-900/5 transition-all" value={formData.phone_number} onChange={(e) => setFormData({...formData, phone_number: e.target.value})} placeholder="Ex: 0812XXXXXXXX" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {!editingUser && (
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/70 ml-1">{t('users.password')}</Label>
                  <Input required type="password" className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-base focus:ring-4 focus:ring-slate-900/5 transition-all" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                </div>
              )}
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/70 ml-1">{t('users.pin')}</Label>
                <Input 
                  type="password" 
                  maxLength={6} 
                  className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-2xl tracking-[0.5em] text-center"
                  placeholder={editingUser ? "••••••" : ""} 
                  value={formData.pin} 
                  onChange={(e) => setFormData({...formData, pin: e.target.value})} 
                />
              </div>
            </div>

            <DialogFooter className="pt-6 flex justify-between gap-6 border-t border-slate-50">
              <Button type="button" variant="ghost" className="h-14 px-10 rounded-2xl font-black text-[10px] uppercase text-slate-400" onClick={() => setIsDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" className="h-14 px-12 rounded-2xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest shadow-xl">{t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isResetPassOpen} onOpenChange={setIsResetPassOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-[3rem] bg-white border-none shadow-2xl">
          <div className="bg-slate-900 p-10 text-white text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
             <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                <Key className="w-6 h-6 text-emerald-400" />
             </div>
             <DialogTitle className="text-2xl font-black uppercase tracking-tight relative z-10 leading-none">{t('users.reset_password')}</DialogTitle>
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-3 opacity-60">Authentication Override Portal</p>
          </div>
          <form onSubmit={handleResetPassword} className="p-10 space-y-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">{t('users.new_password')}</Label>
              <Input 
                required 
                type="password" 
                className="h-16 rounded-2xl bg-slate-50 border-slate-100 font-black text-xl tracking-[0.2em] text-center focus:ring-4 focus:ring-emerald-500/10 transition-all" 
                value={resetPassData.newPassword} 
                onChange={(e) => setResetPassData({...resetPassData, newPassword: e.target.value})} 
                placeholder="••••••"
              />
            </div>
            <div className="flex gap-4 pt-2">
              <Button type="button" variant="ghost" className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-300 hover:text-rose-500" onClick={() => setIsResetPassOpen(false)}>{t('common.discard')}</Button>
              <Button type="submit" className="flex-[2] h-14 rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all">
                {t('common.save')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-[2.5rem] bg-white border-none shadow-2xl">
          <div className="bg-rose-600 p-10 text-white text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
             <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                <Trash2 className="w-6 h-6 text-white" />
             </div>
             <DialogTitle className="text-2xl font-black uppercase tracking-tight relative z-10 leading-none">{t('common.delete') || 'Delete User'}</DialogTitle>
             <p className="text-[9px] font-black text-rose-200 uppercase tracking-[0.2em] mt-3 opacity-60">Permanent Record Removal</p>
          </div>
          <div className="p-10 space-y-6 text-center">
            <p className="text-sm font-bold text-slate-600 leading-relaxed italic">
              {t('users.confirm_delete_msg') || `Are you sure you want to permanently delete user "${deleteTarget?.name}"? This action cannot be undone.`}
            </p>
            <div className="flex gap-4 pt-4">
              <Button type="button" variant="ghost" className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-300 hover:text-slate-900" onClick={() => setIsDeleteDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={handleDeleteUser} className="flex-[2] h-14 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[10px] tracking-[0.2em] shadow-xl active:scale-95 transition-all">
                {t('common.delete') || 'DELETE'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
