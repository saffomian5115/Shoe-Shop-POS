import { useEffect, useState } from 'react'
import { formatCurrency, generateBarcode } from '../lib/utils'
import { Plus, Search, Edit2, Image, Grid3X3, List,QrCode } from 'lucide-react'

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('table')
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [filter, setFilter] = useState({ category_id: '', gender: '', status: 'all' })

  const [form, setForm] = useState({
    name: '', category_id: '', brand_id: '', gender: 'Men', size: '', color: '',
    buying_price: '', selling_price: '', stock: '', min_stock_level: 5, barcode: ''
  })

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const [prods, cats, brds] = await Promise.all([
      window.api.getProducts({}),
      window.api.getCategories(),
      window.api.getBrands()
    ])
    setProducts(prods)
    setCategories(cats)
    setBrands(brds)
  }

  const handleSearch = async (q) => {
    setSearchQuery(q)
    const prods = await window.api.getProducts({ search: q, ...filter })
    setProducts(prods)
  }

  const handleFilter = async (key, value) => {
    const updatedFilter = { ...filter, [key]: value }
    setFilter(updatedFilter)
    const prods = await window.api.getProducts({ search: searchQuery, ...updatedFilter })
    setProducts(prods)
  }

  const openNewForm = () => {
    setEditingProduct(null)
    setForm({ name: '', category_id: '', brand_id: '', gender: 'Men', size: '', color: '', buying_price: '', selling_price: '', stock: '', min_stock_level: 5, barcode: generateBarcode() })
    setShowForm(true)
  }

  const openEditForm = (product) => {
    setEditingProduct(product)
    setForm({
      name: product.name, category_id: product.category_id || '', brand_id: product.brand_id || '',
      gender: product.gender || 'Men', size: product.size || '', color: product.color || '',
      buying_price: product.buying_price, selling_price: product.selling_price,
      stock: product.stock, min_stock_level: product.min_stock_level, barcode: product.barcode || ''
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.selling_price) return
    const data = { ...form, buying_price: Number(form.buying_price), selling_price: Number(form.selling_price), stock: Number(form.stock), min_stock_level: Number(form.min_stock_level) }

    let result
    if (editingProduct) {
      result = await window.api.updateProduct({ ...data, id: editingProduct.id, active: editingProduct.active })
    } else {
      result = await window.api.createProduct(data)
    }
    if (result.success) {
      setShowForm(false)
      loadData()
    }
  }

  const toggleActive = async (id) => {
    await window.api.toggleProductActive(id)
    loadData()
  }

  const filteredProducts = products.filter(p => {
    if (filter.status === 'active' && !p.active) return false
    if (filter.status === 'inactive' && p.active) return false
    return true
  })

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
          <p className="text-sm text-gray-500">Manage your shoe inventory</p>
        </div>
        <button onClick={openNewForm} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all cursor-pointer">
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input type="text" value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name or barcode..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
        </div>
        <select value={filter.category_id} onChange={(e) => handleFilter('category_id', e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm outline-none">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filter.gender} onChange={(e) => handleFilter('gender', e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm outline-none">
          <option value="">All Genders</option>
          <option value="Men">Men</option>
          <option value="Women">Women</option>
          <option value="Kids">Kids</option>
          <option value="Unisex">Unisex</option>
        </select>
        <select value={filter.status} onChange={(e) => handleFilter('status', e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm outline-none">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <div className="flex bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
          <button onClick={() => setViewMode('table')} className={`p-2 cursor-pointer ${viewMode === 'table' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-gray-500'}`}><List size={18} /></button>
          <button onClick={() => setViewMode('grid')} className={`p-2 cursor-pointer ${viewMode === 'grid' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-gray-500'}`}><Grid3X3 size={18} /></button>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800">
                <th className="p-3">Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Price</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Barcode</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(p => (
                <tr key={p.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center text-sm">👟</div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{p.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{p.category_name || '-'}</td>
                  <td className="p-3 text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(p.selling_price)}</td>
                  <td className="p-3">
                    <span className={`text-sm font-medium ${p.stock <= p.min_stock_level ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>{p.stock}</span>
                    {p.stock <= p.min_stock_level && <span className="ml-1 text-xs text-red-500">(Low)</span>}
                  </td>
                  <td className="p-3 text-sm text-gray-500 font-mono">{p.barcode || '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.active ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>{p.active ? 'Active' : 'Inactive'}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button onClick={() => openEditForm(p)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-indigo-600 cursor-pointer"><Edit2 size={16} /></button>
                      <button onClick={() => toggleActive(p.id)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-red-600 cursor-pointer">{p.active ? '🟢' : '🔴'}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No products found</p>}
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredProducts.map(p => (
            <div key={p.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 hover:shadow-md transition-all">
              <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-4xl mb-3">👟</div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{p.name}</h3>
              <p className="text-xs text-gray-500">{p.category_name} {p.size && `- ${p.size}`}</p>
              <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-2">{formatCurrency(p.selling_price)}</p>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs ${p.stock <= p.min_stock_level ? 'text-red-500' : 'text-gray-500'}`}>Stock: {p.stock}</span>
                <button onClick={() => openEditForm(p)} className="text-xs text-indigo-600 hover:text-indigo-700 cursor-pointer">Edit</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{editingProduct ? 'Edit Product' : 'Add Product'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Product Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none">
                  <option value="">Select</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Brand</label>
                <select value={form.brand_id} onChange={(e) => setForm({ ...form, brand_id: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none">
                  <option value="">Select</option>
                  {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none">
                  <option value="Men">Men</option>
                  <option value="Women">Women</option>
                  <option value="Kids">Kids</option>
                  <option value="Unisex">Unisex</option>
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Size</label>
                  <input type="text" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none" placeholder="e.g. 42" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
                  <input type="text" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none" placeholder="e.g. Black" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Buying Price (PKR)</label>
                <input type="number" value={form.buying_price} onChange={(e) => setForm({ ...form, buying_price: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Selling Price *</label>
                <input type="number" value={form.selling_price} onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Stock</label>
                <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Min Stock Level</label>
                <input type="number" value={form.min_stock_level} onChange={(e) => setForm({ ...form, min_stock_level: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Barcode</label>
                <div className="flex gap-2">
                  <input type="text" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono outline-none" />
                  <button onClick={() => setForm({ ...form, barcode: generateBarcode() })} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">Generate</button>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer">Cancel</button>
              <button onClick={handleSave} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all cursor-pointer">
                {editingProduct ? 'Update' : 'Create'} Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
