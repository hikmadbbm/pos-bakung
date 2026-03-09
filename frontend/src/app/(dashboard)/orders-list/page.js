"use client";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { formatIDR } from "../../../lib/format";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../../../components/ui/table";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Search, Eye, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import { PinDialog } from "../../../components/pin-dialog";
import { useToast } from "../../../components/ui/use-toast";

export default function OrderHistoryPage() {
  const { success, error } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Status Change State
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState(null); // { orderId, newStatus }

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const res = await api.get("/orders");
      setOrders(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
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
      
      // Update local state
      if (selectedOrder && selectedOrder.id === pendingStatusChange.orderId) {
        setSelectedOrder({ ...selectedOrder, status: pendingStatusChange.newStatus });
      }
      loadOrders();
      setIsPinDialogOpen(false);
      setPendingStatusChange(null);
    } catch (e) {
      console.error(e);
      throw new Error(e.response?.data?.error || "Authorization failed");
    }
  };

  const filteredOrders = orders.filter(o => 
    (o.order_number || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.customer_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (o.note || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openDetail = (order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Order History</h2>
          <p className="text-sm text-gray-500">View and track all transaction receipts.</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
          <Input 
            placeholder="Search Order Number..." 
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead>Order No.</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Platform</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Total Amount</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-gray-400">Loading orders...</TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-gray-400">No orders found.</TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id} className="hover:bg-gray-50/50 transition-colors">
                  <TableCell className="font-mono font-medium text-blue-600">{order.order_number || `ID-${order.id}`}</TableCell>
                  <TableCell className="text-sm text-gray-600">
                    {new Date(order.date).toLocaleDateString()} <span className="text-gray-400 text-xs">{new Date(order.date).toLocaleTimeString()}</span>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{order.customer_name || "-"}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700">
                      {order.platform?.name || "Unknown"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{order.payment_method}</TableCell>
                  <TableCell className="text-right font-bold text-gray-900">{formatIDR(order.total)}</TableCell>
                  <TableCell className="text-center">
                    <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700 border border-green-200">
                      {order.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openDetail(order)}>
                      <Eye className="w-4 h-4 text-gray-500 hover:text-blue-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
            <div className="flex justify-between items-start border-b pb-4">
              <div>
                <div className="text-sm text-gray-500">Order Number</div>
                <div className="text-xl font-bold font-mono text-blue-600">{selectedOrder.order_number}</div>
                <div className="text-xs text-gray-400 mt-1">{new Date(selectedOrder.date).toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Status</div>
                <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                  {selectedOrder.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 block">Customer</span>
                <span className="font-medium">{selectedOrder.customer_name || "-"}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Platform</span>
                <span className="font-medium">{selectedOrder.platform?.name}</span>
              </div>
              <div>
                <span className="text-gray-500 block">Payment Method</span>
                <span className="font-medium">{selectedOrder.payment_method}</span>
              </div>
              {selectedOrder.note && (
                <div className="col-span-2 bg-yellow-50 p-2 rounded border border-yellow-100">
                  <span className="text-gray-500 text-xs block uppercase">Note</span>
                  <span className="text-gray-700">{selectedOrder.note}</span>
                </div>
              )}
            </div>

            <div className="border rounded-md overflow-hidden">
              <div className="hidden sm:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="h-8 text-xs">Item</TableHead>
                      <TableHead className="h-8 text-xs text-right">Qty</TableHead>
                      <TableHead className="h-8 text-xs text-right">Price</TableHead>
                      <TableHead className="h-8 text-xs text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedOrder.orderItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="py-2 text-sm">{item.menu.name}</TableCell>
                        <TableCell className="py-2 text-sm text-right">{item.qty}</TableCell>
                        <TableCell className="py-2 text-sm text-right">{formatIDR(item.price)}</TableCell>
                        <TableCell className="py-2 text-sm text-right font-medium">{formatIDR(item.price * item.qty)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="sm:hidden divide-y">
                {selectedOrder.orderItems.map((item) => (
                  <div key={item.id} className="p-3">
                    <div className="flex justify-between gap-3">
                      <div className="font-medium text-sm text-gray-900 min-w-0">
                        <div className="truncate">{item.menu.name}</div>
                        <div className="text-xs text-gray-500">
                          {item.qty} × {formatIDR(item.price)}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-gray-900">
                        {formatIDR(item.price * item.qty)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatIDR(selectedOrder.total + (selectedOrder.discount || 0))}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="text-red-500">-{formatIDR(selectedOrder.discount || 0)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-dashed pt-2 mt-2">
                <span>Total</span>
                <span>{formatIDR(selectedOrder.total)}</span>
              </div>
              {selectedOrder.payment_method === 'CASH' && (
                <div className="flex justify-between text-sm text-gray-500 pt-1">
                  <span>Cash Received</span>
                  <span>{formatIDR(selectedOrder.money_received)}</span>
                </div>
              )}
              {selectedOrder.payment_method === 'CASH' && (
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span>Change</span>
                  <span>{formatIDR(selectedOrder.change_amount)}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center pt-4 border-t gap-3">
              <div className="flex flex-col sm:flex-row gap-2">
                {selectedOrder.status !== "CANCELLED" && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleStatusChangeClick(selectedOrder, "CANCELLED")}
                  >
                    Cancel Order
                  </Button>
                )}
                {selectedOrder.status !== "COMPLETED" && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-green-200 text-green-700 hover:bg-green-50"
                    onClick={() => handleStatusChangeClick(selectedOrder, "COMPLETED")}
                  >
                    Mark Completed
                  </Button>
                )}
              </div>
              <Button onClick={() => setIsDetailOpen(false)}>Close</Button>
            </div>
          </div>
        )}
        </DialogContent>
      </Dialog>

      <PinDialog 
        isOpen={isPinDialogOpen} 
        onClose={() => { setIsPinDialogOpen(false); setPendingStatusChange(null); }}
        onVerify={handlePinVerify}
        title={`Authorize ${pendingStatusChange?.newStatus} Status`}
      />
    </div>
  );
}
