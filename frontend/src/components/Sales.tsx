import { useEffect, useState } from 'react';
import { apiCall } from '../utils/api';
import { useERPStore } from '../store';
import { 
  ShoppingCart, Calendar, ClipboardCheck, Plus, Play, CheckCircle2, XCircle, Search, HelpCircle
} from 'lucide-react';

export default function Sales() {
  const { user } = useERPStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [feasibilityModalOpen, setFeasibilityModalOpen] = useState(false);
  const [selectedFeasProduct, setSelectedFeasProduct] = useState('');
  const [feasQty, setFeasQty] = useState(1);
  const [feasResult, setFeasResult] = useState<any | null>(null);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [lines, setLines] = useState<Array<{ productId: string; quantity: number }>>([
    { productId: '', quantity: 1 }
  ]);

  // Confirmation result state
  const [confirmResult, setConfirmResult] = useState<any | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/sales');
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const data = await apiCall('/customers');
      setCustomers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await apiCall('/products?type=finished_good');
      setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddLine = () => {
    setLines([...lines, { productId: '', quantity: 1 }]);
  };

  const handleRemoveLine = (idx: number) => {
    const next = [...lines];
    next.splice(idx, 1);
    setLines(next);
  };

  const handleLineChange = (idx: number, field: string, value: any) => {
    const next = [...lines];
    next[idx] = { ...next[idx], [field]: value };
    setLines(next);
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !expectedDeliveryDate || lines.some(l => !l.productId || l.quantity <= 0)) {
      alert('Please fill in all order fields and lines correctly.');
      return;
    }

    try {
      await apiCall('/sales', {
        method: 'POST',
        body: JSON.stringify({ customerId, expectedDeliveryDate, lines })
      });
      setModalOpen(false);
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to create sales order');
    }
  };

  const handleConfirm = async (id: string) => {
    setConfirmResult(null);
    try {
      const res = await apiCall(`/sales/${id}/confirm`, { method: 'POST' });
      setConfirmResult({
        orderNumber: res.order.orderNumber,
        procurement: res.procurement
      });
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Order confirmation failed');
    }
  };

  const handleDeliver = async (id: string) => {
    try {
      await apiCall(`/sales/${id}/deliver`, { method: 'POST' });
      fetchOrders();
      alert('Stock successfully dispatched and delivered!');
    } catch (err: any) {
      alert(err.message || 'Delivery dispatch failed');
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      await apiCall(`/sales/${id}/cancel`, { method: 'POST' });
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Cancellation failed');
    }
  };

  const checkFeasibility = async () => {
    if (!selectedFeasProduct || feasQty <= 0) return;
    setFeasResult(null);
    try {
      const p = products.find(prod => prod.id === selectedFeasProduct);
      if (!p) return;

      const freeToUse = p.onHandQty - p.reservedQty;
      const buildable = await apiCall(`/products/max-buildable/${p.id}`);

      setFeasResult({
        productName: p.name,
        requestedQty: feasQty,
        freeToUseStock: freeToUse,
        maxBuildable: buildable.maxBuildable,
        isDirectlyFeasible: freeToUse >= feasQty,
        isProducibleFeasible: (freeToUse + buildable.maxBuildable) >= feasQty
      });
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-900 text-slate-400 border-slate-800';
      case 'confirmed': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'partially_delivered': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'fully_delivered': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'cancelled': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-slate-900 text-slate-400 border-slate-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Sales & Customer Orders</h2>
          <p className="text-xs text-muted-foreground mt-1">Record client purchases, trigger feasibility assessments, and dispatch deliveries.</p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedFeasProduct('');
              setFeasQty(1);
              setFeasResult(null);
              setFeasibilityModalOpen(true);
            }}
            className="flex items-center gap-2 py-2 px-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg text-xs font-semibold shadow-lg transition-all duration-150"
          >
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span>Feasibility Checker</span>
          </button>

          <button
            onClick={() => {
              setCustomerId('');
              setExpectedDeliveryDate('');
              setLines([{ productId: '', quantity: 1 }]);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg hover:shadow-indigo-600/25 transition-all duration-150"
          >
            <Plus className="w-4 h-4" />
            <span>Create Sales Order</span>
          </button>
        </div>
      </div>

      {/* Confirmation Logs Banner */}
      {confirmResult && (
        <div className="p-4 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">MTO Procurement Exploded Logs for {confirmResult.orderNumber}</span>
            <button onClick={() => setConfirmResult(null)} className="text-xs text-slate-400 hover:text-white">Clear Log</button>
          </div>
          <div className="space-y-1.5">
            {confirmResult.procurement.length === 0 ? (
              <p className="text-[11px] text-slate-400">All components were available in warehouse. Stock has been locked and reserved.</p>
            ) : (
              confirmResult.procurement.map((proc: any, idx: number) => (
                <div key={idx} className="text-[11px] font-medium text-slate-300 flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>
                    {proc.action === 'RESERVE_STOCK' 
                      ? `Reserved ${proc.quantity} units directly from inventory.`
                      : proc.action === 'CREATE_MANUFACTURING_ORDER'
                      ? `Created auto Manufacturing Order ${proc.moNumber} for shortage of ${proc.quantity} units.`
                      : `Created draft Purchase Order ${proc.poNumber} from default supplier for shortage of ${proc.quantity} units.`
                    } <span className="text-slate-500 font-normal">({proc.reason})</span>
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* List Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-xs text-muted-foreground border border-dashed border-slate-800 rounded-xl">
          No Sales Orders have been recorded yet.
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground">
                  <th className="py-4 px-5">Order #</th>
                  <th className="py-4 px-5">Customer</th>
                  <th className="py-4 px-5">Expected Date</th>
                  <th className="py-4 px-5">Items</th>
                  <th className="py-4 px-5">Total Amount</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {orders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-950/20 transition-colors">
                    <td className="py-4 px-5 font-black text-slate-100">{order.orderNumber}</td>
                    <td className="py-4 px-5 text-slate-300 font-semibold">{order.customer.name}</td>
                    <td className="py-4 px-5 text-slate-400">
                      {new Date(order.expectedDeliveryDate).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-5">
                      <div className="space-y-1">
                        {order.lines.map((line: any, idx: number) => (
                          <div key={idx} className="text-[11px] font-medium text-slate-400">
                            {line.product.name} <span className="text-indigo-400">x{line.quantity}</span> <span className="text-slate-600">(Delivered: {line.deliveredQuantity})</span>
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
                        {(order.status === 'confirmed' || order.status === 'partially_delivered') && (
                          <button
                            onClick={() => handleDeliver(order.id)}
                            className="py-1 px-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold tracking-wider uppercase transition-colors flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Dispatch Deliver
                          </button>
                        )}
                        {order.status !== 'cancelled' && order.status !== 'fully_delivered' && (
                          <button
                            onClick={() => handleCancel(order.id)}
                            className="p-1 text-slate-500 hover:text-rose-400"
                            title="Cancel Order"
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

      {/* Create Order Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-100 mb-6">Create Customer Sales Order</h3>
            
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Select Customer</label>
                  <select
                    value={customerId}
                    onChange={e => setCustomerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={e => setExpectedDeliveryDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Order Lines */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Order Items</span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300"
                  >
                    + Add Item Row
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
                        <option value="">-- Choose Finished Product --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Rs. {p.salesPrice})</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        value={line.quantity}
                        onChange={e => handleLineChange(idx, 'quantity', Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                        min="1"
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
                  Draft Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feasibility Checker Modal */}
      {feasibilityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-100 mb-6">Delivery Feasibility Advisor</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">Select Finished Product</label>
                <select
                  value={selectedFeasProduct}
                  onChange={e => setSelectedFeasProduct(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">Desired Quantity</label>
                <input
                  type="number"
                  value={feasQty}
                  onChange={e => setFeasQty(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  min="1"
                />
              </div>

              <button
                type="button"
                onClick={checkFeasibility}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded transition-colors"
              >
                Assess Feasibility
              </button>

              {feasResult && (
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-3 mt-4">
                  <h4 className="text-xs font-bold text-slate-200">{feasResult.productName}</h4>
                  
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-slate-400">
                    <div>On-Hand Free stock:</div>
                    <div className="text-slate-200 font-bold">{feasResult.freeToUseStock} units</div>
                    
                    <div>Max Buildable units:</div>
                    <div className="text-slate-200 font-bold">{feasResult.maxBuildable} units</div>
                  </div>

                  <div className="pt-3 border-t border-slate-900">
                    {feasResult.isDirectlyFeasible ? (
                      <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded font-semibold text-center">
                        ✓ Instantly Feasible (In Stock)
                      </div>
                    ) : feasResult.isProducibleFeasible ? (
                      <div className="p-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs rounded font-semibold text-center">
                        ⚠ Feasible via Production (Needs Workshop Assembly)
                      </div>
                    ) : (
                      <div className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded font-semibold text-center">
                        ✗ Insufficient Components (Need to Order Raw Materials)
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-800 mt-6">
              <button
                type="button"
                onClick={() => setFeasibilityModalOpen(false)}
                className="py-2 px-4 bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 rounded text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
