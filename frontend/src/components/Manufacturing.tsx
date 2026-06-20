import { useEffect, useState } from 'react';
import { apiCall } from '../utils/api';
import { useERPStore } from '../store';
import { 
  Cpu, Calendar, ClipboardCheck, Plus, Play, CheckCircle2, AlertTriangle, User, ChevronDown, ChevronUp
} from 'lucide-react';

export default function Manufacturing() {
  const { user, fetchAlerts, fetchMetrics } = useERPStore();
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [boms, setBoms] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals / Panels
  const [modalOpen, setModalOpen] = useState(false);
  const [shoppingListModalOpen, setShoppingListModalOpen] = useState(false);
  const [selectedMo, setSelectedMo] = useState<any | null>(null);
  const [shoppingList, setShoppingList] = useState<any[]>([]);
  const [expandedMoId, setExpandedMoId] = useState<string | null>(null);

  // Form State
  const [productId, setProductId] = useState('');
  const [bomId, setBomId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');

  useEffect(() => {
    fetchOrders();
    fetchProducts();
    fetchBoms();
    fetchUsers();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/manufacturing');
      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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

  const fetchBoms = async () => {
    try {
      const data = await apiCall('/boms');
      setBoms(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await apiCall('/users');
      setUsers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleProductChange = (val: string) => {
    setProductId(val);
    // Auto-select first matching BoM
    const matchingBoms = boms.filter(b => b.productId === val);
    if (matchingBoms.length > 0) {
      setBomId(matchingBoms[0].id);
    } else {
      setBomId('');
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !bomId || quantity <= 0 || !dueDate) {
      alert('Please fill in all MO fields correctly.');
      return;
    }

    try {
      await apiCall('/manufacturing', {
        method: 'POST',
        body: JSON.stringify({ productId, bomId, quantity, dueDate, assigneeId: assigneeId || null })
      });
      setModalOpen(false);
      fetchOrders();
      fetchMetrics();
    } catch (err: any) {
      alert(err.message || 'Failed to create MO');
    }
  };

  const handleReserve = async (id: string) => {
    try {
      const res = await apiCall(`/manufacturing/${id}/reserve`, { method: 'POST' });
      fetchOrders();
      fetchMetrics();
      alert('Components successfully reserved and locked for production!');
    } catch (err: any) {
      alert(err.message || 'Reservation failed. Some components might have insufficient stock.');
    }
  };

  const handleStart = async (id: string) => {
    try {
      await apiCall(`/manufacturing/${id}/start`, { method: 'POST' });
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to start production');
    }
  };

  const handleComplete = async (id: string) => {
    try {
      await apiCall(`/manufacturing/${id}/complete`, { method: 'POST' });
      fetchOrders();
      fetchAlerts();
      fetchMetrics();
      alert('Finished products generated! Raw materials consumed.');
    } catch (err: any) {
      alert(err.message || 'Failed to complete production');
    }
  };

  const openShoppingList = async (mo: any) => {
    setSelectedMo(mo);
    setShoppingList([]);
    setShoppingListModalOpen(true);
    try {
      const data = await apiCall(`/manufacturing/shopping-list/${mo.id}`);
      setShoppingList(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompleteWorkOrder = async (woId: string) => {
    try {
      await apiCall(`/manufacturing/work-orders/${woId}/complete`, { method: 'POST' });
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to complete operations step');
    }
  };

  const handleStartWorkOrder = async (woId: string) => {
    try {
      await apiCall(`/manufacturing/work-orders/${woId}/start`, { method: 'POST' });
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Failed to start operations step');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-slate-900 text-slate-400 border-slate-800';
      case 'components_reserved': return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'in_progress': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'cancelled': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default: return 'bg-slate-900 text-slate-400 border-slate-800';
    }
  };

  const getWoStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-slate-950 text-slate-500 border-slate-800';
      case 'in_progress': return 'bg-amber-500/10 text-amber-400 border-amber-500/25';
      case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25';
      default: return 'bg-slate-950 text-slate-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Manufacturing Orders</h2>
          <p className="text-xs text-muted-foreground mt-1">Schedule production, explode Bills of Materials, and track workshop floor operations.</p>
        </div>
        
        <button
          onClick={() => {
            setProductId('');
            setBomId('');
            setQuantity(1);
            setDueDate('');
            setAssigneeId('');
            setModalOpen(true);
          }}
          className="flex items-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg hover:shadow-indigo-600/25 transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          <span>Launch Mfg Order</span>
        </button>
      </div>

      {/* List Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-20 text-xs text-muted-foreground border border-dashed border-slate-800 rounded-xl">
          No Manufacturing Orders are currently scheduled.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(order => {
            const isExpanded = expandedMoId === order.id;
            return (
              <div key={order.id} className="glass-card rounded-xl border border-slate-800 overflow-hidden shadow-lg">
                {/* MO Summary Row */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/10">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mt-1 shrink-0">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-slate-100">{order.orderNumber}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-300 mt-1.5">{order.product.name}</h4>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                        <span className="font-semibold text-indigo-400">Target Qty: {order.quantity} {order.product.unit}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-slate-500" /> Due: {new Date(order.dueDate).toLocaleDateString()}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-slate-500" /> Lead: {order.assignee?.name || 'Unassigned'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 md:self-center">
                    <button
                      onClick={() => openShoppingList(order)}
                      className="py-1.5 px-3 bg-slate-950 hover:bg-slate-900 text-slate-300 border border-slate-800 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                    >
                      Shopping List
                    </button>

                    {order.status === 'draft' && (
                      <button
                        onClick={() => handleReserve(order.id)}
                        className="py-1.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                      >
                        Reserve Components
                      </button>
                    )}

                    {order.status === 'components_reserved' && (
                      <button
                        onClick={() => handleStart(order.id)}
                        className="py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        Start Production
                      </button>
                    )}

                    {(order.status === 'in_progress' || order.status === 'components_reserved') && (
                      <button
                        onClick={() => handleComplete(order.id)}
                        className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Complete Mfg
                      </button>
                    )}

                    <button
                      onClick={() => setExpandedMoId(isExpanded ? null : order.id)}
                      className="p-1.5 text-slate-500 hover:text-white transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Operations Checklist */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 bg-slate-950/40 p-5 space-y-4">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">Workshop Floor Operations Checklist</span>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {order.workOrders.map((wo: any) => (
                        <div key={wo.id} className="bg-slate-900/60 p-4 border border-slate-800 rounded-xl space-y-3 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start">
                              <span className="text-[9px] bg-slate-950 text-indigo-400 border border-slate-800/80 px-2 py-0.5 rounded uppercase font-bold tracking-widest">
                                Step {wo.sequence}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${getWoStatusColor(wo.status)}`}>
                                {wo.status.replace('_', ' ')}
                              </span>
                            </div>
                            <h5 className="text-xs font-bold text-slate-200 mt-2.5">{wo.operationName}</h5>
                            <span className="text-[10px] text-slate-500 mt-1 block">Work Center: {wo.workCenter?.name || 'Assembly'}</span>
                          </div>

                          <div className="pt-3 border-t border-slate-800/60 flex justify-end gap-1.5">
                            {wo.status === 'pending' && (
                              <button
                                onClick={() => handleStartWorkOrder(wo.id)}
                                className="py-1 px-2 bg-amber-600/10 hover:bg-amber-600 text-amber-400 hover:text-white rounded text-[9px] font-bold tracking-widest uppercase transition-colors"
                              >
                                Start Step
                              </button>
                            )}
                            {wo.status === 'in_progress' && (
                              <button
                                onClick={() => handleCompleteWorkOrder(wo.id)}
                                className="py-1 px-2.5 bg-emerald-600/15 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 rounded text-[9px] font-bold tracking-widest uppercase transition-colors flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Finish Step
                              </button>
                            )}
                            {wo.status === 'completed' && (
                              <span className="text-[9px] text-slate-500 font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                Done
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create MO Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-100 mb-6">Launch Manufacturing Order</h3>
            
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Finished Product</label>
                  <select
                    value={productId}
                    onChange={e => handleProductChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Bill of Materials (BoM)</label>
                  <select
                    value={bomId}
                    onChange={e => setBomId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    required
                  >
                    <option value="">-- Choose BoM --</option>
                    {boms.filter(b => b.productId === productId).map(b => (
                      <option key={b.id} value={b.id}>Version {b.version} ({b.product.name})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Target Quantity</label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={e => setQuantity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Target Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Workshop Operator</label>
                  <select
                    value={assigneeId}
                    onChange={e => setAssigneeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Assign Operator --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>
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
                  Create Mfg Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shopping List checklist Modal */}
      {shoppingListModalOpen && selectedMo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-100 mb-2">Manufacturing Shopping List</h3>
            <p className="text-xs text-slate-400 mb-6">Component exploded checklist for {selectedMo.orderNumber} ({selectedMo.product.name} x{selectedMo.quantity})</p>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {shoppingList.length === 0 ? (
                <div className="flex justify-center items-center py-10">
                  <span className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
                </div>
              ) : (
                shoppingList.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200">{item.name}</h4>
                      <span className="text-[10px] text-slate-500">SKU: {item.sku}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-bold">Needed: {item.requiredQty} {item.unit}</span>
                      <span className={`text-[10px] font-extrabold ${item.isShort ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {item.isShort ? `Shortage: ${item.shortageQty} ${item.unit}` : `Available Stock`}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-800 mt-6">
              <button
                type="button"
                onClick={() => setShoppingListModalOpen(false)}
                className="py-2 px-4 bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 rounded text-xs font-semibold"
              >
                Close Checklist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
