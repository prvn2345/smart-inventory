import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL.trim() !== ''
  ? import.meta.env.VITE_API_URL
  : '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ─── Products ────────────────────────────────────────────────────────────────
export const productsAPI = {
  getAll: (params) => api.get('/products', { params }),
  getOne: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  adjustStock: (id, data) => api.patch(`/products/${id}/stock`, data),
  getLogs: (id, params) => api.get(`/products/${id}/logs`, { params }),
  getCategories: () => api.get('/products/categories'),
  getLowStock: () => api.get('/products/low-stock'),
};

// ─── Orders ──────────────────────────────────────────────────────────────────
export const ordersAPI = {
  getAll: (params) => api.get('/orders', { params }),
  getOne: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
};

// ─── Analytics ───────────────────────────────────────────────────────────────
export const analyticsAPI = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getSales: (params) => api.get('/analytics/sales', { params }),
  getInventoryDistribution: () => api.get('/analytics/inventory-distribution'),
  getInventoryTrends: (params) => api.get('/analytics/inventory-trends', { params }),
  getTopProducts: (params) => api.get('/analytics/top-products', { params }),
  getStockStatus: () => api.get('/analytics/stock-status'),
  getByStore: () => api.get('/analytics/by-store'),
  getByRegion: () => api.get('/analytics/by-region'),
  getSeasonal: () => api.get('/analytics/seasonal'),
  getDemandVsActual: (params) => api.get('/analytics/demand-vs-actual', { params }),
};

// ─── Notifications ───────────────────────────────────────────────────────────
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// ─── Predictions ─────────────────────────────────────────────────────────────
export const predictionsAPI = {
  getAll: () => api.get('/predictions'),
  getForProduct: (productId) => api.get(`/predictions/${productId}`),
  generate: (productId, data) => api.post(`/predictions/generate/${productId}`, data),
};

// ─── Users ───────────────────────────────────────────────────────────────────
export const usersAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// ─── Upload ──────────────────────────────────────────────────────────────────
export const uploadAPI = {
  bulkUpload: (formData) => api.post('/upload/bulk', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadImage: (formData) => api.post('/upload/image', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  downloadTemplate: () => api.get('/upload/template', { responseType: 'blob' }),
};

// ─── Reports ─────────────────────────────────────────────────────────────────
export const reportsAPI = {
  inventoryPDF: () => api.get('/reports/inventory/pdf', { responseType: 'blob' }),
  inventoryExcel: () => api.get('/reports/inventory/excel', { responseType: 'blob' }),
  salesPDF: (params) => api.get('/reports/sales/pdf', { params, responseType: 'blob' }),
};

// ─── Retail Records ──────────────────────────────────────────────────────────
export const retailAPI = {
  getRecords: (params) => api.get('/retail/records', { params }),
  getStores: () => api.get('/retail/stores'),
  getRegions: () => api.get('/retail/regions'),
  getProductHistory: (productId, params) => api.get(`/retail/product-history/${productId}`, { params }),
};

export default api;
