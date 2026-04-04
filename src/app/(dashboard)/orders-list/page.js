"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Button } from "../../../components/ui/button";
import { Search, Eye, Calendar, RefreshCcw, TrendingUp, DollarSign, ShoppingBag, CreditCard, Printer, Trash2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent } from "../../../components/ui/dialog";
import PinVerificationModal from "../../../components/PinVerificationModal";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../../../components/ui/dropdown-menu";
import { useToast } from "../../../components/ui/use-toast";
import { cn } from "../../../lib/utils";
import { ResponsiveDataView } from "../../../components/ResponsiveDataView";
import { ReceiptPreview } from "../../../components/receipt-preview";

export default function OrderHistoryPage() {
  const { success, error } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [stats, setStats] = useState({ total_gross: 0, total_net: 0 });
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState(null); 
  const [user, setUser] = useState(null);
  const [isReceiptPreviewOpen, setIsReceiptPreviewOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState(null);
  const [storeConfig, setStoreConfig] = useState(null);

  const [activeFilter, setActiveFilter] = useState("today");
  const getLocalDate = () => new Date().toLocaleDateString('en-CA');
  
  const [startDate, setStartDate] = useState(getLocalDate());
  const [endDate, setEndDate] = useState(getLocalDate());

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) setUser(JSON.parse(userStr));
  }, []);

  useEffect(() => {
    loadOrders(1);
    loadStoreConfig();
  }, [searchTerm, startDate, endDate, activeFilter]);

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
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
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
      }).toString();
      
      const res = await api.get(`/orders?${qs}`);
      setOrders(res.orders);
      setPagination(res.pagination);
      setStats(res.stats || { total_gross: 0, total_net: 0 });
    } catch (e) {
      console.error(e);
      error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    loadOrders(newPage);
  };

  const handleStatusChangeClick = (order, newStatus) => {
    if (order.status === newStatus) return;
    setPendingStatusChange({ orderId: order.id, newStatus });
    setIsPinDialogOpen(true);
  };

  const handlePinVerify = async (pin) => {
    try {
      if (!pendingStatusChange) return;
      await api.patch(`/orders/${pendingStatusChange.orderId}/status`, {
        status: pendingStatusChange.newStatus,
        pin
      });
      success(`Order status updated to ${pendingStatusChange.newStatus}`);
      if (selectedOrder && selectedOrder.id === pendingStatusChange.orderId) {
        setSelectedOrder({ ...selectedOrder, status: pendingStatusChange.newStatus });
      }
      loadOrders(pagination.page);
      setIsPinDialogOpen(false);
      setPendingStatusChange(null);
    } catch (e) {
      console.error(e);
      throw new Error(e.response?.data?.error || "Authorization failed");
    }
  };

  const openDetail = (order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6 md:space-y-12 animate-in fade-in duration-700 max-w-[1700px] mx-auto pb-12 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6">
        <div>
          <h2 className="text-2xl md:text-4xl font-black tracking-tighter text-slate-900 uppercase italic">Order History</h2>
          <div className="flex items-center gap-2.5 mt-1 md:mt-2">
            <span className="flex h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[9px] md:text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Transaction History</p>
          </div>
        </div>
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
          <input 
            placeholder="Search Reference..." 
            className="w-full bg-white/80 border-slate-100 rounded-2xl md:rounded-3xl h-12 md:h-16 pl-14 pr-8 outline-none focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-black text-[10px] uppercase tracking-widest text-slate-900 placeholder:text-slate-400 shadow-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-3 gap-3 md:gap-10">
        {[
          { label: "Orders", value: pagination.total, icon: ShoppingBag, color: "text-slate-900", sub: "TOTAL TRANSACTIONS" },
          { label: "Total Sales", value: formatIDR(stats.total_gross), icon: DollarSign, color: "text-emerald-600", sub: "REVENUE" },
          { label: "Earnings", value: formatIDR(stats.total_net), icon: TrendingUp, color: "text-violet-600", sub: "NET PROFIT" },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-4 md:p-10 rounded-2xl md:rounded-[3rem] border-none shadow-xl md:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] bg-white/50 backdrop-blur-xl group hover:scale-[1.02] transition-all duration-700">
             <div className="flex items-center justify-between mb-4 md:mb-8">
                <div className="w-8 h-8 md:w-16 md:h-16 rounded-lg md:rounded-[1.75rem] bg-slate-900 flex items-center justify-center shadow-lg md:shadow-2xl group-hover:rotate-6 transition-transform">
                   <stat.icon className="w-4 h-4 md:w-8 md:h-8 text-white" />
                </div>
                <div className="h-1 w-6 md:h-1.5 md:w-12 rounded-full bg-slate-100" />
             </div>
             <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest md:tracking-[0.3em] mb-1 md:mb-2 truncate">{stat.label}</p>
             <h4 className={cn("text-xs md:text-3xl font-black uppercase tracking-tight md:tracking-tighter tabular-nums truncate", stat.color)}>
               {loading ? "---" : (typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value)}
             </h4>
             <p className="hidden md:block text-[9px] font-black text-slate-300 uppercase mt-4 tracking-widest">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-4 rounded-[2.5rem] border-none shadow-2xl bg-white/40 backdrop-blur-2xl flex flex-col lg:flex-row items-center gap-8">
        <div className="flex p-2 bg-slate-100/50 rounded-[1.5rem] w-full lg:w-fit border border-slate-200/50 overflow-x-auto no-scrollbar">
          {["today", "weekly", "monthly", "custom", "all"].map((tab) => (
            <button
              key={tab}
              onClick={() => handleFilterChange(tab)}
              disabled={(tab === 'all' && !(user?.role === "OWNER" || user?.role === "MANAGER"))}
              className={cn(
                "flex-1 lg:flex-none px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 whitespace-nowrap",
                activeFilter === tab 
                  ? "bg-white text-slate-900 shadow-xl scale-105" 
                  : "text-slate-400 hover:text-slate-600"
              )}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 w-full lg:w-auto mt-4 lg:mt-0">
          <div className={cn(
               "flex flex-1 items-center justify-between gap-2 sm:gap-6 bg-white/80 backdrop-blur-md px-4 sm:px-8 h-12 w-full rounded-2xl border border-slate-100 shadow-inner transition-all duration-700",
               activeFilter === "today" ? "opacity-30 grayscale pointer-events-none" : "opacity-100"
            )}>
              <Calendar className="w-4 h-4 text-slate-400 hidden sm:block shrink-0" />
              <input type="date" className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest text-slate-900 w-full text-center min-w-0" value={startDate} onChange={e => { setStartDate(e.target.value); setActiveFilter("custom"); }} />
              <div className="w-px h-6 bg-slate-200 hidden sm:block shrink-0" />
              <span className="text-slate-300 text-[10px] font-black sm:hidden shrink-0">-</span>
              <input type="date" className="bg-transparent border-none focus:ring-0 text-[10px] font-black uppercase tracking-widest text-slate-900 w-full text-center min-w-0" value={endDate} onChange={e => { setEndDate(e.target.value); setActiveFilter("custom"); }} />
          </div>
          <button onClick={() => loadOrders(1)} className="h-12 w-full sm:w-12 shrink-0 rounded-2xl bg-slate-900 flex items-center justify-center text-white hover:bg-black transition-all active:scale-90 shadow-2xl group">
             <RefreshCcw className={cn("w-5 h-5 transition-transform duration-1000 sm:mr-0 mr-2", loading && "animate-spin")} />
             <span className="sm:hidden font-black text-[10px] uppercase tracking-widest">Refresh List</span>
          </button>
        </div>
      </div>

      <ResponsiveDataView
        loading={loading}
        data={orders}
        emptyMessage="No orders found"
        onRowClick={openDetail}
        columns={[
          {
            header: "Order ID",
            accessor: (order) => (
              <div className="py-2">
                <p className="font-mono text-xs font-black text-slate-900 group-hover:text-emerald-600 transition-colors uppercase">#{order.order_number}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{new Date(order.date).toLocaleDateString()} {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            ),
            className: "pl-12"
          },
          {
            header: "Customer",
            accessor: (order) => (
              <div>
                <p className="font-black text-slate-900 uppercase tracking-tight text-sm truncate max-w-[180px]">{order.customer_name || 'Guest'}</p>
                <p className="text-[10px] font-black text-emerald-600/50 uppercase tracking-widest mt-1">Staff: {order.user?.name || 'System'}</p>
              </div>
            )
          },
          {
            header: "Type",
            accessor: (order) => (
              <span className={cn(
                 "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border",
                 order.platform?.type === 'DELIVERY' ? "bg-orange-50 text-orange-600 border-orange-100" : "bg-slate-100 text-slate-600 border-slate-200"
              )}>
                {order.platform?.name || 'In-Store'}
              </span>
            )
          },
          {
            header: "Payment",
            accessor: (order) => (
              <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-slate-400" />
                 </div>
                 <p className="text-[10px] font-black text-slate-900 uppercase">{order.payment_method}</p>
              </div>
            )
          },
          {
            header: "Total",
            accessor: (order) => (
              <p className="font-black text-slate-900 text-xl tracking-tighter tabular-nums italic">{formatIDR(Math.max(0, order.total - (order.discount || 0)))}</p>
            ),
            align: "right"
          },
          {
            header: "Status",
            accessor: (order) => (
              <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn(
                      "px-6 py-2 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border transition-all hover:scale-105 active:scale-95",
                      order.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                      order.status === 'PROCESSING' ? "bg-blue-50 text-blue-700 border-blue-100" :
                      order.status === 'PAID' ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                      order.status === 'PENDING' ? "bg-amber-50 text-amber-600 border-amber-100" :
                      "bg-rose-50 text-rose-600 border-rose-100"
                    )}>
                      {order.status}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="rounded-2xl border-none shadow-2xl p-2 bg-slate-900 text-white min-w-[160px]">
                    {["PENDING", "PAID", "PROCESSING", "COMPLETED", "CANCELLED"].map(s => (
                      <DropdownMenuItem key={s} onClick={() => handleStatusChangeClick(order, s)} className="rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-colors p-4 cursor-pointer">{s}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ),
            align: "center"
          },
          {
            header: "Actions",
            accessor: (order) => (
              <button onClick={() => openDetail(order)} className="w-14 h-14 rounded-2xl bg-white shadow-xl flex items-center justify-center text-slate-600 hover:bg-slate-900 hover:text-white transition-all transform active:scale-95 border border-slate-100 ml-auto">
                <Eye className="w-6 h-6" />
              </button>
            ),
            align: "right",
            className: "pr-12"
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
                    <button className={cn(
                      "px-4 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border",
                      order.status === 'COMPLETED' ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                      order.status === 'PROCESSING' ? "bg-blue-50 text-blue-700 border-blue-100" :
                      order.status === 'PAID' ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                      order.status === 'PENDING' ? "bg-amber-50 text-amber-600 border-amber-100" :
                      "bg-rose-50 text-rose-600 border-rose-100"
                    )}>
                      {order.status}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="rounded-2xl border-none shadow-2xl p-2 bg-slate-900 text-white min-w-[160px]">
                    {["PENDING", "PAID", "PROCESSING", "COMPLETED", "CANCELLED"].map(s => (
                      <DropdownMenuItem key={s} onClick={() => handleStatusChangeClick(order, s)} className="rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-colors p-4 cursor-pointer">{s}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            
            <div className="flex justify-between items-center py-2 border-y border-slate-50">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</p>
                <p className="font-black text-slate-900 uppercase text-sm">{order.customer_name || 'Guest'}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                <p className="font-black text-emerald-600 text-lg">{formatIDR(Math.max(0, order.total - (order.discount || 0)))}</p>
              </div>
            </div>

            <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase tracking-widest">
              <span>{order.platform?.name || 'Direct'} • {order.payment_method}</span>
              <span>Staff: {order.user?.name || 'System'}</span>
            </div>
          </div>
        )}
      />

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="p-10 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between overflow-x-auto no-scrollbar">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
            {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} OF {pagination.total} ORDERS
          </p>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="rounded-xl font-black text-[10px] uppercase tracking-widest" onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}>PREV</Button>
            <div className="flex items-center gap-2">
               {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => i + 1).map(p => (
                 <button key={p} onClick={() => handlePageChange(p)} className={cn("w-10 h-10 rounded-xl font-black text-[10px] transition-all", p === pagination.page ? "bg-slate-900 text-white shadow-xl scale-110" : "text-slate-400 hover:text-slate-900")}>{p}</button>
               ))}
               {pagination.totalPages > 5 && <span className="text-slate-300">...</span>}
            </div>
            <Button variant="ghost" className="rounded-xl font-black text-[10px] uppercase tracking-widest" onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === pagination.totalPages}>NEXT</Button>
          </div>
        </div>
      )}

      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-[3rem] border-none shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] flex flex-col max-h-[90dvh]">
           {selectedOrder && (
             <div className="flex flex-col flex-1 overflow-hidden">
                <div className="bg-slate-900 p-8 lg:p-10 text-white relative overflow-hidden flex-shrink-0">
                  <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-emerald-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-6 relative z-10">
                    <div className="space-y-3">
                      <h3 className="text-xl lg:text-3xl font-black uppercase tracking-tighter">ORDER #{selectedOrder.order_number || selectedOrder.id}</h3>
                      <div className="flex flex-wrap items-center gap-4 lg:gap-6">
                         <span className="px-4 py-1.5 rounded-xl bg-white/10 border border-white/20 text-[8px] lg:text-[10px] font-black uppercase tracking-[0.2em]">{selectedOrder.platform?.name || 'STORE'}</span>
                         <div className="flex items-center gap-2 lg:gap-3">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-[10px] lg:text-xs font-black text-slate-400 uppercase tracking-widest">{new Date(selectedOrder.date).toLocaleString()}</span>
                         </div>
                      </div>
                    </div>
                    <div className="sm:text-right">
                       <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-1">TOTAL PAID</p>
                       <p className="text-2xl lg:text-4xl font-black tracking-tighter tabular-nums italic">{formatIDR(Math.max(0, selectedOrder.total - (selectedOrder.discount || 0)))}</p>
                    </div>
                  </div>
               </div>
               
               <div className="p-8 lg:p-12 space-y-10 lg:space-y-12 bg-white/40 backdrop-blur-3xl overflow-y-auto flex-1 custom-scrollbar">
                  <div className="space-y-6 lg:space-y-8">
                    <h4 className="text-[10px] lg:text-[11px] font-black text-slate-400 uppercase tracking-[0.5em] flex items-center gap-4 lg:gap-6">
                      <div className="w-8 lg:w-12 h-px bg-slate-200" /> ORDER ITEMS
                    </h4>
                    <div className="grid grid-cols-1 gap-4 lg:gap-6">
                       {selectedOrder.orderItems.map((item, idx) => (
                         <div key={idx} className="flex justify-between items-center p-4 lg:p-6 bg-white/80 rounded-2xl border border-slate-100 group hover:border-emerald-200 transition-all shadow-sm">
                            <div className="flex items-center gap-4 lg:gap-8">
                               <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-base shadow-2xl group-hover:rotate-6 transition-transform">
                                 {item.qty}
                               </div>
                               <div>
                                 <p className="font-black text-slate-900 uppercase tracking-tight text-sm lg:text-base leading-none">{item.menu.name}</p>
                                 <p className="text-[8px] lg:text-[9px] font-black text-slate-300 uppercase mt-1 lg:mt-2 tracking-widest italic">
                                   PRICE: {formatIDR(item.price)}
                                 </p>
                               </div>
                            </div>
                            <p className="font-black text-slate-900 text-lg lg:text-xl tabular-nums tracking-tighter italic">{formatIDR(item.price * item.qty)}</p>
                         </div>
                       ))}
                    </div>
                  </div>

                  {selectedOrder.note && (
                    <div className="p-6 lg:p-10 bg-amber-50 rounded-[1.5rem] lg:rounded-[2.5rem] border border-amber-100/50 flex gap-4 lg:gap-8 items-start">
                       <div className="p-3 lg:p-4 bg-amber-200/30 rounded-xl lg:rounded-2xl text-amber-600 flex-shrink-0">
                          <AlertCircle className="w-5 h-5 lg:w-6 lg:h-6" />
                       </div>
                       <div>
                          <p className="text-[9px] lg:text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1 lg:mb-2">Staff Note</p>
                          <p className="text-sm lg:text-lg font-black text-amber-900/70 italic uppercase tracking-tight">"{selectedOrder.note}"</p>
                       </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 pt-10 lg:pt-14 border-t border-slate-100">
                    <div className="space-y-8 lg:space-y-10">
                       <div className="space-y-3">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">DETAILS</p>
                          <div className="space-y-3 lg:space-y-4">
                             {[
                               { label: "Staff", value: selectedOrder.user?.name },
                               { label: "Channel", value: selectedOrder.platform?.name },
                               { label: "Payment", value: selectedOrder.payment_method },
                               { label: "Customer", value: selectedOrder.customer_name || 'Guest' },
                             ].map((m, i) => (
                               <div key={i} className="flex justify-between items-center pb-2 border-b border-slate-50">
                                 <span className="text-[10px] font-bold text-slate-400 uppercase">{m.label}:</span>
                                 <span className="text-xs font-black text-slate-900 uppercase tracking-tight">{m.value || '-'}</span>
                               </div>
                             ))}
                          </div>
                       </div>
                    </div>
                    
                    <div className="flex flex-col justify-end items-end gap-4 lg:gap-6">
                       <button 
                         onClick={() => {
                           setReceiptOrder(selectedOrder);
                           setIsReceiptPreviewOpen(true);
                         }}
                         className="h-16 lg:h-20 w-full rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] lg:text-[11px] tracking-[0.3em] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-4 lg:gap-6 group"
                       >
                         <Printer className="w-5 h-5 lg:w-6 lg:h-6 group-hover:rotate-12 transition-transform" /> PRINT RECEIPT
                       </button>
                       <button 
                        onClick={() => handleStatusChangeClick(selectedOrder, "CANCELLED")}
                        className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-300 hover:text-rose-600 transition-all flex items-center gap-2"
                       >
                         <Trash2 className="w-4 h-4" /> Cancel Order
                       </button>
                    </div>
                  </div>
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
    </div>
  );
}
