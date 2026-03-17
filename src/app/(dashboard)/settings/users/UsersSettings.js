"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "../../../../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { Button } from "../../../../components/ui/button";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../../components/ui/dialog";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Select } from "../../../../components/ui/select";
import { useToast } from "../../../../components/ui/use-toast";
import { Plus, Edit2, Trash2, Key } from "lucide-react";

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
    } finally {
      setLoading(false);
    }
  }, [error]);

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
        password: "", // Don't show password
        role: user.role,
        pin: "", // Don't show PIN
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
        success("User updated successfully");
      } else {
        await api.post("/users", formData);
        success("User created successfully");
      }
      setIsDialogOpen(false);
      loadUsers();
    } catch (e) {
      console.error(e);
      error(e.response?.data?.error || "Operation failed");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resetPassData.newPassword) return;
    try {
      await api.post(`/users/${resetPassData.id}/reset-password`, { 
        newPassword: resetPassData.newPassword 
      });
      success("Password reset successfully");
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Manage Staff Accounts</h3>
          <p className="text-sm text-gray-500">Create and manage user access.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" /> Add User
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">Loading...</TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">No users found.</TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.name}
                      {user.employee_id && <span className="block text-xs text-gray-400">#{user.employee_id}</span>}
                    </TableCell>
                    <TableCell>{user.username}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                        user.role === 'OWNER' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        user.role === 'MANAGER' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === 'ACTIVE' ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'
                      }`}>
                        {user.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-500 text-sm">
                      {user.last_login ? new Date(user.last_login).toLocaleString() : "Never"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setResetPassData({ id: user.id, newPassword: "" });
                          setIsResetPassOpen(true);
                        }} title="Reset Password">
                          <Key className="w-4 h-4 text-orange-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(user)}>
                          <Edit2 className="w-4 h-4 text-emerald-500" />
                        </Button>
                        {confirmDeleteId === user.id ? (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-xs text-gray-500 mr-1">{user.status === 'ACTIVE' ? 'Disable?' : 'Enable?'}</span>
                            <Button 
                              variant={user.status === 'ACTIVE' ? 'destructive' : 'default'} 
                              size="sm" 
                              className="h-6 px-2 text-xs" 
                              onClick={() => handleDisableUser(user)}
                            >
                              Yes
                            </Button>
                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setConfirmDeleteId(null)}>Cancel</Button>
                          </span>
                        ) : (
                          <Button variant="ghost" size="icon" onClick={() => setConfirmDeleteId(user.id)}>
                            <Trash2 className={`w-4 h-4 ${user.status === 'ACTIVE' ? 'text-red-500' : 'text-green-500'}`} />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit User" : "Create User"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 px-8 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Full Name</Label>
              <Input required className="h-11 rounded-xl" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Employee ID (Optional)</Label>
              <Input className="h-11 rounded-xl" value={formData.employee_id} onChange={(e) => setFormData({...formData, employee_id: e.target.value})} />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Username</Label>
            <Input required className="h-11 rounded-xl" value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Email</Label>
            <Input required type="email" className="h-11 rounded-xl" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>

          {!editingUser && (
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Password</Label>
              <Input required type="password" className="h-11 rounded-xl" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Role</Label>
              <Select 
                className="h-11 rounded-xl"
                value={formData.role} 
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                options={[
                  { value: "CASHIER", label: "Cashier" },
                  { value: "KITCHEN", label: "Kitchen" },
                  { value: "MANAGER", label: "Manager" },
                  { value: "OWNER", label: "Owner" }
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Phone Number</Label>
              <Input className="h-11 rounded-xl" value={formData.phone_number} onChange={(e) => setFormData({...formData, phone_number: e.target.value})} />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">PIN (for Quick Login)</Label>
            <Input 
              type="password" 
              maxLength={6} 
              className="h-11 rounded-xl"
              placeholder={editingUser ? "Leave blank to keep current" : "Optional"} 
              value={formData.pin} 
              onChange={(e) => setFormData({...formData, pin: e.target.value})} 
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Notes</Label>
            <Input className="h-11 rounded-xl" value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
          </div>

          <DialogFooter className="px-0 mt-8">
            <Button type="button" variant="outline" className="h-12 rounded-xl px-8" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button type="submit" className="h-12 rounded-xl px-8 bg-emerald-600 hover:bg-emerald-700 font-bold">{editingUser ? "Update User" : "Create User"}</Button>
          </DialogFooter>
        </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isResetPassOpen} onOpenChange={setIsResetPassOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-6 px-8 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">New Password</Label>
            <Input required type="password" className="h-11 rounded-xl" value={resetPassData.newPassword} onChange={(e) => setResetPassData({...resetPassData, newPassword: e.target.value})} />
          </div>
          <DialogFooter className="px-0 mt-6">
            <Button type="button" variant="outline" className="h-12 rounded-xl" onClick={() => setIsResetPassOpen(false)}>Cancel</Button>
            <Button type="submit" className="h-12 rounded-xl bg-orange-600 hover:bg-orange-700 font-bold">Reset Password</Button>
          </DialogFooter>
        </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
