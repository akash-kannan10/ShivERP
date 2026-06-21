import { useEffect, useState } from 'react';
import { useERPStore } from '../store';
import { apiCall } from '../utils/api';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, Cpu, DollarSign, Clock, CheckCircle2, ShoppingCart, Send
} from 'lucide-react';

const COLORS = ['#818cf8', '#fb7185', '#fbbf24', '#34d399', '#a78bfa'];

export default function Dashboard() {
  const { metrics, charts, lowStockAlerts, fetchMetrics, fetchCharts, fetchAlerts } = useERPStore();
  const [timeline, setTimeline] = useState<any[]>([]);
  const [replenishingId, setReplenishingId] = useState<string | null>(null);
  const [replenishSuccess, setReplenishSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
    fetchCharts();
    fetchAlerts();
    fetchTimeline();
  }, []);

  const fetchTimeline = async () => {
    try {
      const data = await apiCall('/audit/timeline');
      setTimeline(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReplenish = async (alertItem: any) => {
    setReplenishingId(alertItem.id);
    setReplenishSuccess(null);
    try {
      const defaultVendorId = alertItem.product.defaultVendorId;
      if (!defaultVendorId) {
        alert('Cannot replenish: No default vendor configured for this product.');
        return;
      }

      // Create draft Purchase Order
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() + 5);

      const po = await apiCall('/purchases', {
        method: 'POST',
        body: JSON.stringify({
          vendorId: defaultVendorId,
          expectedDate: expectedDate.toISOString(),
          lines: [
            {
              productId: alertItem.productId,
              quantity: alertItem.shortageQty + alertItem.product.safeStockLevel,
              unitCost: alertItem.product.costPrice
            }
          ]
        })
      });

      // Confirm purchase order immediately to simulate real stock flow
      await apiCall(`/purchases/${po.id}/confirm`, { method: 'POST' });

      setReplenishSuccess(`Successfully generated PO ${po.orderNumber} to vendor!`);
      
      // Refresh
      fetchAlerts();
      fetchMetrics();
      fetchCharts();
      fetchTimeline();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Replenishment failed');
    } finally {
      setReplenishingId(null);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  if (!metrics || !charts) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  const kpis = [
    { label: 'Sales Orders', value: metrics.totalSalesOrders, change: 'Lifetime Count', icon: ShoppingCart, color: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/20' },
    { label: 'Active Mfg Orders', value: metrics.manufacturingOrders, change: 'In Queue', icon: Cpu, color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/20' },
    { label: 'Low Stock Alerts', value: metrics.lowStockAlerts, change: 'Needs Action', icon: AlertTriangle, color: 'text-rose-400 bg-rose-500/15 border-rose-500/20' },
    { label: 'Delayed Deliveries', value: metrics.delayedOrders, change: 'Past Due', icon: Clock, color: 'text-amber-400 bg-amber-500/15 border-amber-500/20' },
    { label: 'Inventory Capital', value: formatCurrency(metrics.inventoryValue), change: 'Asset Value', icon: DollarSign, color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/20' }
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Executive Dashboard</h2>
        <p className="text-xs text-muted-foreground mt-1">Real-time indicators and operational flow control.</p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="glass-card rounded-xl p-5 relative overflow-hidden flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{kpi.label}</span>
                  <h3 className="text-xl font-extrabold text-white mt-1.5">{kpi.value}</h3>
                </div>
                <div className={`p-2.5 rounded-lg border ${kpi.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <span className="text-[10px] font-medium text-slate-400 mt-4 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                {kpi.change}
              </span>
            </div>
          );
        })}
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart */}
        <div className="glass-card rounded-xl p-5 lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Revenue Flow (Trend)</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.salesTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fb7185" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#fb7185" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px' }} 
                  itemStyle={{ color: '#f1f5f9' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', color: '#94a3b8', paddingBottom: '10px' }} />
                <Area type="monotone" name="Revenue" dataKey="revenue" stroke="#818cf8" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" name="Expenses" dataKey="expenses" stroke="#fb7185" strokeWidth={2} fillOpacity={1} fill="url(#colorExpenses)" />
                <Area type="monotone" name="Net Profit" dataKey="profit" stroke="#34d399" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Manufacturing Status Breakdown */}
        <div className="glass-card rounded-xl p-5 space-y-4">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest block">Manufacturing Progress</span>
          <div className="h-64 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.mfgProgress}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {charts.mfgProgress.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px' }} 
                  itemStyle={{ color: '#f1f5f9' }}
                  labelStyle={{ color: '#94a3b8' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Summary Label */}
            <div className="absolute text-center">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Queue</span>
              <h4 className="text-2xl font-black text-white">{metrics.manufacturingOrders}</h4>
            </div>
          </div>
          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900">
            {charts.mfgProgress.map((p, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span>{p.name}: {p.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Stock Alerts and Activity Feed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Replenishment Panel */}
        <div className="glass-card rounded-xl p-5 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Low Stock Intelligence</span>
            <AlertTriangle className="w-4.5 h-4.5 text-rose-500 animate-pulse" />
          </div>

          {replenishSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg">
              {replenishSuccess}
            </div>
          )}

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {lowStockAlerts.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                All raw material stock levels are healthy!
              </div>
            ) : (
              lowStockAlerts.map(alert => (
                <div key={alert.id} className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
                  <div className="overflow-hidden">
                    <h4 className="text-xs font-bold text-slate-200 truncate">{alert.product.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-muted-foreground">SKU: {alert.product.sku}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 font-semibold">
                        Short: {alert.shortageQty.toFixed(1)} {alert.product.unit}
                      </span>
                    </div>
                    {alert.product.defaultVendor && (
                      <span className="text-[9px] text-slate-500 block mt-0.5">Supplier: {alert.product.defaultVendor.name}</span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleReplenish(alert)}
                    disabled={replenishingId === alert.id || !alert.product.defaultVendorId}
                    className="py-1.5 px-3 bg-indigo-600/10 hover:bg-indigo-600 disabled:opacity-50 text-indigo-400 hover:text-white border border-indigo-500/20 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-colors shrink-0"
                  >
                    {replenishingId === alert.id ? 'Ordering...' : 'Order Stock'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="glass-card rounded-xl p-5 space-y-4">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest block">Live Workshop Activity Feed</span>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
            {timeline.length === 0 ? (
              <div className="text-center py-10 text-xs text-muted-foreground">
                No recent workshop activity logs.
              </div>
            ) : (
              timeline.map(act => {
                let activityText = '';
                let colorClass = 'bg-slate-800';

                switch (act.activityType) {
                  case 'login':
                    activityText = 'signed in to the workshop dashboard.';
                    colorClass = 'bg-slate-800';
                    break;
                  case 'logout':
                    activityText = 'left the workshop dashboard.';
                    colorClass = 'bg-slate-800';
                    break;
                  case 'so_created':
                    activityText = `confirmed Sales Order ${act.referenceId}.`;
                    colorClass = 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20';
                    break;
                  case 'po_created':
                    activityText = `raised Procurement PO ${act.referenceId}.`;
                    colorClass = 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20';
                    break;
                  case 'mo_completed':
                    activityText = `completed production for Manufacturing Order ${act.referenceId}.`;
                    colorClass = 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/20';
                    break;
                  case 'delivery_completed':
                    activityText = `dispatched deliveries for Sales Order ${act.referenceId}.`;
                    colorClass = 'bg-purple-500/20 text-purple-400 border border-purple-500/20';
                    break;
                  default:
                    activityText = `performed action on ${act.referenceId || 'system'}.`;
                }

                return (
                  <div key={act.id} className="flex gap-3 text-xs items-start">
                    <div className={`p-1.5 rounded-lg text-[9px] font-bold shrink-0 mt-0.5 ${colorClass}`}>
                      {act.activityType.toUpperCase().substring(0, 3)}
                    </div>
                    <div>
                      <p className="text-slate-300">
                        <strong className="text-slate-100">{act.user.name}</strong> ({act.user.role}) {activityText}
                      </p>
                      <span className="text-[10px] text-muted-foreground block mt-1">
                        {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(act.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
