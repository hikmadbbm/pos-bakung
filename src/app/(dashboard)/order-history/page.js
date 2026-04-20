"use client";
import { useEffect, useState, useMemo } from "react";
import { api } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Button } from "../../../components/ui/button";
import { Search, Eye, Calendar, RefreshCcw, TrendingUp, DollarSign, ShoppingBag, CreditCard, Printer, Trash2, AlertCircle, Tag, CheckCircle2, Loader2, Filter, ChevronDown, Check } from "lucide-react";
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

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (filter === "today") {
      // already set
    } else if (filter === "weekly") {
      start.setDate(now.getDate() - 7);
    } else if (filter === "monthly") {
      start.setMonth(now.getMonth() - 1);
    } 
    
    if (filter !== "custom" && filter !== "all") {
      setStartDate(toLocalYYYYMMDD(start));
      setEndDate(toLocalYYYYMMDD(end));
    }
  };

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

  const handleStatusChangeClick = (order, newStatus) => {
    if (order.status === newStatus) return;
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
    setActualNet(order.platform_actual_net || 0);
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
      await api.put(`/orders/${selectedOrder.id}`, {
        ...selectedOrder,
        platform_actual_net: calculatedPayout,
        platform_adjustments: adjustments,
        // Ensure we send back the items as the PUT route expects them
        items: selectedOrder.orderItems.map(i => ({ menu_id: i.menu_id, qty: i.qty, price: i.price }))
      });
      success("Platform data updated successfully");
      loadOrders(pagination.page);
      setIsDetailOpen(false);
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
            { id: 'paid',      label: t('orders.total_paid_card'),      value: stats.total_paid,      Icon: CheckCircle2, accent: 'emerald', sub: t('orders.collected_funds') },
            { id: 'unpaid',    label: t('orders.total_unpaid_card'),    value: stats.total_unpaid,    Icon: CreditCard,   accent: 'rose',    sub: t('orders.receivables'),    ping: (stats.total_unpaid || 0) > 0 },
            { id: 'gross',     label: t('orders.total_gross_card'),     value: stats.total_gross,     Icon: TrendingUp,   accent: 'slate',   sub: t('orders.gross_sales') },
            { id: 'cancelled', label: t('orders.total_cancelled_card'), value: stats.total_cancelled, Icon: Trash2,       accent: 'amber',   sub: t('orders.total_void') },
          ].map(({ id, label, value, Icon, accent, sub, ping }) => {
            const styles = {
              emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600' },
              rose:    { bg: 'bg-rose-500',    text: 'text-rose-600' },
              slate:   { bg: 'bg-slate-800',   text: 'text-slate-800' },
              amber:   { bg: 'bg-amber-500',   text: 'text-amber-600' },
            }[accent];
            return (
              <div key={id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 overflow-hidden relative group hover:border-emerald-200 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-current/10", styles.bg)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {ping && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
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
            <div className="flex items-center gap-1.5 shrink-0">
              {[
                { id: "today",   label: t('orders.filter_today') },
                { id: "weekly",  label: t('orders.filter_weekly') },
                { id: "monthly", label: t('orders.filter_monthly') },
                { id: "all",     label: t('orders.filter_all') },
                { id: "custom",  label: t('orders.filter_custom') },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => handleFilterChange(f.id)}
                  className={cn(
                    "px-5 py-2.5 rounded-xl text-[11px] font-[900] uppercase italic tracking-[0.2em] transition-all",
                    activeFilter === f.id ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "text-slate-400 hover:bg-slate-50"
                  )}
                >
                  {f.label}
                </button>
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

            {/* 4. Date Range Picker (Far Right) */}
            <div className={cn(
              "flex items-center gap-3 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl shrink-0 transition-all ml-auto focus-within:ring-2 focus-within:ring-emerald-500/20",
              activeFilter === "today" ? "opacity-30 pointer-events-none" : "opacity-100"
            )}>
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex items-center gap-2">
                <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setActiveFilter("custom"); }}
                  className="bg-transparent border-none p-0 focus:ring-0 outline-none text-[11px] font-bold text-slate-900 w-[115px] cursor-pointer" />
                <span className="text-slate-300 font-bold">-</span>
                <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setActiveFilter("custom"); }}
                  className="bg-transparent border-none p-0 focus:ring-0 outline-none text-[11px] font-bold text-slate-900 w-[115px] cursor-pointer" />
              </div>
            </div>
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
                accessor: (order) => (
                  <p className="font-[900] text-slate-900 text-2xl tracking-tighter tabular-nums italic">{formatIDR(Math.max(0, order.platform_actual_net ?? (order.total - (order.discount || 0))))}</p>
                ),
                align: "right",
                sortKey: 'total'
              },
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
                    <p className="font-black text-emerald-600 text-lg">{formatIDR(Math.max(0, order.platform_actual_net ?? (order.total - (order.discount || 0))))}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  <span>{order.platform?.name || t('orders.direct')} - {order.payment_method}</span>
                  <span>{t('orders.staff')}: {order.user?.name || 'System'}</span>
                </div>
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
        <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-[3rem] border-none shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] flex flex-col max-h-[90dvh]">
           {selectedOrder && (
             <div className="flex flex-col flex-1 overflow-hidden">
                <div className="bg-slate-900 p-6 lg:p-8 text-white relative overflow-hidden flex-shrink-0">
                  <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-emerald-500/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
                  
                  {/* Tab Switcher */}
                  <div className="flex gap-2 mb-8 relative z-20">
                    <button 
                      onClick={() => setActiveTab("detail")}
                      className={cn(
                        "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        activeTab === 'detail' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "bg-white/5 text-slate-400 hover:bg-white/10"
                      )}
                    >
                      {t('orders.order_details')}
                    </button>
                    <button 
                      onClick={() => setActiveTab("platform")}
                      className={cn(
                        "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        activeTab === 'platform' ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "bg-white/5 text-slate-400 hover:bg-white/10"
                      )}
                    >
                        INCOME ADJUSTMENT
                    </button>
                  </div>

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
                          {formatIDR(Math.max(0, selectedOrder.total - (selectedOrder.discount || 0)))}
                       </p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 sm:p-8 lg:p-12 space-y-8 lg:space-y-12 bg-white overflow-y-auto flex-1 custom-scrollbar">
                   {activeTab === 'detail' ? (
                    <div className="space-y-8 sm:space-y-10 lg:space-y-12 animate-in slide-in-from-left-4 duration-500">
                      <div className="space-y-6 lg:space-y-8">
                        <h4 className="text-[10px] lg:text-[11px] font-black text-slate-300 uppercase tracking-[0.5em] flex items-center gap-4 lg:gap-6">
                          {t('orders.order_items')} <div className="flex-1 h-px bg-slate-100" />
                        </h4>
                        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-5">
                          {selectedOrder.orderItems.map((item, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-5 lg:p-7 bg-slate-50/50 rounded-2xl sm:rounded-3xl border border-slate-100 group hover:border-emerald-200 hover:bg-white transition-all shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 gap-4">
                                <div className="flex items-center gap-4 sm:gap-6 lg:gap-8">
                                  <div className="w-10 h-10 sm:w-11 sm:h-11 lg:w-14 lg:h-14 rounded-xl sm:rounded-2xl bg-slate-900 flex items-center justify-center text-white font-black text-base lg:text-lg shadow-xl group-hover:bg-emerald-600 transition-colors">
                                    {item.qty}
                                  </div>
                                  <div>
                                    <p className="font-black text-slate-900 uppercase tracking-tight text-sm sm:text-base lg:text-lg leading-none mb-1 sm:mb-2">{item.menu.name}</p>
                                    <p className="text-[8px] sm:text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                                      <Tag className="w-3 h-3" /> {t('orders.price')}: {formatIDR(item.price)}
                                    </p>
                                  </div>
                                </div>
                                <p className="font-black text-slate-900 text-lg sm:text-xl lg:text-2xl tabular-nums tracking-tighter italic ml-14 sm:ml-0">{formatIDR(item.price * item.qty)}</p>
                            </div>
                          ))}
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-14 pt-8 lg:pt-14 border-t border-slate-100">
                        <div className="space-y-6 lg:space-y-10">
                          <div className="space-y-3 sm:space-y-4">
                              <p className="text-[9px] sm:text-[10px] font-black text-slate-300 uppercase tracking-[0.4em]">{t('orders.details')}</p>
                              <div className="space-y-3 sm:space-y-4">
                                {[
                                  { label: t('orders.staff'), value: selectedOrder.user?.name },
                                  { label: t('orders.channel'), value: selectedOrder.platform?.name || t('orders.store') },
                                  { label: t('orders.payment'), value: selectedOrder.payment_method },
                                  { label: t('orders.customer'), value: selectedOrder.customer_name || t('orders.guest') },
                                ].map((m, i) => (
                                  <div key={i} className="flex justify-between items-center pb-2 sm:pb-3 border-b border-slate-50 last:border-0">
                                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.label}:</span>
                                    <span className="text-[10px] sm:text-xs font-black text-slate-900 uppercase tracking-tight">{m.value || '-'}</span>
                                  </div>
                                ))}
                                <button 
                                  onClick={() => setActiveTab("platform")}
                                  className="w-full mt-2 sm:mt-4 py-2.5 sm:py-3 rounded-xl border-2 border-dashed border-amber-200 text-amber-600 text-[9px] sm:text-[10px] font-black uppercase tracking-widest hover:bg-amber-50 hover:border-amber-400 transition-all flex items-center justify-center gap-2"
                                >
                                  <RefreshCcw className="w-3 h-3" /> Manage Income Adjustments
                                </button>
                              </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col justify-end items-center md:items-end gap-3 sm:gap-6">
                          <button 
                            onClick={() => {
                              setReceiptOrder(selectedOrder);
                              setIsReceiptPreviewOpen(true);
                            }}
                            className="h-14 sm:h-16 lg:h-20 w-full rounded-2xl sm:rounded-[2rem] bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] lg:text-xs tracking-[0.2em] sm:tracking-[0.3em] shadow-2xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 sm:gap-4 group"
                          >
                            <Printer className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-12 transition-transform" /> {t('orders.print_receipt')}
                          </button>
                          
                          {selectedOrder.status === 'CANCELLED' ? (
                            <button 
                              onClick={() => {
                                setPendingStatusChange({ orderId: selectedOrder.id, newStatus: 'DELETE_PERMANENT' });
                                setIsPinDialogOpen(true);
                              }}
                              className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-white bg-rose-600 hover:bg-rose-700 transition-all flex items-center justify-center sm:justify-start gap-2 sm:gap-3 group shadow-lg shadow-rose-500/20"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" /> {t('orders.delete_permanent')}
                            </button>
                          ) : (
                            <button 
                              onClick={() => handleStatusChangeClick(selectedOrder, "CANCELLED")}
                              className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em] text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all flex items-center justify-center sm:justify-start gap-2 sm:gap-3 group"
                            >
                              <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 opacity-50 group-hover:opacity-100" /> {t('orders.cancel_order')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8 sm:space-y-10 lg:space-y-12 animate-in slide-in-from-right-4 duration-500">
                        <div className="space-y-6">
                           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <div>
                                 <h4 className="text-lg sm:text-xl font-black text-slate-900 uppercase italic">Income Adjustment</h4>
                                 <p className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manually adjust actual revenue</p>
                              </div>
                              <button 
                                onClick={addAdjustment}
                                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-black transition-all"
                              >
                                + Add Adjustment
                              </button>
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
                                <div key={idx} className="p-4 sm:p-6 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                                   <div className="grow min-w-0 space-y-1.5 sm:space-y-2">
                                      <Label className="text-[8px] sm:text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 sm:ml-2">Adjustment Name</Label>
                                      <input 
                                        placeholder="e.g. Service Fee" 
                                        className="w-full h-10 sm:h-12 px-4 sm:px-6 rounded-xl bg-white border-2 border-transparent focus:border-amber-200 shadow-sm text-xs sm:text-[10px] font-black uppercase outline-none transition-all placeholder:text-slate-300"
                                        value={adj.label} 
                                        onChange={(e) => updateAdjustment(idx, 'label', e.target.value)} 
                                      />
                                   </div>
                                   <div className="sm:w-48 space-y-1.5 sm:space-y-2">
                                      <Label className="text-[8px] sm:text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 sm:ml-2">Type</Label>
                                      <select 
                                        className="w-full h-10 sm:h-12 px-2 sm:px-3 rounded-xl bg-white border-2 border-transparent focus:border-amber-200 shadow-sm text-[10px] sm:text-xs font-black uppercase outline-none transition-all"
                                        value={adj.type}
                                        onChange={(e) => updateAdjustment(idx, 'type', e.target.value)}
                                      >
                                         <option value="PERCENT">% PERCENT</option>
                                         <option value="FIXED">IDR (FIXED)</option>
                                      </select>
                                   </div>
                                   <div className="sm:w-48 lg:w-56 space-y-1.5 sm:space-y-2">
                                      <Label className="text-[8px] sm:text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1 sm:ml-2">Value</Label>
                                      <input 
                                        type="number"
                                        className="w-full h-10 sm:h-12 px-3 sm:px-4 rounded-xl bg-white border-2 border-transparent focus:border-amber-200 shadow-sm text-xs sm:text-[10px] font-black uppercase outline-none transition-all"
                                        value={adj.value}
                                        onChange={(e) => updateAdjustment(idx, 'value', e.target.value)}
                                      />
                                   </div>
                                   <button 
                                      onClick={() => removeAdjustment(idx)}
                                      className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shrink-0 mt-2 sm:mt-6"
                                   >
                                      <Trash2 className="w-4 h-4" />
                                   </button>
                                </div>
                              ))}
                           </div>

                           <div className="pt-8 sm:pt-10 border-t border-slate-100 flex flex-col items-center">
                              <div className="bg-amber-50 p-6 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-amber-100 flex flex-col items-center gap-1 sm:gap-2 w-full max-w-md shadow-2xl shadow-amber-500/5">
                                 <p className="text-[9px] sm:text-[10px] font-black text-amber-600 uppercase tracking-[0.4em]">Final Adjusted Income</p>
                                 <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter text-slate-900 drop-shadow-sm">{formatIDR(calculatedPayout)}</h2>
                                 <p className="text-[8px] sm:text-[9px] font-bold text-amber-700/50 uppercase mt-1 sm:mt-2 italic">{adjustments.length} active adjustment(s)</p>
                              </div>

                              <button 
                                onClick={handleSavePlatform}
                                disabled={isSavingPlatform}
                                className="mt-8 sm:mt-10 h-14 sm:h-16 px-8 sm:px-12 bg-slate-900 text-white rounded-xl sm:rounded-[2rem] text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] shadow-2xl hover:bg-black active:scale-95 transition-all flex items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto"
                              >
                                {isSavingPlatform ? <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" /> : <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />}
                                Save Reconciliation
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
