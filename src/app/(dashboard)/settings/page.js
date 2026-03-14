"use client";
import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Printer, RefreshCw, Smartphone, Globe, Plus, Edit2, Trash2, Receipt, Lock, Users, Upload, FileText } from "lucide-react";
import UsersSettings from "./users/UsersSettings";
import PaymentMethodsSettings from "./PaymentMethodsSettings";
import { usePrinter } from "../../../lib/printer-context";
import { api, getAuth } from "../../../lib/api";
import { ESC_POS } from "../../../lib/printer-commands";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select } from "../../../components/ui/select";
import { useToast } from "../../../components/ui/use-toast";
import { Textarea } from "../../../components/ui/textarea";
import { cn } from "../../../lib/utils";

export default function SettingsPage() {
  const { device, isConnecting, connectionStatus, connect, disconnect, print } = usePrinter();
  const [activeTab, setActiveTab] = useState("printer");
  const { success, error } = useToast();
  const currentUser = getAuth();

  // Platforms State
  const [platforms, setPlatforms] = useState([]);
  const [loadingPlatforms, setLoadingPlatforms] = useState(false);
  const [isPlatformDialogOpen, setIsPlatformDialogOpen] = useState(false);
  const [platformFormData, setPlatformFormData] = useState({ name: "", type: "OFFLINE", commission_rate: "0" });
  const [editingPlatformId, setEditingPlatformId] = useState(null);
  const [confirmDeletePlatformId, setConfirmDeletePlatformId] = useState(null);

  // Receipt Settings State
  const [receiptConfig, setReceiptConfig] = useState({
    store_name: "", address: "", phone: "", receipt_footer: ""
  });

  // Import State
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

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

  const handleTestPrint = async () => {
    if (!print) return;
    try {
      let data = ESC_POS.INIT;
      data += ESC_POS.ALIGN_CENTER;
      data += ESC_POS.BOLD_ON;
      data += ESC_POS.DOUBLE_SIZE_ON;
      data += "TEST PRINT\n";
      data += ESC_POS.RESET_SIZE;
      data += ESC_POS.BOLD_Off;
      data += "\n";
      data += ESC_POS.ALIGN_CENTER;
      data += "POS System Ready\n";
      data += "Printer Connected Successfully\n";
      data += ESC_POS.separator();
      data += ESC_POS.FEED_PAPER(3);
      
      const res = await print(data);
      if (res) success("Test print sent!");
    } catch (e) {
      console.error(e);
      error("Test print failed");
    }
  };

  const seedDummyData = async () => {
    if (!confirm("Seed dummy data? This will create/update users, menus, and sample orders.")) return;
    try {
      await api.post("/auth/seed-dummy");
      success("Dummy data seeded");
    } catch (e) {
      error(e?.response?.data?.error || "Failed to seed dummy data");
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
    // --- Optimistic UI ---
    const previous = platforms;
    setConfirmDeletePlatformId(null);
    setPlatforms(prev => prev.filter(p => p.id !== id));
    try {
      await api.delete(`/platforms/${id}`);
      success("Platform deleted");
    } catch (e) {
      console.error(e);
      setPlatforms(previous); // rollback
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
            activeTab === "users" 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("users")}
        >
          User Management
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "payments" 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("payments")}
        >
          Payment Methods
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "import" 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setActiveTab("import")}
        >
          Import Data
        </button>
      </div>

      {activeTab === "users" && <UsersSettings />}
      {activeTab === "payments" && <PaymentMethodsSettings />}

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
                    <div className="flex items-center gap-2 mt-1">
                      <div className={cn(
                        "w-2.5 h-2.5 rounded-full shadow-sm",
                        connectionStatus === "connected" ? "bg-emerald-500 animate-pulse" :
                        connectionStatus === "connecting" ? "bg-amber-500 animate-pulse" :
                        "bg-rose-500"
                      )} />
                      <p className="text-sm font-semibold capitalize text-gray-700">
                        {connectionStatus}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {device 
                        ? `Connected to: ${device.name}` 
                        : localStorage.getItem("saved_printer_name") 
                          ? `Previously: ${localStorage.getItem("saved_printer_name")}`
                          : "No printer paired"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {connectionStatus === "connected" ? (
                      <Button variant="destructive" size="sm" onClick={disconnect}>
                        Disconnect
                      </Button>
                    ) : (
                      <Button size="sm" onClick={connect} disabled={isConnecting}>
                        {isConnecting ? (
                          <>Connecting...</>
                        ) : (
                          <>
                            <Smartphone className="w-4 h-4 mr-2" /> 
                            {localStorage.getItem("saved_printer_name") ? "Reconnect Printer" : "Connect Printer"}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="text-xs text-gray-500 space-y-1 bg-white p-3 rounded border border-gray-200">
                  <p><strong>Supported Printers:</strong> RP58, MTP-2, MTP-3, and other 58mm ESC/POS Bluetooth printers.</p>
                  <p><strong>Bluefy (iOS):</strong> Ensure Bluefy has Bluetooth permissions enabled in iOS Settings.</p>
                  <p><strong>Stable Connection:</strong> Do not refresh the page while connected. If connection drops, use the Reconnect button above.</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {connectionStatus === "connected" && (
                  <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700" size="sm" onClick={handleTestPrint}>
                    <Printer className="w-4 h-4 mr-2" /> Send Test Print
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  Test Browser Print
                </Button>
              </div>
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
                          {confirmDeletePlatformId === p.id ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-xs text-gray-500 mr-1">Delete?</span>
                              <Button variant="destructive" size="sm" className="h-6 px-2 text-xs" onClick={() => handleDeletePlatform(p.id)}>Yes</Button>
                              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setConfirmDeletePlatformId(null)}>Cancel</Button>
                            </span>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => openEditPlatform(p)}>
                                <Edit2 className="w-4 h-4 text-blue-500" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setConfirmDeletePlatformId(p.id)}>
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

      {activeTab === "import" && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" /> Import Historical Transactions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex items-start gap-4">
                <FileText className="w-6 h-6 text-blue-600 mt-1" />
                <div className="flex-1">
                  <h4 className="font-semibold text-blue-800">CSV Template</h4>
                  <p className="text-sm text-blue-600 mb-4">
                    Download our template to ensure your data is formatted correctly before importing.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/templates/transaction_import_template.csv" download>
                      Download Template
                    </a>
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select CSV File</Label>
                  <Input 
                    type="file" 
                    accept=".csv" 
                    onChange={(e) => setImportFile(e.target.files[0])}
                  />
                  <p className="text-xs text-gray-500">
                    Important: Order numbers must be unique. Duplicate orders will be skipped.
                  </p>
                </div>

                <Button 
                  onClick={async () => {
                    if (!importFile) return error("Please select a file");
                    setIsImporting(true);
                    try {
                      const reader = new FileReader();
                      reader.onload = async (e) => {
                        try {
                          const csvData = e.target.result;
                          const res = await api.post("/orders/import", { csvData });
                          success(`Successfully imported ${res.count} orders`);
                          setImportFile(null);
                        } catch (err) {
                          error(err?.response?.data?.error || "Import failed");
                        } finally {
                          setIsImporting(false);
                        }
                      };
                      reader.readAsText(importFile);
                    } catch (err) {
                      error("Failed to read file");
                      setIsImporting(false);
                    }
                  }} 
                  disabled={!importFile || isImporting}
                  className="w-full"
                >
                  {isImporting ? "Importing..." : "Start Import"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}


    </div>
  );
}
