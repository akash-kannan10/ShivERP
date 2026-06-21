import { useEffect, useState } from 'react';
import { apiCall } from '../utils/api';
import { useERPStore } from '../store';
import { 
  Users as UsersIcon, ShieldAlert, Key, Plus, Trash2, ShieldCheck, Check, Settings
} from 'lucide-react';

export default function Users() {
  const { user, permissionsMatrix, fetchPermissionsMatrix, updatePermissionMatrix } = useERPStore();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('sales');

  useEffect(() => {
    fetchUsers();
    fetchPermissionsMatrix();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const data = await apiCall('/users');
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password || !role) {
      alert('All fields are required.');
      return;
    }

    try {
      await apiCall('/users', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role })
      });
      setModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await apiCall(`/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    }
  };

  const handlePermissionChange = async (roleName: string, moduleName: string, actionField: string, currentValue: boolean) => {
    try {
      await updatePermissionMatrix(roleName, moduleName, actionField, !currentValue);
    } catch (err: any) {
      alert(err.message || 'Failed to update permission matrix');
    }
  };

  // Group permission rows by role
  const rolesList = ['sales', 'purchase', 'manufacturing', 'inventory', 'owner'];
  const modulesList = [
    'dashboard', 'products', 'raw_materials', 'boms', 'sales', 
    'purchases', 'manufacturing', 'inventory', 'audit_logs', 'users', 'reports'
  ];

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Users & Role Permissions Matrix</h2>
          <p className="text-xs text-muted-foreground mt-1">Manage workshop employee accounts and enforce Role-Based Access Control (RBAC).</p>
        </div>

        <button
          onClick={() => {
            setName('');
            setEmail('');
            setPassword('');
            setRole('sales');
            setModalOpen(true);
          }}
          className="flex items-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg hover:shadow-indigo-600/25 transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Users Accounts List */}
        <div className="lg:col-span-1 space-y-4">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest block">Active Accounts</span>
          {loading ? (
            <div className="flex justify-center py-10">
              <span className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
            </div>
          ) : (
            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{u.name}</h4>
                    <span className="text-[10px] text-slate-500 block mt-0.5">{u.email}</span>
                    <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded mt-2 inline-block uppercase tracking-wider">
                      {u.role}
                    </span>
                  </div>
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 border border-transparent hover:border-slate-800 hover:bg-slate-950/40 rounded transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Permission Matrix Grid */}
        <div className="lg:col-span-2 space-y-4">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest block">Interactive Permissions Matrix Grid</span>
          
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/50 text-[10px] uppercase tracking-wider font-extrabold text-muted-foreground">
                    <th className="py-4 px-5">Role</th>
                    <th className="py-4 px-5">Module</th>
                    <th className="py-4 px-5 text-center">View</th>
                    <th className="py-4 px-5 text-center">Create</th>
                    <th className="py-4 px-5 text-center">Edit</th>
                    <th className="py-4 px-5 text-center">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs">
                  {rolesList.map(roleName => {
                    return modulesList.map((modName, mIdx) => {
                      // Find matrix cell
                      const perm = permissionsMatrix.find(p => p.role === roleName && p.module === modName) || {
                        canView: false,
                        canCreate: false,
                        canEdit: false,
                        canDelete: false
                      };

                      return (
                        <tr key={`${roleName}-${modName}`} className="hover:bg-slate-950/20 transition-colors">
                          {mIdx === 0 && (
                            <td 
                              className="py-4 px-5 font-black text-slate-200 border-r border-slate-800 uppercase tracking-wider bg-slate-950/20"
                              rowSpan={modulesList.length}
                            >
                              {roleName}
                            </td>
                          )}
                          <td className="py-4 px-5 font-semibold text-slate-300 border-r border-slate-800/60 capitalize">
                            {modName.replace('_', ' ')}
                          </td>
                          <td className="py-4 px-5 text-center">
                            <input
                              type="checkbox"
                              checked={perm.canView}
                              onChange={() => handlePermissionChange(roleName, modName, 'canView', perm.canView)}
                              className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                            />
                          </td>
                          <td className="py-4 px-5 text-center">
                            <input
                              type="checkbox"
                              checked={perm.canCreate}
                              onChange={() => handlePermissionChange(roleName, modName, 'canCreate', perm.canCreate)}
                              className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                            />
                          </td>
                          <td className="py-4 px-5 text-center">
                            <input
                              type="checkbox"
                              checked={perm.canEdit}
                              onChange={() => handlePermissionChange(roleName, modName, 'canEdit', perm.canEdit)}
                              className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                            />
                          </td>
                          <td className="py-4 px-5 text-center">
                            <input
                              type="checkbox"
                              checked={perm.canDelete}
                              onChange={() => handlePermissionChange(roleName, modName, 'canDelete', perm.canDelete)}
                              className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                            />
                          </td>
                        </tr>
                      );
                    });
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Create Account Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-base font-bold text-slate-100 mb-6">Create Employee Account</h3>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">Employee Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  placeholder="e.g. Ramesh Kumar"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">Login Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  placeholder="ramesh@shiverp.com"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">Secure Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">Assigned Role Group</label>
                <select
                  value={role}
                  onChange={e => setRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none"
                  required
                >
                  <option value="sales">sales (Sales & Deliveries)</option>
                  <option value="purchase">purchase (Procurement & Purchasing)</option>
                  <option value="manufacturing">manufacturing (Workshop floor manager)</option>
                  <option value="inventory">inventory (Warehouse receipts & counts)</option>
                  <option value="owner">owner (Business Owner)</option>
                </select>
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
                  Add Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
