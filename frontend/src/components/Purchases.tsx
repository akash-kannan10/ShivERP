import { useEffect, useState } from 'react';
import { apiCall } from '../utils/api';
import { useERPStore } from '../store';
import { 
  Truck, Calendar, ClipboardCheck, Plus, Play, CheckCircle2, XCircle, Search
} from 'lucide-react';

export default function Purchases() {
  const { user, fetchAlerts, fetchMetrics } = useERPStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [receiptLines, setReceiptLines] = useState<Record<string, number>>({});

  // Form State
  const [vendorId, setVendorId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [lines, setLines] = useState<Array<{ productId: string; quantity: number; unitCost: number }>>([
    { productId: '', quantity: 1, unitCost: 0 }
  ]);

  useEffect(() => {
    fetchOrders();
    fetchVendors();
    fetchProducts();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/purchases');
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const data = await apiCall('/vendors');
      setVendors(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await apiCall('/products?type=raw_material');
      setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddLine = () => {
    setLines([...lines, { productId: '', quantity: 1, unitCost: 0 }]);
  };

  const handleRemoveLine = (idx: number) => {
    const next = [...lines];
    next.splice(idx, 1);
    setLines(next);
  };

  const handleLineChange = (idx: number, field: string, value: any) => {
    const next = [...lines];
    next[idx] = { ...next[idx], [field]: value };
    
    // Automatically fill cost price if product is selected
    if (field === 'productId' && value) {
      const prod = products.find(p => p.id === value);
      if (prod) {
        next[idx].unitCost = prod.costPrice;
      }
    }

    setLines(next);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorId || !expectedDate || lines.some(l => !l.productId || l.quantity <= 0)) {
      alert('Please fill in all PO fields and lines correctly.');
      return;
    }

    try {
      await apiCall('/purchases', {
        method: 'POST',
        body: JSON.stringify({ vendorId, expectedDate, lines })
      });
      setModalOpen(false);
      fetchOrders();
      fetchMetrics();
    } catch (err: any) {
      alert(err.message || 'Failed to create purchase order');
    }
  };

  const handleConfirm = async (id: string) => {
    try {
      await apiCall(`/purchases/${id}/confirm`, { method: 'POST' });
      fetchOrders();
      fetchMetrics();
    } catch (err: any) {
      alert(err.message || 'PO confirmation failed');
    }
  };

  const openReceiveModal = (order: any) => {
    setSelectedOrder(order);
    const initialReceipts: Record<string, number> = {};
    order.lines.forEach((line: any) => {
      initialReceipts[line.productId] = line.quantity - line.receivedQuantity;
    });
    setReceiptLines(initialReceipts);
    setReceiveModalOpen(true);
  };

  const handleReceiveGoods = async () => {
    if (!selectedOrder) return;

    try {
      const receiptsPayload = Object.keys(receiptLines).map(prodId => ({
        productId: prodId,
        quantityToReceive: receiptLines[prodId]
      }));

      await apiCall(`/purchases/${selectedOrder.id}/receive`, {
        method: 'POST',
        body: JSON.stringify({ receipts: receiptsPayload })
      });

      setReceiveModalOpen(false);
      fetchOrders();
      fetchAlerts();
      fetchMetrics();
      alert('Raw materials received and inventory updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to receive goods');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this PO?')) return;
    try {
      await apiCall(`/purchases/${id}/cancel`, { method: 'POST' });
      fetchOrders();
      fetchMetrics();
    } catch (err: any) {
      alert(err.message || 'Cancellation failed');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-900 text-slate-400 border-slate-800';
      case 'confirmed': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'partially_received': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'fully_received': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'cancelled': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-slate-900 text-slate-400 border-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Procurement & Purchase Orders</h2>
          <p className="text-xs text-muted-foreground mt-1">Reorder raw materials, confirm supplier orders, and receive warehouse arrivals.</p>
        </div>
        
        <button
          onClick={() => {
            setVendorId('');
            setExpectedDate('');
            setLines([{ productId: '', quantity: 1, unitCost: 0 }]);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg hover:shadow-indigo-600/25 transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          <span>Create Purchase Order</span>
        </button>
      </div>

      {/* List Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-xs text-muted-foreground border border-dashed border-slate-800 rounded-xl">
          No Purchase Orders recorded.
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground">
                  <th className="py-4 px-5">Order #</th>
                  <th className="py-4 px-5">Supplier Vendor</th>
                  <th className="py-4 px-5">Expected Date</th>
                  <th className="py-4 px-5">Raw Materials</th>
                  <th className="py-4 px-5">Total Cost</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-950/20 transition-colors">
                    <td className="py-4 px-5 font-black text-slate-100">{order.orderNumber}</td>
                    <td className="py-4 px-5 text-slate-300 font-semibold">{order.vendor.name}</td>
                    <td className="py-4 px-5 text-slate-400">
                      {new Date(order.expectedDate).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-5">
                      <div className="space-y-1">
                        {order.lines.map((line: any, idx: number) => (
                          <div key={idx} className="text-[11px] font-medium text-slate-400">
                            {line.product.name} <span className="text-indigo-400">x{line.quantity}</span> <span className="text-slate-600">(Received: {line.receivedQuantity})</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-4 px-5 font-bold text-slate-200">
                      Rs. {order.totalAmount.toFixed(2)}
                    </td>
                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-bold border uppercase tracking-wider ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex gap-2 justify-end">
                        {order.status === 'draft' && (
                          <>
                            <button
                              onClick={() => handleConfirm(order.id)}
                              className="py-1 px-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-[10px] font-bold tracking-wider uppercase transition-colors flex items-center gap-1"
                            >
                              <Play className="w-3 h-3" />
                              Confirm
                            </button>
                            <button
                              onClick={() => handleCancel(order.id)}
                              className="py-1 px-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 rounded text-[10px] font-bold tracking-wider uppercase transition-colors"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {(order.status === 'confirmed' || order.status === 'partially_received') && (
                          <button
                            onClick={() => openReceiveModal(order)}
                            className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold tracking-wider uppercase transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Receive Stocks
                          </button>
                        )}
                        {order.status !== 'cancelled' && order.status !== 'fully_received' && (
                          <button
                            onClick={() => handleCancel(order.id)}
                            className="p-1 text-slate-500 hover:text-rose-400"
                            title="Cancel PO"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create PO Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-100 mb-6">Create Purchase Order (Supplier RFQ)</h3>
            
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">Select Vendor</label>
                  <select
                    value={vendorId}
                    onChange={e => setVendorId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  >
                    <option value="">-- Choose Supplier --</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">Expected Arrival Date</label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={e => setExpectedDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Order Lines */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Raw Material Items</span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300"
                  >
                    + Add Material Row
                  </button>
                </div>

                {lines.map((line, idx) => (
                  <div key={idx} className="flex gap-4 items-center">
                    <div className="flex-1">
                      <select
                        value={line.productId}
                        onChange={e => handleLineChange(idx, 'productId', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                        required
                      >
                        <option value="">-- Choose Raw Material --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Unit cost: Rs. {p.costPrice})</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        value={line.quantity}
                        onChange={e => handleLineChange(idx, 'quantity', Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                        placeholder="Qty"
                        min="1"
                        required
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        value={line.unitCost}
                        onChange={e => handleLineChange(idx, 'unitCost', Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                        placeholder="Cost"
                        min="0"
                        required
                      />
                    </div>
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(idx)}
                        className="text-slate-500 hover:text-rose-400 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-6 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="py-2 px-4 bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold"
                >
                  Create Draft PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Goods Modal */}
      {receiveModalOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-100 mb-2">Process Inventory Receipts</h3>
            <p className="text-xs text-slate-400 mb-6">Confirm incoming quantities from {selectedOrder.vendor.name} for {selectedOrder.orderNumber}.</p>
            
            <div className="space-y-4">
              {selectedOrder.lines.map((line: any) => {
                const remaining = line.quantity - line.receivedQuantity;
                if (remaining <= 0) return null;

                return (
                  <div key={line.id} className="flex justify-between items-center bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{line.product.name}</h4>
                      <span className="text-[10px] text-slate-500">Ordered: {line.quantity} | Previously Received: {line.receivedQuantity}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={receiptLines[line.productId] !== undefined ? receiptLines[line.productId] : remaining}
                        onChange={e => setReceiptLines(prev => ({ ...prev, [line.productId]: Number(e.target.value) }))}
                        className="w-20 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 text-center"
                        min="0"
                        max={remaining}
                      />
                      <span className="text-xs text-slate-400 font-semibold">{line.product.unit}</span>
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-end gap-2 pt-6 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setReceiveModalOpen(false)}
                  className="py-2 px-4 bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReceiveGoods}
                  className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
                >
                  Receive Selected Quantities
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
