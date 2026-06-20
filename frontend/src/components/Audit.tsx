import { useEffect, useState } from 'react';
import { apiCall } from '../utils/api';
import { History, ShieldAlert, Calendar } from 'lucide-react';

export default function Audit() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/audit');
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">System Audit Log & Chain of Custody</h2>
        <p className="text-xs text-muted-foreground mt-1">Immutable security ledger capturing session logins, stock alterations, and MTO exploded procurement actions.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-20 text-xs text-muted-foreground border border-dashed border-slate-800 rounded-xl">
          No audit logs recorded.
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50 text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground">
                  <th className="py-4 px-5">Timestamp</th>
                  <th className="py-4 px-5">User Operator</th>
                  <th className="py-4 px-5">Role</th>
                  <th className="py-4 px-5">Activity Event</th>
                  <th className="py-4 px-5">Reference ID</th>
                  <th className="py-4 px-5">Detail Narrative Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {logs.map(log => {
                  let eventColor = 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
                  if (log.activityType.includes('completed') || log.activityType.includes('deliver') || log.activityType.includes('receive')) {
                    eventColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
                  } else if (log.activityType.includes('cancel') || log.activityType.includes('fail')) {
                    eventColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-950/20 transition-colors">
                      <td className="py-4 px-5 text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-4 px-5 font-semibold text-slate-200">{log.user?.name || 'System Engine'}</td>
                      <td className="py-4 px-5">
                        <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-slate-400 uppercase font-semibold">
                          {log.user?.role || 'SYSTEM'}
                        </span>
                      </td>
                      <td className="py-4 px-5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${eventColor}`}>
                          {log.activityType.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-mono text-[10px] text-slate-500 font-bold">{log.referenceId || 'N/A'}</td>
                      <td className="py-4 px-5 text-slate-300 font-medium max-w-sm truncate" title={log.description}>
                        {log.description}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
