import { create } from 'zustand'

export const useCartStore = create((set, get) => ({
  items: [],
  customerName: '',
  customerPhone: '',
  customerNtn: '',
  discountType: 'none',
  discountValue: 0,
  paymentType: 'cash',
  cashAmount: 0,
  cardAmount: 0,

  addItem: (product) => {
    const items = get().items
    const existing = items.find(item => item.product_id === product.id)
    if (existing) {
      set({
        items: items.map(item =>
          item.product_id === product.id
            ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.unit_price }
            : item
        )
      })
    } else {
      set({
        items: [
          ...items,
          {
            product_id: product.id,
            product_name: product.name,
            product_image: product.image_path || null,
            quantity: 1,
            unit_price: product.selling_price,
            discount: 0,
            subtotal: product.selling_price
          }
        ]
      })
    }
  },

  updateItem: (productId, updates) => {
    set({
      items: get().items.map(item =>
        item.product_id === productId
          ? { ...item, ...updates, subtotal: (updates.quantity || item.quantity) * (updates.unit_price || item.unit_price) - (updates.discount || item.discount || 0) }
          : item
      )
    })
  },

  removeItem: (productId) => {
    set({ items: get().items.filter(item => item.product_id !== productId) })
  },

  clearCart: () => {
    set({
      items: [],
      customerName: '',
      customerPhone: '',
      customerNtn: '',
      discountType: 'none',
      discountValue: 0,
      paymentType: 'cash',
      cashAmount: 0,
      cardAmount: 0
    })
  },

  setCustomer: (data) => {
    set(data)
  },

  setDiscount: (type, value) => {
    set({ discountType: type, discountValue: value })
  },

  setPayment: (type, cashAmount, cardAmount) => {
    set({ paymentType: type, cashAmount: cashAmount || 0, cardAmount: cardAmount || 0 })
  },

  getTotals: () => {
    const { items, discountType, discountValue } = get()
    const subtotal = Math.round(items.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100
    let discountAmount = 0
    if (discountType === 'amount') {
      discountAmount = Math.round(discountValue * 100) / 100
    } else if (discountType === 'percentage') {
      discountAmount = Math.round((subtotal * discountValue) / 100 * 100) / 100
    }
    const total = Math.round((subtotal - discountAmount) * 100) / 100
    return { subtotal, discountAmount, total }
  }
}))
