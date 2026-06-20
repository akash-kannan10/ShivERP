import { useEffect, useState } from 'react';
import { apiCall } from '../utils/api';
import { useERPStore } from '../store';
import { 
  Warehouse, History, Plus, Edit, ShieldCheck, Settings, Search, ArrowUpRight, ArrowDownRight, ArrowRight
} from 'lucide-react';

export default function Inventory() {
  const { user } = useERPStore();
  const [activeSubTab, setActiveSubTab] = useState<'status' | 'ledger'>('status');
  const [stock, setStock] = useState<any[]>([]);
  const [ledger, setLedger] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantityDelta, setQuantityDelta] = useState(0);
  const [reason, setReason] = useState('');

  // Filters
  const [ledgerProductFilter, setLedgerProductFilter] = useState('');

  useEffect(() => {
    fetchStock();
    fetchProducts();
    if (activeSubTab === 'ledger') {
      fetchLedger();
    }
  }, [activeSubTab, ledgerProductFilter]);

  const fetchStock = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/inventory/dashboard');
      setStock(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const data = await apiCall('/products');
      setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const url = ledgerProductFilter 
        ? `/inventory/ledger?productId=${ledgerProductFilter}` 
        : '/inventory/ledger';
      const data = await apiCall(url);
      setLedger(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || quantityDelta === 0 || !reason) {
      alert('Please fill in all adjustment fields correctly.');
      return;
    }

    try {
      await apiCall('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productId: selectedProductId,
          quantityDelta,
          reason
        })
      });
      setAdjustModalOpen(false);
      fetchStock();
      if (activeSubTab === 'ledger') fetchLedger();
    } catch (err: any) {
      alert(err.message || 'Stock adjustment failed. Make sure available quantity does not fall below zero.');
    }
  };

  const getMovementIcon = (delta: number) => {
    if (delta > 0) return <ArrowUpRight className="w-4 h-4 text-emerald-400" />;
    if (delta < 0) return <ArrowDownRight className="w-4 h-4 text-rose-400" />;
    return <ArrowRight className="w-4 h-4 text-slate-400" />;
  };

  const formatMovementType = (type: string) => {
    return type.replace(/_/g, ' ').toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Inventory & Ledger Management</h2>
          <p className="text-xs text-muted-foreground mt-1">Audit on-hand stock counts, submit adjustments, and inspect the immutable stock ledger.</p>
        </div>

        <button
          onClick={() => {
            setSelectedProductId('');
            setQuantityDelta(0);
            setReason('');
            setAdjustModalOpen(true);
          }}
          className="flex items-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg hover:shadow-indigo-600/25 transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          <span>Manual Adjustment</span>
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => setActiveSubTab('status')}
          className={`py-3 px-6 text-xs font-bold tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'status' 
              ? 'border-indigo-500 text-indigo-400 bg-slate-950/20' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Warehouse className="w-4 h-4" />
          Current Stock Levels
        </button>
        <button
          onClick={() => setActiveSubTab('ledger')}
          className={`py-3 px-6 text-xs font-bold tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 ${
            activeSubTab === 'ledger' 
              ? 'border-indigo-500 text-indigo-400 bg-slate-950/20' 
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          Immutable Stock Ledger
        </button>
      </div>

      {/* Main Panel Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : activeSubTab === 'status' ? (
        /* Status Table */
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground">
                  <th className="py-4 px-5">SKU Code</th>
                  <th className="py-4 px-5">Product/Material Name</th>
                  <th className="py-4 px-5">Type</th>
                  <th className="py-4 px-5 text-center">Physical On-Hand</th>
                  <th className="py-4 px-5 text-center">Reserved</th>
                  <th className="py-4 px-5 text-center">Available Free</th>
                  <th className="py-4 px-5">Alert Level</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {stock.map(item => (
                  <tr key={item.id} className="hover:bg-slate-950/20 transition-colors">
                    <td className="py-4 px-5 font-black text-indigo-400">{item.sku}</td>
                    <td className="py-4 px-5 font-semibold text-slate-200">{item.name}</td>
                    <td className="py-4 px-5">
                      <span className="capitalize text-[10px] bg-slate-850 px-2 py-0.5 rounded text-slate-400 border border-slate-800">
                        {item.productType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-center font-bold text-slate-300">
                      {item.onHandQty} {item.unit}
                    </td>
                    <td className="py-4 px-5 text-center font-semibold text-slate-500">
                      {item.reservedQty} {item.unit}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <span className={`font-black ${item.isLowStock && item.productType === 'raw_material' ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {item.freeToUseQty} {item.unit}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      {item.productType === 'raw_material' ? (
                        item.isLowStock ? (
                          <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/15 px-2 py-0.5 rounded uppercase tracking-wider">
                            Low Stock warning
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-2 py-0.5 rounded uppercase tracking-wider">
                            Stock Healthy
                          </span>
                        )
                      ) : (
                        <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">
                          Finished Output
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Ledger Table */
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex gap-4 max-w-sm">
            <select
              value={ledgerProductFilter}
              onChange={e => setLedgerProductFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              <option value="">-- Filter by Product/Material --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </div>

          <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/50 text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground">
                    <th className="py-4 px-5">Movement Date</th>
                    <th className="py-4 px-5">Product/Material</th>
                    <th className="py-4 px-5">SKU</th>
                    <th className="py-4 px-5">Activity</th>
                    <th className="py-4 px-5 text-center">Change Qty</th>
                    <th className="py-4 px-5 text-center">Final Stock</th>
                    <th className="py-4 px-5">Operator</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {ledger.map(entry => (
                    <tr key={entry.id} className="hover:bg-slate-950/20 transition-colors">
                      <td className="py-4 px-5 text-slate-400">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="py-4 px-5 font-semibold text-slate-200">{entry.product.name}</td>
                      <td className="py-4 px-5 font-bold text-slate-500">{entry.product.sku}</td>
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center gap-1.5 font-bold text-indigo-400">
                          {formatMovementType(entry.movementType)}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-center font-bold">
                        <div className="flex items-center justify-center gap-1">
                          {getMovementIcon(entry.quantityDelta)}
                          <span className={entry.quantityDelta > 0 ? 'text-emerald-400' : entry.quantityDelta < 0 ? 'text-rose-400' : 'text-slate-400'}>
                            {entry.quantityDelta > 0 ? `+${entry.quantityDelta}` : entry.quantityDelta}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-center font-bold text-slate-300">
                        {entry.balanceAfter} {entry.product.unit}
                      </td>
                      <td className="py-4 px-5 text-slate-400">
                        {entry.createdBy?.name || 'Automated Engine'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manual Adjustment Modal */}
      {adjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-100 mb-6">Perform Manual Stock Adjustment</h3>

            <form onSubmit={handleAdjust} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">Select Product / Material</label>
                <select
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  required
                >
                  <option value="">-- Select Item --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku}) [On Hand: {p.onHandQty}]</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">Quantity Delta (Positive or Negative)</label>
                <input
                  type="number"
                  value={quantityDelta}
                  onChange={e => setQuantityDelta(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  placeholder="e.g. 10 or -5"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">Reason / Audit Memo</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none h-20"
                  placeholder="e.g. Cycle count adjustment: found 2 additional wooden boards."
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-6 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="py-2 px-4 bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold"
                >
                  Submit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
