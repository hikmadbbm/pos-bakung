"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { Loader2, CheckCircle, Clock, Utensils, AlertCircle, RefreshCcw, Users, CreditCard } from "lucide-react";
import { useToast } from "../../../components/ui/use-toast";
import { cn } from "../../../lib/utils";

export default function KitchenViewPage() {
  const { success, error } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async (isAuto = false) => {
    if (!isAuto) setRefreshing(true);
    try {
      const pendingRes = await api.get("/orders?status=PENDING&limit=100");
      const paidRes = await api.get("/orders?status=PAID&limit=100");
      const processingRes = await api.get("/orders?status=PROCESSING&limit=100");
      
      const pendingOrders = pendingRes.orders || [];
      const paidOrders = paidRes.orders || [];
      const processingOrders = processingRes.orders || [];

      const combined = [...pendingOrders, ...paidOrders, ...processingOrders].sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );
      
      setOrders(combined);
    } catch (e) {
      console.error("Failed to load kitchen orders", e);
      if (!isAuto) error("Failed to load orders");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [error]);

  useEffect(() => {
    loadOrders();
    const interval = setInterval(() => loadOrders(true), 30000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      success(`Order is ${newStatus}`);
      loadOrders(true);
    } catch (e) {
      console.error(e);
      const detail = e.response?.data?.detail || e.response?.data?.error || "Failed to update status";
      error(detail);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-gray-500 animate-pulse font-black uppercase tracking-widest text-[10px]">Loading Kitchen...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in pb-20 px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-4 uppercase italic">
            <Utensils className="w-8 h-8 text-emerald-600" /> Kitchen Orders
          </h2>
          <div className="flex items-center gap-2.5 mt-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Live: {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white/50 backdrop-blur-md p-2 rounded-[1.5rem] border border-slate-100 shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
          {refreshing && <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => loadOrders()} 
            disabled={refreshing}
            className="rounded-xl font-black text-[10px] uppercase tracking-widest text-slate-500"
          >
            <RefreshCcw className="w-4 h-4 mr-2" /> Sync
          </Button>
          <div className="h-6 w-px bg-slate-200" />
          <div className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg whitespace-nowrap">
            {orders.length} ORDERS
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] glass-card border-dashed">
          <div className="w-24 h-24 bg-slate-50 rounded-[3rem] flex items-center justify-center mb-8 shadow-inner border border-slate-100">
             <CheckCircle className="w-10 h-10 text-slate-200" />
          </div>
          <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tight">All Clear</h3>
          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.3em] mt-6 px-10 text-center leading-relaxed">No orders in queue.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {orders.map((order) => (
            <div key={order.id} className={cn(
               "glass-card p-0 flex flex-col overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:-translate-y-1",
               order.status === 'PROCESSING' ? "ring-2 ring-emerald-500 ring-offset-4 ring-offset-slate-50 shadow-emerald-500/10" : "border-slate-100 shadow-slate-200/50"
            )}>
              <div className={cn(
                "p-6 flex justify-between items-start border-b",
                order.status === 'PROCESSING' ? "bg-emerald-600 text-white" : "bg-slate-50 text-slate-900"
              )}>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-1">Order</div>
                  <h3 className="text-2xl font-black font-mono tracking-tighter">#{order.order_number}</h3>
                  <div className="flex items-center gap-2 mt-2 opacity-60">
                    <Clock className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      <span className="mx-2">/</span>
                      {Math.floor((new Date() - new Date(order.date)) / 60000)} MINS AGO
                    </span>
                  </div>
                </div>
                <div className={cn(
                  "px-4 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest border shadow-sm",
                  order.status === 'PROCESSING' ? "bg-white text-emerald-700 border-white" : 
                  order.status === 'PAID' ? "bg-white text-blue-600 border-blue-100" :
                  "bg-white text-orange-600 border-orange-100"
                )}>
                  {order.status}
                </div>
              </div>

              <div className="p-8 flex-1 flex flex-col gap-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <Users className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Customer / Channel</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{order.customer_name || "Guest"}</span>
                          {order.platform?.name && (
                            <span className="text-[9px] font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md uppercase tracking-tighter">{order.platform.name}</span>
                          )}
                        </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                        <CreditCard className="w-5 h-5 text-slate-400" />
                    </div>
                    <div className="flex-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Payment Method</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{order.paymentMethod?.name || order.payment_method || "CASH"}</span>
                          {order.status === 'PENDING' && (
                            <span className="text-[9px] font-black bg-rose-100 text-rose-600 px-2 py-0.5 rounded-md uppercase tracking-tighter flex items-center gap-1 animate-pulse">
                              <AlertCircle className="w-2.5 h-2.5" />
                              WAITING FOR PAYMENT
                            </span>
                          )}
                        </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em] block mb-4">Items</span>
                  {order.orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-50 shadow-sm group/item">
                      <div className="flex gap-4 items-center">
                        <div className="w-10 h-10 bg-emerald-600 text-white flex items-center justify-center rounded-xl text-xs font-black shadow-lg shadow-emerald-500/20">
                          {item.qty}
                        </div>
                        <span className="text-sm font-black text-slate-800 uppercase tracking-tight line-clamp-1">{item.menu?.name}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {order.note && (
                  <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100/50 flex gap-4">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                    <p className="text-[10px] text-amber-700 font-bold uppercase tracking-widest italic">"{order.note}"</p>
                  </div>
                )}

                <div className="flex gap-3 mt-auto pt-6 border-t border-slate-50">
                  {(order.status === 'PENDING' || order.status === 'PAID') && (
                    <Button 
                      className="flex-1 h-14 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                      onClick={() => handleStatusChange(order.id, 'PROCESSING')}
                    >
                      Start Cooking
                    </Button>
                  )}
                  <Button 
                    className={cn(
                      "flex-1 h-14 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all",
                      order.status === 'PROCESSING' 
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20" 
                        : "bg-white text-slate-400 border-slate-100 hover:text-slate-900"
                    )}
                    variant={order.status === 'PROCESSING' ? "default" : "outline"}
                    onClick={() => handleStatusChange(order.id, 'COMPLETED')}
                  >
                    Done
                  </Button>
                </div>
              </div>

              <div className={cn(
                "h-1.5 w-full",
                order.status === 'PROCESSING' ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" : "bg-orange-400 shadow-[0_0_15px_rgba(251,146,60,0.5)]"
              )} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
