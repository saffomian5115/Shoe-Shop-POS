import { ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { app } from 'electron'
import { getDb } from './database'

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export function registerIpcHandlers() {
  // ==================== AUTH ====================
  ipcMain.handle('auth:login', (_, { username, password }) => {
    const db = getDb()
    const hash = hashPassword(password)
    const user = db.prepare('SELECT id, username, role FROM users WHERE username = ? AND password_hash = ? AND active = 1').get(username, hash)
    return user || null
  })

  // ==================== USERS ====================
  ipcMain.handle('users:list', () => {
    return getDb().prepare('SELECT id, username, role, active, created_at FROM users ORDER BY id').all()
  })

  ipcMain.handle('users:create', (_, { username, password, role }) => {
    const hash = hashPassword(password)
    try {
      getDb().prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, hash, role)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('users:update', (_, { id, username, password, role, active }) => {
    const db = getDb()
    if (password) {
      const hash = hashPassword(password)
      db.prepare('UPDATE users SET username = ?, password_hash = ?, role = ?, active = ? WHERE id = ?').run(username, hash, role, active ? 1 : 0, id)
    } else {
      db.prepare('UPDATE users SET username = ?, role = ?, active = ? WHERE id = ?').run(username, role, active ? 1 : 0, id)
    }
    return { success: true }
  })

  ipcMain.handle('users:delete', (_, id) => {
    getDb().prepare('DELETE FROM users WHERE id = ?').run(id)
    return { success: true }
  })

  // ==================== CATEGORIES ====================
  ipcMain.handle('categories:list', () => {
    return getDb().prepare('SELECT * FROM categories ORDER BY name').all()
  })

  ipcMain.handle('categories:create', (_, { name, description }) => {
    try {
      getDb().prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, description || null)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('categories:delete', (_, id) => {
    const count = getDb().prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(id)
    if (count.count > 0) return { success: false, error: 'Category has products, cannot delete' }
    getDb().prepare('DELETE FROM categories WHERE id = ?').run(id)
    return { success: true }
  })

  // ==================== BRANDS ====================
  ipcMain.handle('brands:list', () => {
    return getDb().prepare('SELECT * FROM brands ORDER BY name').all()
  })

  ipcMain.handle('brands:create', (_, { name }) => {
    try {
      getDb().prepare('INSERT INTO brands (name) VALUES (?)').run(name)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  // ==================== PRODUCTS ====================
  ipcMain.handle('products:list', (_, filters = {}) => {
    const db = getDb()
    let sql = `SELECT p.*, c.name as category_name, b.name as brand_name 
               FROM products p 
               LEFT JOIN categories c ON p.category_id = c.id 
               LEFT JOIN brands b ON p.brand_id = b.id 
               WHERE 1=1`
    const params = []

    if (filters.search) {
      sql += ' AND (p.name LIKE ? OR p.barcode LIKE ?)'
      params.push(`%${filters.search}%`, `%${filters.search}%`)
    }
    if (filters.category_id) {
      sql += ' AND p.category_id = ?'
      params.push(filters.category_id)
    }
    if (filters.brand_id) {
      sql += ' AND p.brand_id = ?'
      params.push(filters.brand_id)
    }
    if (filters.gender) {
      sql += ' AND p.gender = ?'
      params.push(filters.gender)
    }
    if (filters.active !== undefined) {
      sql += ' AND p.active = ?'
      params.push(filters.active ? 1 : 0)
    }
    if (filters.low_stock) {
      sql += ' AND p.stock <= p.min_stock_level'
    }
    sql += ' ORDER BY p.name'
    return db.prepare(sql).all(...params)
  })

  ipcMain.handle('products:get', (_, id) => {
    return getDb().prepare(`SELECT p.*, c.name as category_name, b.name as brand_name 
      FROM products p LEFT JOIN categories c ON p.category_id = c.id 
      LEFT JOIN brands b ON p.brand_id = b.id WHERE p.id = ?`).get(id)
  })

  ipcMain.handle('products:create', (_, product) => {
    const db = getDb()
    try {
      const result = db.prepare(`INSERT INTO products (name, category_id, brand_id, gender, buying_price, selling_price, 
        stock, min_stock_level, barcode, image_path, size, color, active) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`).run(
        product.name, product.category_id || null, product.brand_id || null,
        product.gender || null, product.buying_price || 0, product.selling_price || 0,
        product.stock || 0, product.min_stock_level || 5, product.barcode || null,
        product.image_path || null, product.size || null, product.color || null
      )
      return { success: true, id: result.lastInsertRowid }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('products:update', (_, { id, ...product }) => {
    const db = getDb()
    try {
      db.prepare(`UPDATE products SET name=?, category_id=?, brand_id=?, gender=?, buying_price=?, 
        selling_price=?, stock=?, min_stock_level=?, barcode=?, image_path=?, size=?, color=?, 
        active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(
        product.name, product.category_id || null, product.brand_id || null,
        product.gender || null, product.buying_price || 0, product.selling_price || 0,
        product.stock || 0, product.min_stock_level || 5, product.barcode || null,
        product.image_path || null, product.size || null, product.color || null,
        product.active !== undefined ? (product.active ? 1 : 0) : 1, id
      )
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('products:toggle-active', (_, id) => {
    const product = getDb().prepare('SELECT active FROM products WHERE id = ?').get(id)
    if (!product) return { success: false, error: 'Product not found' }
    getDb().prepare('UPDATE products SET active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(product.active ? 0 : 1, id)
    return { success: true }
  })

  ipcMain.handle('products:get-by-barcode', (_, barcode) => {
    return getDb().prepare(`SELECT p.*, c.name as category_name, b.name as brand_name 
      FROM products p LEFT JOIN categories c ON p.category_id = c.id 
      LEFT JOIN brands b ON p.brand_id = b.id WHERE p.barcode = ?`).get(barcode)
  })

  // ==================== SALES ====================
  ipcMain.handle('sales:create', (_, { sale, items }) => {
    const db = getDb()
    const transaction = db.transaction(() => {
      const date = new Date()
      const prefix = `BILL-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-`
      const lastBill = db.prepare("SELECT bill_no FROM sales WHERE bill_no LIKE ? ORDER BY id DESC LIMIT 1").get(`${prefix}%`)
      let seq = 1
      if (lastBill) {
        seq = parseInt(lastBill.bill_no.split('-')[2]) + 1
      }
      const billNo = `${prefix}${String(seq).padStart(4, '0')}`

      const result = db.prepare(`INSERT INTO sales (bill_no, customer_name, customer_phone, customer_ntn, 
        total_amount, discount_type, discount_value, discount_amount, net_amount, 
        payment_type, cash_amount, card_amount, status, user_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`).run(
        billNo, sale.customer_name || null, sale.customer_phone || null, sale.customer_ntn || null,
        sale.total_amount || 0, sale.discount_type || 'none', sale.discount_value || 0,
        sale.discount_amount || 0, sale.net_amount || 0, sale.payment_type || 'cash',
        sale.cash_amount || 0, sale.card_amount || 0, sale.user_id || null
      )

      const saleId = result.lastInsertRowid
      const insertItem = db.prepare('INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, discount, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)')

      for (const item of items) {
        insertItem.run(saleId, item.product_id, item.product_name, item.quantity, item.unit_price, item.discount || 0, item.subtotal)
        db.prepare('UPDATE products SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(item.quantity, item.product_id)
      }

      return { success: true, bill_no: billNo, id: saleId }
    })
    return transaction()
  })

  ipcMain.handle('sales:list', (_, filters = {}) => {
    const db = getDb()
    let sql = `SELECT s.*, u.username FROM sales s LEFT JOIN users u ON s.user_id = u.id WHERE 1=1`
    const params = []

    if (filters.date_from) {
      sql += ' AND s.created_at >= ?'
      params.push(filters.date_from)
    }
    if (filters.date_to) {
      sql += ' AND s.created_at <= ?'
      params.push(filters.date_to + ' 23:59:59')
    }
    if (filters.status) {
      sql += ' AND s.status = ?'
      params.push(filters.status)
    }
    sql += ' ORDER BY s.id DESC'
    if (filters.limit) {
      sql += ' LIMIT ?'
      params.push(filters.limit)
    }
    return db.prepare(sql).all(...params)
  })

  ipcMain.handle('sales:get', (_, id) => {
    const db = getDb()
    const sale = db.prepare(`SELECT s.*, u.username FROM sales s LEFT JOIN users u ON s.user_id = u.id WHERE s.id = ?`).get(id)
    if (sale) {
      sale.items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id)
    }
    return sale
  })

  ipcMain.handle('sales:void', (_, { id, user_id }) => {
    const db = getDb()
    const transaction = db.transaction(() => {
      const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id)
      if (!sale) return { success: false, error: 'Sale not found' }
      if (sale.status === 'void') return { success: false, error: 'Sale already voided' }

      db.prepare('UPDATE sales SET status = ? WHERE id = ?').run('void', id)

      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id)
      for (const item of items) {
        db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.quantity, item.product_id)
      }

      return { success: true }
    })
    return transaction()
  })

  ipcMain.handle('sales:held', () => {
    return getDb().prepare(`SELECT s.*, u.username FROM sales s LEFT JOIN users u ON s.user_id = u.id WHERE s.status = 'held' ORDER BY s.id DESC`).all()
  })

  ipcMain.handle('sales:hold', (_, { sale, items }) => {
    const db = getDb()
    const transaction = db.transaction(() => {
      const result = db.prepare(`INSERT INTO sales (bill_no, customer_name, customer_phone, 
        total_amount, discount_type, discount_value, discount_amount, net_amount, 
        payment_type, status, user_id, created_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'held', ?, CURRENT_TIMESTAMP)`).run(
        `HOLD-${Date.now()}`, sale.customer_name || null, sale.customer_phone || null,
        sale.total_amount || 0, sale.discount_type || 'none', sale.discount_value || 0,
        sale.discount_amount || 0, sale.net_amount || 0, sale.payment_type || 'cash',
        sale.user_id || null
      )

      const saleId = result.lastInsertRowid
      const insertItem = db.prepare('INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, discount, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)')

      for (const item of items) {
        insertItem.run(saleId, item.product_id, item.product_name, item.quantity, item.unit_price, item.discount || 0, item.subtotal)
      }

      return { success: true, id: saleId }
    })
    return transaction()
  })

  ipcMain.handle('sales:delete-held', (_, id) => {
    const items = getDb().prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(id)
    for (const item of items) {
      getDb().prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.quantity, item.product_id)
    }
    getDb().prepare('DELETE FROM sale_items WHERE sale_id = ?').run(id)
    getDb().prepare('DELETE FROM sales WHERE id = ?').run(id)
    return { success: true }
  })

  // ==================== DASHBOARD STATS ====================
  ipcMain.handle('dashboard:stats', (_, { date_from, date_to }) => {
    const db = getDb()
    const params = [date_from, date_to + ' 23:59:59']

    const todaySales = db.prepare(`SELECT COALESCE(SUM(net_amount), 0) as total, COUNT(*) as count, 
      COALESCE(AVG(net_amount), 0) as avg_bill 
      FROM sales WHERE status = 'active' AND created_at >= ? AND created_at <= ?`).get(...params)

    const lowStockCount = db.prepare('SELECT COUNT(*) as count FROM products WHERE stock <= min_stock_level AND active = 1').get()

    return {
      total_sales: todaySales.total,
      bill_count: todaySales.count,
      avg_bill: todaySales.avg_bill,
      low_stock_count: lowStockCount.count
    }
  })

  ipcMain.handle('dashboard:sales-trend', (_, days = 30) => {
    return getDb().prepare(`SELECT DATE(created_at) as date, COALESCE(SUM(net_amount), 0) as total, COUNT(*) as count 
      FROM sales WHERE status = 'active' AND created_at >= DATE('now', ?) 
      GROUP BY DATE(created_at) ORDER BY date`).all(`-${days} days`)
  })

  ipcMain.handle('dashboard:top-products', (_, { date_from, date_to, limit = 10 }) => {
    return getDb().prepare(`SELECT si.product_id, si.product_name, SUM(si.quantity) as qty_sold, 
      SUM(si.subtotal) as total_revenue, p.image_path
      FROM sale_items si 
      JOIN sales s ON si.sale_id = s.id 
      LEFT JOIN products p ON si.product_id = p.id
      WHERE s.status = 'active' AND s.created_at >= ? AND s.created_at <= ?
      GROUP BY si.product_id ORDER BY qty_sold DESC LIMIT ?`).all(date_from, date_to + ' 23:59:59', limit)
  })

  ipcMain.handle('dashboard:category-breakdown', (_, { date_from, date_to }) => {
    return getDb().prepare(`SELECT c.name, COALESCE(SUM(si.subtotal), 0) as total
      FROM sale_items si JOIN sales s ON si.sale_id = s.id
      JOIN products p ON si.product_id = p.id
      RIGHT JOIN categories c ON p.category_id = c.id
      WHERE s.status = 'active' AND s.created_at >= ? AND s.created_at <= ?
      GROUP BY c.name ORDER BY total DESC`).all(date_from, date_to + ' 23:59:59')
  })

  // ==================== STOCK ADJUSTMENTS ====================
  ipcMain.handle('stock:adjust', (_, { product_id, new_qty, reason_type, reason, user_id }) => {
    const db = getDb()
    const transaction = db.transaction(() => {
      const product = db.prepare('SELECT stock FROM products WHERE id = ?').get(product_id)
      if (!product) return { success: false, error: 'Product not found' }

      const oldQty = product.stock
      const change = new_qty - oldQty

      db.prepare('UPDATE products SET stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(new_qty, product_id)
      db.prepare('INSERT INTO stock_adjustments (product_id, quantity_change, old_qty, new_qty, reason_type, reason, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        product_id, change, oldQty, new_qty, reason_type, reason, user_id
      )

      return { success: true }
    })
    return transaction()
  })

  ipcMain.handle('stock:history', (_, product_id) => {
    return getDb().prepare(`SELECT sa.*, p.name as product_name FROM stock_adjustments sa 
      JOIN products p ON sa.product_id = p.id 
      WHERE sa.product_id = ? ORDER BY sa.id DESC`).all(product_id)
  })

  // ==================== PURCHASES ====================
  ipcMain.handle('purchases:create', (_, { supplier_id, invoice_no, items }) => {
    const db = getDb()
    const transaction = db.transaction(() => {
      let total = 0
      for (const item of items) {
        total += item.quantity * item.buying_price
      }

      const result = db.prepare('INSERT INTO purchases (supplier_id, invoice_no, total_amount) VALUES (?, ?, ?)').run(supplier_id, invoice_no, total)
      const purchaseId = result.lastInsertRowid
      const insertItem = db.prepare('INSERT INTO purchase_items (purchase_id, product_id, quantity, buying_price) VALUES (?, ?, ?, ?)')

      for (const item of items) {
        insertItem.run(purchaseId, item.product_id, item.quantity, item.buying_price)
        const product = db.prepare('SELECT stock, buying_price FROM products WHERE id = ?').get(item.product_id)
        const newStock = product.stock + item.quantity
        const newAvgPrice = ((product.buying_price * product.stock) + (item.buying_price * item.quantity)) / newStock
        db.prepare('UPDATE products SET stock = ?, buying_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStock, Math.round(newAvgPrice * 100) / 100, item.product_id)
      }

      return { success: true, id: purchaseId }
    })
    return transaction()
  })

  ipcMain.handle('purchases:list', () => {
    return getDb().prepare(`SELECT pu.*, s.name as supplier_name FROM purchases pu 
      LEFT JOIN suppliers s ON pu.supplier_id = s.id ORDER BY pu.id DESC`).all()
  })

  // ==================== SUPPLIERS ====================
  ipcMain.handle('suppliers:list', () => {
    return getDb().prepare('SELECT * FROM suppliers ORDER BY name').all()
  })

  ipcMain.handle('suppliers:create', (_, { name, phone, address }) => {
    try {
      getDb().prepare('INSERT INTO suppliers (name, phone, address) VALUES (?, ?, ?)').run(name, phone, address)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  // ==================== SETTINGS ====================
  ipcMain.handle('settings:get', (_, key) => {
    const setting = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key)
    return setting ? setting.value : null
  })

  ipcMain.handle('settings:set', (_, { key, value }) => {
    getDb().prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
    return { success: true }
  })

  ipcMain.handle('settings:get-all', () => {
    const rows = getDb().prepare('SELECT key, value FROM settings').all()
    const settings = {}
    rows.forEach(row => settings[row.key] = row.value)
    return settings
  })

  // ==================== SHOP INFO ====================
  ipcMain.handle('shop:get', () => {
    return getDb().prepare('SELECT * FROM shop_info WHERE id = 1').get()
  })

  ipcMain.handle('shop:update', (_, info) => {
    getDb().prepare(`UPDATE shop_info SET shop_name=?, address=?, phone=?, receipt_header=?, receipt_footer=?, logo_path=? WHERE id=1`).run(
      info.shop_name, info.address, info.phone, info.receipt_header, info.receipt_footer, info.logo_path
    )
    return { success: true }
  })

  // ==================== REPORTS ====================
  ipcMain.handle('reports:sales', (_, { date_from, date_to, group_by = 'daily' }) => {
    let dateFormat
    if (group_by === 'daily') dateFormat = '%Y-%m-%d'
    else if (group_by === 'monthly') dateFormat = '%Y-%m'
    else dateFormat = '%Y-%W'

    return getDb().prepare(`SELECT strftime('${dateFormat}', created_at) as period, 
      COUNT(*) as bill_count, COALESCE(SUM(net_amount), 0) as revenue,
      COALESCE(SUM(total_amount), 0) as total_amount, COALESCE(SUM(discount_amount), 0) as total_discount
      FROM sales WHERE status = 'active' AND created_at >= ? AND created_at <= ?
      GROUP BY period ORDER BY period`).all(date_from, date_to + ' 23:59:59')
  })

  ipcMain.handle('reports:profit', (_, { date_from, date_to }) => {
    return getDb().prepare(`SELECT DATE(s.created_at) as date,
      SUM(s.net_amount) as revenue,
      SUM(si.quantity * p.buying_price) as cost,
      SUM(s.net_amount) - SUM(si.quantity * p.buying_price) as profit
      FROM sales s JOIN sale_items si ON s.id = si.sale_id
      JOIN products p ON si.product_id = p.id
      WHERE s.status = 'active' AND s.created_at >= ? AND s.created_at <= ?
      GROUP BY DATE(s.created_at) ORDER BY date`).all(date_from, date_to + ' 23:59:59')
  })

  // ==================== BACKUP ====================
  ipcMain.handle('backup:local', () => {
    const dbPath = 'C:\\ProgramData\\ShoeShopPOS\\pos.db'
    const backupDir = path.join(app.getPath('documents'), 'ShoeShopPOS_Backups')
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })

    const date = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = path.join(backupDir, `pos_backup_${date}.db`)
    fs.copyFileSync(dbPath, backupPath)

    return { success: true, path: backupPath }
  })

  ipcMain.handle('backup:get-last-time', () => {
    const setting = getDb().prepare("SELECT value FROM settings WHERE key = 'last_backup'").get()
    return setting ? setting.value : null
  })

  // ==================== PRINTER ====================
  ipcMain.handle('printer:list', async () => {
    return []
  })

  ipcMain.handle('printer:test', async (_, printerName) => {
    const { getPrinter } = await import('./printer')
    try {
      const p = getPrinter(printerName)
      if (!p) return { success: false, error: 'Printer not configured' }
      const isConnected = await p.isPrinterConnected()
      if (!isConnected) return { success: false, error: 'Printer not connected' }
      p.clear()
      p.println('ShoeShop POS Test Print')
      p.println('================')
      p.println('If you can read this,')
      p.println('your printer is working!')
      p.newLine()
      p.println(new Date().toLocaleString())
      p.cut()
      await p.execute()
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  // ==================== PRINT ====================
  ipcMain.handle('print:receipt', async (_, { saleId, printerName }) => {
    try {
      const db = getDb()
      const sale = db.prepare(`SELECT s.*, u.username FROM sales s LEFT JOIN users u ON s.user_id = u.id WHERE s.id = ?`).get(saleId)
      if (!sale) return { success: false, error: 'Sale not found' }

      const items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(saleId)
      const shopInfo = db.prepare('SELECT * FROM shop_info WHERE id = 1').get()

      const { generateReceiptContent, printReceipt } = await import('./printer')
      const receiptText = generateReceiptContent({ shopInfo, sale, items })

      return printReceipt(receiptText, printerName)
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('print:barcode-label', async (_, { barcode, productName, price, printerName }) => {
    const { printBarcodeLabel } = await import('./printer')
    return printBarcodeLabel(barcode, productName, price, printerName)
  })

  // ==================== BARCODE GENERATION ====================
  ipcMain.handle('barcode:generate', async (_, text) => {
    try {
      const bwipjs = await import('bwip-js')
      const buffer = await bwipjs.toBuffer({
        bcid: 'code128',
        text: text,
        scale: 3,
        height: 10,
        includetext: true,
        textxalign: 'center'
      })
      return { success: true, data: buffer.toString('base64') }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })
}
