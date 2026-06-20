import { useEffect, useState } from 'react';
import { apiCall } from '../utils/api';
import { useERPStore } from '../store';
import { 
  Package, Layers, Plus, Edit3, Trash2, Eye, ShieldAlert, Check, RefreshCw
} from 'lucide-react';

export default function Catalog() {
  const { user } = useERPStore();
  const [products, setProducts] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>(''); // all, finished_good, raw_material
  
  // Modals state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [productType, setProductType] = useState('finished_good');
  const [salesPrice, setSalesPrice] = useState(0);
  const [costPrice, setCostPrice] = useState(0);
  const [procurementStrategy, setProcurementStrategy] = useState('MTS');
  const [procurementType, setProcurementType] = useState('manufacture');
  const [defaultVendorId, setDefaultVendorId] = useState('');
  const [reorderPoint, setReorderPoint] = useState(0);
  const [safeStockLevel, setSafeStockLevel] = useState(0);
  const [unit, setUnit] = useState('pcs');
  const [isActive, setIsActive] = useState(true);

  // Buildable State
  const [buildableQties, setBuildableQties] = useState<Record<string, number>>({});
  const [calculatingId, setCalculatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchVendors();
  }, [filterType]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const url = filterType ? `/products?type=${filterType}` : '/products';
      const data = await apiCall(url);
      setProducts(data);
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

  const checkBuildable = async (productId: string) => {
    setCalculatingId(productId);
    try {
      const res = await apiCall(`/products/max-buildable/${productId}`);
      setBuildableQties(prev => ({ ...prev, [productId]: res.maxBuildable }));
    } catch (err) {
      console.error(err);
    } finally {
      setCalculatingId(null);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setName('');
    setSku('');
    setProductType('finished_good');
    setSalesPrice(0);
    setCostPrice(0);
    setProcurementStrategy('MTS');
    setProcurementType('manufacture');
    setDefaultVendorId('');
    setReorderPoint(0);
    setSafeStockLevel(0);
    setUnit('pcs');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (product: any) => {
    setEditingProduct(product);
    setName(product.name);
    setSku(product.sku);
    setProductType(product.productType);
    setSalesPrice(product.salesPrice);
    setCostPrice(product.costPrice);
    setProcurementStrategy(product.procurementStrategy);
    setProcurementType(product.procurementType);
    setDefaultVendorId(product.defaultVendorId || '');
    setReorderPoint(product.reorderPoint);
    setSafeStockLevel(product.safeStockLevel);
    setUnit(product.unit);
    setIsActive(product.isActive);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      sku,
      productType,
      salesPrice,
      costPrice,
      procurementStrategy,
      procurementType,
      defaultVendorId: defaultVendorId || null,
      reorderPoint,
      safeStockLevel,
      unit,
      isActive
    };

    try {
      if (editingProduct) {
        await apiCall(`/products/${editingProduct.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await apiCall('/products', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      setModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Failed to save product');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await apiCall(`/products/${id}`, { method: 'DELETE' });
      fetchProducts();
    } catch (err: any) {
      alert(err.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Product Catalog</h2>
          <p className="text-xs text-muted-foreground mt-1">Manage physical goods, materials, strategies, and costs.</p>
        </div>
        
        {user?.role === 'admin' && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg hover:shadow-indigo-600/25 transition-all duration-150"
          >
            <Plus className="w-4 h-4" />
            <span>Create Product</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 bg-slate-900/50 p-1 border border-slate-800 rounded-lg max-w-sm">
        <button
          onClick={() => setFilterType('')}
          className={`flex-1 py-1.5 px-3 rounded text-[11px] font-bold tracking-wider uppercase transition-colors ${
            filterType === '' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterType('finished_good')}
          className={`flex-1 py-1.5 px-3 rounded text-[11px] font-bold tracking-wider uppercase transition-colors ${
            filterType === 'finished_good' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Finished Goods
        </button>
        <button
          onClick={() => setFilterType('raw_material')}
          className={`flex-1 py-1.5 px-3 rounded text-[11px] font-bold tracking-wider uppercase transition-colors ${
            filterType === 'raw_material' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Raw Materials
        </button>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-xs text-muted-foreground border border-dashed border-slate-800 rounded-xl">
          No products matched the current filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map(p => {
            const freeToUse = p.onHandQty - p.reservedQty;
            const isLow = freeToUse < p.reorderPoint;
            
            return (
              <div key={p.id} className="glass-card rounded-xl p-5 flex flex-col justify-between relative overflow-hidden">
                {/* Active Indicator */}
                {!p.isActive && (
                  <div className="absolute top-2 right-2 bg-slate-900 text-slate-500 border border-slate-800 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded">
                    Inactive
                  </div>
                )}

                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[9px] bg-slate-800 text-slate-300 font-extrabold uppercase px-2 py-0.5 rounded tracking-wider border border-slate-700">
                        {p.productType.replace('_', ' ')}
                      </span>
                      <h3 className="text-sm font-bold text-white mt-2.5 leading-snug">{p.name}</h3>
                      <span className="text-[10px] text-indigo-400 font-semibold block mt-1">SKU: {p.sku}</span>
                    </div>
                    
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block font-medium">Sales Price</span>
                      <span className="text-sm font-extrabold text-slate-100">Rs. {p.salesPrice.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Stock Levels Status */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-950/40 p-3 rounded-lg border border-slate-900 mt-4 text-center">
                    <div>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">On Hand</span>
                      <span className="text-xs font-black text-slate-300">{p.onHandQty}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Reserved</span>
                      <span className="text-xs font-black text-slate-300">{p.reservedQty}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-muted-foreground uppercase font-bold block">Available</span>
                      <span className={`text-xs font-black ${isLow && p.productType === 'raw_material' ? 'text-rose-400' : 'text-slate-300'}`}>
                        {freeToUse}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 mt-4 text-[11px] font-medium text-slate-400">
                    <div className="flex justify-between">
                      <span>Procurement Type:</span>
                      <span className="text-slate-200 capitalize">{p.procurementType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Replenishment Strategy:</span>
                      <span className="text-slate-200">{p.procurementStrategy}</span>
                    </div>
                    {p.productType === 'raw_material' && (
                      <>
                        <div className="flex justify-between">
                          <span>Reorder Limit:</span>
                          <span className="text-slate-200">{p.reorderPoint} {p.unit}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Default Vendor:</span>
                          <span className="text-slate-200 truncate max-w-[120px]">{p.defaultVendor?.name || 'N/A'}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-6 pt-4 border-t border-slate-900/60 flex items-center justify-between gap-2">
                  {p.productType === 'finished_good' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => checkBuildable(p.id)}
                        disabled={calculatingId === p.id}
                        className="py-1 px-2.5 bg-slate-900 border border-slate-800 hover:border-indigo-500/30 text-indigo-400 hover:text-white rounded text-[10px] font-bold tracking-wider uppercase transition-all flex items-center gap-1.5"
                      >
                        <RefreshCw className={`w-3 h-3 ${calculatingId === p.id ? 'animate-spin' : ''}`} />
                        <span>Check Buildable</span>
                      </button>
                      {buildableQties[p.id] !== undefined && (
                        <span className="text-[10px] text-slate-300 font-bold bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/10">
                          Max: {buildableQties[p.id]} units
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {isLow && (
                        <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3" />
                          <span>Low Stock Alert</span>
                        </span>
                      )}
                    </div>
                  )}

                  {user?.role === 'admin' && (
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:text-indigo-400 rounded text-slate-400 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 bg-slate-900 border border-slate-800 hover:border-rose-950/20 hover:text-rose-400 rounded text-slate-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-xl w-full p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-100 mb-6">
              {editingProduct ? `Edit Product Details` : `Create New Catalog Item`}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Product Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. Premium Dining Table"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Unique SKU</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="e.g. FG-DT-001"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Product Type</label>
                  <select
                    value={productType}
                    onChange={e => setProductType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="finished_good">Finished Good</option>
                    <option value="raw_material">Raw Material</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Sales Price (Rs.)</label>
                  <input
                    type="number"
                    value={salesPrice}
                    onChange={e => setSalesPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Cost Price (Rs.)</label>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={e => setCostPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Procurement Strategy</label>
                  <select
                    value={procurementStrategy}
                    onChange={e => setProcurementStrategy(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="MTS">Make to Stock (MTS)</option>
                    <option value="MTO">Make to Order (MTO)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Replenishment Action</label>
                  <select
                    value={procurementType}
                    onChange={e => setProcurementType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="manufacture">Manufacture (Assemble in-house)</option>
                    <option value="purchase">Purchase (Procure from Vendor)</option>
                  </select>
                </div>
              </div>

              {productType === 'raw_material' ? (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Default Supplier</label>
                    <select
                      value={defaultVendorId}
                      onChange={e => setDefaultVendorId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="">-- Choose Vendor --</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>{v.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Reorder Limit</label>
                    <input
                      type="number"
                      value={reorderPoint}
                      onChange={e => setReorderPoint(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Safety Stock Qty</label>
                    <input
                      type="number"
                      value={safeStockLevel}
                      onChange={e => setSafeStockLevel(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                      min="0"
                    />
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">Unit of Measure</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    placeholder="pcs, meters, kg"
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                  />
                  <label htmlFor="isActive" className="text-xs font-semibold text-slate-300 cursor-pointer">
                    Item is Active & Sellable
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-6 border-t border-slate-800 mt-6">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="py-2 px-4 bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 rounded text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-semibold transition-colors"
                >
                  Save Catalog Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
