import { create } from 'zustand';
import { apiCall } from '../utils/api';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Permission {
  id: string;
  role: string;
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

interface ERPState {
  token: string | null;
  user: User | null;
  activeTab: string;
  permissionsMatrix: Permission[];
  lowStockAlerts: any[];
  metrics: {
    totalSalesOrders: number;
    pendingDeliveries: number;
    totalPurchaseOrders: number;
    partialReceipts: number;
    manufacturingOrders: number;
    lowStockAlerts: number;
    delayedOrders: number;
    inventoryValue: number;
  } | null;
  charts: {
    salesTrend: Array<{ date: string; amount: number }>;
    topProducts: Array<{ name: string; quantity: number; revenue: number }>;
    mfgProgress: Array<{ name: string; count: number }>;
  } | null;
  
  // Actions
  login: (token: string, user: User) => void;
  logout: () => void;
  setTab: (tab: string) => void;
  fetchMetrics: () => Promise<void>;
  fetchCharts: () => Promise<void>;
  fetchAlerts: () => Promise<void>;
  fetchPermissionsMatrix: () => Promise<void>;
  updatePermissionMatrix: (role: string, module: string, action: string, value: boolean) => Promise<void>;
}

export const useERPStore = create<ERPState>((set, get) => ({
  token: localStorage.getItem('shiverp_token'),
  user: (() => {
    const raw = localStorage.getItem('shiverp_user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })(),
  activeTab: 'dashboard',
  permissionsMatrix: [],
  lowStockAlerts: [],
  metrics: null,
  charts: null,

  login: (token, user) => {
    localStorage.setItem('shiverp_token', token);
    localStorage.setItem('shiverp_user', JSON.stringify(user));
    set({ token, user, activeTab: 'dashboard' });
  },

  logout: () => {
    localStorage.removeItem('shiverp_token');
    localStorage.removeItem('shiverp_user');
    set({ token: null, user: null, metrics: null, charts: null, permissionsMatrix: [] });
  },

  setTab: (activeTab) => set({ activeTab }),

  fetchMetrics: async () => {
    if (!get().token) return;
    try {
      const data = await apiCall('/reports/dashboard/metrics');
      set({ metrics: data });
    } catch (err) {
      console.error('Error fetching metrics:', err);
    }
  },

  fetchCharts: async () => {
    if (!get().token) return;
    try {
      const data = await apiCall('/reports/dashboard/charts');
      set({ charts: data });
    } catch (err) {
      console.error('Error fetching charts:', err);
    }
  },

  fetchAlerts: async () => {
    if (!get().token) return;
    try {
      const data = await apiCall('/inventory/alerts');
      set({ lowStockAlerts: data });
    } catch (err) {
      console.error('Error fetching alerts:', err);
    }
  },

  fetchPermissionsMatrix: async () => {
    if (!get().token) return;
    try {
      const data = await apiCall('/users/permissions/matrix');
      set({ permissionsMatrix: data });
    } catch (err) {
      console.error('Error fetching permission matrix:', err);
    }
  },

  updatePermissionMatrix: async (role, module, action, value) => {
    try {
      await apiCall('/users/permissions/matrix', {
        method: 'PUT',
        body: JSON.stringify({ role, module, action, value })
      });
      await get().fetchPermissionsMatrix();
    } catch (err) {
      console.error('Error updating permission:', err);
      throw err;
    }
  }
}));
