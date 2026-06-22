/**
 * Seed script — run with: node scripts/seed.cjs
 * Inserts limited test data to verify all features work correctly.
 * Only runs if products table is empty (safe to run multiple times).
 */
const path = require('path')
const crypto = require('crypto')

let Database
try {
  Database = require('better-sqlite3')
} catch (e) {
  console.error('❌ better-sqlite3 native module not available.')
  console.error('   Run: npm rebuild better-sqlite3')
  process.exit(1)
}

const DB_PATH = 'C:\\ProgramData\\ShoeShopPOS\\pos.db'

function main() {
  console.log('Opening database...')
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  // Ensure database tables exist (in case app hasn't been run yet)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'cashier' CHECK(role IN ('admin', 'cashier')),
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER REFERENCES categories(id),
      brand_id INTEGER REFERENCES brands(id),
      gender TEXT CHECK(gender IN ('Men', 'Women', 'Kids', 'Unisex')),
      buying_price REAL DEFAULT 0,
      selling_price REAL DEFAULT 0,
      stock INTEGER DEFAULT 0,
      min_stock_level INTEGER DEFAULT 5,
      barcode TEXT UNIQUE,
      image_path TEXT,
      active INTEGER DEFAULT 1,
      parent_sku TEXT,
      size TEXT,
      color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS purchases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      supplier_id INTEGER REFERENCES suppliers(id),
      invoice_no TEXT,
      total_amount REAL DEFAULT 0,
      purchase_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS purchase_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      purchase_id INTEGER REFERENCES purchases(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      quantity INTEGER DEFAULT 0,
      buying_price REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_no TEXT UNIQUE NOT NULL,
      customer_name TEXT,
      customer_phone TEXT,
      customer_ntn TEXT,
      total_amount REAL DEFAULT 0,
      discount_type TEXT CHECK(discount_type IN ('amount', 'percentage', 'none')),
      discount_value REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      net_amount REAL DEFAULT 0,
      payment_type TEXT CHECK(payment_type IN ('cash', 'card', 'mixed')),
      cash_amount REAL DEFAULT 0,
      card_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'void', 'held')),
      user_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id),
      product_name TEXT,
      quantity INTEGER DEFAULT 0,
      unit_price REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      subtotal REAL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS stock_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER REFERENCES products(id),
      quantity_change INTEGER DEFAULT 0,
      old_qty INTEGER DEFAULT 0,
      new_qty INTEGER DEFAULT 0,
      reason_type TEXT CHECK(reason_type IN ('Damaged', 'Lost', 'Physical Count', 'Return to Supplier', 'Restock')),
      reason TEXT,
      user_id INTEGER REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE TABLE IF NOT EXISTS shop_info (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_name TEXT DEFAULT 'My Shoe Shop',
      address TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      receipt_header TEXT DEFAULT '',
      receipt_footer TEXT DEFAULT 'Thank you for shopping!',
      logo_path TEXT DEFAULT ''
    );
  `)

  // Seed default categories and admin user if missing (same as app startup)
  const catCount = db.prepare('SELECT COUNT(*) as count FROM categories').get()
  if (catCount.count === 0) {
    const defaultCats = ['Sneakers', 'Sandals', 'Formal', 'Casual', 'Sports', 'Boots', 'Slippers', 'Heels']
    const insert = db.prepare('INSERT INTO categories (name) VALUES (?)')
    defaultCats.forEach(cat => insert.run(cat))
    console.log('  ✓ default categories seeded')
  }

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get()
  if (userCount.count === 0) {
    const hash = crypto.createHash('sha256').update('admin').digest('hex')
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', hash, 'admin')
    console.log('  ✓ admin user created')
  }

  const shopCount = db.prepare('SELECT COUNT(*) as count FROM shop_info').get()
  if (shopCount.count === 0) {
    db.prepare('INSERT INTO shop_info DEFAULT VALUES').run()
  }

  // Check if products already exist
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get()
  if (productCount.count > 0) {
    console.log("⚠️  Products already exist. Delete the database file to reset: C:\\ProgramData\\ShoeShopPOS\\pos.db")
    db.close()
    return
  }

  console.log('Seeding limited test data...')

  // ==================== BRANDS (4) ====================
  const brandNames = ['Nike', 'Adidas', 'Bata', 'Service']
  const insertBrand = db.prepare('INSERT INTO brands (name) VALUES (?)')
  for (const name of brandNames) {
    insertBrand.run(name)
  }

  const brands = {}
  db.prepare('SELECT id, name FROM brands').all().forEach(b => { brands[b.name] = b.id })

  const categories = {}
  db.prepare('SELECT id, name FROM categories').all().forEach(c => { categories[c.name] = c.id })

  console.log(`  ✓ ${brandNames.length} brands`)

  // ==================== USERS (cashiers) ====================
  const hash = crypto.createHash('sha256').update('cashier123').digest('hex')
  const existingCashier = db.prepare('SELECT id FROM users WHERE username = ?').get('cashier1')
  if (!existingCashier) {
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('cashier1', hash, 'cashier')
  }
  db.prepare('INSERT OR IGNORE INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('cashier2', hash, 'cashier')

  const users = db.prepare('SELECT id, username FROM users').all()
  console.log(`  ✓ ${users.length} users (admin + cashiers)`)

  // ==================== PRODUCTS (12) ====================
  const productsData = [
    // Sneakers - Men - normal stock
    { name: 'Nike Air Max 270', cat: 'Sneakers', brand: 'Nike', gender: 'Men', price: 24999, cost: 18000, stock: 10, minStock: 5, size: '42', color: 'Black/White' },
    // Sneakers - Men - LOW STOCK (3 < min 8)
    { name: 'Adidas Ultraboost', cat: 'Sneakers', brand: 'Adidas', gender: 'Men', price: 29999, cost: 22000, stock: 3, minStock: 8, size: '43', color: 'Core Black' },
    // Sandals - Men - normal stock
    { name: 'Bata Floaters Sandals', cat: 'Sandals', brand: 'Bata', gender: 'Men', price: 4999, cost: 3000, stock: 20, minStock: 10, size: '41', color: 'Brown' },
    // Sandals - Men - LOW STOCK (5 < min 10)
    { name: 'Service Hawaii Sandals', cat: 'Sandals', brand: 'Service', gender: 'Men', price: 3999, cost: 2200, stock: 5, minStock: 10, size: '42', color: 'Black' },
    // Sneakers - Kids - normal stock
    { name: 'Nike Kids Runners', cat: 'Sneakers', brand: 'Nike', gender: 'Kids', price: 9999, cost: 7000, stock: 8, minStock: 5, size: '33', color: 'Multi' },
    // Casual - Unisex - LOW STOCK (1 < min 5)
    { name: 'Adidas Stan Smith', cat: 'Casual', brand: 'Adidas', gender: 'Unisex', price: 19999, cost: 14500, stock: 1, minStock: 5, size: '41', color: 'White/Green' },
    // Formal - Men - normal stock
    { name: 'Bata Oxford Shoes', cat: 'Formal', brand: 'Bata', gender: 'Men', price: 14999, cost: 10000, stock: 15, minStock: 5, size: '43', color: 'Tan' },
    // Formal - Men - OUT OF STOCK (0 stock)
    { name: 'Service Derby Shoes', cat: 'Formal', brand: 'Service', gender: 'Men', price: 12999, cost: 8500, stock: 0, minStock: 5, size: '42', color: 'Black' },
    // Sports - Men - normal stock
    { name: 'Nike Zoom Pegasus', cat: 'Sports', brand: 'Nike', gender: 'Men', price: 27999, cost: 20000, stock: 12, minStock: 5, size: '42', color: 'Blue/White' },
    // Slippers - Women - normal stock
    { name: 'Bata Soft Slippers', cat: 'Slippers', brand: 'Bata', gender: 'Women', price: 2999, cost: 1500, stock: 25, minStock: 10, size: '37', color: 'Pink' },
    // Slippers - Men - LOW STOCK (3 < min 10)
    { name: 'Service Comfy Slippers', cat: 'Slippers', brand: 'Service', gender: 'Men', price: 2499, cost: 1200, stock: 3, minStock: 10, size: '42', color: 'Navy' },
    // Sneakers - Kids - normal stock
    { name: 'Adidas Racer Kids', cat: 'Sneakers', brand: 'Adidas', gender: 'Kids', price: 9999, cost: 7000, stock: 6, minStock: 5, size: '34', color: 'Blue/White' },
  ]

  // Add barcodes
  const productsWithBarcodes = productsData.map((p, i) => ({
    ...p,
    barcode: `BAR-${String(i + 1).padStart(4, '0')}`
  }))

  const insertProduct = db.prepare(`INSERT INTO products
    (name, category_id, brand_id, gender, buying_price, selling_price, stock, min_stock_level, barcode, size, color, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)

  const productIds = []
  for (const p of productsWithBarcodes) {
    const result = insertProduct.run(
      p.name, categories[p.cat], brands[p.brand], p.gender,
      p.cost, p.price, p.stock, p.minStock, p.barcode, p.size, p.color
    )
    productIds.push({ id: result.lastInsertRowid, name: p.name, price: p.price, cost: p.cost })
  }

  console.log(`  ✓ ${productsWithBarcodes.length} products`)

  // ==================== SUPPLIERS (2) ====================
  const supplierNames = [
    { name: 'Shoe Mart International', phone: '051-2345678', address: '10 Main Blvd, Saddar, Rawalpindi' },
    { name: 'Footwear Distributors Ltd', phone: '042-3567890', address: '45 Business Avenue, Gulberg, Lahore' },
  ]
  const insertSupplier = db.prepare('INSERT INTO suppliers (name, phone, address) VALUES (?, ?, ?)')
  for (const s of supplierNames) {
    insertSupplier.run(s.name, s.phone, s.address)
  }
  console.log(`  ✓ ${supplierNames.length} suppliers`)

  // ==================== PURCHASES (2) ====================
  const now = new Date()
  const daysAgo = (date, days) => {
    const d = new Date(date)
    d.setDate(d.getDate() - days)
    d.setHours(11, 30, 0, 0)
    return d
  }

  const purchaseData = [
    { date: daysAgo(now, 10), supplier: 1, invoice: 'PUR-001', items: [
      { product: 0, qty: 20, price: 18000 },
      { product: 2, qty: 30, price: 3000 },
      { product: 8, qty: 15, price: 20000 },
    ]},
    { date: daysAgo(now, 5), supplier: 2, invoice: 'PUR-002', items: [
      { product: 1, qty: 15, price: 22000 },
      { product: 3, qty: 20, price: 2200 },
      { product: 4, qty: 15, price: 7000 },
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
  console.log(`  ✓ ${purchaseData.length} purchases`)

  // ==================== SALES (last 5 days) ====================
  const paymentTypes = ['cash', 'cash', 'card', 'mixed']
  const customerNames = [
    { name: 'Ahmad Khan', phone: '0300-1234567', ntn: '' },
    { name: 'Fatima Ali', phone: '0333-7654321', ntn: 'NTN-12345' },
    { name: 'Usman Malik', phone: '', ntn: '' },
    { name: 'Sana Tariq', phone: '0321-4567890', ntn: 'NTN-67890' },
    { name: 'Bilal Ahmed', phone: '0312-3456789', ntn: '' },
  ]

  const insertSale = db.prepare(`INSERT INTO sales
    (bill_no, customer_name, customer_phone, customer_ntn, total_amount, discount_type, discount_value, discount_amount, net_amount, payment_type, cash_amount, card_amount, status, user_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const insertSaleItem = db.prepare('INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, discount, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)')
  const updateStock = db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?')

  let billSeq = 1

  // Sale scenarios for each day
  const saleScenarios = [
    // Day -5 (5 days ago) - 2 sales
    { day: 5, sales: [
      { customer: 0, paymentType: 'cash', discountType: 'none', discountValue: 0,
        items: [{ product: 0, qty: 2 }, { product: 9, qty: 1 }] },
      { customer: 1, paymentType: 'card', discountType: 'percentage', discountValue: 10,
        items: [{ product: 1, qty: 1 }, { product: 4, qty: 2 }] },
    ]},
    // Day -4 (4 days ago) - 3 sales
    { day: 4, sales: [
      { customer: 2, paymentType: 'cash', discountType: 'none', discountValue: 0,
        items: [{ product: 6, qty: 1 }] },
      { customer: 3, paymentType: 'mixed', discountType: 'amount', discountValue: 500,
        items: [{ product: 2, qty: 3 }, { product: 10, qty: 2 }] },
      { customer: 0, paymentType: 'cash', discountType: 'percentage', discountValue: 5,
        items: [{ product: 8, qty: 1 }, { product: 5, qty: 1 }] },
    ]},
    // Day -3 (3 days ago) - 2 sales + 1 VOID sale
    { day: 3, sales: [
      { customer: 4, paymentType: 'card', discountType: 'none', discountValue: 0,
        items: [{ product: 11, qty: 2 }, { product: 9, qty: 1 }] },
      { customer: 1, paymentType: 'cash', discountType: 'percentage', discountValue: 15,
        items: [{ product: 6, qty: 1 }, { product: 2, qty: 2 }] },
      // VOID sale - appears in bill history as void
      { customer: 3, paymentType: 'cash', discountType: 'none', discountValue: 0, status: 'void',
        items: [{ product: 0, qty: 1 }, { product: 5, qty: 1 }] },
    ]},
    // Day -2 (2 days ago) - 3 sales + 1 HELD bill
    { day: 2, sales: [
      { customer: 0, paymentType: 'cash', discountType: 'none', discountValue: 0,
        items: [{ product: 3, qty: 2 }, { product: 10, qty: 3 }] },
      { customer: 4, paymentType: 'mixed', discountType: 'amount', discountValue: 1000,
        items: [{ product: 8, qty: 1 }, { product: 1, qty: 1 }, { product: 9, qty: 2 }] },
      { customer: 2, paymentType: 'cash', discountType: 'none', discountValue: 0,
        items: [{ product: 4, qty: 1 }, { product: 11, qty: 1 }] },
      // HELD bill - saved but not completed
      { customer: 3, paymentType: 'cash', discountType: 'none', discountValue: 0, status: 'held',
        items: [{ product: 0, qty: 2 }, { product: 6, qty: 1 }] },
    ]},
    // Day -1 (yesterday) - 3 sales
    { day: 1, sales: [
      { customer: 1, paymentType: 'card', discountType: 'percentage', discountValue: 20,
        items: [{ product: 0, qty: 1 }, { product: 8, qty: 1 }] },
      { customer: 0, paymentType: 'cash', discountType: 'none', discountValue: 0,
        items: [{ product: 2, qty: 2 }, { product: 9, qty: 2 }] },
      { customer: 4, paymentType: 'mixed', discountType: 'amount', discountValue: 200,
        items: [{ product: 5, qty: 1 }, { product: 6, qty: 1 }, { product: 11, qty: 1 }] },
    ]},
    // Today (today) - 4 sales for dashboard data
    { day: 0, sales: [
      { customer: 2, paymentType: 'cash', discountType: 'none', discountValue: 0,
        items: [{ product: 10, qty: 1 }] },
      { customer: 3, paymentType: 'card', discountType: 'percentage', discountValue: 5,
        items: [{ product: 8, qty: 1 }, { product: 0, qty: 1 }] },
      { customer: 0, paymentType: 'mixed', discountType: 'none', discountValue: 0,
        items: [{ product: 2, qty: 1 }, { product: 9, qty: 3 }] },
      { customer: 1, paymentType: 'cash', discountType: 'amount', discountValue: 300,
        items: [{ product: 6, qty: 1 }, { product: 4, qty: 1 }] },
    ]},
  ]

  let totalSales = 0
  for (const scenario of saleScenarios) {
    const saleDate = daysAgo(now, scenario.day)
    // Vary the time throughout the day
    let hour = 9
    let minute = 0

    for (const sale of scenario.sales) {
      const saleTime = new Date(saleDate)
      saleTime.setHours(hour, minute + Math.floor(Math.random() * 30), Math.floor(Math.random() * 60), 0)
      hour += 1 + Math.floor(Math.random() * 2)
      if (hour > 20) hour = 20

      const customer = customerNames[sale.customer]
      const paymentType = sale.paymentType || 'cash'
      const discountType = sale.discountType || 'none'
      const discountValue = sale.discountValue || 0
      const status = sale.status || 'active'

      // Calculate totals
      let totalAmount = 0
      const saleItems = []
      for (const item of sale.items) {
        const p = productIds[item.product]
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

      const dateStr = saleTime.toISOString()
      const datePrefix = `${saleTime.getFullYear()}${String(saleTime.getMonth() + 1).padStart(2, '0')}${String(saleTime.getDate()).padStart(2, '0')}`
      const billNo = `BILL-${datePrefix}-${String(billSeq).padStart(4, '0')}`
      billSeq++

      const userId = users[Math.floor(Math.random() * users.length)].id

      const saleResult = insertSale.run(
        billNo, customer.name, customer.phone, customer.ntn,
        totalAmount, discountType, discountValue, discountAmount, netAmount,
        paymentType, cashAmount, cardAmount, status, userId, dateStr
      )
      const saleId = saleResult.lastInsertRowid

      for (const si of saleItems) {
        const itemDiscount = totalAmount > 0 ? Math.round((si.subtotal / totalAmount) * discountAmount) : 0
        insertSaleItem.run(saleId, si.productId, si.name, si.qty, si.price, itemDiscount, si.subtotal - itemDiscount)
        // Only update stock for non-void and non-held sales
        if (status === 'active') {
          updateStock.run(si.qty, si.productId)
        }
      }
      totalSales++
    }
  }
  console.log(`  ✓ ${totalSales} sales (including void & held bills)`)

  // ==================== STOCK ADJUSTMENTS ====================
  const insertAdjustment = db.prepare(`INSERT INTO stock_adjustments
    (product_id, quantity_change, old_qty, new_qty, reason_type, reason, user_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)

  const adjDate = daysAgo(now, 7)
  // Damaged item
  const adminUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin')
  insertAdjustment.run(
    productIds[10].id, -1, 4, 3, 'Damaged', 'Customer returned damaged slippers', adminUser.id, adjDate.toISOString()
  )
  // Physical count correction
  const adjDate2 = daysAgo(now, 3)
  insertAdjustment.run(
    productIds[0].id, 2, 8, 10, 'Physical Count', 'Found extra stock during inventory', adminUser.id, adjDate2.toISOString()
  )
  console.log('  ✓ 2 stock adjustments')

  // ==================== SETTINGS ====================
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('printer_name', 'EPSON TM-T88VI')").run()
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('last_backup', ?)").run(daysAgo(now, 2).toISOString())
  console.log('  ✓ settings')

  db.close()
  console.log('\n✅ Seed complete!')
  console.log(`   ${brandNames.length} brands, ${productsWithBarcodes.length} products`)
  console.log(`   ${supplierNames.length} suppliers, ${purchaseData.length} purchases`)
  console.log(`   ${totalSales} sales across ${saleScenarios.length} days`)
  console.log(`   Includes: active, void, and held bills`)
  console.log(`   Includes: cash, card, and mixed payments`)
  console.log(`   Includes: % discount, Rs. discount, and no discount`)
  console.log(`   Includes: low stock alerts, out-of-stock items`)
  console.log(`   Cashier login: cashier1 / cashier123`)
}

main()
