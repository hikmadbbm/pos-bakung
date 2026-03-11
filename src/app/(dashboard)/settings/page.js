"use client";
import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Printer, RefreshCw, Smartphone, Globe, Plus, Edit2, Trash2, Receipt, Lock, Users } from "lucide-react";
import UsersSettings from "./users/UsersSettings";
import { usePrinter } from "../../../lib/printer-context";
import { api } from "../../../lib/api";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select } from "../../../components/ui/select";
import { useToast } from "../../../components/ui/use-toast";
import { Textarea } from "../../../components/ui/textarea";

export default function SettingsPage() {
  const { device, isConnecting, connect, disconnect } = usePrinter();
  const [activeTab, setActiveTab] = useState("printer");
  const { success, error } = useToast();

  // Platforms State
  const [platforms, setPlatforms] = useState([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(false);
  const [isPlatformDialogOpen, setIsPlatformDialogOpen] = useState(false);
  const [platformFormData, setPlatformFormData] = useState({ name: "", type: "OFFLINE", commission_rate: "0" });
  const [editingPlatformId, setEditingPlatformId] = useState(null);

  // Receipt Settings State
  const [receiptConfig, setReceiptConfig] = useState({
    store_name: "", address: "", phone: "", receipt_footer: ""
  });

  useEffect(() => {
    if (activeTab === "platforms") loadPlatforms();
    if (activeTab === "receipt") loadReceiptConfig();
  }, [activeTab]);

  const loadPlatforms = async () => {
    setLoadingPlatforms(true);
    try {
      const res = await api.get("/platforms");
      setPlatforms(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingPlatforms(false);
    }
  };

  const loadReceiptConfig = async () => {
    try {
      const res = await api.get("/settings/config");
      setReceiptConfig(res);
    } catch (e) {
      console.error(e);
    }
  };

  const saveReceiptConfig = async (e) => {
    e.preventDefault();
    try {
      await api.put("/settings/config", receiptConfig);
      success("Receipt settings saved");
    } catch (e) {
      console.error(e);
      error("Failed to save settings");
    }
  };
  
  // NOTE: PIN management is handled in User Management tab or by admin.
  
  const handlePlatformSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingPlatformId) {
        await api.put(`/platforms/${editingPlatformId}`, platformFormData);
      } else {
        await api.post("/platforms", platformFormData);
      }
      setIsPlatformDialogOpen(false);
      resetPlatformForm();
      loadPlatforms();
      success(editingPlatformId ? "Platform updated" : "Platform added");
    } catch (e) {
      console.error(e);
      error("Failed to save platform");
    }
  };

  const handleDeletePlatform = async (id) => {
    if (!confirm("Delete platform? This will fail if orders exist for this platform.")) return;
    try {
      await api.delete(`/platforms/${id}`);
      loadPlatforms();
      success("Platform deleted");
    } catch (e) {
      console.error(e);
      error("Failed to delete platform");
    }
  };

  const openEditPlatform = (p) => {
    setPlatformFormData({ name: p.name, type: p.type, commission_rate: p.commission_rate.toString() });
    setEditingPlatformId(p.id);
    setIsPlatformDialogOpen(true);
  };

  const resetPlatformForm = () => {
    setPlatformFormData({ name: "", type: "OFFLINE", commission_rate: "0" });
    setEditingPlatformId(null);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold tracking-tight">Settings</h2>

      <div className="flex space-x-2 border-b overflow-x-auto">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "printer" 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("printer")}
        >
          Printer & Devices
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "platforms" 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("platforms")}
        >
          Order Platforms
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "receipt" 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("receipt")}
        >
          Receipt Settings
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "security" 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("security")}
        >
          Security & PIN
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "users" 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("users")}
        >
          User Management
        </button>
      </div>

      {activeTab === "users" && <UsersSettings />}

      {activeTab === "printer" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="w-5 h-5" /> Bluetooth Thermal Printer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="font-medium text-gray-900">Connection Status</h3>
                    <p className="text-sm text-gray-500">
                      {device 
                        ? `Connected to: ${device.name}` 
                        : "Not connected to any printer"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {device ? (
                      <Button variant="destructive" onClick={disconnect}>
                        Disconnect
                      </Button>
                    ) : (
                      <Button onClick={connect} disabled={isConnecting}>
                        {isConnecting ? (
                          <>Connecting...</>
                        ) : (
                          <>
                            <Smartphone className="w-4 h-4 mr-2" /> Connect Printer
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                  <p><strong>Supported Printers:</strong> RP58, MTP-2, MTP-3, and other ESC/POS Bluetooth printers.</p>
                  <p><strong>Note:</strong> Ensure your printer is turned on and paired with your device via Bluetooth settings first if required.</p>
                  <p><strong>Browser Support:</strong> Works best on Chrome (Android/Desktop) or Bluefy (iOS).</p>
                </div>
              </div>

              {device && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.print()}>
                    Test Browser Print
                  </Button>
                  {/* Add Test Print logic here later using context.print() */}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "platforms" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Manage Order Sources</h3>
            <Button onClick={() => { resetPlatformForm(); setIsPlatformDialogOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Platform
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Commission (%)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingPlatforms ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">Loading...</TableCell>
                    </TableRow>
                  ) : platforms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">No platforms found</TableCell>
                    </TableRow>
                  ) : (
                    platforms.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${p.type === 'DELIVERY' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700'}`}>
                            {p.type}
                          </span>
                        </TableCell>
                        <TableCell>{p.commission_rate}%</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditPlatform(p)}>
                            <Edit2 className="w-4 h-4 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeletePlatform(p.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={isPlatformDialogOpen} onOpenChange={setIsPlatformDialogOpen}>
            <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingPlatformId ? "Edit Platform" : "Add Platform"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePlatformSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Platform Name</Label>
                <Input 
                  value={platformFormData.name} 
                  onChange={e => setPlatformFormData({...platformFormData, name: e.target.value})} 
                  placeholder="e.g. GoFood, GrabFood" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select 
                  value={platformFormData.type} 
                  onChange={e => setPlatformFormData({...platformFormData, type: e.target.value})}
                  options={[
                    { value: "OFFLINE", label: "Offline / Take Away" },
                    { value: "DELIVERY", label: "Online Delivery" }
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label>Commission Rate (%)</Label>
                <Input 
                  type="number" 
                  value={platformFormData.commission_rate} 
                  onChange={e => setPlatformFormData({...platformFormData, commission_rate: e.target.value})} 
                  placeholder="0" 
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsPlatformDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Save Platform</Button>
              </DialogFooter>
            </form>
            </DialogContent>
          </Dialog>
        </div>
      )}
      {activeTab === "receipt" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" /> Receipt Customization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveReceiptConfig} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Store Name</Label>
                    <Input 
                      value={receiptConfig.store_name || ""} 
                      onChange={e => setReceiptConfig({...receiptConfig, store_name: e.target.value})} 
                      placeholder="e.g. Bakmie You-Tje" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone Number</Label>
                    <Input 
                      value={receiptConfig.phone || ""} 
                      onChange={e => setReceiptConfig({...receiptConfig, phone: e.target.value})} 
                      placeholder="e.g. 0812-3456-7890" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea 
                    value={receiptConfig.address || ""} 
                    onChange={e => setReceiptConfig({...receiptConfig, address: e.target.value})} 
                    placeholder="Store Address" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Receipt Footer Message</Label>
                  <Textarea 
                    value={receiptConfig.receipt_footer || ""} 
                    onChange={e => setReceiptConfig({...receiptConfig, receipt_footer: e.target.value})} 
                    placeholder="e.g. Thank you for visiting!" 
                  />
                </div>
                <div className="pt-2">
                  <Button type="submit">Save Settings</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "security" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" /> PIN Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Set a PIN code to authorize sensitive actions like cancelling orders or refunding transactions.
                  Please use the <strong>User Management</strong> tab to set PINs for specific users.
                </p>
                
                <div className="bg-yellow-50 p-4 rounded border border-yellow-200">
                  <p className="text-sm text-yellow-700">
                    <strong>Note:</strong> Default PIN for testing: <strong>123456</strong> (if configured).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
