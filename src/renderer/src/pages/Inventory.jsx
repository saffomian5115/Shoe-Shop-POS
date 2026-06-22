import { useEffect, useState, Fragment } from 'react'
import { formatCurrency, formatDate } from '../lib/utils'
import { useAuthStore } from '../store/authStore'
import { Search, AlertTriangle, History, Plus, Package, Truck, ChevronDown, ChevronRight, Building2, Phone, MapPin, UserPlus } from 'lucide-react'

export default function Inventory() {
  const { user } = useAuthStore()
  const isCashier = user?.role === 'cashier'
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [adjustProduct, setAdjustProduct] = useState(null)
  const [showAdjust, setShowAdjust] = useState(false)
  const [showPurchase, setShowPurchase] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showSuppliers, setShowSuppliers] = useState(false)
  const [showAddSupplier, setShowAddSupplier] = useState(false)
  const [supplierForm, setSupplierForm] = useState({ name: '', phone: '', address: '' })
  const [historyData, setHistoryData] = useState([])
  const [adjustForm, setAdjustForm] = useState({ new_qty: 0, reason_type: 'Physical Count', reason: '' })
  const [purchaseForm, setPurchaseForm] = useState({ supplier_id: '', invoice_no: '', items: [{ product_id: '', quantity: 1, buying_price: 0 }] })
  const [expandedGroups, setExpandedGroups] = useState(new Set())
  const [savingSupplier, setSavingSupplier] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [prods, supps] = await Promise.all([
      window.api.getProducts({}),
      window.api.getSuppliers()
    ])
    setProducts(prods)
    setSuppliers(supps)
  }

  // Build grouped inventory
  const buildGroupedInventory = () => {
    const groups = new Map() // parent_sku -> { name, variants: [] }
    const singles = []

    for (const p of products) {
      if (p.parent_sku && p.size) {
        if (!groups.has(p.parent_sku)) {
          groups.set(p.parent_sku, { name: p.name, parentSku: p.parent_sku, variants: [] })
        }
        groups.get(p.parent_sku).variants.push(p)
      } else if (!p.parent_sku) {
        singles.push(p)
      }
    }

    // Filter
    const filteredSingles = singles.filter(p => {
      if (showLowStock && p.stock > p.min_stock_level) return false
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !p.barcode?.includes(searchQuery)) return false
      return true
    })

    const filteredGroups = []
    for (const [sku, group] of groups) {
      const matchedVariants = group.variants.filter(v => {
        if (showLowStock && v.stock > v.min_stock_level) return false
        if (searchQuery && !v.name.toLowerCase().includes(searchQuery.toLowerCase()) && !v.barcode?.includes(searchQuery)) return false
        return true
      })
      if (matchedVariants.length > 0) {
        filteredGroups.push({ ...group, variants: matchedVariants })
      }
    }

    return { singles: filteredSingles, groups: filteredGroups }
  }

  const toggleGroup = (sku) => {
    const next = new Set(expandedGroups)
    if (next.has(sku)) next.delete(sku)
    else next.add(sku)
    setExpandedGroups(next)
  }

  const { singles, groups } = buildGroupedInventory()
  const totalItems = singles.length + groups.length

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

  const handleAddSupplier = async () => {
    if (!supplierForm.name.trim() || savingSupplier) return
    setSavingSupplier(true)
    try {
      const result = await window.api.createSupplier({
        name: supplierForm.name.trim(),
        phone: supplierForm.phone.trim(),
        address: supplierForm.address.trim()
      })
      if (result.success) {
        setShowAddSupplier(false)
        setSupplierForm({ name: '', phone: '', address: '' })
        const supps = await window.api.getSuppliers()
        setSuppliers(supps)
      } else {
        alert(`Failed to add supplier: ${result.error}`)
      }
    } catch (e) {
      alert(`Failed to add supplier: ${e.message}`)
    }
    setSavingSupplier(false)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h1>
          <p className="text-sm text-gray-500">Manage stock levels and receive purchases</p>
        </div>
        <div className="flex gap-2">
          {!isCashier && (
            <button onClick={() => setShowPurchase(true)} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all cursor-pointer">
              <Truck size={18} /> Receive Stock
            </button>
          )}
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

      {/* Supplier Management Section */}
      {!isCashier && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <button
            onClick={() => setShowSuppliers(!showSuppliers)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                <Building2 size={18} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Supplier Management</h3>
                <p className="text-xs text-gray-500">{suppliers.length} registered supplier{suppliers.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); setShowAddSupplier(true) }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-lg font-medium transition-all cursor-pointer"
              >
                <UserPlus size={14} /> Add Supplier
              </button>
              {showSuppliers ? <ChevronDown size={18} className="text-gray-400" /> : <ChevronRight size={18} className="text-gray-400" />}
            </div>
          </button>

          {showSuppliers && (
            <div className="border-t border-gray-200 dark:border-gray-800">
              {suppliers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">No suppliers yet. Click "Add Supplier" to register one.</p>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {suppliers.map(s => (
                    <div key={s.id} className="flex items-center gap-4 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                        <Building2 size={14} className="text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.name}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          {s.phone && (
                            <span className="flex items-center gap-1">
                              <Phone size={11} /> {s.phone}
                            </span>
                          )}
                          {s.address && (
                            <span className="flex items-center gap-1 truncate">
                              <MapPin size={11} /> {s.address}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400">ID: {s.id}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
            {/* Single products (non-variant) */}
            {singles.map(p => {
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
                      {!isCashier && (
                        <button onClick={() => { setAdjustProduct(p); setAdjustForm({ new_qty: p.stock, reason_type: 'Physical Count', reason: '' }); setShowAdjust(true) }}
                          className="px-2 py-1 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer">Adjust</button>
                      )}
                      <button onClick={() => viewHistory(p)}
                        className="px-2 py-1 text-xs bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"><History size={14} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}

            {/* Variant groups */}
            {groups.map(group => {
              const totalStock = group.variants.reduce((s, v) => s + v.stock, 0)
              const isExpanded = expandedGroups.has(group.parentSku)
              const minStock = Math.min(...group.variants.map(v => v.min_stock_level))
              const groupLow = totalStock <= minStock
              const colors = [...new Set(group.variants.map(v => v.color).filter(Boolean))]
              const sizes = [...new Set(group.variants.map(v => v.size).filter(Boolean))]
              return (
                <Fragment key={'group-' + group.parentSku}>
                  <tr
                    onClick={() => toggleGroup(group.parentSku)}
                    className={`border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-all ${groupLow ? 'bg-orange-50 dark:bg-orange-900/10' : 'bg-indigo-50/50 dark:bg-indigo-900/10'}`}
                  >
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {isExpanded ? <ChevronDown size={16} className="text-indigo-500" /> : <ChevronRight size={16} className="text-indigo-500" />}
                        <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">{group.name}</span>
                        <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded text-xs">
                          {colors.length} colors × {sizes.length} sizes
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-sm text-gray-500">—</td>
                    <td className="p-3">
                      <span className={`text-sm font-bold ${groupLow ? 'text-orange-600' : 'text-gray-900 dark:text-white'}`}>{totalStock}</span>
                      <span className="text-xs text-gray-400 ml-1">total</span>
                    </td>
                    <td className="p-3 text-sm text-gray-400">—</td>
                    <td className="p-3">
                      {groupLow ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">Low Stock</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">In Stock</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-gray-400 italic">Click to expand</td>
                  </tr>
                  {/* Expanded variant rows */}
                  {isExpanded && group.variants.map(v => {
                    const isLow = v.stock <= v.min_stock_level
                    const isOut = v.stock === 0
                    return (
                      <tr key={v.id} className={`border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all ${isLow ? 'bg-red-50/50 dark:bg-red-900/5' : ''}`}>
                        <td className="p-3 pl-10">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">↳</span>
                            <span className="text-sm text-gray-900 dark:text-white">{v.color}, Size {v.size}</span>
                            <span className="text-xs text-gray-400 font-mono">{v.barcode}</span>
                          </div>
                        </td>
                        <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{v.category_name || '-'}</td>
                        <td className="p-3">
                          <span className={`text-sm font-bold ${isOut ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-gray-900 dark:text-white'}`}>{v.stock}</span>
                        </td>
                        <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{v.min_stock_level}</td>
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
                            {!isCashier && (
                              <button onClick={(e) => { e.stopPropagation(); setAdjustProduct(v); setAdjustForm({ new_qty: v.stock, reason_type: 'Physical Count', reason: '' }); setShowAdjust(true) }}
                                className="px-2 py-1 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer">Adjust</button>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); viewHistory(v) }}
                              className="px-2 py-1 text-xs bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"><History size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </Fragment>
              )
            })}
          </tbody>
        </table>
        {totalItems === 0 && <p className="text-center text-sm text-gray-400 py-8">No products found</p>}
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

      {/* Add Supplier Modal */}
      {showAddSupplier && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => { setShowAddSupplier(false); setSupplierForm({ name: '', phone: '', address: '' }) }}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                <Building2 size={20} className="text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add New Supplier</h3>
                <p className="text-xs text-gray-500">Register a new supplier in the system</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Supplier Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={supplierForm.name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    placeholder="e.g. Al-Fajar Shoes Distributor"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Full name or company name of the supplier</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="text" value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    placeholder="e.g. 0300-1234567"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Address</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-3 text-gray-400" />
                  <textarea value={supplierForm.address}
                    onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                    placeholder="e.g. Shop #5, Shah Alam Market, Lahore"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" rows={2} />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setShowAddSupplier(false); setSupplierForm({ name: '', phone: '', address: '' }) }}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">Cancel</button>
              <button onClick={handleAddSupplier} disabled={!supplierForm.name.trim() || savingSupplier}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-semibold cursor-pointer">{savingSupplier ? 'Adding...' : 'Add Supplier'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase/Receive Stock Modal */}
      {showPurchase && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowPurchase(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <Truck size={20} className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Receive Stock from Supplier</h3>
                <p className="text-xs text-gray-500">Record a new purchase order and update inventory</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Supplier Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <select value={purchaseForm.supplier_id} onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier_id: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none appearance-none">
                    <option value="">— Select a supplier —</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Choose the supplier you are receiving stock from</p>
              </div>

              {/* Invoice Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Invoice / Reference Number</label>
                <input type="text" value={purchaseForm.invoice_no} onChange={(e) => setPurchaseForm({ ...purchaseForm, invoice_no: e.target.value })}
                  placeholder="e.g. INV-2024-001"
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
                <p className="text-[10px] text-gray-400 mt-1">Supplier's invoice number for tracking purposes</p>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Received Items <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-gray-400">{purchaseForm.items.length} item{purchaseForm.items.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="space-y-2.5">
                  {purchaseForm.items.map((item, i) => (
                    <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">Item #{i + 1}</span>
                        {purchaseForm.items.length > 1 && (
                          <button onClick={() => setPurchaseForm({ ...purchaseForm, items: purchaseForm.items.filter((_, j) => j !== i) })}
                            className="text-red-400 hover:text-red-600 text-xs cursor-pointer">✕ Remove</button>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <select value={item.product_id} onChange={(e) => {
                          const items = [...purchaseForm.items]
                          items[i].product_id = Number(e.target.value)
                          setPurchaseForm({ ...purchaseForm, items })
                        }}
                          className="flex-1 px-3 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none">
                          <option value="">— Select product —</option>
                          {products.map(p => {
                            const hasVariant = p.size || p.color
                            const variantLabel = hasVariant
                              ? `${p.name} — ${[p.color, p.size ? `Size ${p.size}` : ''].filter(Boolean).join(', ')} (${p.barcode || 'no barcode'})`
                              : `${p.name}${p.barcode ? ` (${p.barcode})` : ''}`
                            return <option key={p.id} value={p.id}>{variantLabel}</option>
                          })}
                        </select>
                        <div className="flex gap-1.5">
                          <div className="relative">
                            <input type="number" min="1" placeholder="Qty" value={item.quantity} onChange={(e) => {
                              const items = [...purchaseForm.items]
                              items[i].quantity = Number(e.target.value)
                              setPurchaseForm({ ...purchaseForm, items })
                            }}
                              className="w-16 px-2 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none text-center" />
                          </div>
                          <div className="relative">
                            <input type="number" min="0" step="0.01" placeholder="Price" value={item.buying_price} onChange={(e) => {
                              const items = [...purchaseForm.items]
                              items[i].buying_price = Number(e.target.value)
                              setPurchaseForm({ ...purchaseForm, items })
                            }}
                              className="w-24 px-2 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none" />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-1.5 text-[10px] text-gray-400">
                        <span>Qty: {item.quantity || 0}</span>
                        <span>Price: Rs. {Number(item.buying_price || 0).toLocaleString()}</span>
                        <span className="font-medium text-gray-500">Total: Rs. {((item.quantity || 0) * (item.buying_price || 0)).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={() => setPurchaseForm({ ...purchaseForm, items: [...purchaseForm.items, { product_id: '', quantity: 1, buying_price: 0 }] })}
                  className="mt-2 flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium cursor-pointer">
                  <Plus size={14} /> Add Another Item
                </button>
              </div>
            </div>

            <div className="flex gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={() => setShowPurchase(false)}
                className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">Cancel</button>
              <button onClick={handlePurchase} disabled={!purchaseForm.supplier_id || purchaseForm.items.every(it => !it.product_id)}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-semibold cursor-pointer flex items-center justify-center gap-2">
                <Truck size={16} /> Receive Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
