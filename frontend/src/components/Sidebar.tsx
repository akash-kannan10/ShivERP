import { useERPStore } from '../store';
import { 
  LayoutDashboard, 
  Package, 
  Warehouse, 
  ShoppingCart, 
  Truck, 
  Cpu, 
  FileSpreadsheet, 
  Users, 
  History, 
  Bot, 
  LogOut,
  User
} from 'lucide-react';

export default function Sidebar() {
  const { user, activeTab, setTab, logout, permissionsMatrix } = useERPStore();

  if (!user) return null;

  const hasAccess = (moduleName: string): boolean => {
    if (user.role === 'admin') return true;
    const perm = permissionsMatrix.find(p => p.role === user.role && p.module === moduleName);
    return perm ? perm.canView : false;
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, access: true },
    { id: 'catalog', label: 'Product Catalog', icon: Package, access: hasAccess('products') },
    { id: 'inventory', label: 'Inventory & Ledger', icon: Warehouse, access: hasAccess('inventory') },
    { id: 'sales', label: 'Sales Orders', icon: ShoppingCart, access: hasAccess('sales') },
    { id: 'purchases', label: 'Procurement (POs)', icon: Truck, access: hasAccess('purchases') },
    { id: 'manufacturing', label: 'Manufacturing', icon: Cpu, access: hasAccess('manufacturing') },
    { id: 'boms', label: 'Bills of Materials', icon: FileSpreadsheet, access: hasAccess('boms') },
    { id: 'users', label: 'Users & Permissions', icon: Users, access: user.role === 'admin' },
    { id: 'audit', label: 'Audit Trail', icon: History, access: user.role === 'admin' },
    { id: 'copilot', label: 'AI Business Copilot', icon: Bot, access: true }
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between h-screen shrink-0">
      <div className="flex flex-col overflow-y-auto">
        {/* Brand Header */}
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 bg-slate-950/40">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-lg">
            S
          </div>
          <div>
            <h1 className="font-bold text-white tracking-wide text-sm">Shiv Furniture</h1>
            <span className="text-[10px] text-indigo-400 font-semibold tracking-widest uppercase">ShivERP v1.0</span>
          </div>
        </div>

        {/* User Context */}
        <div className="p-4 mx-3 my-4 bg-slate-950/50 border border-slate-800/80 rounded-xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
            <User className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h4 className="text-xs font-semibold text-slate-200 truncate">{user.name}</h4>
            <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
              {user.role}
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="px-3 space-y-1">
          {navItems.map(item => {
            if (!item.access) return null;
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/15' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-100'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logout Action */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/20">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-950 hover:bg-red-950/20 hover:text-red-400 border border-slate-800 hover:border-red-900/30 rounded-lg text-xs font-semibold text-slate-400 transition-all duration-150"
        >
          <LogOut className="w-4 h-4" />
          <span>Leave Workshop</span>
        </button>
      </div>
    </aside>
  );
}
