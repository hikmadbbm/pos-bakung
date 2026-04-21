"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { api } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Button } from "../../../components/ui/button";
import { Search, Eye, Calendar, RefreshCcw, TrendingUp, DollarSign, ShoppingBag, CreditCard, Printer, Trash2, AlertCircle, Tag, CheckCircle2, Loader2, Filter, ChevronDown, Check, Calculator, ArrowLeft, User, Layout, Users, Sparkles, Camera, ArrowDownRight } from "lucide-react";
import { Input } from "../../../components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "../../../components/ui/dialog";
import PinVerificationModal from "../../../components/PinVerificationModal";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../../../components/ui/dropdown-menu";
import { useToast } from "../../../components/ui/use-toast";
import { cn } from "../../../lib/utils";
import { ResponsiveDataView } from "../../../components/ResponsiveDataView";
import { ReceiptPreview } from "../../../components/receipt-preview";
import { useTranslation } from "../../../lib/language-context";
import { Label } from "../../../components/ui/label";
import { Skeleton } from "../../../components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";

export default function OrderHistoryPage() {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [stats, setStats] = useState({ total_gross: 0, total_net: 0 });
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState(null); 
  const [user, setUser] = useState(null);
  const canSeeProfit = useMemo(() => ['OWNER', 'MANAGER', 'ADMIN'].includes(user?.role), [user]);
  const [isReceiptPreviewOpen, setIsReceiptPreviewOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [storeConfig, setStoreConfig] = useState(null);
  const [activeTab, setActiveTab] = useState("detail");
  const [adjustments, setAdjustments] = useState([]);
  const [actualNet, setActualNet] = useState(0);
  const [isSavingPlatform, setIsSavingPlatform] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [settlingOrder, setSettlingOrder] = useState(null); 
  const [moneyReceived, setMoneyReceived] = useState("");
  const [selectedPmId, setSelectedPmId] = useState("");
  const [isSettleDialogOpen, setIsSettleDialogOpen] = useState(false);
  const [settleProcessing, setSettleProcessing] = useState(false);
  const [visionLoading, setVisionLoading] = useState(false);
  const visionInputRef = useRef(null);

  const quickMoneyButtons = [20000, 50000, 100000, 200000];

  const [activeFilter, setActiveFilter] = useState("today");
  const [activeStatus, setActiveStatus] = useState("ALL"); // ALL, PAID, UNPAID, CANCELLED
  const toLocalYYYYMMDD = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const getLocalDate = () => toLocalYYYYMMDD(new Date());
  
  const [startDate, setStartDate] = useState(getLocalDate());
  const [endDate, setEndDate] = useState(getLocalDate());

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) setUser(JSON.parse(userStr));
  }, []);

  useEffect(() => {
    loadOrders(1);
    loadStoreConfig();
    loadPaymentMethods();
  }, [debouncedSearch, startDate, endDate, activeFilter, activeStatus]);

  const loadPaymentMethods = async () => {
    try {
      const res = await api.get("/payment-methods");
      setPaymentMethods(res.filter(m => m.is_active && m.type !== 'PAY_LATER'));
    } catch (e) {
      console.warn("History: Failed to load payment methods", e);
    }
  };

  const loadStoreConfig = async () => {
    try {
      const res = await api.get("/settings/config");
      if (res) setStoreConfig(res);
    } catch (e) {
      console.warn("History: Failed to load store config", e);
    }
  };

  const handleFilterChange = (filter, customStart, customEnd) => {
    setActiveFilter(filter);
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (filter === "today") {
      // already set (current day)
    } else if (filter === "weekly") {
      // Default to last 7 days if not provided
      if (customStart && customEnd) {
        start = new Date(customStart);
        end = new Date(customEnd);
      } else {
        start.setDate(now.getDate() - 7);
      }
    } else if (filter === "monthly") {
      // Default to last 30 days if not provided
      if (customStart && customEnd) {
        start = new Date(customStart);
        end = new Date(customEnd);
      } else {
        start.setMonth(now.getMonth() - 1);
      }
    } 
    
    if (filter !== "custom" && filter !== "all") {
      setStartDate(toLocalYYYYMMDD(start));
      setEndDate(toLocalYYYYMMDD(end));
    }
  };

  const weekOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      const s = new Date(now);
      s.setDate(now.getDate() - (i * 7 + (now.getDay() || 7) - 1));
      const e = new Date(s);
      e.setDate(s.getDate() + 6);
      options.push({ 
        label: i === 0 ? "This Week" : `${i} Week${i > 1 ? 's' : ''} Ago`, 
        start: toLocalYYYYMMDD(s), 
        end: i === 0 ? toLocalYYYYMMDD(new Date()) : toLocalYYYYMMDD(e) 
      });
    }
    return options;
  }, []);

  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const s = new Date(d);
      const e = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      options.push({ 
        label: i === 0 ? "This Month" : d.toLocaleDateString('en-US', { month: 'long' }), 
        start: toLocalYYYYMMDD(s), 
        end: i === 0 ? toLocalYYYYMMDD(new Date()) : toLocalYYYYMMDD(e) 
      });
    }
    return options;
  }, []);

  const loadOrders = async (page = 1) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page,
        limit: pagination.limit,
        search: searchTerm,
        range: activeFilter === "all" ? "all" : (activeFilter === "today" ? "today" : ""),
        startDate: activeFilter !== "all" ? startDate : "",
        endDate: activeFilter !== "all" ? endDate : "",
        status: activeStatus !== "ALL" ? activeStatus : "",
      }).toString();
      
      const res = await api.get(`/orders?${qs}`);
      setOrders(res.orders);
      setPagination(res.pagination);
      setStats(res.stats || { total_gross: 0, total_net: 0 });
    } catch (e) {
      console.error(e);
      error(t('common.error_load'));
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page) => {
    loadOrders(page);
  };

  const handleLimitChange = (newLimit) => {
    setPagination(prev => ({ ...prev, limit: newLimit }));
    loadOrdersWithLimit(1, newLimit);
  };

  const loadOrdersWithLimit = async (page, limit) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        page,
        limit: limit,
        search: searchTerm,
        range: activeFilter === "all" ? "all" : (activeFilter === "today" ? "today" : ""),
        startDate: activeFilter !== "all" ? startDate : "",
        endDate: activeFilter !== "all" ? endDate : "",
      }).toString();
      
      const res = await api.get(`/orders?${qs}`);
      setOrders(res.orders);
      setPagination(res.pagination);
      setStats(res.stats || { total_gross: 0, total_net: 0 });
    } catch (e) {
      console.error(e);
      error(t('common.error_load'));
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChangeClick = async (order, newStatus) => {
    if (order.status === newStatus) return;
    
    // If CANCELLED, do it directly without PIN
    if (newStatus === 'CANCELLED') {
      try {
        await api.patch(`/orders/${order.id}/status`, { status: newStatus });
        success(t('orders.status_updated'));
        if (selectedOrder && selectedOrder.id === order.id) {
          setSelectedOrder({ ...selectedOrder, status: newStatus });
        }
        loadOrders(pagination.page);
      } catch (e) {
        console.error(e);
        error(e.response?.data?.error || "Failed to cancel order");
      }
      return;
    }

    setPendingStatusChange({ orderId: order.id, newStatus });
    setIsPinDialogOpen(true);
  };

  const handleHardDelete = async (pin) => {
    try {
      if (!selectedOrder) return;
      await api.delete(`/orders/${selectedOrder.id}`, { data: { pin } });
      success("Order deleted permanently");
      setIsDetailOpen(false);
      loadOrders(pagination.page);
      setIsPinDialogOpen(false);
      setPendingStatusChange(null);
    } catch (e) {
      console.error(e);
      throw new Error(e.response?.data?.error || "Failed to delete order");
    }
  };

  const handlePinVerify = async (pin) => {
    if (pendingStatusChange?.newStatus === 'DELETE_PERMANENT') {
      return handleHardDelete(pin);
    }
    try {
      if (!pendingStatusChange) return;
      await api.patch(`/orders/${pendingStatusChange.orderId}/status`, {
        status: pendingStatusChange.newStatus,
        pin
      });
      success(t('orders.status_updated'));
      if (selectedOrder && selectedOrder.id === pendingStatusChange.orderId) {
        setSelectedOrder({ ...selectedOrder, status: pendingStatusChange.newStatus });
      }
      loadOrders(pagination.page);
      setIsPinDialogOpen(false);
      setPendingStatusChange(null);
    } catch (e) {
      console.error(e);
      throw new Error(e.response?.data?.error || t('common.auth_failed'));
    }
  };

  const openDetail = (order) => {
    setSelectedOrder(order);
    setAdjustments(order.platform_adjustments || []);
    setActualNet(order.platform_actual_net || order.net_revenue || 0);
    setActiveTab("detail");
    setIsDetailOpen(true);
  };

  const addAdjustment = () => {
    setAdjustments([...adjustments, { label: "", type: "PERCENT", value: 0 }]);
  };

  const removeAdjustment = (idx) => {
    setAdjustments(adjustments.filter((_, i) => i !== idx));
  };

  const updateAdjustment = (idx, field, val) => {
    const next = [...adjustments];
    next[idx][field] = val;
    setAdjustments(next);
  };

  const handleVisionScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setVisionLoading(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
      });
      const base64 = await base64Promise;

      const res = await api.post("/ai/vision", {
        image: base64,
        mimeType: file.type
      });

      if (res.adjustments && res.adjustments.length > 0) {
        const newAdjs = res.adjustments.map(a => ({
          label: a.label.toUpperCase(),
          type: "FIXED",
          value: Math.abs(a.value)
        }));
        setAdjustments([...adjustments, ...newAdjs]);
        success(`${res.adjustments.length} adjustment(s) extracted by AI`);
      } else {
        error("No adjustments detected in the image");
      }
    } catch (err) {
      console.error(err);
      error("Vision Error: " + (err.response?.data?.error || err.message));
    } finally {
      setVisionLoading(false);
      if (visionInputRef.current) visionInputRef.current.value = "";
    }
  };

  const calculatedPayout = useMemo(() => {
    if (!selectedOrder) return 0;
    // Base amount is total minus discount and platform commission
    let net = selectedOrder.total - (selectedOrder.discount || 0) - (selectedOrder.commission || 0);
    adjustments.forEach(adj => {
      if (adj.type === 'PERCENT') {
        net -= (net * (Number(adj.value) / 100));
      } else {
        net -= Number(adj.value);
      }
    });
    return Math.round(net);
  }, [selectedOrder, adjustments]);

  const handleSavePlatform = async () => {
    if (!selectedOrder) return;
    setIsSavingPlatform(true);
    try {
      const res = await api.put(`/orders/${selectedOrder.id}`, {
        ...selectedOrder,
        platform_actual_net: calculatedPayout,
        platform_adjustments: adjustments,
        // Ensure we send back the items as the PUT route expects them
        items: selectedOrder.orderItems.map(i => ({ menu_id: i.menu_id, qty: i.qty, price: i.price }))
      });
      success("Platform data updated successfully");
      // Update local state so the detail view reflects changes immediately
      setSelectedOrder(res.data); 
      loadOrders(pagination.page);
      setActiveTab("detail"); 
    } catch (e) {
      console.error(e);
      error("Failed to save platform data");
    } finally {
      setIsSavingPlatform(false);
    }
  };

  const handleSettleOrder = async () => {
    if (!settlingOrder || !selectedPmId) return;
    const pm = paymentMethods.find(m => m.id === Number(selectedPmId));
    if (!pm) return;
    
    setSettleProcessing(true);
    try {
      const totalDue = Math.max(0, settlingOrder.total - (settlingOrder.discount || 0));
      const received = moneyReceived ? parseFloat(moneyReceived) : totalDue;

      await api.put(`/orders/${settlingOrder.id}`, {
        payment_method_id: pm.id,
        payment_method: pm.name,
        money_received: received,
        status: 'PAID'
      });
      success(`${t('shift.order_settled') || 'Order settled'} via ${pm.name}`);
      loadOrders(pagination.page);
      setIsSettleDialogOpen(false);
      setSettlingOrder(null);
      setMoneyReceived("");
    } catch (e) {
      console.error(e);
      error(t('common.error'));
    } finally {
      setSettleProcessing(false);
    }
  };

  const openSettleDialog = (order) => {
    setSettlingOrder(order);
    setMoneyReceived("");
    const defaultPm = paymentMethods.find(m => m.type === 'CASH') || paymentMethods[0];
    setSelectedPmId(defaultPm?.id?.toString() || "");
    setIsSettleDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#fcfdfe] pb-10">
      {/* Compact Sticky Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-sm sticky top-0 z-40">
        <div className="max-w-[1700px] mx-auto px-4 lg:px-10 py-4">
          <div className="flex justify-between items-center bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50">
            {/* Title */}
            <div className="space-y-0.5">
              <h1 className="text-xl font-[900] text-slate-900 tracking-tighter uppercase italic leading-none">{t('orders.title')}</h1>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-2">
                <span className="inline-block w-5 h-0.5 bg-emerald-500 rounded-full" />
                {t('orders.subtitle')} 
                <span className="ml-2 px-2 py-0.5 bg-emerald-500 text-white rounded-full text-[8px] animate-in fade-in zoom-in duration-500">
                  {pagination.total} {t('orders.total') || 'TRX'}
                </span>
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Status Dropdown - Mobile only in header */}
              <div className="lg:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-200">
                      <Filter className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[180px]">
                    {[
                      { id: "ALL",       label: t('orders.status_all') },
                      { id: "PENDING",   label: "PENDING" },
                      { id: "PAID",      label: t('orders.status_paid') },
                      { id: "PROCESSING",label: "PROCESSING" },
                      { id: "COMPLETED", label: "COMPLETED" },
                      { id: "UNPAID",    label: t('orders.status_unpaid') },
                      { id: "CANCELLED", label: t('orders.status_cancelled') },
                    ].map((s) => (
                      <DropdownMenuItem
                        key={s.id}
                        onClick={() => setActiveStatus(s.id)}
                        className={cn(
                          "flex items-center justify-between",
                          activeStatus === s.id ? "bg-indigo-600 text-white" : ""
                        )}
                      >
                        {s.label}
                        {activeStatus === s.id && <Check className="w-4 h-4" />}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="hidden lg:flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live System
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1700px] mx-auto px-4 lg:px-10 mt-5 space-y-4">
        
        {/* Stats Grid â€” 2 cols on mobile, 4 on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { id: 'paid',      label: t('orders.total_paid_card'),      value: stats.total_paid,      Icon: CheckCircle2, accent: 'emerald', sub: t('orders.collected_funds'), status: 'PAID' },
            { id: 'unpaid',    label: t('orders.total_unpaid_card'),    value: stats.total_unpaid,    Icon: CreditCard,   accent: 'rose',    sub: t('orders.receivables'),    ping: (stats.total_unpaid || 0) > 0, status: 'UNPAID' },
            { id: 'gross',     label: t('orders.total_gross_card'),     value: stats.total_gross,     Icon: TrendingUp,   accent: 'slate',   sub: t('orders.gross_sales'),    status: 'ALL' },
            { id: 'cancelled', label: t('orders.total_cancelled_card'), value: stats.total_cancelled, Icon: Trash2,       accent: 'amber',   sub: t('orders.total_void'),     status: 'CANCELLED' },
          ].map(({ id, label, value, Icon, accent, sub, ping, status }) => {
            const styles = {
              emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', ring: 'hover:ring-emerald-500/20' },
              rose:    { bg: 'bg-rose-500',    text: 'text-rose-600',    ring: 'hover:ring-rose-500/20' },
              slate:   { bg: 'bg-slate-800',   text: 'text-slate-800',   ring: 'hover:ring-slate-800/20' },
              amber:   { bg: 'bg-amber-500',   text: 'text-amber-600',   ring: 'hover:ring-amber-500/20' },
            }[accent];
            return (
              <div 
                key={id} 
                onClick={() => setActiveStatus(status)}
                className={cn(
                  "bg-white rounded-2xl border border-slate-100 shadow-sm p-4 overflow-hidden relative group transition-all cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-95 ring-offset-2 ring-transparent hover:ring-2",
                  activeStatus === status ? "ring-2 " + styles.ring : "",
                  styles.ring
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-current/10", styles.bg)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {ping && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
                  {activeStatus === status && (
                    <div className={cn("ml-auto px-2 py-0.5 rounded-full text-[8px] font-black uppercase text-white shadow-sm", styles.bg)}>
                      Active Filter
                    </div>
                  )}
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 truncate">{label}</p>
                <p className={cn("text-xl font-[900] italic tabular-nums leading-none tracking-tight", styles.text)}>
                  {loading ? <span className="opacity-30">--</span> : formatIDR(value || 0)}
                </p>
                <p className="text-[9px] font-bold text-slate-300 mt-2 uppercase tracking-widest truncate">{sub}</p>
              </div>
            );
          })}
        </div>

        {/* Filter Bar */}
        <div className="space-y-4">
          {/* Row 1: Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 pointer-events-none" />
            <Input
              type="text"
              placeholder={t('orders.search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-14 rounded-2xl border-slate-100 bg-white shadow-sm text-sm font-semibold tracking-wide placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/10"
            />
          </div>

          {/* Row 2: Period + Status + Refresh + Date Range */}
          <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm px-3 py-2.5 overflow-x-auto no-scrollbar">
            
            {/* 1. Period Filter Buttons */}
            <div className="flex items-center gap-1.5 shrink-0 px-1">
              {[
                { id: "today",   label: "TODAY" },
                { id: "weekly",  label: "WEEKLY" },
                { id: "monthly", label: "MONTHLY" },
                { id: "all",     label: "ALL TIME" },
                { id: "custom",  label: "CUSTOM" },
              ].map((f) => (
                <div key={f.id} className="shrink-0">
                  {f.id === 'custom' ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={cn(
                            "px-5 py-2.5 rounded-xl text-[10px] lg:text-[11px] font-[900] uppercase italic tracking-[0.1em] transition-all flex items-center justify-center gap-2",
                            activeFilter === f.id ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "text-slate-400 hover:bg-slate-50 border border-slate-100"
                          )}
                        >
                          <span>{f.label}</span>
                          <ChevronDown className="w-2 h-2 opacity-50" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="p-4 w-[280px] space-y-4">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Select Date Range</p>
                        <div className="space-y-2">
                           <label className="text-[8px] font-black uppercase text-slate-400">Start Date</label>
                           <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setActiveFilter("custom"); }}
                              className="w-full h-10 px-3 rounded-xl bg-slate-50 border-none text-[10px] font-black uppercase" />
                        </div>
                        <div className="space-y-2">
                           <label className="text-[8px] font-black uppercase text-slate-400">End Date</label>
                           <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setActiveFilter("custom"); }}
                              className="w-full h-10 px-3 rounded-xl bg-slate-50 border-none text-[10px] font-black uppercase" />
                        </div>
                        <Button 
                          className="w-full bg-slate-900 text-white text-[10px] font-black uppercase py-6 rounded-xl"
                          onClick={() => { loadOrders(1); setActiveFilter("custom"); }}
                        >
                          Apply Range
                        </Button>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <button
                      onClick={() => handleFilterChange(f.id)}
                      className={cn(
                        "px-4 lg:px-5 py-2.5 rounded-xl text-[10px] lg:text-[11px] font-[900] uppercase italic tracking-[0.1em] transition-all flex items-center justify-center",
                        activeFilter === f.id ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "text-slate-400 hover:bg-slate-50 border border-slate-100"
                      )}
                    >
                      <span>{f.label}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="hidden lg:block w-px h-8 bg-slate-100 shrink-0 mx-2" />

            {/* 2. Transaction Status Dropdown */}
            <div className="hidden lg:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 px-5 py-2.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 text-[11px] font-[900] uppercase italic tracking-[0.2em] hover:bg-indigo-100 transition-all shadow-sm shrink-0">
                    <Filter className="w-4 h-4" />
                    <span>{activeStatus === 'ALL' ? t('orders.status_all') : activeStatus}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px]">
                  {[
                    { id: "ALL",       label: t('orders.status_all') },
                    { id: "PENDING",   label: "PENDING" },
                    { id: "PAID",      label: "PAID" },
                    { id: "PROCESSING",label: "PROCESSING" },
                    { id: "COMPLETED", label: "COMPLETED" },
                    { id: "UNPAID",    label: "UNPAID" },
                    { id: "CANCELLED", label: "CANCELLED" },
                  ].map((s) => (
                    <DropdownMenuItem
                      key={s.id}
                      onClick={() => setActiveStatus(s.id)}
                      className={cn(
                        "flex items-center justify-between text-[11px] font-black py-3",
                        activeStatus === s.id ? "bg-indigo-600 text-white" : ""
                      )}
                    >
                      {s.label}
                      {activeStatus === s.id && <Check className="w-4 h-4" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* 3. Refresh button */}
            <button
              onClick={() => loadOrders(1)}
              className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0 transition-all active:scale-95 shadow-lg",
                loading ? "bg-slate-200" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20")}
            >
              <RefreshCcw className={cn("w-5 h-5", loading && "animate-spin")} />
            </button>

            <div className="flex-1 min-w-[30px]" />

            {/* Date Range Picker removed as requested */}
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <ResponsiveDataView
            loading={loading}
            data={orders}
            emptyMessage={t('common.no_records')}
            onRowClick={openDetail}
            columns={[
              {
                header: t('orders.order_id'),
                accessor: (order) => (
                  <div className="py-4">
                    <p className="font-mono text-sm font-[900] text-slate-900 uppercase group-hover:text-emerald-600 transition-colors">#{order.order_number}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase mt-1 tracking-widest">{new Date(order.date).toLocaleDateString()} {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                ),
                className: "pl-8",
                sortKey: 'order_number'
              },
              {
                header: t('orders.customer'),
                accessor: (order) => (
                  <div>
                    <p className="font-black text-slate-900 uppercase tracking-tight text-[13px] truncate max-w-[180px]">{order.customer_name || t('orders.guest')}</p>
                    <p className="text-[10px] font-black text-emerald-600/50 uppercase tracking-[0.2em] mt-1.5">{t('orders.staff')}: {order.user?.name || 'System'}</p>
                  </div>
                ),
                sortKey: 'customer_name'
              },
              {
                header: t('orders.type'),
                accessor: (order) => (
                  <span className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border inline-block ring-4 ring-transparent transition-all",
                    order.platform?.type === 'DELIVERY' ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-slate-100 text-slate-600 border-slate-200"
                  )}>
                    {order.platform?.name || t('orders.in_store')}
                  </span>
                ),
                sortKey: 'platform.name'
              },
              {
                header: t('orders.payment'),
                accessor: (order) => (
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                      <CreditCard className="w-4 h-4 text-slate-400" />
                    </div>
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{order.payment_method}</p>
                  </div>
                ),
                sortKey: 'payment_method'
              },
              {
                header: t('orders.total'),
                accessor: (order) => {
                  const items = order.orderItems || [];
                  const orderPlatId = Number(order.platform_id);
                  const total = items.reduce((acc, item) => {
                    const platPrice = item.menu?.prices?.find(p => Number(p.platform_id) === orderPlatId)?.price || item.price;
                    let itemPromoDisc = 0;
                    order.orderPromotions?.forEach(op => {
                      const pIds = op.promotion?.conditions?.[0]?.productIds || [];
                      if (pIds.includes(item.menu_id)) {
                        const totElig = items.filter(oi => pIds.includes(oi.menu_id)).reduce((s, x) => s + x.qty, 0);
                        if (totElig > 0) itemPromoDisc += (op.amount / totElig) * item.qty;
                      }
                    });
                    return acc + (platPrice * item.qty - itemPromoDisc);
                  }, 0);
                  return (
                    <p className="font-black text-emerald-600 text-lg tabular-nums italic">
                      {formatIDR(total + (order.service_amount || 0) + (order.tax_amount || 0))}
                    </p>
                  );
                },
                sortKey: 'total'
              },
              ...(canSeeProfit ? [{
                header: t('orders.profit'),
                accessor: (order) => {
                  const items = order.orderItems || [];
                  const orderPlatId = Number(order.platform_id);
                  const platCommissionRate = order.platform?.commission_rate || 0;
                  
                  const revenueStats = items.reduce((acc, item) => {
                    const platPrice = item.menu?.prices?.find(p => Number(p.platform_id) === orderPlatId)?.price || item.price;
                    const isConsignment = item.menu?.productType === 'CONSIGNMENT';
                    let itemPromoDisc = 0;
                    order.orderPromotions?.forEach(op => {
                      const pIds = op.promotion?.conditions?.[0]?.productIds || [];
                      if (pIds.includes(item.menu_id)) {
                        const totElig = items.filter(oi => pIds.includes(oi.menu_id)).reduce((s, x) => s + x.qty, 0);
                        if (totElig > 0) itemPromoDisc += (op.amount / totElig) * item.qty;
                      }
                    });

                    const itemNetAfterPromo = (platPrice * item.qty) - itemPromoDisc;
                    
                    return {
                      totalRevenue: acc.totalRevenue + itemNetAfterPromo,
                      ownRevenue: acc.ownRevenue + (isConsignment ? 0 : itemNetAfterPromo),
                      ownCogs: acc.ownCogs + (isConsignment ? 0 : (item.cost * item.qty))
                    };
                  }, { totalRevenue: 0, ownRevenue: 0, ownCogs: 0 });

                  // Commission for PROFIT calculation is based only on Own Products 
                  // to satisfy "tidak menghitung profit/rugi" for consignment
                  const commission = revenueStats.ownRevenue * (platCommissionRate / 100);
                  const adjustments = (order.platform_adjustments || []).reduce((sum, adj) => sum + (parseFloat(adj.value) || 0), 0);
                  
                  const profit = revenueStats.ownRevenue - revenueStats.ownCogs - commission - adjustments;

                  return (
                    <div className="py-4">
                      <p className="font-black text-slate-900 tabular-nums text-[13px]">{formatIDR(profit)}</p>
                      <p className={cn(
                        "text-[10px] font-black uppercase mt-1 tracking-widest",
                        profit > 0 ? "text-emerald-500" : "text-rose-500"
                      )}>
                        {Math.round((profit / (revenueStats.totalRevenue || 1)) * 100)}% MARGIN
                      </p>
                    </div>
                  );
                },
                align: "right",
              }] : []),
              {
                header: t('orders.status'),
                accessor: (order) => (
                  <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={cn(
                          "px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all hover:scale-105 active:scale-95 shadow-sm",
                          order.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-700 border-emerald-100 shadow-emerald-50" :
                          order.status === 'PROCESSING' ? "bg-blue-50 text-blue-700 border-blue-100 shadow-blue-50" :
                          order.status === 'PAID' ? "bg-indigo-50 text-indigo-700 border-indigo-100 shadow-indigo-50" :
                          order.status === 'PENDING' ? "bg-amber-50 text-amber-600 border-amber-100 shadow-amber-50" :
                          order.status === 'UNPAID' ? "bg-orange-50 text-orange-700 border-orange-100 shadow-orange-50" :
                          "bg-rose-50 text-rose-600 border-rose-100 shadow-rose-50"
                        )}>
                          {order.status}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-[180px]">
                        {["PENDING", "PAID", "PROCESSING", "COMPLETED", "UNPAID", "CANCELLED"].map(s => (
                          <DropdownMenuItem key={s} onClick={() => handleStatusChangeClick(order, s)} className="rounded-xl">{s}</DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ),
                align: "center",
                sortKey: 'status'
              },
              {
                header: (
                  <div className="w-full text-center pr-8">{t('common.actions')}</div>
                ),
                sortable: false,
                accessor: (order) => (
                  <div className="flex items-center justify-center gap-3 pr-8">
                    {order.status === 'UNPAID' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openSettleDialog(order); }}
                        className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 shadow-lg flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all transform active:scale-95 border border-emerald-100"
                        title="Lunasi"
                      >
                        <DollarSign className="w-5 h-5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); openDetail(order); }}
                      className="w-10 h-10 rounded-2xl bg-white shadow-lg flex items-center justify-center text-slate-600 hover:bg-slate-900 hover:text-white transition-all transform active:scale-95 border border-slate-100"
                      title="Lihat Detail"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                ),
                align: "center"
              }
            ]}
            renderCard={(order) => (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono text-xs font-black text-emerald-600">#{order.order_number}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(order.date).toLocaleDateString()} {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className={cn("px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border", order.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : order.status === 'PAID' ? "bg-indigo-50 text-indigo-700 border-indigo-100" : order.status === 'UNPAID' ? "bg-orange-50 text-orange-700 border-orange-100" : order.status === 'PENDING' ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-rose-50 text-rose-600 border-rose-100")}>
                          {order.status}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="rounded-2xl border-none shadow-2xl p-2 bg-slate-900 text-white min-w-[160px]">
                        {["PENDING","PAID","PROCESSING","COMPLETED","UNPAID","CANCELLED"].map(s => (
                          <DropdownMenuItem key={s} onClick={() => handleStatusChangeClick(order, s)} className="rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-colors p-4 cursor-pointer">{s}</DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="flex justify-between items-center py-2 border-y border-slate-50">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('orders.customer')}</p>
                    <p className="font-black text-slate-900 uppercase text-sm">{order.customer_name || t('orders.guest')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('orders.total')}</p>
                    <p className="font-black text-emerald-600 text-lg">
                      {formatIDR((() => {
                         const items = order.orderItems || [];
                         const orderPlatId = Number(order.platform_id);
                         const total = items.reduce((acc, item) => {
                           const platPrice = item.menu?.prices?.find(p => Number(p.platform_id) === orderPlatId)?.price || item.price;
                           let itemPromoDisc = 0;
                           order.orderPromotions?.forEach(op => {
                             const pIds = op.promotion?.conditions?.[0]?.productIds || [];
                             if (pIds.includes(item.menu_id)) {
                               const totElig = items.filter(oi => pIds.includes(oi.menu_id)).reduce((s, x) => s + x.qty, 0);
                               if (totElig > 0) itemPromoDisc += (op.amount / totElig) * item.qty;
                             }
                           });
                           return acc + (platPrice * item.qty - itemPromoDisc);
                         }, 0);
                         return total + (order.service_amount || 0) + (order.tax_amount || 0);
                      })())}
                    </p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <span>{order.platform?.name || t('orders.direct')} - {order.payment_method}</span>
                  <span>{t('orders.staff')}: {order.user?.name || 'System'}</span>
                </div>
                {canSeeProfit && (() => {
                  const items = order.orderItems || [];
                  const orderPlatId = Number(order.platform_id);
                  const platCommissionRate = order.platform?.commission_rate || 0;
                  
                  const revenueStats = items.reduce((acc, item) => {
                    const platPrice = item.menu?.prices?.find(p => Number(p.platform_id) === orderPlatId)?.price || item.price;
                    const isConsignment = item.menu?.productType === 'CONSIGNMENT';
                    let itemPromoDisc = 0;
                    order.orderPromotions?.forEach(op => {
                      const pIds = op.promotion?.conditions?.[0]?.productIds || [];
                      if (pIds.includes(item.menu_id)) {
                        const totElig = items.filter(oi => pIds.includes(oi.menu_id)).reduce((s, x) => s + x.qty, 0);
                        if (totElig > 0) itemPromoDisc += (op.amount / totElig) * item.qty;
                      }
                    });

                    const itemNetAfterPromo = (platPrice * item.qty) - itemPromoDisc;
                    
                    return {
                      totalRevenue: acc.totalRevenue + itemNetAfterPromo,
                      ownRevenue: acc.ownRevenue + (isConsignment ? 0 : itemNetAfterPromo),
                      ownCogs: acc.ownCogs + (isConsignment ? 0 : (item.cost * item.qty))
                    };
                  }, { totalRevenue: 0, ownRevenue: 0, ownCogs: 0 });

                  const commission = revenueStats.totalRevenue * (platCommissionRate / 100);
                  const adjustments = (order.platform_adjustments || []).reduce((sum, adj) => sum + (parseFloat(adj.value) || 0), 0);
                  const profit = revenueStats.ownRevenue - revenueStats.ownCogs - commission - adjustments;

                  return (
                    <div className="pt-3 border-t border-slate-50 flex justify-between items-center">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('orders.profit')}</p>
                       <p className={cn("font-black text-sm italic", profit >= 0 ? "text-emerald-600" : "text-rose-600")}>
                        {formatIDR(profit)} ({Math.round((profit / (revenueStats.totalRevenue || 1)) * 100)}%)
                       </p>
                    </div>
                  );
                })()}
              </div>
            )}
          />
          {pagination.totalPages > 1 && (
            <div className="px-5 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-4">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} {t('common.of')} {pagination.total} {t('orders.orders_label')}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{t('common.per_page')}</span>
                  <select value={pagination.limit} onChange={(e) => handleLimitChange(Number(e.target.value))} className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[9px] font-black uppercase outline-none cursor-pointer text-slate-600 shadow-sm">
                    {[10,20,50,100].map(l => (<option key={l} value={l}>{l}</option>))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" className="rounded-xl font-black text-[9px] uppercase px-3 h-8" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}>{t('common.previous')}</Button>
                <div className="flex items-center gap-1.5">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => handlePageChange(p)} className={cn("w-8 h-8 rounded-xl font-black text-[9px] transition-all", p === pagination.page ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-900")}>{p}</button>
                  ))}
                  {pagination.totalPages > 5 && <span className="text-slate-300">...</span>}
                </div>
                <Button variant="ghost" className="rounded-xl font-black text-[9px] uppercase px-3 h-8" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>{t('common.next')}</Button>
              </div>
            </div>
          )}
        </div>
      </div>


      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-[3rem] border-none shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] flex flex-col max-h-[95dvh]">
           {selectedOrder && (
             <div className="flex flex-col flex-1 overflow-hidden">
                <div className="bg-slate-900 p-6 lg:p-10 text-white relative overflow-hidden flex-shrink-0">
                  <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-emerald-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
                  
                  <div className="flex flex-row justify-between items-center gap-4 relative z-10">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                         <div className="p-1.5 bg-emerald-500/20 rounded-md border border-emerald-500/20">
                            <ShoppingBag className="w-4 h-4 text-emerald-400" />
                         </div>
                         <h3 className="text-base lg:text-lg font-black uppercase tracking-tight text-amber-400 italic leading-none">{t('orders.order_id_label')} #{selectedOrder.order_number || selectedOrder.id}</h3>
                      </div>
                      <div className="flex items-center gap-4">
                         <span className={cn(
                            "px-3 py-1 rounded-lg text-[8px] lg:text-[9px] font-black uppercase tracking-[0.2em] border",
                            selectedOrder.platform?.type === 'DELIVERY' ? "bg-orange-500/20 text-orange-400 border-orange-500/20" : "bg-white/10 text-white/50 border-white/10"
                         )}>
                            {selectedOrder.platform?.name || t('orders.store')}
                         </span>
                         <span className="text-[8px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(selectedOrder.date).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="text-right">
                       <p className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-0.5 opacity-60 uppercase">{t('orders.total_paid_label')}</p>
                       <p className="text-2xl lg:text-3xl font-black tracking-tighter tabular-nums italic text-white drop-shadow-2xl">
                          {(() => {
                             const totalSub = selectedOrder.orderItems.reduce((acc, item) => {
                                const orderPlatId = Number(selectedOrder.platform_id);
                                const menuPriceOnPlatform = item.menu?.prices?.find(p => Number(p.platform_id) === orderPlatId)?.price;
                                const unitRefPrice = menuPriceOnPlatform || item.menu?.price || item.price;
                                const refPriceTotal = unitRefPrice * item.qty;

                                let itemPromoDiscount = 0;
                                selectedOrder.orderPromotions?.forEach(op => {
                                  const pIds = op.promotion?.conditions?.[0]?.productIds || [];
                                  if (pIds.length > 0 && pIds.includes(item.menu_id)) {
                                    const totalEligibleItemsQty = selectedOrder.orderItems
                                      .filter(oi => pIds.includes(oi.menu_id))
                                      .reduce((sum, oi) => sum + oi.qty, 0);
                                    if (totalEligibleItemsQty > 0) {
                                      itemPromoDiscount += (op.amount / totalEligibleItemsQty) * item.qty;
                                    }
                                  }
                                });
                                return acc + (refPriceTotal - itemPromoDiscount);
                             }, 0);
                             return formatIDR(totalSub);
                          })()}
                       </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 sm:p-10 lg:p-14 space-y-10 lg:space-y-14 bg-white overflow-y-auto flex-1 custom-scrollbar">
                   {activeTab === 'detail' ? (
                    <div className="flex flex-col gap-10 lg:gap-14 animate-in slide-in-from-bottom-4 duration-500">
                      {/* 1. Order Items Section */}
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <h4 className="text-[10px] lg:text-[11px] font-black text-slate-300 uppercase tracking-[0.5em] shrink-0">{t('orders.order_items')}</h4>
                          <div className="flex-1 h-px bg-slate-100" />
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          {selectedOrder.orderItems.map((item, idx) => {

                            
                            // Calculate specific platform reference price
                            const orderPlatId = Number(selectedOrder.platform_id);
                            const menuPriceOnPlatform = item.menu?.prices?.find(p => Number(p.platform_id) === orderPlatId)?.price;
                            const unitRefPrice = menuPriceOnPlatform || item.menu?.price || item.price;
                            const refPriceTotal = unitRefPrice * item.qty;

                            // Calculate promotions targeting this specific item
                            let itemPromoDiscount = 0;
                            selectedOrder.orderPromotions?.forEach(op => {
                              const pIds = op.promotion?.conditions?.[0]?.productIds || [];
                              if (pIds.length > 0 && pIds.includes(item.menu_id)) {
                                const totalEligibleItemsQty = selectedOrder.orderItems
                                  .filter(oi => pIds.includes(oi.menu_id))
                                  .reduce((sum, oi) => sum + oi.qty, 0);
                                    
                                if (totalEligibleItemsQty > 0) {
                                  itemPromoDiscount += (op.amount / totalEligibleItemsQty) * item.qty;
                                }
                              }
                            });

                            const itemPromos = selectedOrder.orderPromotions?.filter(op => {
                              const pIds = op.promotion?.conditions?.[0]?.productIds || [];
                              return pIds.includes(item.menu_id);
                            }) || [];

                            const finalDisplayPrice = refPriceTotal - itemPromoDiscount;
                            const itemProfit = finalDisplayPrice - (item.cost * item.qty);
                            const hasItemLevelDiscount = itemPromoDiscount > 0 || (refPriceTotal > (item.price * item.qty));

                            return (
                              <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 group hover:border-emerald-200 hover:bg-white transition-all shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 gap-4">
                                  <div className="flex items-center gap-4 sm:gap-6 flex-1">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-base shadow-xl group-hover:bg-emerald-600 transition-colors">
                                      {item.qty}
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-black text-slate-900 uppercase tracking-tight text-sm sm:text-base leading-none mb-2">{item.menu.name}</p>
                                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                        <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-1.5">
                                          <Tag className="w-3 h-3" /> {t('orders.price')}: {formatIDR(item.price)}
                                        </p>
                                        {canSeeProfit && (
                                          <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-1.5">
                                            <Calculator className="w-3 h-3 text-amber-500" /> {t('orders.cogs')}: {formatIDR(item.cost)}
                                          </p>
                                        )}
                                      </div>
                                      {itemPromos.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                          {itemPromos.map((op, i) => (
                                            <span key={i} className="px-2 py-0.5 rounded-md bg-emerald-500 text-white text-[7px] font-black uppercase tracking-widest shadow-sm">
                                              {op.promotion.name}
                                            </span >
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right ml-14 sm:ml-0">
                                    {hasItemLevelDiscount ? (
                                      <div className="flex flex-col items-end">
                                        <p className="text-[10px] font-bold text-slate-300 line-through tabular-nums italic leading-none mb-1 opacity-60">
                                          {formatIDR(refPriceTotal)}
                                        </p>
                                        <p className="font-black text-slate-900 text-lg sm:text-xl tabular-nums tracking-tighter italic leading-none">
                                          {formatIDR(finalDisplayPrice)}
                                        </p>
                                      </div>
                                    ) : (
                                      <p className="font-black text-slate-900 text-lg sm:text-xl tabular-nums tracking-tighter italic">{formatIDR(item.price * item.qty)}</p>
                                    )}
                                    {canSeeProfit && (
                                      <p className={cn(
                                        "text-[9px] font-black uppercase tracking-widest italic mt-1",
                                        itemProfit >= 0 ? "text-emerald-500" : "text-rose-500"
                                      )}>
                                        {itemProfit >= 0 ? '+' : ''}{formatIDR(itemProfit)} {t('orders.profit').toUpperCase()}
                                      </p>
                                    )}
                                  </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>



                      {selectedOrder.note && (
                        <div className="p-6 sm:p-8 lg:p-10 bg-amber-50/50 rounded-2xl sm:rounded-[2.5rem] border border-amber-100/50 flex flex-col sm:flex-row gap-4 sm:gap-6 lg:gap-8 items-start">
                          <div className="p-3 lg:p-4 bg-amber-100 rounded-xl sm:rounded-2xl text-amber-600 flex-shrink-0">
                              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                          </div>
                          <div>
                              <p className="text-[9px] sm:text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1 sm:mb-2">{t('orders.staff_note')}</p>
                              <p className="text-sm sm:text-base lg:text-xl font-black text-amber-900/80 italic uppercase tracking-tight leading-relaxed">"{selectedOrder.note}"</p>
                          </div>
                        </div>
                      )}

                      <div className="space-y-12 pt-6 lg:pt-14 border-t border-slate-100">
                        {/* 2. Transaction Details Section */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-3">
                              <p className="text-[9px] lg:text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] leading-none shrink-0">{t('orders.details')}</p>
                              <div className="flex-1 h-px bg-slate-50" />
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10">
                              {[
                                { label: t('orders.staff'), value: selectedOrder.user?.name, icon: <User className="w-3 h-3 opacity-40" /> },
                                { label: t('orders.channel'), value: selectedOrder.platform?.name || t('orders.store'), icon: <Layout className="w-3 h-3 opacity-40" /> },
                                { label: t('orders.payment'), value: selectedOrder.payment_method, icon: <CreditCard className="w-3 h-3 opacity-40" /> },
                                { label: t('orders.customer'), value: selectedOrder.customer_name || t('orders.guest'), icon: <Users className="w-3 h-3 opacity-40" /> },
                              ].map((m, i) => (
                                <div key={i} className="flex flex-col gap-2">
                                  <div className="flex items-center gap-2">
                                    {m.icon}
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">{m.label}</span>
                                  </div>
                                  <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-none">{m.value || '-'}</span>
                                </div>
                              ))}
                            </div>
                        </div>
                        
                        {/* 3. Financial Summary - Waterfall Waterfall Detail Model */}
                        {canSeeProfit && selectedOrder && (
                          <div className="space-y-6">
                            <div className="flex items-center gap-3">
                              <p className="text-[9px] lg:text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] leading-none shrink-0">{t('orders.financial_summary')}</p>
                              <div className="flex-1 h-px bg-slate-50" />
                            </div>
                            
                        {(() => {
                              // 1. Calculate items subtotal after item-level promos (The "Sold Price" sum)
                              // 1. Calculate items subtotal after POS-level platform promos (The "Harga Pesanan")
                              const itemCalculations = selectedOrder.orderItems.map(item => {
                                const orderPlatId = Number(selectedOrder.platform_id);
                                const menuPriceOnPlatform = item.menu?.prices?.find(p => Number(p.platform_id) === orderPlatId)?.price;
                                const unitRefPrice = menuPriceOnPlatform || item.menu?.price || item.price;
                                const refPriceTotal = unitRefPrice * item.qty;

                                let itemPromoDiscount = 0;
                                selectedOrder.orderPromotions?.forEach(op => {
                                  const pIds = op.promotion?.conditions?.[0]?.productIds || [];
                                  if (pIds.length > 0 && pIds.includes(item.menu_id)) {
                                    const totalEligibleItemsQty = selectedOrder.orderItems
                                      .filter(oi => pIds.includes(oi.menu_id))
                                      .reduce((sum, oi) => sum + oi.qty, 0);
                                    if (totalEligibleItemsQty > 0) {
                                      itemPromoDiscount += (op.amount / totalEligibleItemsQty) * item.qty;
                                    }
                                  }
                                });
                                return { refPriceTotal, itemPromoDiscount, finalPrice: refPriceTotal - itemPromoDiscount };
                              });

                              const hargaPesanan = itemCalculations.reduce((s, i) => s + i.finalPrice, 0);

                              // 2. Calculate Merchant Adjustments (Subsidies, Vouchers, etc.)
                              const platformAdjustments = selectedOrder.platform_adjustments || [];
                              const totalAdjustments = platformAdjustments.reduce((sum, adj) => {
                                 if (adj.type === 'PERCENT') return sum + (hargaPesanan * (Number(adj.value) / 100));
                                 return sum + Number(adj.value);
                              }, 0);

                              const subtotalPencairan = hargaPesanan - totalAdjustments;
                              
                              // 3. Platform Revenue & Fees
                              const netRevenue = selectedOrder.platform_actual_net || selectedOrder.net_revenue || 0;
                              const platformFee = subtotalPencairan - netRevenue;
                              
                              const totalCost = selectedOrder.orderItems?.reduce((sum, item) => {
                                if (item.menu?.productType === 'CONSIGNMENT') return sum;
                                return sum + (item.cost * item.qty);
                              }, 0) || 0;

                              const profit = netRevenue - totalCost;
                              const margin = netRevenue > 0 ? (profit / netRevenue) * 100 : 0;
                              
                              return (
                                <div className="relative pl-6 space-y-1">
                                   {/* Vertical Path Line */}
                                   <div className="absolute left-[3px] top-4 bottom-4 w-px bg-gradient-to-b from-slate-200 via-slate-100 to-emerald-400 border-l border-dashed border-slate-300" />

                                   {/* Step 1: Harga Pesanan */}
                                   <div className="relative group">
                                      <div className="absolute -left-[27px] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-slate-900 border-2 border-white ring-4 ring-slate-50" />
                                      <div className="flex justify-between items-center p-5 bg-white rounded-3xl border border-slate-100 shadow-sm group-hover:border-slate-200 transition-all">
                                         <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Harga Pesanan</span>
                                            <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest italic tracking-tight">Main Subtotal</span>
                                         </div>
                                         <span className="text-lg font-black text-slate-900 tabular-nums italic">{formatIDR(hargaPesanan)}</span>
                                      </div>
                                   </div>

                                    {/* Step 2: Merchant Adjustments Breakdown (The Subsidy section) */}
                                    {platformAdjustments.length > 0 && (
                                       <div className="py-2 ml-4 space-y-2">
                                          <div className="flex items-center gap-3 mb-2 px-2">
                                            <ArrowDownRight className="w-3 h-3 text-slate-300" />
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Merchant Adjustments</span>
                                          </div>
                                          {platformAdjustments.map((adj, i) => (
                                             <div key={i} className="flex justify-between items-center px-6 py-3 bg-slate-50/50 rounded-2xl border border-slate-100 relative group hover:bg-white transition-all">
                                                <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-4 h-px bg-slate-200" />
                                                <div className="flex items-center gap-3">
                                                   <div className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-black text-[8px]">-</div>
                                                   <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{adj.label}</span>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-400 tabular-nums">
                                                   ({adj.type === 'PERCENT' ? `${adj.value}%` : formatIDR(adj.value)})
                                                </span>
                                             </div>
                                          ))}
                                       </div>
                                    )}

                                   {/* Milestone 1: Subtotal Pencairan (Like Shopee total before commission) */}
                                   <div className="relative group py-2">
                                      <div className="absolute -left-[27px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-slate-400 border-2 border-white ring-4 ring-slate-50" />
                                      <div className="flex justify-between items-center p-5 bg-slate-100/50 rounded-3xl border border-slate-200 border-dashed group-hover:bg-slate-100 transition-all">
                                         <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest italic">Subtotal Pencairan</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest italic opacity-60">Before Platform Fee</span>
                                         </div>
                                         <span className="text-xl font-[900] text-slate-600 tabular-nums italic tracking-tighter">{formatIDR(subtotalPencairan)}</span>
                                      </div>
                                   </div>

                                    {/* Step 1.5: Order Discounts (Waterfall Step) */}
                                   {/* Step 3: Platform Deductions */}
                                   <div className="py-2 ml-4 space-y-3">
                                      {platformFee > 0 && (
                                         <div className="flex justify-between items-center px-6 py-3 bg-rose-50/30 rounded-2xl border border-rose-100/20 relative group">
                                            <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-4 h-px bg-slate-200" />
                                            <div className="flex items-center gap-3">
                                               <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center text-rose-500 font-black text-[10px]">-</div>
                                               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Platform Fee / Commission</span>
                                            </div>
                                            <span className="text-[11px] font-black text-rose-500 tabular-nums">({formatIDR(platformFee)})</span>
                                         </div>
                                      )}
                                   </div>

                                   {/* Milestone 1: Net Revenue */}
                                   <div className="relative group">
                                      <div className="absolute -left-[27px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white ring-4 ring-emerald-50" />
                                      <div className="flex justify-between items-center p-6 bg-emerald-600 rounded-[2rem] shadow-xl shadow-emerald-600/20 group-hover:scale-[1.02] transition-all relative overflow-hidden">
                                         <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl opacity-50" />
                                         <div className="flex flex-col gap-1 relative z-10">
                                            <span className="text-[10px] font-black text-emerald-100 uppercase tracking-[0.2em]">{t('orders.net_revenue_label')}</span>
                                            <span className="text-[8px] font-bold text-emerald-200 uppercase tracking-widest italic opacity-60">Actual Received</span>
                                         </div>
                                         <span className="text-2xl font-black text-white tabular-nums italic tracking-tight relative z-10">{formatIDR(netRevenue)}</span>
                                      </div>
                                   </div>

                                   {/* Step 3: Product Cost */}
                                   <div className="py-2 ml-4">
                                      <div className="flex justify-between items-center px-6 py-4 bg-slate-900 rounded-2xl relative group">
                                         <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-4 h-px bg-slate-200" />
                                         <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-3">
                                               <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-rose-400 font-black text-[10px]">-</div>
                                               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{t('orders.cogs')} (HPP)</span>
                                            </div>
                                            <span className="text-[8px] font-medium text-slate-500 uppercase tracking-widest ml-8">Direct Product Cost</span>
                                         </div>
                                         <span className="text-[12px] font-black text-rose-400 tabular-nums italic">({formatIDR(totalCost)})</span>
                                      </div>
                                   </div>

                                   {/* Milestone 2: Net Profit */}
                                   <div className="relative pt-2">
                                      <div className="absolute -left-[27px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-900 border-2 border-emerald-400 ring-4 ring-slate-950" />
                                      <div className="flex justify-between items-center p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl transition-all">
                                         <div className="flex flex-col gap-3">
                                            <div className="flex flex-col gap-1.5">
                                               <span className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.3em] italic leading-none">Net {t('orders.profit')}</span>
                                               <span className="px-3 py-1 rounded-lg bg-emerald-500 text-white text-[8px] font-black uppercase tracking-widest block w-fit shadow-lg shadow-emerald-500/20">{Math.round(margin)}% MARGIN</span>
                                            </div>
                                         </div>
                                         <div className="text-right flex flex-col gap-1.5">
                                            <p className={cn("text-3xl sm:text-4xl font-black italic tabular-nums tracking-tighter leading-none text-emerald-400 transition-all", profit < 0 && "text-rose-400")}>
                                              {formatIDR(profit)}
                                            </p>
                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.4em] italic">Final Earnings</p>
                                          </div>
                                      </div>
                                   </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}

                        {/* 4. Action Buttons Hub */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-10">
                           <button 
                             onClick={() => {
                               setReceiptOrder(selectedOrder);
                               setIsReceiptPreviewOpen(true);
                             }}
                             className="h-20 sm:h-24 rounded-[1.8rem] bg-slate-900 hover:bg-emerald-600 text-white font-black uppercase text-xs tracking-widest shadow-xl hover:shadow-emerald-500/30 active:scale-[0.97] transition-all flex items-center justify-center gap-4 group relative overflow-hidden"
                           >
                             <Printer className="w-6 h-6 group-hover:scale-110 transition-transform relative z-10" /> 
                             <span className="relative z-10 tracking-[0.2em]">{t('orders.print_receipt')}</span>
                           </button>

                           <button 
                             onClick={() => setActiveTab("platform")}
                             className="h-20 sm:h-24 rounded-[1.8rem] bg-slate-50 border-2 border-dashed border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 text-slate-500 hover:text-emerald-700 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-4 active:scale-[0.97] group"
                           >
                             <RefreshCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                             <span className="text-center leading-tight">Manage<br/>Adjustments</span>
                           </button>
                        </div>

                        {/* 5. Cancel Button - Bottom Middle */}
                        <div className="flex justify-center pt-10 pb-4">
                           {selectedOrder.status === 'CANCELLED' ? (
                              <button 
                                onClick={() => {
                                  setPendingStatusChange({ orderId: selectedOrder.id, newStatus: 'DELETE_PERMANENT' });
                                  setIsPinDialogOpen(true);
                                }}
                                className="px-10 py-4 h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] text-white bg-rose-600 hover:bg-rose-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-rose-500/20 active:scale-95"
                              >
                                <Trash2 className="w-4 h-4" /> {t('orders.delete_permanent')}
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleStatusChangeClick(selectedOrder, "CANCELLED")}
                                className="px-10 py-4 h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all flex items-center justify-center gap-3 group active:scale-95"
                              >
                                <Trash2 className="w-4 h-4 opacity-50 group-hover:opacity-100" /> {t('orders.cancel_order')}
                              </button>
                            )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8 sm:space-y-10 lg:space-y-12 animate-in slide-in-from-right-4 duration-500">
                        <div className="space-y-6">
                           <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-6 border-b border-slate-100">
                              <div className="flex items-center gap-4">
                                <button 
                                  onClick={() => setActiveTab("detail")}
                                  className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center shrink-0 shadow-sm"
                                >
                                  <ArrowLeft className="w-5 h-5" />
                                </button>
                                <div>
                                    <h4 className="text-xl sm:text-2xl font-black text-slate-900 uppercase italic leading-none">Income Adjustment</h4>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">Reconcile actual revenue from platform reports</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                                 <input 
                                   type="file" 
                                   accept="image/*" 
                                   className="hidden" 
                                   ref={visionInputRef} 
                                   onChange={handleVisionScan}
                                 />
                                 <button 
                                   onClick={() => visionInputRef.current?.click()}
                                   disabled={visionLoading}
                                   className="flex-1 lg:flex-none px-6 h-12 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 group"
                                 >
                                   {visionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform text-emerald-300" />}
                                   <span>AI Magic Scan</span>
                                 </button>
                                 <button 
                                   onClick={addAdjustment}
                                   className="flex-1 lg:flex-none px-6 h-12 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                                 >
                                   <span>+ Manual Add</span>
                                 </button>
                               </div>
                           </div>

                           <div className="space-y-4 mt-6 sm:mt-8">
                              {adjustments.length === 0 && (
                                <div className="py-8 sm:py-12 border-2 border-dashed border-slate-100 rounded-2xl sm:rounded-[2.5rem] flex flex-col items-center justify-center gap-3 sm:gap-4">
                                   <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-50 flex items-center justify-center">
                                      <Tag className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
                                   </div>
                                   <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">No adjustments added yet</p>
                                </div>
                              )}
                              
                              {adjustments.map((adj, idx) => (
                                 <div key={idx} className="p-5 sm:p-7 bg-slate-50/50 rounded-3xl border border-slate-100 flex flex-col md:flex-row gap-5 items-stretch md:items-end group hover:bg-white hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-500/5 transition-all animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex-1 min-w-0 space-y-2">
                                       <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-3">Adjustment Name</Label>
                                       <input 
                                         placeholder="e.g. Service Fee / Bag Charge" 
                                         className="w-full h-12 px-6 rounded-2xl bg-white border-2 border-transparent focus:border-emerald-400 shadow-sm text-[9px] sm:text-[10px] font-bold uppercase outline-none transition-all placeholder:text-slate-200"
                                         value={adj.label} 
                                         onChange={(e) => updateAdjustment(idx, 'label', e.target.value)} 
                                       />
                                    </div>
                                    <div className="md:w-40 space-y-2">
                                       <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-3">Type</Label>
                                       <select 
                                         className="w-full h-12 px-4 rounded-2xl bg-white border-2 border-transparent focus:border-emerald-400 shadow-sm text-[11px] font-black uppercase outline-none transition-all cursor-pointer"
                                         value={adj.type}
                                         onChange={(e) => updateAdjustment(idx, 'type', e.target.value)}
                                       >
                                          <option value="PERCENT">% PERCENT</option>
                                          <option value="FIXED">IDR (FIXED)</option>
                                       </select>
                                    </div>
                                    <div className="md:w-48 space-y-2">
                                       <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-3">Value</Label>
                                       <input 
                                         type="number"
                                         placeholder="0"
                                         className="w-full h-12 px-6 rounded-2xl bg-white border-2 border-transparent focus:border-emerald-400 shadow-sm text-[11px] font-black uppercase outline-none transition-all font-mono"
                                         value={adj.value}
                                         onChange={(e) => updateAdjustment(idx, 'value', e.target.value)}
                                       />
                                    </div>
                                    <button 
                                       onClick={() => removeAdjustment(idx)}
                                       className="h-12 w-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shrink-0 shadow-sm hover:shadow-rose-500/20 active:scale-90"
                                    >
                                       <Trash2 className="w-5 h-5" />
                                    </button>
                                 </div>
                               ))}
                           </div>

                           <div className="pt-10 border-t border-slate-100 flex flex-col items-center gap-8">
                              <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 sm:p-10 rounded-[3rem] text-white flex flex-col items-center gap-2 w-full max-w-lg shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] relative overflow-hidden">
                                 <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                                 <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] relative z-10">Final Adjusted Income</p>
                                 <h2 className="text-4xl sm:text-5xl font-black italic tracking-tighter text-white drop-shadow-sm relative z-10 tabular-nums">{formatIDR(calculatedPayout)}</h2>
                                 <div className="mt-4 px-4 py-2 bg-white/5 rounded-full border border-white/10 relative z-10">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase italic tracking-widest">{adjustments.length} Active Adjustment(s)</p>
                                 </div>
                              </div>

                              <button 
                                onClick={handleSavePlatform}
                                disabled={isSavingPlatform}
                                className="h-16 px-10 sm:px-14 bg-emerald-600 text-white rounded-[2rem] text-[11px] sm:text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-emerald-500/20 hover:bg-emerald-700 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-4 w-full sm:w-auto group"
                              >
                                {isSavingPlatform ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5 text-emerald-300 group-hover:scale-110 transition-transform" />}
                                <span>Save Reconciliation</span>
                              </button>
                           </div>
                        </div>
                    </div>
                  )}
                </div>
             </div>
           )}
        </DialogContent>
      </Dialog>
      
      {receiptOrder && (
        <ReceiptPreview 
          isOpen={isReceiptPreviewOpen} 
          onClose={() => {
            setIsReceiptPreviewOpen(false);
            // Refresh the current order details to get latest print_count
            if (selectedOrder?.id === receiptOrder.id) {
              loadOrders(pagination.page);
              // Optimistically update selectedOrder if possible or let user re-open
            }
          }} 
          order={receiptOrder} 
          config={storeConfig}
          forceCopy={true}
          receiptOnly={true}
        />
      )}

      <PinVerificationModal 
        open={isPinDialogOpen}
        onClose={() => {
          setIsPinDialogOpen(false);
          setPendingStatusChange(null);
        }}
        onSubmit={handlePinVerify}
        title="Manager PIN"
        subtitle="Verification required for this action"
      />

      <Dialog open={isSettleDialogOpen} onOpenChange={setIsSettleDialogOpen}>
        <DialogContent className="max-w-xl p-0 rounded-[2.5rem] overflow-hidden border-none shadow-2xl">
          <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
            <div>
              <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">{t('pos.total_payable')}</p>
              <p className="text-3xl font-black italic tabular-nums font-mono text-amber-400 drop-shadow-sm">
                {formatIDR(settlingOrder ? Math.max(0, settlingOrder.total - (settlingOrder.discount || 0)) : 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-[9px] font-black uppercase mb-1 italic">CHECKOUT</p>
              <CreditCard className="w-8 h-8 ml-auto opacity-50 text-white" />
            </div>
          </div>
          
          <div className="p-8 space-y-8 max-h-[70dvh] overflow-y-auto scrollbar-hide">
            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('pos.payment_method')}</Label>
              <div className="grid grid-cols-4 gap-2">
                {paymentMethods.map(pm => (
                  <button 
                    key={pm.id} 
                    type="button"
                    onClick={() => setSelectedPmId(pm.id.toString())}
                    className={cn(
                      "h-20 border rounded-2xl flex flex-col items-center justify-center transition-all p-2",
                      selectedPmId === pm.id.toString() 
                        ? "bg-slate-900 text-white border-slate-900 shadow-xl" 
                        : "bg-white border-slate-100 hover:bg-slate-50"
                    )}
                  >
                    <span className="text-[10px] font-black uppercase text-center line-clamp-2">{pm.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {paymentMethods.find(m => m.id === Number(selectedPmId))?.type === "CASH" && (
              <div className="bg-slate-50 p-6 rounded-[2rem] space-y-4 border border-slate-100">
                <div className="flex justify-between items-center font-black text-[10px] uppercase text-slate-400">
                  <span>{t('pos.money_received')}</span>
                  <span className={cn(
                    "transition-colors",
                    (parseFloat(moneyReceived) || 0) >= (settlingOrder ? Math.max(0, settlingOrder.total - (settlingOrder.discount || 0)) : 0) ? "text-emerald-600" : "text-rose-500"
                  )}>
                    {t('pos.change')}: {formatIDR(Math.max(0, (parseFloat(moneyReceived) || 0) - (settlingOrder ? Math.max(0, settlingOrder.total - (settlingOrder.discount || 0)) : 0)))}
                  </span>
                </div>
                <Input 
                  type="number" 
                  className="h-14 text-3xl font-black text-center font-mono border-none bg-white shadow-inner" 
                  value={moneyReceived} 
                  onChange={e => setMoneyReceived(e.target.value)} 
                  placeholder="0" 
                />
                <div className="grid grid-cols-4 gap-2">
                  {quickMoneyButtons.map(amt => (
                    <button 
                      key={amt} 
                      type="button" 
                      onClick={() => setMoneyReceived(amt.toString())} 
                      className="h-10 border bg-white rounded-xl text-[10px] font-black hover:bg-emerald-500 hover:text-white transition-all uppercase tracking-tighter"
                    >
                      {amt / 1000}k
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4 border-t border-slate-100">
               <Button 
                type="button" 
                variant="ghost" 
                className="h-14 flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest text-slate-400"
                onClick={() => setIsSettleDialogOpen(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button 
                type="button" 
                className="h-14 flex-[2] rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-black uppercase text-[10px] tracking-[0.2em] text-white shadow-xl shadow-emerald-500/20" 
                onClick={handleSettleOrder} 
                disabled={settleProcessing || !selectedPmId}
              >
                {settleProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : t('pos.authorize_settlement')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
