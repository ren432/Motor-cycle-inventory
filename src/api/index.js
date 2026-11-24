import { request } from './client.js';
import { mockApi } from './mockDb.js';

export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

// The REST contract the Node.js backend must implement (also reusable from Flutter later).
const realApi = {
  listProducts: () => request('/products'),
  createProduct: (data) => request('/products', { method: 'POST', body: data }),
  updateProduct: (id, data) => request(`/products/${id}`, { method: 'PUT', body: data }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  listSales: () => request('/sales'),
  createSale: (data) => request('/sales', { method: 'POST', body: data }),
};

export const api = USE_MOCK ? mockApi : realApi;