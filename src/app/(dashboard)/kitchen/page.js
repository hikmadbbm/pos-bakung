"use client";
import { useEffect, useState, useCallback } from "react";
import { api } from "../../../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Loader2, CheckCircle, Clock, Utensils, AlertCircle } from "lucide-react";
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
      // Fetch both PENDING and PROCESSING orders
      const pendingRes = await api.get("/orders?status=PENDING&limit=100");
      const processingRes = await api.get("/orders?status=PROCESSING&limit=100");
      
      const pendingOrders = pendingRes.orders || [];
      const processingOrders = processingRes.orders || [];

      // Combine and sort by date (oldest first for FIFO)
      const combined = [...pendingOrders, ...processingOrders].sort((a, b) => 
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
    // Auto refresh every 30 seconds
    const interval = setInterval(() => loadOrders(true), 30000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      success(`Order mark as ${newStatus}`);
      loadOrders(true);
    } catch (e) {
      console.error(e);
      error(e.response?.data?.error || "Failed to update status");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-gray-500 animate-pulse">Loading Kitchen Queue...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Utensils className="w-6 h-6 text-orange-500" /> Kitchen Queue
          </h2>
          <p className="text-sm text-gray-500">Live order display for production.</p>
        </div>
        <div className="flex items-center gap-3">
          {refreshing && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
          <Button variant="outline" size="sm" onClick={() => loadOrders()} disabled={refreshing}>
            Refresh
          </Button>
          <Badge variant="secondary" className="px-3 py-1 text-sm font-bold">
            {orders.length} Active Orders
          </Badge>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] bg-white rounded-xl border border-dashed border-gray-300">
          <CheckCircle className="w-12 h-12 text-green-500 mb-4 opacity-20" />
          <p className="text-gray-400 font-medium">No pending orders. Kitchen is clear!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {orders.map((order) => (
            <Card key={order.id} className={cn(
               "border-l-4 shadow-md transition-all hover:shadow-lg",
               order.status === 'PROCESSING' ? "border-l-blue-500" : "border-l-orange-500"
            )}>
              <CardHeader className="pb-3 border-b bg-gray-50/50">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-mono text-blue-700">{order.order_number}</CardTitle>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      <span className="mx-1">•</span>
                      {Math.floor((new Date() - new Date(order.date)) / 60000)} mins ago
                    </p>
                  </div>
                  <Badge className={cn(
                    "capitalize",
                    order.status === 'PROCESSING' ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-orange-100 text-orange-700 border-orange-200"
                  )}>
                    {order.status.toLowerCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="flex justify-between items-center bg-gray-100 p-2 rounded-md">
                   <span className="text-xs font-bold text-gray-500">CUSTOMER:</span>
                   <span className="text-sm font-bold text-gray-900">{order.customer_name || "Guest"}</span>
                </div>

                <div className="space-y-2">
                  {order.orderItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-dashed last:border-0">
                      <div className="flex gap-2 items-center">
                        <span className="bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold">
                          {item.qty}
                        </span>
                        <span className="text-sm font-medium text-gray-800">{item.menu?.name || "Deleted Item"}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {order.note && (
                  <div className="bg-yellow-50 p-2 rounded border border-yellow-100 flex gap-2">
                    <AlertCircle className="w-4 h-4 text-yellow-600 shrink-0" />
                    <p className="text-xs text-yellow-800 font-medium italic">"{order.note}"</p>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  {order.status === 'PENDING' && (
                    <Button 
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleStatusChange(order.id, 'PROCESSING')}
                    >
                      Start Cooking
                    </Button>
                  )}
                  <Button 
                    className={cn("flex-1", order.status === 'PROCESSING' ? "bg-green-600 hover:bg-green-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200")}
                    variant={order.status === 'PROCESSING' ? "default" : "outline"}
                    onClick={() => handleStatusChange(order.id, 'COMPLETED')}
                  >
                    Mark Done
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
