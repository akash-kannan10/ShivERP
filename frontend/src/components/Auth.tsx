import React, { useState } from 'react';
import { useERPStore } from '../store';
import { apiCall } from '../utils/api';
import { ShieldCheck, UserCheck, Flame } from 'lucide-react';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useERPStore(state => state.login);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError('');

    try {
      const res = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      login(res.token, res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('Password123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.2),rgba(255,255,255,0))] p-4">
      <div className="w-full max-w-md glass-card rounded-2xl p-8 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-16 -left-16 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-xl mb-3 text-primary border border-primary/20">
            <Flame className="w-8 h-8 animate-pulse text-indigo-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">
            ShivERP
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Smart Manufacturing & Inventory Management
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-red-400 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
              placeholder="e.g. admin@shiverp.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-lg hover:shadow-indigo-500/20 transition-all duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Sign In to Workshop'
            )}
          </button>
        </form>

        {/* Quick Testing Matrix */}
        <div className="mt-8 pt-6 border-t border-slate-900 relative z-10">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <span>Quick Login Scenarios</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleQuickLogin('admin@shiverp.com')}
              className="px-3 py-2 bg-slate-900/40 border border-slate-800 hover:bg-slate-900 hover:border-slate-700 text-xs rounded text-slate-300 font-medium transition-colors text-left"
            >
              👑 Admin Owner
            </button>
            <button
              onClick={() => handleQuickLogin('sales@shiverp.com')}
              className="px-3 py-2 bg-slate-900/40 border border-slate-800 hover:bg-slate-900 hover:border-slate-700 text-xs rounded text-slate-300 font-medium transition-colors text-left"
            >
              📈 Sales Manager
            </button>
            <button
              onClick={() => handleQuickLogin('manufacturing@shiverp.com')}
              className="px-3 py-2 bg-slate-900/40 border border-slate-800 hover:bg-slate-900 hover:border-slate-700 text-xs rounded text-slate-300 font-medium transition-colors text-left"
            >
              ⚙️ Workshop Chief
            </button>
            <button
              onClick={() => handleQuickLogin('inventory@shiverp.com')}
              className="px-3 py-2 bg-slate-900/40 border border-slate-800 hover:bg-slate-900 hover:border-slate-700 text-xs rounded text-slate-300 font-medium transition-colors text-left"
            >
              📦 Stock Planner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
