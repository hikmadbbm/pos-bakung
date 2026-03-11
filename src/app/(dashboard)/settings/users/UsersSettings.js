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

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/users");
      setUsers(res);
    } catch (e) {
      console.error(e);
      error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [error]);

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
    if (!confirm(`Are you sure you want to ${user.status === 'ACTIVE' ? 'disable' : 'enable'} ${user.name}?`)) return;
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
                        user.role === 'MANAGER' ? 'bg-blue-50 text-blue-700 border-blue-200' :
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
                          <Edit2 className="w-4 h-4 text-blue-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDisableUser(user)}>
                          <Trash2 className={`w-4 h-4 ${user.status === 'ACTIVE' ? 'text-red-500' : 'text-green-500'}`} />
                        </Button>
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
          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Employee ID (Optional)</Label>
              <Input value={formData.employee_id} onChange={(e) => setFormData({...formData, employee_id: e.target.value})} />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Username</Label>
            <Input required value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input required type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
          </div>

          {!editingUser && (
            <div className="space-y-2">
              <Label>Password</Label>
              <Input required type="password" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})}>
                <option value="CASHIER">Cashier</option>
                <option value="KITCHEN">Kitchen</option>
                <option value="MANAGER">Manager</option>
                <option value="OWNER">Owner</option>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input value={formData.phone_number} onChange={(e) => setFormData({...formData, phone_number: e.target.value})} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>PIN (for Quick Login)</Label>
            <Input 
              type="password" 
              maxLength={6} 
              placeholder={editingUser ? "Leave blank to keep current" : "Optional"} 
              value={formData.pin} 
              onChange={(e) => setFormData({...formData, pin: e.target.value})} 
            />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button type="submit">{editingUser ? "Update" : "Create"}</Button>
          </DialogFooter>
        </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isResetPassOpen} onOpenChange={setIsResetPassOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
          <div className="space-y-2">
            <Label>New Password</Label>
            <Input required type="password" value={resetPassData.newPassword} onChange={(e) => setResetPassData({...resetPassData, newPassword: e.target.value})} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsResetPassOpen(false)}>Cancel</Button>
            <Button type="submit">Reset Password</Button>
          </DialogFooter>
        </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
