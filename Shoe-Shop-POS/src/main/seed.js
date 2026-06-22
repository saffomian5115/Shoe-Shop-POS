import { getDb } from './database'
import crypto from 'crypto'

export function seedDatabase() {
  const db = getDb()

  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get()
  if (productCount.count > 0) {
    console.log('Seed data already exists, skipping')
    return
  }

  console.log('Seeding test data...')

  // ==================== BRANDS ====================
  const brandNames = ['Nike', 'Adidas', 'Puma', 'Reebok', 'New Balance', 'Bata', 'Service', 'Stylo', 'Gucci', 'Hush Puppies']
  const insertBrand = db.prepare('INSERT INTO brands (name) VALUES (?)')
  for (const name of brandNames) {
    insertBrand.run(name)
  }

  // Map brand names to IDs for reference
  const brands = {}
  db.prepare('SELECT id, name FROM brands').all().forEach(b => { brands[b.name] = b.id })

  // Map category names to IDs
  const categories = {}
  db.prepare('SELECT id, name FROM categories').all().forEach(c => { categories[c.name] = c.id })

  // ==================== USERS ====================
  const hash = crypto.createHash('sha256').update('cashier123').digest('hex')
  db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('cashier1', hash, 'cashier')
  db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('cashier2', hash, 'cashier')

  const users = db.prepare('SELECT id, username FROM users').all()

  // ==================== PRODUCTS ====================
  const productsData = [
    // Sneakers
    { name: 'Nike Air Max 270', cat: 'Sneakers', brand: 'Nike', gender: 'Men', price: 24999, cost: 18000, stock: 45, minStock: 10, barcode: 'NIK270M001', size: '42', color: 'Black/White' },
    { name: 'Adidas Ultraboost 23', cat: 'Sneakers', brand: 'Adidas', gender: 'Men', price: 29999, cost: 22000, stock: 32, minStock: 8, barcode: 'ADIUB23M01', size: '43', color: 'Core Black' },
    { name: 'Puma RS-X3', cat: 'Sneakers', brand: 'Puma', gender: 'Women', price: 18999, cost: 14000, stock: 28, minStock: 10, barcode: 'PUMRSX3W01', size: '38', color: 'White/Pink' },
    { name: 'New Balance 574', cat: 'Sneakers', brand: 'New Balance', gender: 'Unisex', price: 21999, cost: 16000, stock: 3, minStock: 10, barcode: 'NB574U001', size: '40', color: 'Grey' },
    { name: 'Reebok Classic Leather', cat: 'Sneakers', brand: 'Reebok', gender: 'Men', price: 15999, cost: 11000, stock: 55, minStock: 15, barcode: 'REECLM001', size: '44', color: 'White' },

    // Sports
    { name: 'Nike Air Zoom Pegasus 40', cat: 'Sports', brand: 'Nike', gender: 'Men', price: 27999, cost: 20000, stock: 22, minStock: 8, barcode: 'NIKPEG40M1', size: '42', color: 'Blue/White' },
    { name: 'Adidas Adizero Boston 12', cat: 'Sports', brand: 'Adidas', gender: 'Men', price: 25999, cost: 19000, stock: 18, minStock: 8, barcode: 'ADIAB12M01', size: '43', color: 'Solar Yellow' },
    { name: 'Puma Velocity Nitro 3', cat: 'Sports', brand: 'Puma', gender: 'Women', price: 20999, cost: 15000, stock: 15, minStock: 8, barcode: 'PUMVN3W001', size: '37', color: 'Teal/White' },

    // Sandals
    { name: 'Bata Floaters Sandals', cat: 'Sandals', brand: 'Bata', gender: 'Men', price: 4999, cost: 3000, stock: 80, minStock: 20, barcode: 'BATFSM001', size: '41', color: 'Brown' },
    { name: 'Service Hawaii Sandals', cat: 'Sandals', brand: 'Service', gender: 'Men', price: 3999, cost: 2200, stock: 65, minStock: 15, barcode: 'SERVHSM01', size: '42', color: 'Black' },
    { name: 'Stylo Trendy Sandals', cat: 'Sandals', brand: 'Stylo', gender: 'Women', price: 6999, cost: 4500, stock: 40, minStock: 12, barcode: 'STYTSW01', size: '36', color: 'Gold' },
    { name: 'Gucci Beach Sandals', cat: 'Sandals', brand: 'Gucci', gender: 'Women', price: 45000, cost: 32000, stock: 8, minStock: 3, barcode: 'GUCBSW01', size: '37', color: 'Beige/GG' },

    // Formal
    { name: 'Service Derby Shoes', cat: 'Formal', brand: 'Service', gender: 'Men', price: 12999, cost: 8500, stock: 35, minStock: 10, barcode: 'SERVDSM01', size: '42', color: 'Black' },
    { name: 'Bata Oxford Shoes', cat: 'Formal', brand: 'Bata', gender: 'Men', price: 14999, cost: 10000, stock: 25, minStock: 10, barcode: 'BATOXM01', size: '43', color: 'Tan' },
    { name: 'Hush Puppies Loafers', cat: 'Formal', brand: 'Hush Puppies', gender: 'Men', price: 16999, cost: 12000, stock: 20, minStock: 8, barcode: 'HUSHPLM1', size: '41', color: 'Brown' },

    // Casual
    { name: 'Adidas Stan Smith', cat: 'Casual', brand: 'Adidas', gender: 'Unisex', price: 19999, cost: 14500, stock: 2, minStock: 10, barcode: 'ADISSU001', size: '41', color: 'White/Green' },
    { name: 'Puma Carina Street', cat: 'Casual', brand: 'Puma', gender: 'Women', price: 15999, cost: 11000, stock: 30, minStock: 10, barcode: 'PUMCASW01', size: '38', color: 'White/Gold' },
    { name: 'New Balance 327', cat: 'Casual', brand: 'New Balance', gender: 'Unisex', price: 18999, cost: 13500, stock: 1, minStock: 8, barcode: 'NB327U001', size: '39', color: 'Sea Salt/Black' },

    // Boots
    { name: 'Nike Air Force 1 Boot', cat: 'Boots', brand: 'Nike', gender: 'Men', price: 32999, cost: 24000, stock: 12, minStock: 5, barcode: 'NIKAFBM01', size: '43', color: 'Black' },
    { name: 'Adidas Terrex Free Hiker', cat: 'Boots', brand: 'Adidas', gender: 'Men', price: 34999, cost: 25000, stock: 10, minStock: 5, barcode: 'ADITFHM01', size: '44', color: 'Grey/Green' },
    { name: 'Bata Winter Boots', cat: 'Boots', brand: 'Bata', gender: 'Women', price: 8999, cost: 6000, stock: 18, minStock: 8, barcode: 'BATWBW01', size: '37', color: 'Dark Brown' },

    // Heels
    { name: 'Stylo Stiletto Heels', cat: 'Heels', brand: 'Stylo', gender: 'Women', price: 11999, cost: 8000, stock: 14, minStock: 6, barcode: 'STYSHW01', size: '36', color: 'Red' },
    { name: 'Gucci Block Heels', cat: 'Heels', brand: 'Gucci', gender: 'Women', price: 65000, cost: 45000, stock: 4, minStock: 3, barcode: 'GUCBHW01', size: '37', color: 'Black/GG' },
    { name: 'Hush Puppies Wedge Heels', cat: 'Heels', brand: 'Hush Puppies', gender: 'Women', price: 13999, cost: 9500, stock: 9, minStock: 5, barcode: 'HUSHWHW1', size: '38', color: 'Nude' },

    // Slippers
    { name: 'Service Comfy Slippers', cat: 'Slippers', brand: 'Service', gender: 'Men', price: 2499, cost: 1200, stock: 100, minStock: 30, barcode: 'SERVCSM01', size: '42', color: 'Navy' },
    { name: 'Bata Soft Slippers', cat: 'Slippers', brand: 'Bata', gender: 'Women', price: 2999, cost: 1500, stock: 90, minStock: 25, barcode: 'BATSSW01', size: '37', color: 'Pink' },
    { name: 'Puma Slide Slippers', cat: 'Slippers', brand: 'Puma', gender: 'Unisex', price: 5999, cost: 3500, stock: 7, minStock: 15, barcode: 'PUMSSU001', size: '40', color: 'Black/White' },

    // More Kids products
    { name: 'Nike Air Max Kids', cat: 'Sneakers', brand: 'Nike', gender: 'Kids', price: 12999, cost: 9000, stock: 25, minStock: 10, barcode: 'NIKAMK001', size: '33', color: 'Multi' },
    { name: 'Adidas Racer Kids', cat: 'Sneakers', brand: 'Adidas', gender: 'Kids', price: 9999, cost: 7000, stock: 20, minStock: 8, barcode: 'ADIRAK001', size: '34', color: 'Blue/White' },
    { name: 'Bata School Shoes', cat: 'Formal', brand: 'Bata', gender: 'Kids', price: 5999, cost: 3800, stock: 40, minStock: 15, barcode: 'BATSSK001', size: '32', color: 'Black' },
  ]

  const insertProduct = db.prepare(`INSERT INTO products
    (name, category_id, brand_id, gender, buying_price, selling_price, stock, min_stock_level, barcode, size, color, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)

  const productIds = []
  for (const p of productsData) {
    const result = insertProduct.run(
      p.name, categories[p.cat], brands[p.brand], p.gender,
      p.cost, p.price, p.stock, p.minStock, p.barcode, p.size, p.color
    )
    productIds.push({ id: result.lastInsertRowid, name: p.name, price: p.price, cost: p.cost })
  }

  // ==================== SUPPLIERS ====================
  const supplierNames = [
    { name: 'Shoe Mart International', phone: '051-2345678', address: '10 Main Blvd, Saddar, Rawalpindi' },
    { name: 'Footwear Distributors Ltd', phone: '042-3567890', address: '45 Business Avenue, Gulberg, Lahore' },
    { name: 'Premium Shoes Trading', phone: '021-3456789', address: '78 Trade Center, Clifton, Karachi' },
    { name: 'Sports Footwear Co', phone: '051-4567890', address: '22 Industrial Area, Wah Cantt' },
  ]
  const insertSupplier = db.prepare('INSERT INTO suppliers (name, phone, address) VALUES (?, ?, ?)')
  for (const s of supplierNames) {
    insertSupplier.run(s.name, s.phone, s.address)
  }

  // ==================== PURCHASES ====================
  const now = new Date()
  const purchaseData = [
    { date: daysAgo(now, 25), supplier: 1, invoice: 'INV-001', items: [
      { product: 0, qty: 50, price: 18000 },
      { product: 5, qty: 30, price: 20000 },
      { product: 8, qty: 100, price: 3000 },
    ]},
    { date: daysAgo(now, 18), supplier: 2, invoice: 'INV-002', items: [
      { product: 1, qty: 40, price: 22000 },
      { product: 6, qty: 25, price: 19000 },
      { product: 9, qty: 80, price: 2200 },
    ]},
    { date: daysAgo(now, 12), supplier: 3, invoice: 'INV-003', items: [
      { product: 2, qty: 35, price: 14000 },
      { product: 7, qty: 20, price: 15000 },
      { product: 10, qty: 50, price: 4500 },
    ]},
    { date: daysAgo(now, 5), supplier: 4, invoice: 'INV-004', items: [
      { product: 13, qty: 30, price: 10000 },
      { product: 18, qty: 15, price: 24000 },
      { product: 26, qty: 40, price: 9000 },
    ]},
  ]

  const insertPurchase = db.prepare('INSERT INTO purchases (supplier_id, invoice_no, total_amount, created_at) VALUES (?, ?, ?, ?)')
  const insertPurchaseItem = db.prepare('INSERT INTO purchase_items (purchase_id, product_id, quantity, buying_price) VALUES (?, ?, ?, ?)')

  for (const p of purchaseData) {
    const total = p.items.reduce((sum, item) => sum + (item.qty * item.price), 0)
    const purResult = insertPurchase.run(p.supplier, p.invoice, total, p.date.toISOString())
    const purchaseId = purResult.lastInsertRowid
    for (const item of p.items) {
      insertPurchaseItem.run(purchaseId, productIds[item.product].id, item.qty, item.price)
    }
  }

  // ==================== SALES ====================
  // Generate sales spanning the last 30 days with realistic patterns
  const paymentTypes = ['cash', 'cash', 'cash', 'card', 'mixed']
  const customerNames = [
    { name: 'Ahmad Khan', phone: '0300-1234567', ntn: '' },
    { name: 'Fatima Ali', phone: '0333-7654321', ntn: 'NTN-12345' },
    { name: 'Usman Malik', phone: '0345-9876543', ntn: '' },
    { name: 'Sana Tariq', phone: '0321-4567890', ntn: 'NTN-67890' },
    { name: 'Bilal Ahmed', phone: '0312-3456789', ntn: '' },
    { name: 'Zara Hassan', phone: '0336-7890123', ntn: '' },
    { name: 'Kamran Shah', phone: '0301-2345678', ntn: 'NTN-54321' },
    { name: 'Hira Nawaz', phone: '0344-5678901', ntn: '' },
    { name: 'Tariq Mehmood', phone: '0315-6789012', ntn: '' },
    { name: 'Aisha Riaz', phone: '0337-8901234', ntn: 'NTN-09876' },
  ]

  const insertSale = db.prepare(`INSERT INTO sales
    (bill_no, customer_name, customer_phone, customer_ntn, total_amount, discount_type, discount_value, discount_amount, net_amount, payment_type, cash_amount, card_amount, status, user_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`)

  const insertSaleItem = db.prepare('INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, discount, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)')
  const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?')

  let billSeq = 1
  // Products that sell well (lower index = better selling)
  const getRandomProducts = () => {
    const count = 1 + Math.floor(Math.random() * 4) // 1-4 items per sale
    const items = []
    const used = new Set()
    for (let i = 0; i < count; i++) {
      let idx
      // Bias toward first few products (more popular)
      if (Math.random() < 0.4) {
        idx = Math.floor(Math.random() * 10) // top 10
      } else {
        idx = Math.floor(Math.random() * productIds.length)
      }
      if (!used.has(idx)) {
        used.add(idx)
        const qty = 1 + Math.floor(Math.random() * 3) // 1-3 qty
        items.push({ idx, qty })
      }
    }
    return items
  }

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const saleDate = daysAgo(now, dayOffset)
    // More sales on weekends (day 0 = Sunday, day 6 = Saturday)
    const dayOfWeek = saleDate.getDay()
    let numSales
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      numSales = 8 + Math.floor(Math.random() * 8) // 8-15 on weekends
    } else {
      numSales = 3 + Math.floor(Math.random() * 6) // 3-8 on weekdays
    }

    for (let s = 0; s < numSales; s++) {
      const customer = customerNames[Math.floor(Math.random() * customerNames.length)]
      const paymentType = paymentTypes[Math.floor(Math.random() * paymentTypes.length)]
      const discountType = Math.random() < 0.3 ? 'percentage' : (Math.random() < 0.5 ? 'amount' : 'none')
      const discountValue = discountType === 'percentage' ? (5 + Math.floor(Math.random() * 16)) : (discountType === 'amount' ? Math.floor(Math.random() * 500) : 0)

      const items = getRandomProducts()
      let totalAmount = 0
      const saleItems = []

      for (const item of items) {
        const p = productIds[item.idx]
        const subtotal = p.price * item.qty
        totalAmount += subtotal
        saleItems.push({ productId: p.id, name: p.name, qty: item.qty, price: p.price, subtotal })
      }

      let discountAmount = 0
      if (discountType === 'percentage') {
        discountAmount = Math.round(totalAmount * (discountValue / 100))
      } else if (discountType === 'amount') {
        discountAmount = Math.min(discountValue, totalAmount)
      }

      const netAmount = totalAmount - discountAmount
      const cashAmount = paymentType === 'cash' ? netAmount : (paymentType === 'mixed' ? Math.round(netAmount * 0.5) : 0)
      const cardAmount = paymentType === 'card' ? netAmount : (paymentType === 'mixed' ? netAmount - cashAmount : 0)

      const dateStr = saleDate.toISOString()
      const prefix = `BILL-${saleDate.getFullYear()}${String(saleDate.getMonth() + 1).padStart(2, '0')}${String(saleDate.getDate()).padStart(2, '0')}-`
      const billNo = `${prefix}${String(billSeq).padStart(4, '0')}`
      billSeq++

      const userId = users[Math.floor(Math.random() * users.length)].id

      const saleResult = insertSale.run(
        billNo, customer.name, customer.phone, customer.ntn,
        totalAmount, discountType, discountValue, discountAmount, netAmount,
        paymentType, cashAmount, cardAmount, userId, dateStr
      )
      const saleId = saleResult.lastInsertRowid

      for (const si of saleItems) {
        const itemDiscount = Math.round((si.subtotal / totalAmount) * discountAmount)
        insertSaleItem.run(saleId, si.productId, si.name, si.qty, si.price, itemDiscount, si.subtotal - itemDiscount)
        updateStock.run(si.qty, si.productId)
      }
    }
  }

  // ==================== SETTINGS ====================
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('printer_name', 'EPSON TM-T88VI')").run()
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_backup', ?)").run(new Date().toISOString())

  console.log(`✅ Seed data inserted: ${brandNames.length} brands, ${productsData.length} products, ${supplierNames.length} suppliers, ${purchaseData.length} purchases, many sales spanning 30 days`)
}

function daysAgo(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() - days)
  d.setHours(10 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60), 0, 0)
  return d
}
