"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "../../../../lib/api";
import { Button } from "../../../../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../../components/ui/dialog";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Select } from "../../../../components/ui/select";
import { useToast } from "../../../../components/ui/use-toast";
import { Plus, Edit2, Trash2, Key, UserCircle } from "lucide-react";
import { ResponsiveDataView } from "../../../../components/ResponsiveDataView";
import { cn } from "../../../../lib/utils";

export default function UsersSettings() {
  const { success, error } = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isResetPassOpen, setIsResetPassOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  
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
        success("Staff updated");
      } else {
        await api.post("/users", formData);
        success("Staff added");
      }
      setIsDialogOpen(false);
      loadUsers();
    } catch (e) {
      console.error(e);
      error(e.response?.data?.error || "Failed to save staff");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPassData.newPassword) return;
    try {
      await api.post(`/users/${resetPassData.id}/reset-password`, { 
        newPassword: resetPassData.newPassword 
      });
      success("Password reset successful");
      setIsResetPassOpen(false);
      setResetPassData({ id: null, newPassword: "" });
    } catch (e) {
      console.error(e);
      error("Failed to reset password");
    }
  };

  const handleDisableUser = async (user) => {
    setConfirmDeleteId(null);
    try {
      await api.put(`/users/${user.id}`, { 
        status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' 
      });
      loadUsers();
      success(`User ${user.status === 'ACTIVE' ? 'disabled' : 'enabled'}`);
    } catch (e) {
      console.error(e);
      error("Failed to update status");
    }
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">Staff Management</h3>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Manage your team and their access levels</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="w-full md:w-auto h-12 px-8 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all">
          <Plus className="w-4 h-4 mr-2" /> New Staff
        </Button>
      </div>

      <div className="glass-card rounded-[2.5rem] overflow-hidden shadow-2xl border-none p-0">
        <ResponsiveDataView
          loading={loading}
          data={users}
          emptyMessage="No staff found"
          columns={[
            {
              header: "Name",
              accessor: (user) => (
                <div className="font-black text-slate-900 uppercase tracking-tight">
                  <p className="text-base">{user.name}</p>
                  {user.employee_id && <p className="text-[9px] text-slate-400 font-bold tracking-widest mt-1">ID: #{user.employee_id}</p>}
                </div>
              ),
              className: "pl-10"
            },
            {
              header: "Username",
              accessor: (user) => <span className="text-slate-500 font-bold">{user.username}</span>
            },
            {
              header: "Role",
              accessor: (user) => (
                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                  user.role === 'OWNER' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                  user.role === 'MANAGER' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                  'bg-slate-50 text-slate-600 border-slate-100'
                }`}>
                  {user.role}
                </span>
              )
            },
            {
              header: "Status",
              accessor: (user) => (
                <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${
                  user.status === 'ACTIVE' ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'
                }`}>
                  {user.status}
                </span>
              )
            },
            {
              header: "Last Active",
              accessor: (user) => (
                <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  {user.last_login ? new Date(user.last_login).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : "Never"}
                </span>
              )
            },
            {
              header: "Actions",
              accessor: (user) => (
                <div className="flex justify-end gap-2 pr-10">
                   <Button variant="ghost" size="icon" className="h-10 w-10 text-orange-400 hover:bg-orange-50 rounded-xl" onClick={() => {
                      setResetPassData({ id: user.id, newPassword: "" });
                      setIsResetPassOpen(true);
                   }}>
                      <Key className="w-4 h-4" />
                   </Button>
                   <Button variant="ghost" size="icon" className="h-10 w-10 text-emerald-400 hover:bg-emerald-50 rounded-xl" onClick={() => handleOpenDialog(user)}>
                      <Edit2 className="w-4 h-4" />
                   </Button>
                   <Button variant="ghost" size="icon" className={cn("h-10 w-10 rounded-xl", user.status === 'ACTIVE' ? "text-rose-300 hover:bg-rose-50 hover:text-rose-600" : "text-emerald-300 hover:bg-emerald-50 hover:text-emerald-600")} onClick={() => handleDisableUser(user)}>
                      <Trash2 className="w-4 h-4" />
                   </Button>
                </div>
              ),
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
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">@{user.username}</p>
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
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : "NEVER"}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-50">
                <Button variant="outline" className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase" onClick={() => handleOpenDialog(user)}>Edit</Button>
                <Button variant="outline" className="h-12 w-12 rounded-xl text-orange-500" onClick={() => {
                    setResetPassData({ id: user.id, newPassword: "" });
                    setIsResetPassOpen(true);
                }}><Key className="w-4.5 h-4.5" /></Button>
                <Button variant="ghost" className={cn("h-12 w-12 rounded-xl", user.status === 'ACTIVE' ? "text-rose-500 hover:bg-rose-50" : "text-emerald-500 hover:bg-emerald-50")} onClick={() => handleDisableUser(user)}>
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
             <DialogTitle className="text-3xl font-black uppercase tracking-tight relative z-10">{editingUser ? "Edit Staff" : "New Staff"}</DialogTitle>
             <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mt-3 relative z-10">Account Details</p>
          </div>

          <form onSubmit={handleSubmit} className="p-10 space-y-8 bg-white flex-1 overflow-y-auto min-h-0 scrollbar-hide">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Name</Label>
                <Input required className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-base" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Full Name" />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Employee ID</Label>
                <Input className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-base" value={formData.employee_id} onChange={(e) => setFormData({...formData, employee_id: e.target.value})} placeholder="Ex: EMP-001" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Username</Label>
                <Input required className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-base" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} placeholder="username" />
              </div>
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Role</Label>
                <select 
                  className="w-full h-14 rounded-2xl bg-slate-50 border border-slate-100 font-black text-[11px] uppercase tracking-widest px-6 appearance-none cursor-pointer"
                  value={formData.role} 
                  onChange={(e) => setFormData({...formData, role: e.target.value})}
                >
                  <option value="CASHIER">Cashier</option>
                  <option value="KITCHEN">Kitchen</option>
                  <option value="MANAGER">Manager</option>
                  <option value="OWNER">Owner</option>
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email</Label>
              <Input required type="email" className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-base" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} placeholder="email@example.com" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {!editingUser && (
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Password</Label>
                  <Input required type="password" className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-base" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
                </div>
              )}
              <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Login PIN (6 Digits)</Label>
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
              <Button type="button" variant="ghost" className="h-14 px-10 rounded-2xl font-black text-[10px] uppercase text-slate-400" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="h-14 px-12 rounded-2xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest shadow-xl">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isResetPassOpen} onOpenChange={setIsResetPassOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-[2.5rem] bg-white border-none shadow-2xl">
          <div className="bg-orange-600 p-8 text-white text-center relative overflow-hidden md:max-w-md mx-auto">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
             <DialogTitle className="text-2xl font-black uppercase tracking-tight relative z-10">Reset Password</DialogTitle>
          </div>
          <form onSubmit={handleResetPassword} className="p-8 space-y-6">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">New Password</Label>
              <Input required type="password" className="h-14 rounded-2xl bg-slate-50 border-slate-100 font-black text-base" value={resetPassData.newPassword} onChange={(e) => setResetPassData({...resetPassData, newPassword: e.target.value})} />
            </div>
            <DialogFooter className="pt-4 gap-4">
              <Button type="button" variant="ghost" className="flex-1 h-14 rounded-2xl font-black uppercase text-[10px] text-slate-400" onClick={() => setIsResetPassOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-1 h-14 rounded-2xl bg-orange-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl">Reset</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
