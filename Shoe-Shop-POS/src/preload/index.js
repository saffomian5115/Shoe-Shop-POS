import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Auth
  login: (username, password) => ipcRenderer.invoke('auth:login', { username, password }),

  // Users
  getUsers: () => ipcRenderer.invoke('users:list'),
  createUser: (data) => ipcRenderer.invoke('users:create', data),
  updateUser: (data) => ipcRenderer.invoke('users:update', data),
  deleteUser: (id) => ipcRenderer.invoke('users:delete', id),
  resetAdmin: () => ipcRenderer.invoke('users:reset-admin'),

  // Categories
  getCategories: () => ipcRenderer.invoke('categories:list'),
  createCategory: (data) => ipcRenderer.invoke('categories:create', data),
  deleteCategory: (id) => ipcRenderer.invoke('categories:delete', id),

  // Brands
  getBrands: () => ipcRenderer.invoke('brands:list'),
  createBrand: (data) => ipcRenderer.invoke('brands:create', data),

  // Products
  getProducts: (filters) => ipcRenderer.invoke('products:list', filters),
  getProduct: (id) => ipcRenderer.invoke('products:get', id),
  createProduct: (data) => ipcRenderer.invoke('products:create', data),
  updateProduct: (data) => ipcRenderer.invoke('products:update', data),
  toggleProductActive: (id) => ipcRenderer.invoke('products:toggle-active', id),
  deleteProduct: (data) => ipcRenderer.invoke('products:delete', data),
  getProductByBarcode: (barcode) => ipcRenderer.invoke('products:get-by-barcode', barcode),
  uploadProductImage: () => ipcRenderer.invoke('products:upload-image'),
  createWithVariants: (data) => ipcRenderer.invoke('products:create-with-variants', data),
  getVariantGroup: (parentSku) => ipcRenderer.invoke('products:get-variant-group', parentSku),

  // Sales
  createSale: (data) => ipcRenderer.invoke('sales:create', data),
  getSales: (filters) => ipcRenderer.invoke('sales:list', filters),
  getSale: (id) => ipcRenderer.invoke('sales:get', id),
  voidSale: (data) => ipcRenderer.invoke('sales:void', data),
  holdSale: (data) => ipcRenderer.invoke('sales:hold', data),
  getHeldBills: () => ipcRenderer.invoke('sales:held'),
  deleteHeldBill: (id) => ipcRenderer.invoke('sales:delete-held', id),

  // Dashboard
  getDashboardStats: (filters) => ipcRenderer.invoke('dashboard:stats', filters),
  getSalesTrend: (days) => ipcRenderer.invoke('dashboard:sales-trend', days),
  getTopProducts: (filters) => ipcRenderer.invoke('dashboard:top-products', filters),
  getCategoryBreakdown: (filters) => ipcRenderer.invoke('dashboard:category-breakdown', filters),

  // Stock
  adjustStock: (data) => ipcRenderer.invoke('stock:adjust', data),
  getStockHistory: (productId) => ipcRenderer.invoke('stock:history', productId),

  // Purchases
  createPurchase: (data) => ipcRenderer.invoke('purchases:create', data),
  getPurchases: () => ipcRenderer.invoke('purchases:list'),

  // Suppliers
  getSuppliers: () => ipcRenderer.invoke('suppliers:list'),
  createSupplier: (data) => ipcRenderer.invoke('suppliers:create', data),

  // Settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (data) => ipcRenderer.invoke('settings:set', data),
  getAllSettings: () => ipcRenderer.invoke('settings:get-all'),

  // Shop Info
  getShopInfo: () => ipcRenderer.invoke('shop:get'),
  updateShopInfo: (data) => ipcRenderer.invoke('shop:update', data),

  // Reports
  getSalesReport: (filters) => ipcRenderer.invoke('reports:sales', filters),
  getProfitReport: (filters) => ipcRenderer.invoke('reports:profit', filters),

  // Backup
  backupLocal: () => ipcRenderer.invoke('backup:local'),
  getLastBackupTime: () => ipcRenderer.invoke('backup:get-last-time'),

  // Printer
  listPrinters: () => ipcRenderer.invoke('printer:list'),
  testPrinter: (printerName) => ipcRenderer.invoke('printer:test', printerName),
  printReceipt: (data) => ipcRenderer.invoke('print:receipt', data),
  printBarcodeLabel: (data) => ipcRenderer.invoke('print:barcode-label', data),

  // Barcode
  generateBarcode: (text) => ipcRenderer.invoke('barcode:generate', text),

  // Excel
  exportProducts: () => ipcRenderer.invoke('excel:export-products'),
  importProducts: () => ipcRenderer.invoke('excel:import-products')
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
