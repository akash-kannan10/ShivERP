import { useEffect } from 'react';
import { useERPStore } from './store';
import Sidebar from './components/Sidebar';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import Catalog from './components/Catalog';
import Inventory from './components/Inventory';
import Sales from './components/Sales';
import Purchases from './components/Purchases';
import Manufacturing from './components/Manufacturing';
import Boms from './components/Boms';
import Users from './components/Users';
import Audit from './components/Audit';
import Copilot from './components/Copilot';
import { Bell, AlertTriangle } from 'lucide-react';

function App() {
  const { token, user, activeTab, lowStockAlerts, fetchAlerts, fetchPermissionsMatrix } = useERPStore();

  useEffect(() => {
    if (token) {
      fetchAlerts();
      fetchPermissionsMatrix();
    }
  }, [token]);

  if (!token || !user) {
    return <Auth />;
  }

  // Active workspace selector
  const renderWorkspace = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'catalog':
        return <Catalog />;
      case 'inventory':
        return <Inventory />;
      case 'sales':
        return <Sales />;
      case 'purchases':
        return <Purchases />;
      case 'manufacturing':
        return <Manufacturing />;
      case 'boms':
        return <Boms />;
      case 'users':
        return <Users />;
      case 'audit':
        return <Audit />;
      case 'copilot':
        return <Copilot />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-950 overflow-hidden text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-900 bg-slate-950/40 backdrop-blur-md flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-sm text-slate-200 capitalize">
              {activeTab === 'boms' ? 'Bills of Materials' : activeTab.replace('_', ' ')}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Blinking Low Stock Indicator */}
            {lowStockAlerts.length > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-[10px] font-black text-rose-400 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{lowStockAlerts.length} LOW STOCK WARNINGS</span>
              </div>
            )}

            <div className="h-4 w-px bg-slate-900"></div>

            {/* Notifications Badge */}
            <button className="p-2 text-slate-400 hover:text-white transition-colors relative">
              <Bell className="w-4.5 h-4.5" />
              {lowStockAlerts.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
              )}
            </button>
          </div>
        </header>

        {/* Dynamic Workspace Container */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-950/50">
          {renderWorkspace()}
        </main>
      </div>
    </div>
  );
}

export default App;
