import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '../lib/utils'
import { Search, AlertTriangle, History, Plus, Package, Truck } from 'lucide-react'

export default function Inventory() {
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [adjustProduct, setAdjustProduct] = useState(null)
  const [showAdjust, setShowAdjust] = useState(false)
  const [showPurchase, setShowPurchase] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [historyData, setHistoryData] = useState([])
  const [adjustForm, setAdjustForm] = useState({ new_qty: 0, reason_type: 'Physical Count', reason: '' })
  const [purchaseForm, setPurchaseForm] = useState({ supplier_id: '', invoice_no: '', items: [{ product_id: '', quantity: 1, buying_price: 0 }] })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [prods, supps] = await Promise.all([
      window.api.getProducts({}),
      window.api.getSuppliers()
    ])
    setProducts(prods)
    setSuppliers(supps)
  }

  const filteredProducts = products.filter(p => {
    if (showLowStock && p.stock > p.min_stock_level) return false
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !p.barcode?.includes(searchQuery)) return false
    return true
  })

  const handleAdjust = async () => {
    if (!adjustProduct) return
    await window.api.adjustStock({
      product_id: adjustProduct.id,
      new_qty: Number(adjustForm.new_qty),
      reason_type: adjustForm.reason_type,
      reason: adjustForm.reason
    })
    setShowAdjust(false)
    loadData()
  }

  const viewHistory = async (product) => {
    const data = await window.api.getStockHistory(product.id)
    setHistoryData(data)
    setShowHistory(true)
  }

  const handlePurchase = async () => {
    await window.api.createPurchase({
      supplier_id: Number(purchaseForm.supplier_id),
      invoice_no: purchaseForm.invoice_no,
      items: purchaseForm.items
    })
    setShowPurchase(false)
    loadData()
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
          <p className="text-sm text-gray-500">Manage stock levels and receive purchases</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowPurchase(true)} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all cursor-pointer">
            <Truck size={18} /> Receive Stock
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
        </div>
        <label className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm cursor-pointer">
          <input type="checkbox" checked={showLowStock} onChange={() => setShowLowStock(!showLowStock)}
            className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />
          <span className="text-gray-700 dark:text-gray-300">Low stock only</span>
          {products.filter(p => p.stock <= p.min_stock_level).length > 0 && (
            <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-xs">
              {products.filter(p => p.stock <= p.min_stock_level).length}
            </span>
          )}
        </label>
      </div>

      {/* Stock Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800">
              <th className="p-3">Product</th>
              <th className="p-3">Category</th>
              <th className="p-3">Current Stock</th>
              <th className="p-3">Min Level</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map(p => {
              const isLow = p.stock <= p.min_stock_level
              const isOut = p.stock === 0
              return (
                <tr key={p.id} className={`border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all ${isLow ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</span>
                      <span className="text-xs text-gray-500">{p.size && `(${p.size})`}</span>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{p.category_name || '-'}</td>
                  <td className="p-3">
                    <span className={`text-sm font-bold ${isOut ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-gray-900 dark:text-white'}`}>{p.stock}</span>
                  </td>
                  <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{p.min_stock_level}</td>
                  <td className="p-3">
                    {isOut ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Out of Stock</span>
                    ) : isLow ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Low Stock</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">In Stock</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setAdjustProduct(p); setAdjustForm({ new_qty: p.stock, reason_type: 'Physical Count', reason: '' }); setShowAdjust(true) }}
                        className="px-2 py-1 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer">Adjust</button>
                      <button onClick={() => viewHistory(p)}
                        className="px-2 py-1 text-xs bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"><History size={14} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filteredProducts.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No products found</p>}
      </div>

      {/* Stock Adjustment Modal */}
      {showAdjust && adjustProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowAdjust(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Stock Adjustment</h3>
            <p className="text-sm text-gray-500 mb-4">{adjustProduct.name}</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Current Stock: {adjustProduct.stock}</label>
                <input type="number" value={adjustForm.new_qty} onChange={(e) => setAdjustForm({ ...adjustForm, new_qty: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reason Type</label>
                <select value={adjustForm.reason_type} onChange={(e) => setAdjustForm({ ...adjustForm, reason_type: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none">
                  <option value="Physical Count">Physical Count</option>
                  <option value="Damaged">Damaged</option>
                  <option value="Lost">Lost</option>
                  <option value="Return to Supplier">Return to Supplier</option>
                  <option value="Restock">Restock</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (optional)</label>
                <textarea value={adjustForm.reason} onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none" rows={2} />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowAdjust(false)} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">Cancel</button>
              <button onClick={handleAdjust} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold cursor-pointer">Update Stock</button>
            </div>
          </div>
        </div>
      )}

      {/* Stock History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowHistory(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Stock Adjustment History</h3>
            {historyData.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No history found</p>
            ) : (
              <div className="space-y-2">
                {historyData.map(h => (
                  <div key={h.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${h.quantity_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {h.quantity_change >= 0 ? '+' : ''}{h.quantity_change}
                      </span>
                      <span className="text-xs text-gray-500">{formatDate(h.created_at)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{h.reason_type}{h.reason ? ` - ${h.reason}` : ''}</p>
                    <p className="text-xs text-gray-400">Old: {h.old_qty} → New: {h.new_qty}</p>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setShowHistory(false)} className="w-full py-2 mt-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">Close</button>
          </div>
        </div>
      )}

      {/* Purchase/Receive Stock Modal */}
      {showPurchase && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowPurchase(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Receive Stock from Supplier</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier</label>
                <select value={purchaseForm.supplier_id} onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none">
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Invoice No</label>
                <input type="text" value={purchaseForm.invoice_no} onChange={(e) => setPurchaseForm({ ...purchaseForm, invoice_no: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Items</label>
                {purchaseForm.items.map((item, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <select value={item.product_id} onChange={(e) => {
                      const items = [...purchaseForm.items]
                      items[i].product_id = Number(e.target.value)
                      setPurchaseForm({ ...purchaseForm, items })
                    }}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none">
                      <option value="">Select Product</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => {
                      const items = [...purchaseForm.items]
                      items[i].quantity = Number(e.target.value)
                      setPurchaseForm({ ...purchaseForm, items })
                    }}
                      className="w-16 px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none" />
                    <input type="number" placeholder="Price" value={item.buying_price} onChange={(e) => {
                      const items = [...purchaseForm.items]
                      items[i].buying_price = Number(e.target.value)
                      setPurchaseForm({ ...purchaseForm, items })
                    }}
                      className="w-24 px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none" />
                    {purchaseForm.items.length > 1 && (
                      <button onClick={() => setPurchaseForm({ ...purchaseForm, items: purchaseForm.items.filter((_, j) => j !== i) })}
                        className="text-red-500 hover:text-red-700 p-2 cursor-pointer">✕</button>
                    )}
                  </div>
                ))}
                <button onClick={() => setPurchaseForm({ ...purchaseForm, items: [...purchaseForm.items, { product_id: '', quantity: 1, buying_price: 0 }] })}
                  className="text-sm text-indigo-600 hover:text-indigo-700 cursor-pointer">+ Add Item</button>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowPurchase(false)} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">Cancel</button>
              <button onClick={handlePurchase} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold cursor-pointer">Receive Stock</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
