"use client";
import { useState, useEffect } from "react";
import { Button } from "../../../components/ui/button";
import { 
  Printer, RefreshCw, Smartphone, Globe, Plus, 
  Edit2, Trash2, Receipt, Lock, Users, 
  Upload, FileText, Sparkles, CreditCard, 
  AlertCircle, Eye, ChefHat, CheckCircle2, X,
  Instagram, MessageCircle
} from "lucide-react";
import UsersSettings from "./users/UsersSettings";
import PaymentMethodsSettings from "./PaymentMethodsSettings";
import { ReceiptPreview } from "../../../components/receipt-preview";
import { usePrinter } from "../../../lib/printer-context";
import { api, getAuth } from "../../../lib/api";
import { ESC_POS } from "../../../lib/printer-commands";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../components/ui/dialog";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Select } from "../../../components/ui/select";
import { useToast } from "../../../components/ui/use-toast";
import { Textarea } from "../../../components/ui/textarea";
import { useTranslation } from "../../../lib/language-context";
import { cn } from "../../../lib/utils";
import { ResponsiveDataView } from "../../../components/ResponsiveDataView";

export default function SettingsPage() {
  const { t, language, setLanguage } = useTranslation();
  const { device, isConnecting, connectionStatus, connect, disconnect, print } = usePrinter();
  const [activeTab, setActiveTab] = useState("printer");
  const { success, error, confirm } = useToast();
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
    store_name: "", 
    address: "", 
    phone: "", 
    receipt_footer: "",
    paper_width: 58,
    show_logo: false,
    show_customer: true,
    show_name: true,
    language: "en",
    kitchen_enabled: true,
    kitchen_auto_print: false,
    kitchen_copies: 1,
    kitchen_categories: [],
    kitchen_delay: 0,
    receipt_auto_print: false
  });

  // Import State
  const [importFile, setImportFile] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  const [categories, setCategories] = useState([]);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isAddTagDialogOpen, setIsAddTagDialogOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [tagTargetCategory, setTagTargetCategory] = useState("FOOD");

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/upload/payment-method", formData);
      setReceiptConfig({ ...receiptConfig, logo_url: res.imageUrl, show_logo: true });
      success("Logo uploaded successfully");
    } catch (err) {
      console.error(err);
      error("Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const MOCK_ORDER = {
    order_number: "TRX-PREVIEW-999",
    date: new Date(),
    customer_name: "DEMO CUSTOMER",
    total: 45000,
    discount: 5000,
    payment_method: "CASH",
    money_received: 50000,
    change_amount: 10000,
    orderItems: [
      { menu: { name: "Bakmie Ayam Special", categoryId: categories[0]?.id || 1 }, qty: 2, price: 18000 },
      { menu: { name: "Es Teh Manis", categoryId: categories[1]?.id || 2 }, qty: 1, price: 9000 },
    ],
    note: "Spicy level 5"
  };

  useEffect(() => {
    if (activeTab === "platforms") loadPlatforms();
    if (activeTab === "receipt" || activeTab === "language") {
      loadReceiptConfig();
      loadCategories();
    }
  }, [activeTab]);

  const loadCategories = async () => {
    try {
      const res = await api.get("/pos/init");
      if (res.categories) setCategories(res.categories);
    } catch (e) {
      console.error(e);
    }
  };

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
    if (!(await confirm({
      title: "Reset Demo Data?",
      message: "This will reset your products and orders to demonstration data. This action cannot be undone.",
      confirmText: "Reset Data",
      variant: "warning"
    }))) return;

    try {
      await api.post("/auth/seed-dummy");
      success("Demo data reset successfully");
    } catch (e) {
      error(e?.response?.data?.error || "Failed to seed demo data");
    }
  };
  
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
    const previous = platforms;
    setConfirmDeletePlatformId(null);
    setPlatforms(prev => prev.filter(p => p.id !== id));
    try {
      await api.delete(`/platforms/${id}`);
      success("Platform deleted");
    } catch (e) {
      console.error(e);
      setPlatforms(previous);
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

  const tabs = [
    { id: "printer", label: t('printer'), icon: Printer },
    { id: "platforms", label: t('platforms'), icon: Globe },
    { id: "receipt", label: t('document_design'), icon: Receipt },
    { id: "users", label: t('users'), icon: Users },
    { id: "payments", label: t('payments'), icon: CreditCard },
    { id: "tags", label: "Quick Tags", icon: Sparkles },
    { id: "language", label: t('language'), icon: RefreshCw },
    { id: "import", label: t('import_data'), icon: Upload },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-fade-in pb-20 px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">{t('system_orchestration')}</h2>
          <div className="flex items-center gap-2.5 mt-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Manage your store and device preferences</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-2 rounded-[2.5rem] border-none shadow-xl bg-white/50 backdrop-blur-xl flex items-center gap-1 overflow-x-auto scrollbar-hide sticky top-4 z-50">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "px-6 md:px-8 py-4 rounded-[1.75rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 flex items-center gap-3 whitespace-nowrap",
              activeTab === tab.id 
                ? "bg-slate-900 text-white shadow-2xl shadow-slate-900/20" 
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            )}
          >
            <tab.icon className={cn("w-4 h-4", activeTab === tab.id ? "text-emerald-400" : "text-slate-300")} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-10">
        {activeTab === "users" && <UsersSettings />}
        {activeTab === "payments" && <PaymentMethodsSettings />}

        {activeTab === "printer" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-card rounded-[3rem] overflow-hidden p-0 border-none shadow-2xl md:max-w-4xl mx-auto">
              <div className="p-10 bg-slate-900 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                <div className="flex items-center gap-6 relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl">
                    <Printer className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight uppercase">Printer Settings</h3>
                    <p className="text-[10px] text-emerald-400/60 font-black uppercase tracking-[0.2em] mt-1">Connect and test your thermal printer</p>
                  </div>
                </div>
              </div>

              <div className="p-8 md:p-12 space-y-10 bg-white/50 backdrop-blur-xl">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-inner">
                  <div className="flex items-center gap-6 md:gap-8 w-full md:w-auto flex-1 min-w-0">
                    <div className="relative shrink-0">
                      <div className={cn(
                        "w-20 h-20 rounded-[2rem] flex items-center justify-center transition-all duration-700 shadow-2xl",
                        connectionStatus === "connected" ? "bg-emerald-500 shadow-emerald-500/30" : "bg-slate-200"
                      )}>
                        <Smartphone className={cn("w-10 h-10", connectionStatus === 'connected' ? "text-white" : "text-slate-400")} />
                      </div>
                      {connectionStatus === "connected" && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-400 rounded-full border-4 border-white animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Printer Status</p>
                      <h4 className="text-lg min-[375px]:text-xl sm:text-2xl md:text-3xl font-black text-slate-900 uppercase tracking-tighter tabular-nums leading-none">
                        {connectionStatus === 'connected' ? 'ONLINE' : connectionStatus.toUpperCase()}
                      </h4>
                      <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide truncate">
                        {device ? device.name : "NOT CONNECTED"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-4 w-full md:w-auto">
                    {connectionStatus === "connected" ? (
                      <Button 
                        variant="destructive" 
                        size="lg" 
                        onClick={disconnect}
                        className="flex-1 md:flex-none h-16 px-10 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-500/20 active:scale-95 transition-all"
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button 
                        size="lg" 
                        onClick={connect} 
                        disabled={isConnecting}
                        className="flex-1 md:flex-none h-16 px-10 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-slate-900/20 active:scale-95 transition-all flex items-center justify-center gap-4"
                      >
                        {isConnecting ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Smartphone className="w-5 h-5" />}
                        Connect Printer
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="p-8 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
                    <h5 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-3">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Instructions
                    </h5>
                    <div className="space-y-3">
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight flex items-start gap-3">
                         <span className="text-emerald-500">01</span> Use 58mm thermal printers
                       </p>
                       <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight flex items-start gap-3">
                         <span className="text-emerald-500">02</span> Enable Bluetooth in your browser
                       </p>
                    </div>
                  </div>
                  <div className="p-8 bg-emerald-50/50 rounded-3xl border border-emerald-100 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest mb-1">Test Print</p>
                      <p className="text-xs font-bold text-emerald-600 uppercase tracking-tight">Verify connection</p>
                    </div>
                    <Button 
                      variant="outline" 
                      className="h-14 px-8 rounded-2xl border-emerald-200 text-emerald-700 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                      onClick={handleTestPrint}
                      disabled={connectionStatus !== 'connected'}
                    >
                      Test Print
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "platforms" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h3 className="text-2xl font-black tracking-tight text-slate-900 uppercase italic">Sales Channels</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-1">Manage GoFood, GrabFood, etc.</p>
              </div>
              <Button 
                onClick={() => { resetPlatformForm(); setIsPlatformDialogOpen(true); }}
                className="w-full md:w-auto h-16 px-10 rounded-[1.5rem] bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
              >
                <Plus className="w-5 h-5 mr-3" /> Add Channel
              </Button>
            </div>

            <div className="glass-card rounded-[3rem] overflow-hidden p-0 border-none shadow-2xl">
              <ResponsiveDataView
                loading={loadingPlatforms}
                data={platforms}
                emptyMessage="No channels found"
                columns={[
                  {
                    header: "Name",
                    accessor: (p) => <p className="text-lg font-black text-slate-900 uppercase tracking-tighter group-hover:text-emerald-600 transition-colors">{p.name}</p>,
                    className: "pl-10"
                  },
                  {
                    header: "Type",
                    accessor: (p) => (
                      <span className={cn(
                        "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        p.type === 'DELIVERY' ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-slate-100 text-slate-600 border-slate-200"
                      )}>
                        {p.type}
                      </span>
                    )
                  },
                  {
                    header: "Commission (%)",
                    accessor: (p) => <span className="font-mono text-lg font-black text-slate-900">{p.commission_rate}%</span>
                  },
                  {
                    header: "Actions",
                    accessor: (p) => (
                      <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all">
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-white shadow-xl hover:bg-slate-900 hover:text-white transition-all" onClick={() => openEditPlatform(p)}>
                          <Edit2 className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-500 shadow-xl hover:bg-rose-500 hover:text-white transition-all" onClick={() => { setConfirmDeletePlatformId(p.id) }}>
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    ),
                    align: "right",
                    className: "pr-10"
                  }
                ]}
                renderCard={(p) => (
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                         <p className="text-lg font-black text-slate-900 uppercase tracking-tighter">{p.name}</p>
                         <span className={cn(
                            "inline-block mt-2 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                            p.type === 'DELIVERY' ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-slate-50 text-slate-600 border-slate-100"
                         )}>
                            {p.type}
                         </span>
                      </div>
                      <div className="text-right">
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Commission</p>
                         <p className="font-black text-slate-900 text-xl">{p.commission_rate}%</p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-slate-50">
                       <Button variant="outline" className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase" onClick={() => openEditPlatform(p)}>Edit</Button>
                       <Button variant="ghost" className="h-12 w-12 rounded-xl text-rose-500 hover:bg-rose-50" onClick={() => handleDeletePlatform(p.id)}><Trash2 className="w-4.5 h-4.5" /></Button>
                    </div>
                  </div>
                )}
              />
            </div>

            <Dialog open={isPlatformDialogOpen} onOpenChange={setIsPlatformDialogOpen}>
              <DialogContent className="max-w-lg p-0 overflow-hidden rounded-[3rem] border-none shadow-2xl">
                <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                  <h3 className="text-3xl font-black uppercase tracking-tighter relative z-10">{editingPlatformId ? "Edit Channel" : "New Channel"}</h3>
                  <p className="text-[10px] text-emerald-400 font-black uppercase tracking-[0.2em] mt-1">Sales Channel Details</p>
                </div>
                <form onSubmit={handlePlatformSubmit} className="p-10 space-y-8 bg-white">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Name</Label>
                    <Input className="h-14 rounded-2xl font-black text-sm uppercase px-6" value={platformFormData.name} onChange={e => setPlatformFormData({...platformFormData, name: e.target.value})} placeholder="e.g. GOFOOD, GRABFOOD" required />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Type</Label>
                    <Select value={platformFormData.type} onChange={e => setPlatformFormData({...platformFormData, type: e.target.value})} options={[{ value: "OFFLINE", label: "OFFLINE" }, { value: "DELIVERY", label: "DELIVERY" }]} />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Commission (%)</Label>
                    <Input type="number" className="h-14 rounded-2xl font-black text-lg px-6" value={platformFormData.commission_rate} onChange={e => setPlatformFormData({...platformFormData, commission_rate: e.target.value})} placeholder="0" />
                  </div>
                  <DialogFooter className="pt-6 gap-4">
                    <Button type="button" variant="ghost" className="h-14 flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400" onClick={() => setIsPlatformDialogOpen(false)}>Cancel</Button>
                    <Button type="submit" className="h-14 flex-1 rounded-2xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest shadow-2xl">Save Channel</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {activeTab === "language" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto space-y-10">
             <div className="glass-card rounded-[3rem] overflow-hidden p-0 border-none shadow-2xl">
                <div className="p-12 bg-slate-900 text-white relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-[30rem] h-[30rem] bg-emerald-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
                   <div className="flex items-center gap-8 relative z-10">
                     <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl">
                       <RefreshCw className="w-10 h-10 text-emerald-400" />
                     </div>
                     <div>
                       <h3 className="text-3xl font-black tracking-tight uppercase">Language</h3>
                       <p className="text-[10px] text-emerald-400/60 font-black uppercase tracking-[0.3em] mt-2">Select your interface language</p>
                     </div>
                   </div>
                </div>
                <div className="p-8 md:p-12 space-y-12 bg-white/40 backdrop-blur-xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
                       {[
                         { id: "en", name: "English", sub: "Global English", flag: "🇺🇸" },
                         { id: "id", name: "Bahasa Indonesia", sub: "Bahasa Lokal", flag: "🇮🇩" }
                       ].map((lang) => (
                         <button
                           key={lang.id}
                           onClick={() => setLanguage(lang.id)}
                           className={cn(
                             "p-8 rounded-[2.5rem] border-2 transition-all duration-300 text-left relative overflow-hidden group",
                             language === lang.id 
                               ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02]" 
                               : "bg-white border-slate-100 hover:border-emerald-200 text-slate-900 hover:shadow-xl"
                           )}
                         >
                           <div className="flex items-center justify-between relative z-10">
                              <div className="flex items-center gap-6">
                                <div className="text-4xl">{lang.flag}</div>
                                <div>
                                   <div className="font-black text-xl uppercase tracking-tighter">{lang.name}</div>
                                   <div className={cn("text-[9px] font-black uppercase tracking-widest mt-1", language === lang.id ? "text-emerald-400" : "text-slate-400")}>{lang.sub}</div>
                                </div>
                              </div>
                              {language === lang.id && (
                                <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/50">
                                   <CheckCircle2 className="w-6 h-6 text-white" />
                                </div>
                              )}
                           </div>
                         </button>
                       ))}
                    </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === "tags" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto space-y-10">
            <div className="glass-card rounded-[3rem] overflow-hidden p-0 border-none shadow-2xl">
              <div className="p-10 md:p-12 bg-slate-900 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-amber-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 text-center md:text-left">
                  <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl">
                    <Sparkles className="w-10 h-10 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-black tracking-tight uppercase">Quick Order Tags</h3>
                    <p className="text-[10px] text-amber-400/60 font-black uppercase tracking-[0.3em] mt-2">Customize predefined order requests</p>
                  </div>
                </div>
              </div>
              <div className="p-12 space-y-12 bg-white/50 backdrop-blur-xl">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                   {/* Food Tags */}
                   <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-4">
                          <ChefHat className="w-4 h-4 text-orange-500" /> Food Tags
                        </Label>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 rounded-xl font-black text-[9px] uppercase tracking-widest text-emerald-600 hover:bg-emerald-50"
                          onClick={() => {
                            setTagTargetCategory("FOOD");
                            setNewTagInput("");
                            setIsAddTagDialogOpen(true);
                          }}
                        >
                          <Plus className="w-3.5 h-3.5 mr-2" /> Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 min-h-[140px] items-start">
                        {receiptConfig.quick_tags?.FOOD?.length > 0 ? (
                          receiptConfig.quick_tags.FOOD.map((tag, i) => (
                            <div key={i} className="px-4 py-2 bg-white border border-slate-100 rounded-xl flex items-center gap-3 shadow-sm group">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{tag}</span>
                              <button 
                                onClick={() => {
                                  const current = receiptConfig.quick_tags;
                                  setReceiptConfig({
                                    ...receiptConfig,
                                    quick_tags: { ...current, FOOD: current.FOOD.filter((_, idx) => idx !== i) }
                                  });
                                }}
                                className="text-slate-300 hover:text-rose-500 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center w-full py-10 opacity-30">No food tags defined</p>
                        )}
                      </div>
                   </div>

                   {/* Drink Tags */}
                   <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-4">
                          <Smartphone className="w-4 h-4 text-blue-500" /> Drink Tags
                        </Label>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 rounded-xl font-black text-[9px] uppercase tracking-widest text-emerald-600 hover:bg-emerald-50"
                          onClick={() => {
                            setTagTargetCategory("DRINK");
                            setNewTagInput("");
                            setIsAddTagDialogOpen(true);
                          }}
                        >
                          <Plus className="w-3.5 h-3.5 mr-2" /> Add
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2 p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 min-h-[140px] items-start">
                        {receiptConfig.quick_tags?.DRINK?.length > 0 ? (
                          receiptConfig.quick_tags.DRINK.map((tag, i) => (
                            <div key={i} className="px-4 py-2 bg-white border border-slate-100 rounded-xl flex items-center gap-3 shadow-sm group">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">{tag}</span>
                              <button 
                                onClick={() => {
                                  const current = receiptConfig.quick_tags;
                                  setReceiptConfig({
                                    ...receiptConfig,
                                    quick_tags: { ...current, DRINK: current.DRINK.filter((_, idx) => idx !== i) }
                                  });
                                }}
                                className="text-slate-300 hover:text-rose-500 transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest text-center w-full py-10 opacity-30">No drink tags defined</p>
                        )}
                      </div>
                   </div>
                 </div>

                 <div className="pt-10 border-t border-slate-100 flex items-center justify-between gap-6">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setReceiptConfig({
                          ...receiptConfig,
                          quick_tags: {
                            FOOD: ["PEDAS", "TIDAK PEDAS", "EXTRA PEDAS", "TANPA SAYUR", "TANPA BAWANG", "BUNGKUS", "PISAH KUAH", "ASIN", "MANIS"],
                            DRINK: ["LESS SUGAR", "MORE SUGAR", "LESS ICE", "NO ICE", "PISAH GULA", "NORMAL"]
                          }
                        });
                        success("Tags reset to recommended defaults");
                      }}
                      className="h-20 px-8 rounded-3xl border-rose-100 text-rose-500 font-black uppercase text-[10px] tracking-widest active:scale-95 transition-all"
                    >
                      Restore Recommended Defaults
                    </Button>
                    <Button 
                      onClick={saveReceiptConfig}
                      className="h-20 flex-1 rounded-3xl bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-[0.4em] shadow-2xl active:scale-95 transition-all"
                    >
                      Save Configuration
                    </Button>
                 </div>
              </div>
            </div>

            <Dialog open={isAddTagDialogOpen} onOpenChange={setIsAddTagDialogOpen}>
              <DialogContent className="max-w-md p-0 overflow-hidden rounded-[2.5rem] border-none shadow-2xl bg-white/95 backdrop-blur-xl">
                <div className="bg-slate-900 p-8 text-white relative">
                  <DialogTitle className="text-xl font-black uppercase tracking-tighter">Add {tagTargetCategory} Tag</DialogTitle>
                </div>
                <div className="p-8 space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tag Name</Label>
                    <Input 
                      className="h-14 rounded-2xl font-black text-sm uppercase px-6 bg-slate-50 border-slate-100" 
                      placeholder="e.g. EXTRA SPICY"
                      value={newTagInput}
                      onChange={e => setNewTagInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const tag = newTagInput.trim().toUpperCase();
                          if (tag) {
                            const current = receiptConfig.quick_tags || { FOOD: [], DRINK: [] };
                            const list = (tagTargetCategory === "FOOD" ? current.FOOD : current.DRINK) || [];
                            if (!list.includes(tag)) {
                              setReceiptConfig({
                                ...receiptConfig,
                                quick_tags: { 
                                  ...current, 
                                  [tagTargetCategory]: [...list, tag] 
                                }
                              });
                              setIsAddTagDialogOpen(false);
                            }
                          }
                        }
                      }}
                    />
                  </div>
                  <Button 
                    className="w-full h-14 rounded-2xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest"
                    onClick={() => {
                      const tag = newTagInput.trim().toUpperCase();
                      if (tag) {
                        const current = receiptConfig.quick_tags || { FOOD: [], DRINK: [] };
                        const list = (tagTargetCategory === "FOOD" ? current.FOOD : current.DRINK) || [];
                        if (!list.includes(tag)) {
                          setReceiptConfig({
                            ...receiptConfig,
                            quick_tags: { 
                              ...current, 
                              [tagTargetCategory]: [...list, tag] 
                            }
                          });
                          setIsAddTagDialogOpen(false);
                        }
                      }
                    }}
                  >
                    Add Tag
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
        {activeTab === "receipt" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto space-y-10">
            <div className="glass-card rounded-[3rem] overflow-hidden p-0 border-none shadow-2xl">
               <div className="p-10 md:p-12 bg-slate-900 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-emerald-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
                  <div className="flex flex-col md:flex-row items-center gap-8 relative z-10 text-center md:text-left">
                    <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-2xl">
                      <Receipt className="w-10 h-10 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-3xl font-black tracking-tight uppercase">Receipt Design</h3>
                      <p className="text-[10px] text-emerald-400/60 font-black uppercase tracking-[0.3em] mt-2">Customize your printed receipts</p>
                    </div>
                    <Button 
                     type="button"
                     onClick={() => setIsPreviewOpen(true)}
                     className="w-full md:w-auto h-14 px-8 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-black text-[10px] uppercase tracking-widest backdrop-blur-md transition-all"
                    >
                      <Eye className="w-4 h-4 mr-3 text-emerald-400" /> Preview
                    </Button>
                  </div>
               </div>
               <div className="p-8 md:p-12 space-y-12 bg-white/40 backdrop-blur-xl">
                 <form onSubmit={saveReceiptConfig} className="space-y-12">
                    <div className="space-y-10">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] flex items-center gap-6">
                         <div className="w-12 h-px bg-slate-200" /> Brand Identity
                      </h4>
                      
                      <div className="flex flex-col md:flex-row items-start gap-10">
                        <div className="relative group shrink-0">
                          <div className={cn(
                            "w-48 h-48 rounded-[2.5rem] bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center transition-all overflow-hidden",
                            receiptConfig.logo_url ? "border-solid border-emerald-500/30 bg-white" : "hover:bg-slate-100 hover:border-slate-300"
                          )}>
                            {receiptConfig.logo_url ? (
                              <div className="relative w-full h-full p-6 flex items-center justify-center">
                                <img src={receiptConfig.logo_url} alt="Store Logo" className="max-w-full max-h-full object-contain" />
                                <button 
                                  type="button"
                                  onClick={() => setReceiptConfig({...receiptConfig, logo_url: null, show_logo: false})}
                                  className="absolute top-4 right-4 w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </div>
                            ) : (
                              <div className="text-center p-6 cursor-pointer" onClick={() => document.getElementById('logo-upload').click()}>
                                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                                  {isUploadingLogo ? <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" /> : <Upload className="w-8 h-8 text-slate-400" />}
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Upload Logo</p>
                                <p className="text-[8px] text-slate-300 font-bold uppercase mt-2">PNG, JPG recommended</p>
                              </div>
                            )}
                          </div>
                          <input 
                            id="logo-upload" 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleLogoUpload} 
                            disabled={isUploadingLogo}
                          />
                        </div>

                        <div className="flex-1 space-y-6 pt-2">
                           <div>
                              <h5 className="text-lg font-black text-slate-900 uppercase tracking-tight">Receipt Brand Logo</h5>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.05em] mt-2 leading-relaxed">
                                 Upload your business logo to be displayed at the top of your digital and physical receipts. 
                                 A monochrome, high-contrast logo works best for thermal printers.
                              </p>
                           </div>
                           
                           <div className="flex items-center gap-4 p-6 bg-slate-50 rounded-[1.75rem] border border-slate-100">
                              <div className={cn(
                                "w-12 h-6 rounded-full relative transition-all duration-500 cursor-pointer",
                                receiptConfig.show_logo ? "bg-emerald-500" : "bg-slate-300"
                              )} onClick={() => setReceiptConfig({...receiptConfig, show_logo: !receiptConfig.show_logo})}>
                                 <div className={cn(
                                   "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-500 shadow-sm",
                                   receiptConfig.show_logo ? "left-7" : "left-1"
                                 )} />
                              </div>
                              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-900 cursor-pointer" onClick={() => setReceiptConfig({...receiptConfig, show_logo: !receiptConfig.show_logo})}>
                                 Display logo on receipts
                              </Label>
                           </div>

                           {!receiptConfig.logo_url && (
                             <Button 
                              type="button" 
                              variant="outline" 
                              className="h-12 px-8 rounded-xl font-black text-[9px] uppercase tracking-widest border-slate-200"
                              onClick={() => document.getElementById('logo-upload').click()}
                             >
                               Choose File
                             </Button>
                           )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] flex items-center gap-6">
                         <div className="w-12 h-px bg-slate-200" /> Header Info
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <div className="flex justify-between items-end gap-4">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Store Name</Label>
                            <Button 
                              type="button" 
                              variant={receiptConfig.show_name ? "default" : "outline"} 
                              onClick={() => setReceiptConfig({...receiptConfig, show_name: !receiptConfig.show_name})}
                              className="w-16 h-8 rounded-lg font-black text-[8px] uppercase tracking-widest"
                            >
                              {receiptConfig.show_name ? "ON" : "OFF"}
                            </Button>
                          </div>
                          <Input className="h-16 rounded-2xl font-black text-sm uppercase px-8 bg-white border-slate-200 focus:border-emerald-500 transition-colors" value={receiptConfig.store_name || ""} onChange={e => setReceiptConfig({...receiptConfig, store_name: e.target.value})} placeholder="Store Name" />
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</Label>
                          <Input className="h-16 rounded-2xl font-black text-sm uppercase px-8 bg-white border-slate-200 focus:border-emerald-500 transition-colors" value={receiptConfig.phone || ""} onChange={e => setReceiptConfig({...receiptConfig, phone: e.target.value})} placeholder="Phone Number" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                        <div className="space-y-3">
                           <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                              <Instagram className="w-3 h-3" /> Instagram
                           </Label>
                           <Input className="h-14 rounded-2xl font-black text-sm px-6 bg-slate-50 border-none shadow-inner" value={receiptConfig.instagram || ""} onChange={e => setReceiptConfig({...receiptConfig, instagram: e.target.value})} placeholder="@yourstore" />
                        </div>
                        <div className="space-y-3">
                           <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                              <MessageCircle className="w-3 h-3" /> WhatsApp
                           </Label>
                           <Input className="h-14 rounded-2xl font-black text-sm px-6 bg-slate-50 border-none shadow-inner" value={receiptConfig.whatsapp || ""} onChange={e => setReceiptConfig({...receiptConfig, whatsapp: e.target.value})} placeholder="0812-..." />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Address</Label>
                        <Textarea className="rounded-[2rem] font-bold text-sm uppercase p-8 min-h-[120px] bg-white border-slate-200 focus:border-emerald-500 transition-colors" value={receiptConfig.address || ""} onChange={e => setReceiptConfig({...receiptConfig, address: e.target.value})} placeholder="Complete Address" />
                      </div>
                    </div>

                   <div className="space-y-8">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] flex items-center gap-6">
                         <div className="w-12 h-px bg-slate-200" /> Financial Settings
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Tax Rate (%)</Label>
                          <div className="relative">
                            <Input type="number" step="0.01" className="h-16 rounded-2xl font-black text-lg px-8 bg-white border-slate-200" value={receiptConfig.tax_rate || 0} onChange={e => setReceiptConfig({...receiptConfig, tax_rate: e.target.value})} placeholder="0.00" />
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300">%</div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Service Charge (%)</Label>
                          <div className="relative">
                            <Input type="number" step="0.01" className="h-16 rounded-2xl font-black text-lg px-8 bg-white border-slate-200" value={receiptConfig.service_charge || 0} onChange={e => setReceiptConfig({...receiptConfig, service_charge: e.target.value})} placeholder="0.00" />
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 font-black text-slate-300">%</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-8">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] flex items-center gap-6">
                         <div className="w-12 h-px bg-slate-200" /> Layout & Automation
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Paper Width</Label>
                            <div className="flex p-2 bg-slate-100/50 rounded-2xl border border-slate-100">
                               {[58, 80].map(w => (
                                 <button
                                   key={w}
                                   type="button"
                                   onClick={() => setReceiptConfig({...receiptConfig, paper_width: w})}
                                   className={cn(
                                     "flex-1 py-4 px-6 rounded-xl text-[10px] font-black uppercase transition-all duration-300",
                                     receiptConfig.paper_width === w ? "bg-slate-900 text-white shadow-xl translate-y-[-1px]" : "text-slate-400 hover:text-slate-600"
                                   )}
                                 >
                                   {w}MM Thermal
                                 </button>
                               ))}
                            </div>
                         </div>
                         <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-center justify-between p-6 bg-slate-50/50 rounded-2xl border border-slate-100">
                               <div>
                                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-0.5 block">Customer Name</Label>
                                  <p className="text-[8px] font-bold text-slate-400 uppercase">Show on receipt</p>
                               </div>
                               <Button 
                                 type="button" 
                                 variant={receiptConfig.show_customer ? "default" : "outline"} 
                                 onClick={() => setReceiptConfig({...receiptConfig, show_customer: !receiptConfig.show_customer})}
                                 className="w-20 h-12 rounded-xl font-black text-[9px] uppercase tracking-widest"
                               >
                                 {receiptConfig.show_customer ? "ON" : "OFF"}
                               </Button>
                            </div>
                            <div className="flex items-center justify-between p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                               <div>
                                  <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-900 mb-0.5 block">Receipt Auto Print</Label>
                                  <p className="text-[8px] font-bold text-emerald-600 uppercase">Print immediately after pay</p>
                               </div>
                               <Button 
                                 type="button" 
                                 variant={receiptConfig.receipt_auto_print ? "default" : "outline"} 
                                 onClick={() => setReceiptConfig({...receiptConfig, receipt_auto_print: !receiptConfig.receipt_auto_print})}
                                 className={cn("w-20 h-12 rounded-xl font-black text-[9px] uppercase tracking-widest", receiptConfig.receipt_auto_print ? "bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20" : "")}
                               >
                                 {receiptConfig.receipt_auto_print ? "ON" : "OFF"}
                               </Button>
                            </div>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-8 pt-8 border-t border-slate-100">
                     <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] flex items-center gap-6">
                           <div className="w-12 h-px bg-slate-200" /> Kitchen Printer
                        </h4>
                        <Button 
                           type="button"
                           className={cn(
                             "h-10 px-6 rounded-xl font-black text-[9px] uppercase tracking-widest",
                             receiptConfig.kitchen_enabled ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"
                           )}
                           onClick={() => setReceiptConfig({...receiptConfig, kitchen_enabled: !receiptConfig.kitchen_enabled})}
                        >
                           {receiptConfig.kitchen_enabled ? "ACTIVE" : "OFF"}
                        </Button>
                     </div>

                     {receiptConfig.kitchen_enabled && (
                       <div className="space-y-10 animate-in fade-in duration-500">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                             <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Auto-Print</Label>
                                <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center justify-between">
                                   <div>
                                      <p className="text-sm font-black text-slate-900 uppercase tracking-tight">Print after payment</p>
                                      <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Automatically print to kitchen after checkout</p>
                                   </div>
                                   <Button 
                                      type="button"
                                      variant={receiptConfig.kitchen_auto_print ? "default" : "outline"}
                                      className="h-12 px-8 rounded-xl font-black text-[9px] uppercase tracking-widest"
                                      onClick={() => setReceiptConfig({...receiptConfig, kitchen_auto_print: !receiptConfig.kitchen_auto_print})}
                                   >
                                      {receiptConfig.kitchen_auto_print ? "ON" : "OFF"}
                                   </Button>
                                </div>
                             </div>
                             <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Copies</Label>
                                <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center gap-8">
                                   {[1, 2, 3].map(c => (
                                      <button
                                         key={c}
                                         type="button"
                                         onClick={() => setReceiptConfig({...receiptConfig, kitchen_copies: c})}
                                         className={cn(
                                            "w-12 h-12 rounded-xl flex items-center justify-center font-black transition-all",
                                            receiptConfig.kitchen_copies === c ? "bg-slate-900 text-white" : "bg-white text-slate-400"
                                         )}
                                      >
                                         {c}
                                      </button>
                                   ))}
                                   <div className="flex-1 text-right">
                                      <p className="text-[10px] font-black text-slate-300 uppercase underline">Copies</p>
                                   </div>
                                </div>
                             </div>
                             <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Print Delay</Label>
                                <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 flex items-center gap-6">
                                   <div className="relative flex-1">
                                      <Input 
                                        type="number" 
                                        className="h-12 rounded-xl border-none bg-white font-black text-center pr-10" 
                                        value={receiptConfig.kitchen_delay || 0} 
                                        onChange={e => setReceiptConfig({...receiptConfig, kitchen_delay: e.target.value})} 
                                        min="0"
                                      />
                                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase">SEC</span>
                                   </div>
                                   <div className="text-right">
                                      <p className="text-[10px] font-black text-slate-300 uppercase underline leading-none">After Receipt</p>
                                   </div>
                                </div>
                             </div>
                          </div>

                          <div className="space-y-4">
                             <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Print by Category</Label>
                             <div className="flex flex-wrap gap-3">
                                {categories.map(cat => (
                                   <Button
                                      key={cat.id}
                                      type="button"
                                      variant={receiptConfig.kitchen_categories?.includes(cat.id) ? "default" : "outline"}
                                      onClick={() => {
                                         const current = receiptConfig.kitchen_categories || [];
                                         const next = current.includes(cat.id) 
                                            ? current.filter(id => id !== cat.id)
                                            : [...current, cat.id];
                                         setReceiptConfig({...receiptConfig, kitchen_categories: next});
                                      }}
                                      className="rounded-2xl h-12 px-6 font-black text-[9px] uppercase tracking-widest"
                                   >
                                      {cat.name}
                                   </Button>
                                ))}
                             </div>
                          </div>
                       </div>
                     )}
                   </div>

                   <div className="space-y-3 pt-8 border-t border-slate-100">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Footer Message</Label>
                     <Textarea className="rounded-[2rem] font-bold text-sm uppercase p-8 min-h-[140px] bg-slate-50 border-none shadow-inner" value={receiptConfig.receipt_footer || ""} onChange={e => setReceiptConfig({...receiptConfig, receipt_footer: e.target.value})} placeholder="Thank You for Your Order" />
                   </div>

                   <div className="pt-10">
                     <Button type="submit" className="h-20 w-fit px-14 rounded-3xl bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-[0.4em] shadow-2xl active:scale-95 transition-all">
                       Save Changes
                     </Button>
                   </div>
                 </form>
               </div>
            </div>
          </div>
        )}

        {activeTab === "import" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
             <div className="glass-card rounded-[3rem] overflow-hidden p-0 border-none shadow-2xl">
               <div className="p-10 bg-slate-900 text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                  <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                      <Upload className="w-8 h-8 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black tracking-tight uppercase">Import Data</h3>
                      <p className="text-[10px] text-amber-400/60 font-black uppercase tracking-[0.2em] mt-1">Import past transaction data</p>
                    </div>
                  </div>
               </div>
               <div className="p-12 space-y-10 bg-white">
                 <div className="bg-amber-50 p-8 rounded-[2rem] border border-amber-100 flex items-start gap-6">
                    <FileText className="w-10 h-10 text-amber-500 shrink-0" />
                    <div>
                      <h4 className="font-black text-amber-900 uppercase tracking-tight text-lg">CSV Template</h4>
                      <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest mt-2">
                        Download the template to ensure your file is formatted correctly.
                      </p>
                      <Button variant="outline" size="sm" asChild className="mt-6 h-10 px-6 rounded-xl border-amber-200 text-amber-700 font-black text-[9px] uppercase tracking-widest">
                        <a href="/templates/transaction_import_template.csv" download>Download Template</a>
                      </Button>
                    </div>
                 </div>

                 <div className="space-y-8">
                   <div className="space-y-3">
                     <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Select CSV File</Label>
                     <Input type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files[0])} className="h-16 rounded-2xl border-dashed border-2 p-4 cursor-pointer" />
                   </div>

                   <Button 
                     onClick={async () => {
                       if (!importFile) return error("Please select a file first");
                       setIsImporting(true);
                       try {
                         const reader = new FileReader();
                         reader.onload = async (e) => {
                           try {
                             const csvData = e.target.result;
                             const res = await api.post("/orders/import", { csvData });
                             success(`Imported ${res.count} transactions`);
                             setImportFile(null);
                           } catch (err) {
                             error(err?.response?.data?.error || "Import failed");
                           } finally {
                             setIsImporting(false);
                           }
                         };
                         reader.readAsText(importFile);
                       } catch (err) {
                         error("Import failed");
                         setIsImporting(false);
                       }
                     }} 
                     disabled={!importFile || isImporting}
                     className="h-16 w-full rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest shadow-2xl active:scale-95 transition-all"
                   >
                     {isImporting ? <RefreshCw className="w-5 h-5 animate-spin" /> : "Start Import"}
                   </Button>
                 </div>
               </div>
             </div>
          </div>
        )}
      </div>

      <div className="pt-16 border-t border-slate-100 flex flex-col items-center gap-6">
         <div className="text-center">
            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.4em]">Maintenance</h4>
            <p className="text-[8px] text-slate-400 uppercase tracking-widest font-black mt-2">For demo and testing only</p>
         </div>
         <Button 
           variant="outline" 
           size="sm" 
           onClick={seedDummyData}
           className="h-12 px-8 rounded-xl border-amber-200 bg-amber-50/30 text-amber-700 font-black text-[9px] uppercase tracking-widest hover:bg-amber-100 transition-all"
         >
           <Sparkles className="w-4 h-4 mr-3" /> Reset Demo Data
         </Button>
      </div>

      <ReceiptPreview 
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        order={MOCK_ORDER}
        config={receiptConfig}
      />
    </div>
  );
}
