import React, { useEffect, useState } from 'react';
import { apiCall } from '../utils/api';
import { useERPStore } from '../store';
import { 
  FileSpreadsheet, Plus, Edit3, Trash2, HelpCircle, Layers, CheckCircle2, ChevronRight
} from 'lucide-react';

export default function Boms() {
  const { user } = useERPStore();
  const [boms, setBoms] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [workCenters, setWorkCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBom, setSelectedBom] = useState<any | null>(null);

  // Form State
  const [productId, setProductId] = useState('');
  const [version, setVersion] = useState('1.0');
  const [components, setComponents] = useState<Array<{ componentProductId: string; quantity: number; unit: string }>>([
    { componentProductId: '', quantity: 1, unit: 'pcs' }
  ]);
  const [operations, setOperations] = useState<Array<{ operationName: string; sequence: number; durationMinutes: number; workCenterId: string }>>([
    { operationName: 'Assembly', sequence: 1, durationMinutes: 30, workCenterId: '' }
  ]);

  useEffect(() => {
    fetchBoms();
    fetchProducts();
    fetchMaterials();
    fetchWorkCenters();
  }, []);

  const fetchBoms = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/boms');
      setBoms(data);
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

  const fetchMaterials = async () => {
    try {
      const data = await apiCall('/products?type=raw_material');
      setMaterials(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchWorkCenters = async () => {
    try {
      const data = await apiCall('/boms/workcenters');
      setWorkCenters(data);
    } catch (err) {
      console.error(err);
    }
  };

  // Components Row Modifiers
  const handleAddComponent = () => {
    setComponents([...components, { componentProductId: '', quantity: 1, unit: 'pcs' }]);
  };

  const handleRemoveComponent = (idx: number) => {
    const next = [...components];
    next.splice(idx, 1);
    setComponents(next);
  };

  const handleComponentChange = (idx: number, field: string, value: any) => {
    const next = [...components];
    next[idx] = { ...next[idx], [field]: value };
    
    // Autofill unit
    if (field === 'componentProductId' && value) {
      const mat = materials.find(m => m.id === value);
      if (mat) {
        next[idx].unit = mat.unit;
      }
    }
    setComponents(next);
  };

  // Operations Row Modifiers
  const handleAddOperation = () => {
    const seq = operations.length + 1;
    setOperations([...operations, { operationName: '', sequence: seq, durationMinutes: 15, workCenterId: '' }]);
  };

  const handleRemoveOperation = (idx: number) => {
    const next = [...operations];
    next.splice(idx, 1);
    // re-sequence remaining
    const resequenced = next.map((op, i) => ({ ...op, sequence: i + 1 }));
    setOperations(resequenced);
  };

  const handleOperationChange = (idx: number, field: string, value: any) => {
    const next = [...operations];
    next[idx] = { ...next[idx], [field]: value };
    setOperations(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || components.some(c => !c.componentProductId || c.quantity <= 0)) {
      alert('Please fill in finished product and raw material components correctly.');
      return;
    }

    try {
      await apiCall('/boms', {
        method: 'POST',
        body: JSON.stringify({ productId, version, components, operations })
      });
      setModalOpen(false);
      fetchBoms();
    } catch (err: any) {
      alert(err.message || 'Failed to create BoM');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this BoM?')) return;
    try {
      await apiCall(`/boms/${id}`, { method: 'DELETE' });
      fetchBoms();
    } catch (err: any) {
      alert(err.message || 'Failed to delete BoM');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Bills of Materials (BoM)</h2>
          <p className="text-xs text-muted-foreground mt-1">Configure structural component blueprints and production routing steps.</p>
        </div>
        
        {user?.role === 'admin' && (
          <button
            onClick={() => {
              setProductId('');
              setVersion('1.0');
              setComponents([{ componentProductId: '', quantity: 1, unit: 'pcs' }]);
              setOperations([{ operationName: 'Assembly', sequence: 1, durationMinutes: 30, workCenterId: '' }]);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg hover:shadow-indigo-600/25 transition-all duration-150"
          >
            <Plus className="w-4 h-4" />
            <span>Create Blueprint (BoM)</span>
          </button>
        )}
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : boms.length === 0 ? (
        <div className="text-center py-20 text-xs text-muted-foreground border border-dashed border-slate-800 rounded-xl">
          No Bills of Materials configured. Create one to enable manufacturing scheduling.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {boms.map(bom => (
            <div key={bom.id} className="glass-card rounded-xl p-5 space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{bom.product.name}</h3>
                    <span className="text-[10px] text-indigo-400 font-semibold block mt-1">Version: {bom.version}</span>
                  </div>
                  {bom.isActive && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase tracking-widest">
                      Active
                    </span>
                  )}
                </div>

                {/* Exploded Components Checklist */}
                <div className="mt-4 pt-4 border-t border-slate-900 space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Exploded Ingredients</span>
                    <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto pr-1">
                      {bom.components.map((comp: any) => (
                        <div key={comp.id} className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                          <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>{comp.componentProduct.name} <strong className="text-slate-300">x{comp.quantity}</strong></span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Routing Checklist */}
                  <div className="pt-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Production Routing</span>
                    <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                      {bom.operations.map((op: any) => (
                        <div key={op.id} className="text-[11px] font-medium text-slate-400 flex justify-between gap-4">
                          <span>{op.sequence}. {op.operationName} ({op.workCenter?.name || 'Assembly'})</span>
                          <span className="text-slate-500">{op.durationMinutes} mins</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              {user?.role === 'admin' && (
                <div className="pt-4 border-t border-slate-900/60 flex justify-end">
                  <button
                    onClick={() => handleDelete(bom.id)}
                    className="flex items-center gap-1 py-1 px-2.5 bg-slate-900 border border-slate-800 hover:border-rose-950/20 hover:text-rose-400 rounded text-[10px] font-bold uppercase tracking-wider transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create BoM Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-100 mb-6">Create Finished Product Blueprint (BoM)</h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">Target Finished Product</label>
                  <select
                    value={productId}
                    onChange={e => setProductId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    required
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">BoM Blueprint Version</label>
                  <input
                    type="text"
                    value={version}
                    onChange={e => setVersion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                    placeholder="e.g. 1.0"
                    required
                  />
                </div>
              </div>

              {/* Dynamic Components List */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Exploded Components Required</span>
                  <button
                    type="button"
                    onClick={handleAddComponent}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300"
                  >
                    + Add Component Row
                  </button>
                </div>

                {components.map((comp, idx) => (
                  <div key={idx} className="flex gap-4 items-center">
                    <div className="flex-1">
                      <select
                        value={comp.componentProductId}
                        onChange={e => handleComponentChange(idx, 'componentProductId', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                        required
                      >
                        <option value="">-- Choose Raw Material --</option>
                        {materials.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="w-28">
                      <input
                        type="number"
                        value={comp.quantity}
                        onChange={e => handleComponentChange(idx, 'quantity', Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                        placeholder="Quantity"
                        min="0.1"
                        step="any"
                        required
                      />
                    </div>
                    <div className="w-16 text-slate-400 text-xs font-semibold">
                      {comp.unit}
                    </div>
                    {components.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveComponent(idx)}
                        className="text-slate-500 hover:text-rose-400 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Dynamic Routing Operations */}
              <div className="space-y-3 pt-4 border-t border-slate-805">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Manufacturing Operations Routing</span>
                  <button
                    type="button"
                    onClick={handleAddOperation}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300"
                  >
                    + Add Routing Step
                  </button>
                </div>

                {operations.map((op, idx) => (
                  <div key={idx} className="flex gap-3 items-center">
                    <div className="w-12 text-center text-xs font-bold text-indigo-400">
                      Step {op.sequence}
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={op.operationName}
                        onChange={e => handleOperationChange(idx, 'operationName', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                        placeholder="e.g. Painting Floor Assembly"
                        required
                      />
                    </div>
                    <div className="w-32">
                      <input
                        type="number"
                        value={op.durationMinutes}
                        onChange={e => handleOperationChange(idx, 'durationMinutes', Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                        placeholder="Minutes"
                        min="1"
                        required
                      />
                    </div>
                    <div className="w-44">
                      <select
                        value={op.workCenterId}
                        onChange={e => handleOperationChange(idx, 'workCenterId', e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                        required
                      >
                        <option value="">-- Choose Work Center --</option>
                        {workCenters.map(wc => (
                          <option key={wc.id} value={wc.id}>{wc.name}</option>
                        ))}
                      </select>
                    </div>
                    {operations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOperation(idx)}
                        className="text-slate-500 hover:text-rose-400 text-xs"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Submit Buttons */}
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
                  Confirm Blueprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
