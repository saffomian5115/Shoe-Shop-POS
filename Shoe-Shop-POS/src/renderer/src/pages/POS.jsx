import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '../store/cartStore'
import { useAuthStore } from '../store/authStore'
import { formatCurrency } from '../lib/utils'
import {
  Search, Plus, Minus, Trash2, Printer,
  DollarSign, CreditCard, Save, X, ShoppingCart
} from 'lucide-react'

export default function POS() {
  const { user } = useAuthStore()
  const cart = useCartStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [showPayment, setShowPayment] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [lastSale, setLastSale] = useState(null)
  const [heldBills, setHeldBills] = useState([])
  const [showHeldBills, setShowHeldBills] = useState(false)
  const [barcodeBuffer, setBarcodeBuffer] = useState('')
  const [printing, setPrinting] = useState(false)
  const [printStatus, setPrintStatus] = useState('')
  const [variantPicker, setVariantPicker] = useState(null)
  const searchRef = useRef(null)
  const barcodeTimer = useRef(null)
  const { subtotal, discountAmount, total } = cart.getTotals()

  // Handle barcode scanner input
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault()
        searchRef.current?.focus()
        return
      }
      if (e.key === 'F1') {
        e.preventDefault()
        handleNewSale()
        return
      }
      if (e.key === 'F12') {
        e.preventDefault()
        handleHoldBill()
        return
      }

      if (e.key === 'Enter' && barcodeBuffer.length > 0) {
        e.preventDefault()
        lookupBarcode(barcodeBuffer)
        setBarcodeBuffer('')
        return
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && e.key !== ' ') {
        setBarcodeBuffer(prev => prev + e.key)
        clearTimeout(barcodeTimer.current)
        barcodeTimer.current = setTimeout(() => setBarcodeBuffer(''), 100)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [barcodeBuffer])

  useEffect(() => {
    loadHeldBills()
  }, [])

  const loadHeldBills = async () => {
    try {
      const bills = await window.api.getHeldBills()
      setHeldBills(bills)
    } catch (e) { console.error(e) }
  }

  const lookupBarcode = async (barcode) => {
    try {
      const product = await window.api.getProductByBarcode(barcode.trim())
      if (product && product.active) {
        cart.addItem(product)
        setSearchQuery('')
        setSearchResults([])
      }
    } catch (e) { console.error(e) }
  }

  const handleSearch = useCallback(async (query) => {
    setSearchQuery(query)
    if (query.length < 1) {
      setSearchResults([])
      return
    }
    try {
      const products = await window.api.getProducts({ search: query, active: true })
      setSearchResults(products)
    } catch (e) { console.error(e) }
  }, [])

  const handleNewSale = () => {
    cart.clearCart()
    setShowPayment(false)
    setShowReceipt(false)
    setLastSale(null)
  }

  const handleHoldBill = async () => {
    if (cart.items.length === 0) return
    try {
      await window.api.holdSale({
        sale: {
          customer_name: cart.customerName,
          customer_phone: cart.customerPhone,
          total_amount: subtotal,
          discount_type: cart.discountType,
          discount_value: cart.discountValue,
          discount_amount: discountAmount,
          net_amount: total,
          payment_type: cart.paymentType,
          user_id: user?.id
        },
        items: cart.items
      })
      cart.clearCart()
      loadHeldBills()
    } catch (e) { console.error(e) }
  }

  const handlePayment = async () => {
    try {
      const result = await window.api.createSale({
        sale: {
          customer_name: cart.customerName,
          customer_phone: cart.customerPhone,
          customer_ntn: cart.customerNtn,
          total_amount: subtotal,
          discount_type: cart.discountType,
          discount_value: cart.discountValue,
          discount_amount: discountAmount,
          net_amount: total,
          payment_type: cart.paymentType,
          cash_amount: cart.paymentType === 'cash' ? total : (cart.paymentType === 'mixed' ? total / 2 : 0),
          card_amount: cart.paymentType === 'card' ? total : (cart.paymentType === 'mixed' ? total / 2 : 0),
          user_id: user?.id
        },
        items: cart.items
      })
      if (result.success) {
        setLastSale({ ...result, items: cart.items, total })
        setShowPayment(false)
        setShowReceipt(true)
      }
    } catch (e) { console.error(e) }
  }

  const handlePrintReceipt = async () => {
    if (!lastSale) return
    setPrinting(true)
    setPrintStatus('')
    try {
      const printerName = await window.api.getSetting('printer_name')
      if (!printerName) {
        setPrintStatus('❌ No printer configured. Go to Settings → Printer to set up.')
        setPrinting(false)
        return
      }
      const result = await window.api.printReceipt({
        saleId: lastSale.id,
        printerName
      })
      if (result.success) {
        setPrintStatus('✅ Receipt sent to printer!')
      } else {
        setPrintStatus(`❌ ${result.error}`)
      }
    } catch (e) {
      setPrintStatus(`❌ ${e.message}`)
    }
    setPrinting(false)
    setTimeout(() => setPrintStatus(''), 5000)
  }

  const handleReturnHeldBill = async (bill) => {
    try {
      const fullBill = await window.api.getSale(bill.id)
      if (fullBill?.items) {
        cart.clearCart()
        fullBill.items.forEach(item => {
          cart.addItem({ id: item.product_id, name: item.product_name, selling_price: item.unit_price })
          // Set quantities
          cart.updateItem(item.product_id, { quantity: item.quantity })
        })
        cart.setCustomer({ customerName: fullBill.customer_name || '', customerPhone: fullBill.customer_phone || '' })
        await window.api.deleteHeldBill(bill.id)
        loadHeldBills()
        setShowHeldBills(false)
      }
    } catch (e) { console.error(e) }
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main POS Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search products by name or scan barcode... (F2)"
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
            {searchQuery && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto">
                {(() => {
                  // Group results: products with parent_sku are variants, group them
                  const groups = new Map() // parent_sku -> { name, variants: [] }
                  const singles = []
                  for (const p of searchResults) {
                    if (p.parent_sku && p.size) {
                      // This is a variant → add to group
                      if (!groups.has(p.parent_sku)) {
                        groups.set(p.parent_sku, { name: p.name, parentSku: p.parent_sku, variants: [] })
                      }
                      groups.get(p.parent_sku).variants.push(p)
                    } else if (!p.parent_sku) {
                      // Normal product (no parent_sku) → show directly
                      singles.push(p)
                    }
                    // else: parent placeholder (parent_sku set but no size) → SKIP
                  }
                  const items = []
                  // Add single products (non-variant)
                  for (const p of singles) {
                    items.push(
                      <motion.button
                        key={p.id}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => { cart.addItem(p); setSearchQuery(''); setSearchResults([]) }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-left"
                        whileHover={{ scale: 1.01 }}
                      >
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-sm overflow-hidden flex-shrink-0">
                          {p.image_path ? (
                            <img src={p.image_path} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg">👟</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</p>
                          <p className="text-xs text-gray-500">{p.category_name} {p.size && `- Size ${p.size}`} {p.color && `- ${p.color}`}</p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(p.selling_price)}</p>
                        <p className="text-xs text-gray-400">Stock: {p.stock}</p>
                      </motion.button>
                    )
                  }
                  // Add variant groups
                  for (const [sku, group] of groups) {
                    const colors = [...new Set(group.variants.map(v => v.color).filter(Boolean))]
                    const sizes = [...new Set(group.variants.map(v => v.size).filter(Boolean))]
                    const totalStock = group.variants.reduce((sum, v) => sum + v.stock, 0)
                    items.push(
                      <motion.button
                        key={'group-' + sku}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => setVariantPicker(group)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-indigo-50 dark:hover:bg-gray-800 transition-all text-left border-l-4 border-indigo-500"
                        whileHover={{ scale: 1.01 }}
                      >
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-sm overflow-hidden flex-shrink-0">
                          {group.variants[0]?.image_path ? (
                            <img src={group.variants[0].image_path} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-lg">📦</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{group.name}</p>
                          <p className="text-xs text-indigo-500 font-medium">{colors.length} colors × {sizes.length} sizes — tap to select</p>
                        </div>
                        <p className="text-xs text-gray-400">Stock: {totalStock}</p>
                      </motion.button>
                    )
                  }
                  return items
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ShoppingCart size={64} strokeWidth={1} />
              <p className="mt-3 text-lg font-medium">Cart is empty</p>
              <p className="text-sm">Search products or scan barcode to add items</p>
            </div>
          ) : (
            <AnimatePresence>
            {cart.items.map((item, i) => (
              <motion.div
                key={item.product_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800"
              >
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                  {item.product_image ? (
                    <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-lg">👟</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.product_name}</p>
                  <p className="text-xs text-gray-500">{formatCurrency(item.unit_price)} each</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => item.quantity > 1 ? cart.updateItem(item.product_id, { quantity: item.quantity - 1 }) : cart.removeItem(item.product_id)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 cursor-pointer">
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center text-sm font-medium text-gray-900 dark:text-white">{item.quantity}</span>
                  <button onClick={() => cart.updateItem(item.product_id, { quantity: item.quantity + 1 })} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 cursor-pointer">
                    <Plus size={16} />
                  </button>
                </div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white w-20 text-right">{formatCurrency(item.subtotal)}</p>
                <button onClick={() => cart.removeItem(item.product_id)} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 hover:text-red-600 cursor-pointer">
                  <Trash2 size={16} />
                </button>
              </motion.div>
            ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* Right Panel - Cart Summary */}
      <div className="w-80 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-white">Order Summary</h3>
        </div>

        {/* Customer Info */}
        <div className="p-4 space-y-2 border-b border-gray-200 dark:border-gray-800">
          <input type="text" placeholder="Customer name (optional)" value={cart.customerName}
            onChange={(e) => cart.setCustomer({ customerName: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
          <input type="text" placeholder="Phone (optional)" value={cart.customerPhone}
            onChange={(e) => cart.setCustomer({ customerPhone: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
        </div>

        {/* Discount */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Discount</p>
          <div className="flex gap-2 mb-2">
            <button onClick={() => cart.setDiscount('none', 0)} className={`px-2 py-1 text-xs rounded-lg transition-all cursor-pointer ${cart.discountType === 'none' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>None</button>
            <button onClick={() => cart.setDiscount('amount', 0)} className={`px-2 py-1 text-xs rounded-lg transition-all cursor-pointer ${cart.discountType === 'amount' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>Rs.</button>
            <button onClick={() => cart.setDiscount('percentage', 0)} className={`px-2 py-1 text-xs rounded-lg transition-all cursor-pointer ${cart.discountType === 'percentage' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>%</button>
          </div>
          {cart.discountType !== 'none' && (
            <input type="number" placeholder={cart.discountType === 'amount' ? 'Amount' : 'Percentage'} value={cart.discountValue || ''}
              onChange={(e) => cart.setDiscount(cart.discountType, Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
          )}
        </div>

        {/* Payment */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Method</p>
          <div className="flex gap-2 mb-3">
            <button onClick={() => cart.setPayment('cash', total, 0)} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-all cursor-pointer ${cart.paymentType === 'cash' ? 'bg-green-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}><DollarSign size={16} /> Cash</button>
            <button onClick={() => cart.setPayment('card', 0, total)} className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-all cursor-pointer ${cart.paymentType === 'card' ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}><CreditCard size={16} /> Card</button>
            <button onClick={() => cart.setPayment('mixed', total / 2, total / 2)} className={`flex-1 px-3 py-2 text-sm rounded-lg transition-all cursor-pointer ${cart.paymentType === 'mixed' ? 'bg-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>Split</button>
          </div>
          {cart.paymentType === 'mixed' && (
            <div className="flex gap-2">
              <input type="number" placeholder="Cash" value={cart.cashAmount || ''} onChange={(e) => cart.setPayment('mixed', Number(e.target.value), total - Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
              <input type="number" placeholder="Card" value={cart.cardAmount || ''} onChange={(e) => cart.setPayment('mixed', total - Number(e.target.value), Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-900 dark:text-white">{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Discount</span>
              <span className="text-green-600">-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t border-gray-200 dark:border-gray-800 pt-2">
            <span className="text-gray-900 dark:text-white">Total</span>
            <span className="text-gray-900 dark:text-white">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 space-y-2 mt-auto">
          <button onClick={() => setShowPayment(true)} disabled={cart.items.length === 0}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer">
            <DollarSign size={18} /> Charge {formatCurrency(total)}
          </button>
          <div className="flex gap-2">
            <button onClick={handleHoldBill} disabled={cart.items.length === 0}
              className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50 cursor-pointer">
              Hold (F12)
            </button>
            <button onClick={() => setShowHeldBills(true)} className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer">
              Held ({heldBills.length})
            </button>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowPayment(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Confirm Payment</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total</span>
                <span className="text-gray-900 dark:text-white font-semibold">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Payment</span>
                <span className="text-gray-900 dark:text-white capitalize">{cart.paymentType}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Change</span>
                <span className="text-green-600 font-semibold">{formatCurrency(0)}</span>
              </div>
            </div>
            <button onClick={handlePayment} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold transition-all cursor-pointer">
              Confirm & Complete Sale
            </button>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceipt && lastSale && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={() => setShowReceipt(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="text-4xl mb-2 animate-bounce">✅</div>
              <h3 className="text-lg font-bold text-green-600">Payment Successful!</h3>
              <p className="text-xs text-gray-500 mt-1">{lastSale.bill_no}</p>
            </div>

            {/* Receipt Preview */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4 text-xs font-mono leading-relaxed">
              <div className="text-center font-bold text-sm mb-2">RECEIPT</div>
              <div className="text-center text-gray-500 mb-2">---</div>
              <div className="flex justify-between">
                <span>Bill:</span>
                <span>{lastSale.bill_no}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
              <div className="border-t border-gray-300 dark:border-gray-600 my-2"></div>
              {lastSale.items?.map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span className="truncate max-w-[180px]">{item.product_name} x{item.quantity}</span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
              <div className="border-t border-gray-300 dark:border-gray-600 my-2"></div>
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>{formatCurrency(lastSale.total)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handlePrintReceipt} disabled={printing}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-xl font-semibold transition-all cursor-pointer">
                <Printer size={18} /> {printing ? 'Printing...' : 'Print Receipt'}
              </button>
              <button onClick={handleNewSale}
                className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer">
                New Sale (F1)
              </button>
            </div>
            {printStatus && (
              <p className={`text-xs text-center mt-2 ${printStatus.includes('✅') ? 'text-green-600' : 'text-red-600'}`}>{printStatus}</p>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* Variant Picker Modal */}
      {variantPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setVariantPicker(null)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{variantPicker.name}</h3>
                <p className="text-xs text-gray-500">Select a color and size to add to cart</p>
              </div>
              <button onClick={() => setVariantPicker(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={20} /></button>
            </div>
            {(() => {
              const colors = [...new Set(variantPicker.variants.map(v => v.color).filter(Boolean))]
              const sizes = [...new Set(variantPicker.variants.map(v => v.size).filter(Boolean))]
              return (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className="p-2 border border-gray-200 dark:border-gray-700 text-xs text-gray-500 font-medium bg-gray-50 dark:bg-gray-800 text-left">Color \ Size</th>
                        {sizes.map(s => (
                          <th key={s} className="p-2 border border-gray-200 dark:border-gray-700 text-xs text-gray-500 font-medium bg-gray-50 dark:bg-gray-800 text-center">{s}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {colors.map(color => (
                        <tr key={color}>
                          <td className="p-2 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">{color}</td>
                          {sizes.map(size => {
                            const variant = variantPicker.variants.find(v => v.color === color && v.size === size)
                            return (
                              <td key={size} className="p-1 border border-gray-200 dark:border-gray-700 text-center">
                                {variant ? (
                                  <button
                                    onClick={() => {
                                      cart.addItem(variant)
                                      setVariantPicker(null)
                                      setSearchQuery('')
                                      setSearchResults([])
                                    }}
                                    disabled={variant.stock === 0}
                                    className={`w-full px-2 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                                      variant.stock === 0
                                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                                        : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                                    }`}
                                  >
                                    <div className="font-bold">{formatCurrency(variant.selling_price)}</div>
                                    <div className={variant.stock <= variant.min_stock_level ? 'text-red-500' : 'text-gray-400'}>
                                      {variant.stock === 0 ? 'Out of Stock' : `Stock: ${variant.stock}`}
                                    </div>
                                  </button>
                                ) : (
                                  <span className="text-xs text-gray-300">—</span>
                                )}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })()}
            <button onClick={() => setVariantPicker(null)} className="w-full py-2.5 mt-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Held Bills Modal */}
      {showHeldBills && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowHeldBills(false)}>
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Held Bills</h3>
              <button onClick={() => setShowHeldBills(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X size={20} /></button>
            </div>
            {heldBills.length === 0 ? (
              <p className="text-center text-sm text-gray-400 py-8">No held bills</p>
            ) : (
              <div className="space-y-2">
                {heldBills.map(bill => (
                  <div key={bill.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(bill.net_amount)}</p>
                      <p className="text-xs text-gray-500">{bill.created_at}</p>
                    </div>
                    <button onClick={() => handleReturnHeldBill(bill)} className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-all cursor-pointer">
                      Return to Cart
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


