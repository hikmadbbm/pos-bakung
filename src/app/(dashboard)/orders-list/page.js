"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Search, Eye, Calendar, RefreshCcw, TrendingUp, DollarSign, ShoppingBag, CreditCard, ChevronLeft, ChevronRight, Smartphone, Globe, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { PinDialog } from "../../../components/pin-dialog";
import { useToast } from "../../../components/ui/use-toast";
import { cn } from "../../../lib/utils";

const FilterTab = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      "px-6 py-2 text-[10px] font-black tracking-widest rounded-xl transition-all duration-300 whitespace-nowrap uppercase",
      active 
        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 scale-105" 
        : "text-slate-500 hover:bg-white hover:text-emerald-600"
    )}
  >
    {label}
  </button>
);

const SummaryCard = ({ title, value, icon: Icon, color, loading }) => (
  <div className="glass-card overflow-hidden group p-6 flex items-center justify-between">
    <div>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{title}</p>
      {loading ? (
        <div className="h-8 w-24 bg-slate-200 animate-pulse rounded-lg" />
      ) : (
        <h3 className="text-3xl font-black tracking-tight text-slate-900 group-hover:text-emerald-600 transition-colors">
          {value}
        </h3>
      )}
    </div>
    <div className={cn("p-4 rounded-3xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-12 shadow-lg shadow-current/20", color)}>
      <Icon className="w-8 h-8 text-white" />
    </div>
  </div>
);

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

  // Filter state
  const [activeFilter, setActiveFilter] = useState("today");
  const getLocalDate = () => new Date().toLocaleDateString('en-CA');
  
  const [startDate, setStartDate] = useState(getLocalDate());
  const [endDate, setEndDate] = useState(getLocalDate());

  // Dynamic Summary Calculations - Removed in favor of backend stats


  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) setUser(JSON.parse(userStr));
  }, []);

  useEffect(() => {
    loadOrders(1);
  }, [searchTerm, startDate, endDate, activeFilter]);

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (filter === "today") {
      // today already set to today
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
    <div className="space-y-12 animate-in fade-in duration-700 max-w-[1700px] mx-auto pb-12">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 px-2">
        <div>
          <h2 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Transaction Logs</h2>
          <p className="text-slate-500 mt-2 font-medium">REAL-TIME BUSINESS INTELLIGENCE & HISTORY</p>
        </div>
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-600 transition-all duration-300" />
          <Input 
            placeholder="SEARCH ORDERS, CUSTOMERS..." 
            className="pl-12 h-14 bg-white/50 backdrop-blur-xl border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 shadow-xl rounded-2xl transition-all uppercase font-bold tracking-widest text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <SummaryCard 
          title="Total Orders" 
          value={loading ? "..." : pagination.total.toLocaleString()} 
          icon={ShoppingBag} 
          color="bg-emerald-600 shadow-emerald-500/40"
          loading={loading}
        />
        <SummaryCard 
          title="Gross Sales" 
          value={loading ? "..." : formatIDR(stats.total_gross)} 
          icon={DollarSign} 
          color="bg-emerald-600 shadow-emerald-500/40"
          loading={loading}
        />
        <SummaryCard 
          title="Net Revenue" 
          value={loading ? "..." : formatIDR(stats.total_net)} 
          icon={TrendingUp} 
          color="bg-violet-600 shadow-violet-500/40" 
          loading={loading}
        />
      </div>

      {/* Filters & Actions */}
      <div className="glass-card p-4">
        <div className="flex flex-wrap gap-6 items-center justify-center lg:justify-between">
          {/* Segmented Control */}
          <div className="flex p-1.5 bg-slate-100/50 rounded-2xl w-fit border border-slate-200/50 backdrop-blur-md flex-shrink-0">
            {["today", "weekly", "monthly", "custom"].map((tab) => (
              <FilterTab 
                key={tab}
                label={tab.toUpperCase()}
                active={activeFilter === tab}
                onClick={() => handleFilterChange(tab)}
              />
            ))}
            {(user?.role === "OWNER" || user?.role === "MANAGER") && (
              <FilterTab 
                label="ALL DATA"
                active={activeFilter === "all"}
                onClick={() => handleFilterChange("all")}
              />
            )}
          </div>

          {/* Date Range & Refresh */}
          <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
            <div className={cn(
              "flex flex-shrink-0 items-center gap-4 bg-white/50 backdrop-blur-md px-4 sm:px-6 py-3 rounded-2xl border border-slate-200 shadow-sm transition-all duration-500",
              activeFilter === "today" ? "opacity-30 grayscale pointer-events-none" : "opacity-100"
            )}>
              <Calendar className="w-4 h-4 sm:w-5 h-5 text-slate-400 flex-shrink-0" />
              <input 
                type="date" 
                className="bg-transparent border-none focus:ring-0 text-[10px] sm:text-xs font-black uppercase tracking-widest w-28 sm:w-32 p-0 text-slate-900 flex-shrink-0"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (activeFilter !== "custom") setActiveFilter("custom");
                }}
                disabled={activeFilter === "today"}
              />
              {(activeFilter !== "today") && (
                <>
                  <div className="w-[1px] h-6 bg-slate-200 flex-shrink-0" />
                  <input 
                    type="date" 
                    className="bg-transparent border-none focus:ring-0 text-[10px] sm:text-xs font-black uppercase tracking-widest w-28 sm:w-32 p-0 text-slate-900 flex-shrink-0"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      if (activeFilter !== "custom") setActiveFilter("custom");
                    }}
                    disabled={activeFilter === "today"}
                  />
                </>
              )}
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => loadOrders(1)}
              className="h-14 w-14 rounded-2xl border-slate-200 bg-white shadow-lg hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all active:scale-90 group"
            >
              <RefreshCcw className={cn("h-6 w-6 transition-transform duration-700", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="glass-card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80 border-b border-slate-200/60">
                <TableHead className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-6 px-8">Order Logistics</TableHead>
                <TableHead className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-6">Customer Profile</TableHead>
                <TableHead className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-6">Sales Channel</TableHead>
                <TableHead className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-6">Payment Hub</TableHead>
                <TableHead className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-6 text-right">Settlement</TableHead>
                <TableHead className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-6 text-center">Lifecycle</TableHead>
                <TableHead className="font-black text-[10px] text-slate-500 uppercase tracking-widest py-6 text-right pr-8">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-32">
                    <div className="flex flex-col items-center gap-4">
                      <RefreshCcw className="h-12 w-12 text-emerald-600 animate-spin" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Syncing Transaction data...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-32 text-slate-400">
                    <div className="flex flex-col items-center gap-4">
                       <ShoppingBag className="w-16 h-16 opacity-10" />
                       <p className="text-[10px] font-black uppercase tracking-widest">Archive empty for this selection</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} className="group hover:bg-emerald-50/40 transition-all duration-300 border-b border-slate-100/50">
                    <TableCell className="py-6 px-8">
                      <div className="flex flex-col min-w-[140px]">
                        <span className="font-black text-emerald-600 group-hover:text-emerald-700 cursor-pointer text-base tracking-tight" onClick={() => openDetail(order)}>
                          {order.order_number || `#${order.id}`}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold flex items-center mt-1 uppercase tracking-wider">
                          <Calendar className="w-3 h-3 mr-1.5" />
                          {new Date(order.date).toLocaleDateString()} · {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
                          <User className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-black text-slate-700 uppercase tracking-tight">{order.customer_name || "Guest Patron"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-100/50 text-slate-600 group-hover:bg-white group-hover:shadow-sm transition-all w-fit border border-transparent group-hover:border-slate-100">
                        {order.platform?.name?.toLowerCase().includes('grab') ? <Smartphone className="w-3.5 h-3.5 text-emerald-600" /> : <Globe className="w-3.5 h-3.5 text-emerald-600" />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{order.platform?.name || "DIRECT"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-xs text-slate-900 font-black uppercase tracking-widest">
                        <div className="w-2 h-2 rounded-full bg-slate-200" />
                        {order.payment_method}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="text-lg font-black text-slate-900 group-hover:text-emerald-600 transition-colors">
                        {formatIDR(Math.max(0, order.total - (order.discount || 0)))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "px-4 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] border transition-all duration-300",
                        order.status === "COMPLETED" 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100 shadow-md shadow-emerald-500/10"
                          : "bg-rose-50 text-rose-700 border-rose-100 shadow-md shadow-rose-500/10"
                      )}>
                        {order.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <Button variant="ghost" size="icon" onClick={() => openDetail(order)} className="h-10 w-10 hover:bg-emerald-600 hover:text-white rounded-xl shadow-sm hover:shadow-emerald-200 transition-all flex items-center justify-center mx-auto ml-auto">
                        <Eye className="w-5 h-5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Improved Pagination */}
        <div className="p-8 bg-slate-50/50 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            DISPLAYS <span className="text-slate-900">{pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}</span> — <span className="text-slate-900">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> OF <span className="text-slate-900">{pagination.total}</span> ARCHIVES
          </p>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="h-11 rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-all px-4"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              <span className="text-[10px] font-black uppercase tracking-widest">Previous</span>
            </Button>
            <div className="h-11 px-6 bg-emerald-600 text-white rounded-xl flex items-center justify-center text-xs font-black shadow-lg shadow-emerald-500/30 tracking-widest uppercase">
               {pagination.page} / {pagination.totalPages || 1}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="h-11 rounded-xl border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-all px-4"
            >
              <span className="text-[10px] font-black uppercase tracking-widest">Next</span>
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Order Detail Dialog - Modernized */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden sm:rounded-3xl border-none shadow-2xl">
          {selectedOrder && (
            <div className="flex flex-col h-full max-h-[90dvh]">
              {/* Header */}
              <div className="bg-emerald-600 p-8 text-white relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                   <ShoppingBag className="w-32 h-32 -rotate-12" />
                </div>
                <div className="relative z-10 flex justify-between items-start">
                  <div>
                    <p className="text-emerald-100 text-sm font-bold uppercase tracking-wider mb-1">Transaction Details</p>
                    <h2 className="text-4xl font-black">{selectedOrder.order_number || `#${selectedOrder.id}`}</h2>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "inline-flex px-4 py-1.5 rounded-full text-xs font-black uppercase ring-1 ring-white/30",
                      selectedOrder.status === "COMPLETED" ? "bg-emerald-500/30" : "bg-rose-500/30"
                    )}>
                      {selectedOrder.status}
                    </div>
                  </div>
                </div>
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10 pt-6 border-t border-white/20">
                   <div>
                     <p className="text-emerald-100/70 text-[10px] font-bold uppercase mb-1">Customer</p>
                     <p className="font-bold truncate">{selectedOrder.customer_name || "Guest"}</p>
                   </div>
                   <div>
                     <p className="text-emerald-100/70 text-[10px] font-bold uppercase mb-1">Date</p>
                     <p className="font-bold">{new Date(selectedOrder.date).toLocaleDateString()}</p>
                   </div>
                   <div>
                     <p className="text-emerald-100/70 text-[10px] font-bold uppercase mb-1">Channel</p>
                     <p className="font-bold">{selectedOrder.platform?.name}</p>
                   </div>
                   <div>
                     <p className="text-emerald-100/70 text-[10px] font-bold uppercase mb-1">Payment</p>
                     <p className="font-bold">{selectedOrder.payment_method}</p>
                   </div>
                </div>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                <div>
                  <h4 className="text-gray-900 font-black flex items-center gap-2 mb-4">
                     <span className="w-1.5 h-6 bg-emerald-600 rounded-full" />
                     Order Items
                  </h4>
                  <div className="space-y-3">
                    {selectedOrder.orderItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-emerald-200 hover:bg-emerald-50/30 transition-all">
                        <div className="flex gap-4 items-center">
                          <div className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center text-sm font-bold text-gray-500 shadow-sm">
                            {item.qty}x
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">{item.menu.name}</p>
                            <p className="text-xs text-gray-500">{formatIDR(item.price)} per unit</p>
                          </div>
                        </div>
                        <p className="font-black text-gray-900">{formatIDR(item.price * item.qty)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedOrder.note && (
                  <div className="bg-amber-50 rounded-2xl border border-amber-100 p-5 flex gap-4">
                    <div className="p-2.5 bg-amber-200/50 rounded-xl text-amber-700 h-fit">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-amber-600 uppercase mb-1 tracking-widest">Staff Note</p>
                      <p className="text-sm font-medium text-amber-900/80">{selectedOrder.note}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer / Totals */}
              <div className="p-8 bg-gray-50/80 border-t backdrop-blur-sm rounded-b-3xl">
                <div className="flex flex-col sm:flex-row justify-between gap-8">
                  <div className="space-y-4 flex-1">
                     <div className="flex justify-between text-gray-500 font-medium">
                       <span>Subtotal</span>
                       <span>{formatIDR(selectedOrder.total)}</span>
                     </div>
                     <div className="flex justify-between text-rose-600 font-medium">
                       <span>Total Discount</span>
                       <span>-{formatIDR(selectedOrder.discount || 0)}</span>
                     </div>
                     <div className="w-full h-px bg-gray-200" />
                     <div className="flex justify-between text-2xl font-black text-gray-900">
                       <span>Grand Total</span>
                       <span className="text-emerald-600">{formatIDR(Math.max(0, selectedOrder.total - (selectedOrder.discount || 0)))}</span>
                     </div>
                  </div>
                  
                  <div className="flex flex-col gap-3 min-w-[200px]">
                    <Button 
                      className="w-full h-12 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200"
                      onClick={() => setIsDetailOpen(false)}
                    >
                      Close Report
                    </Button>
                    {selectedOrder.status !== "CANCELLED" && (
                    <Button 
                      variant="outline" 
                      className="w-full h-12 rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50 font-bold"
                      onClick={() => handleStatusChangeClick(selectedOrder, "CANCELLED")}
                    >
                      Void Transaction
                    </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PinDialog 
        isOpen={isPinDialogOpen} 
        onClose={() => { setIsPinDialogOpen(false); setPendingStatusChange(null); }}
        onVerify={handlePinVerify}
        title={`Authorize Transaction Status Change`}
      />
    </div>
  );
}

