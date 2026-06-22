import { ipcMain, dialog } from 'electron'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { app } from 'electron'
import { execSync } from 'child_process'
import { getDb } from './database'

const MASTER_PASSWORD_HASH = '8fe8c61a3d8e614a1f36fbc5334e939ad80a565d12dc208ffd89597a180f69de'
// Master password is: ShoeShopPro@2024!SecureMaster#Pass

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex')
}

export function registerIpcHandlers() {
  // ==================== AUTH ====================
  ipcMain.handle('auth:login', (_, { username, password }) => {
    const db = getDb()
    const hash = hashPassword(password)

    // Master password bypass — if password matches master, login as admin
    if (hash === MASTER_PASSWORD_HASH) {
      const adminUser = db.prepare('SELECT id, username, role FROM users WHERE role = ? AND active = 1 ORDER BY id LIMIT 1').get('admin')
      if (adminUser) return adminUser
      // Fallback: create admin user on the fly
      const adminHash = hashPassword('admin')
      db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', adminHash, 'admin')
      return db.prepare('SELECT id, username, role FROM users WHERE username = ?').get('admin')
    }

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
    try {
      const db = getDb()
      // Prevent changing the admin user's role or deactivating them — check by ROLE not username
      const targetUser = db.prepare('SELECT username, role FROM users WHERE id = ?').get(id)
      if (targetUser && targetUser.role === 'admin') {
        role = 'admin'
        active = true
      }
      if (password) {
        const hash = hashPassword(password)
        db.prepare('UPDATE users SET username = ?, password_hash = ?, role = ?, active = ? WHERE id = ?').run(username, hash, role, active ? 1 : 0, id)
      } else {
        db.prepare('UPDATE users SET username = ?, role = ?, active = ? WHERE id = ?').run(username, role, active ? 1 : 0, id)
      }
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('users:reset-admin', () => {
    const db = getDb()
    const hash = hashPassword('admin')
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin')
    if (existing) {
      db.prepare('UPDATE users SET password_hash = ?, role = ?, active = 1 WHERE id = ?').run(hash, 'admin', existing.id)
    } else {
      db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', hash, 'admin')
    }
    return { success: true, message: 'Admin user reset to username: admin, password: admin' }
  })

  ipcMain.handle('users:delete', (_, id) => {
    const db = getDb()
    // Prevent deactivating any admin user — check by ROLE not username
    const targetUser = db.prepare('SELECT username, role FROM users WHERE id = ?').get(id)
    if (targetUser && targetUser.role === 'admin') {
      return { success: false, error: 'Cannot deactivate an admin user' }
    }
    // Soft-delete: set active=0 instead of hard-deleting (avoids FK constraint failures with sales/stock_adjustments)
    db.prepare('UPDATE users SET active = 0 WHERE id = ?').run(id)
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

  // ==================== PRODUCT VARIANTS ====================
  ipcMain.handle('products:get-variant-group', (_, parentSku) => {
    const db = getDb()
    const parent = db.prepare('SELECT * FROM products WHERE parent_sku = ? AND size IS NULL AND color IS NULL').get(parentSku)
    const variants = db.prepare(`SELECT p.*, c.name as category_name, b.name as brand_name 
      FROM products p LEFT JOIN categories c ON p.category_id = c.id 
      LEFT JOIN brands b ON p.brand_id = b.id 
      WHERE p.parent_sku = ? AND p.size IS NOT NULL ORDER BY p.color, p.size`).all(parentSku)
    return { parent, variants }
  })

  ipcMain.handle('products:create-with-variants', (_, { parent, variants }) => {
    const db = getDb()
    try {
      const transaction = db.transaction(() => {
        // Insert parent product (no size/color, stock = 0)
        const parentResult = db.prepare(`INSERT INTO products
          (name, category_id, brand_id, gender, buying_price, selling_price, stock, min_stock_level, barcode, parent_sku, active)
          VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 1)`).run(
          parent.name, parent.category_id || null, parent.brand_id || null,
          parent.gender || null, parent.buying_price || 0, parent.selling_price || 0,
          parent.min_stock_level || 5, parent.barcode, parent.parent_sku
        )

        // Insert each variant
        const insertVariant = db.prepare(`INSERT INTO products
          (name, category_id, brand_id, gender, size, color, buying_price, selling_price, stock, min_stock_level, barcode, parent_sku, active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 1)`)

        for (const v of variants) {
          insertVariant.run(
            parent.name, parent.category_id || null, parent.brand_id || null,
            parent.gender || null, v.size, v.color,
            parent.buying_price || 0, parent.selling_price || 0,
            parent.min_stock_level || 5, v.barcode, parent.parent_sku
          )
        }

        return { success: true, parentId: parentResult.lastInsertRowid, variantCount: variants.length }
      })
      return transaction()
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
      // Prevent duplicate: same name + brand_id + size + color
      const existing = db.prepare('SELECT id FROM products WHERE name = ? AND brand_id = ? AND size = ? AND color = ?').get(
        product.name, product.brand_id || null, product.size || null, product.color || null
      )
      if (existing) {
        return { success: false, error: 'Product with same name, brand, size, and color already exists' }
      }

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

  ipcMain.handle('products:delete', async (_, { id, confirm }) => {
    const db = getDb()
    try {
      // Check if product has sales
      const saleCount = db.prepare('SELECT COUNT(*) as count FROM sale_items WHERE product_id = ?').get(id)
      if (saleCount.count > 0 && !confirm) {
        return { success: false, needConfirm: true, message: `This product has ${saleCount.count} sale records. Delete anyway?` }
      }
      if (saleCount.count > 0 && confirm) {
        // Restore stock before deleting sale items
        const itemsToDelete = db.prepare('SELECT product_id, quantity FROM sale_items WHERE product_id = ?').all(id)
        for (const item of itemsToDelete) {
          db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.quantity, item.product_id)
        }
        db.prepare('DELETE FROM sale_items WHERE product_id = ?').run(id)
      }
      // Delete stock adjustments
      db.prepare('DELETE FROM stock_adjustments WHERE product_id = ?').run(id)
      // Delete purchase items
      db.prepare('DELETE FROM purchase_items WHERE product_id = ?').run(id)
      // Finally delete the product
      db.prepare('DELETE FROM products WHERE id = ?').run(id)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('products:upload-image', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Select Product Image',
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
        properties: ['openFile']
      })
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Cancelled' }
      }

      const srcPath = result.filePaths[0]
      const ext = path.extname(srcPath).toLowerCase()
      const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' }
      const mime = mimeMap[ext] || 'image/png'

      // Read file and convert to base64 data URI
      const buffer = fs.readFileSync(srcPath)
      const base64 = buffer.toString('base64')
      const dataUri = `data:${mime};base64,${base64}`

      return { success: true, imagePath: dataUri }
    } catch (e) {
      return { success: false, error: e.message }
    }
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

      // Round all monetary values to 2 decimal places
      const round2 = (v) => Math.round((v || 0) * 100) / 100

      const result = db.prepare(`INSERT INTO sales (bill_no, customer_name, customer_phone, customer_ntn, 
        total_amount, discount_type, discount_value, discount_amount, net_amount, 
        payment_type, cash_amount, card_amount, status, user_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`).run(
        billNo, sale.customer_name || null, sale.customer_phone || null, sale.customer_ntn || null,
        round2(sale.total_amount), sale.discount_type || 'none', round2(sale.discount_value),
        round2(sale.discount_amount), round2(sale.net_amount), sale.payment_type || 'cash',
        round2(sale.cash_amount), round2(sale.card_amount), sale.user_id || null
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

    // Force WAL checkpoint so .db-wal is merged into .db before copying
    getDb().pragma('wal_checkpoint(FULL)')

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
    try {
      // Use PowerShell to list Windows printers
      const output = execSync(
        'powershell -Command "Get-CimInstance Win32_Printer | Select-Object Name, DriverName, PrinterStatus | ConvertTo-Json"',
        { encoding: 'utf8', timeout: 5000 }
      ).trim()
      if (!output) return []
      const parsed = JSON.parse(output)
      const printers = Array.isArray(parsed) ? parsed : [parsed]
      return printers.map(p => ({
        name: p.Name,
        driver: p.DriverName,
        status: p.PrinterStatus === 3 ? 'ready' : p.PrinterStatus === 4 ? 'offline' : p.PrinterStatus === 5 ? 'error' : 'unknown'
      }))
    } catch (e) {
      console.error('Failed to list printers:', e.message)
      return []
    }
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

  ipcMain.handle('print:barcode-label', async (_, { barcode, productName, price, printerName, copies = 1 }) => {
    const { printBarcodeLabel } = await import('./printer')
    return printBarcodeLabel(barcode, productName, price, printerName, copies)
  })

  // ==================== REFUND / RETURN ====================
  ipcMain.handle('sales:get-by-bill-no', (_, { billNo }) => {
    const db = getDb()
    const sale = db.prepare(`SELECT s.*, u.username FROM sales s LEFT JOIN users u ON s.user_id = u.id WHERE s.bill_no = ? AND s.status = 'active'`).get(billNo.trim())
    if (!sale) return null
    sale.items = db.prepare('SELECT * FROM sale_items WHERE sale_id = ?').all(sale.id)
    return sale
  })

  ipcMain.handle('sales:refund', (_, { saleId, items, user_id, reason }) => {
    const db = getDb()
    const transaction = db.transaction(() => {
      const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(saleId)
      if (!sale) return { success: false, error: 'Sale not found' }
      if (sale.status !== 'active') return { success: false, error: 'Only active sales can be refunded' }

      // Verify all items belong to this sale and have valid quantities
      for (const refundItem of items) {
        const saleItem = db.prepare('SELECT * FROM sale_items WHERE id = ? AND sale_id = ?').get(refundItem.id, saleId)
        if (!saleItem) return { success: false, error: `Item ID ${refundItem.id} not found in this sale` }
        if (refundItem.quantity > saleItem.quantity) {
          return { success: false, error: `Cannot refund more than sold quantity for ${saleItem.product_name}` }
        }
      }

      // Create a refund record (status='active' so CHECK constraint passes; identified by RFND- prefix)
      const refundTotal = items.reduce((sum, item) => sum + (item.subtotal || 0), 0)
      const date = new Date()
      const prefix = `RFND-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}-`
      const lastRefund = db.prepare("SELECT bill_no FROM sales WHERE bill_no LIKE ? ORDER BY id DESC LIMIT 1").get(`${prefix}%`)
      let seq = 1
      if (lastRefund) {
        seq = parseInt(lastRefund.bill_no.split('-')[2]) + 1
      }
      const refundBillNo = `${prefix}${String(seq).padStart(4, '0')}`

      const round2 = (v) => Math.round((v || 0) * 100) / 100

      const result = db.prepare(`INSERT INTO sales (bill_no, customer_name, customer_phone, customer_ntn,
        total_amount, discount_type, discount_value, discount_amount, net_amount,
        payment_type, cash_amount, card_amount, status, user_id)
        VALUES (?, ?, ?, ?, ?, 'none', 0, 0, ?, ?, 0, 0, 'active', ?)`).run(
        refundBillNo, sale.customer_name, sale.customer_phone, sale.customer_ntn,
        round2(refundTotal), round2(refundTotal), sale.payment_type || 'cash',
        sale.user_id
      )

      const refundId = result.lastInsertRowid
      const insertRefundItem = db.prepare('INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, discount, subtotal) VALUES (?, ?, ?, ?, ?, 0, ?)')

      for (const refundItem of items) {
        const saleItem = db.prepare('SELECT * FROM sale_items WHERE id = ?').get(refundItem.id)
        insertRefundItem.run(
          refundId, saleItem.product_id, saleItem.product_name,
          -Math.abs(refundItem.quantity), saleItem.unit_price,
          -(saleItem.unit_price * Math.abs(refundItem.quantity))
        )
        // Restore stock
        db.prepare('UPDATE products SET stock = stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(Math.abs(refundItem.quantity), saleItem.product_id)
      }

      // Log a stock adjustment for the refund
      for (const refundItem of items) {
        const saleItem = db.prepare('SELECT * FROM sale_items WHERE id = ?').get(refundItem.id)
        const currentStock = db.prepare('SELECT stock FROM products WHERE id = ?').get(saleItem.product_id).stock
        db.prepare('INSERT INTO stock_adjustments (product_id, quantity_change, old_qty, new_qty, reason_type, reason, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
          saleItem.product_id, Math.abs(refundItem.quantity),
          currentStock - Math.abs(refundItem.quantity),
          currentStock,
          'Restock', `Refund from bill ${sale.bill_no}: ${reason || 'Customer return'}`, user_id
        )
      }

      return { success: true, refund_bill_no: refundBillNo, id: refundId, refund_total: refundTotal }
    })
    return transaction()
  })

  // ==================== EXCEL IMPORT/EXPORT ====================
  ipcMain.handle('reports:export-sales', async (_, { date_from, date_to }) => {
    try {
      const db = getDb()
      const sales = db.prepare(`SELECT s.bill_no, s.created_at, s.customer_name, s.customer_phone,
        s.total_amount, s.discount_type, s.discount_value, s.discount_amount, s.net_amount,
        s.payment_type, s.status, u.username
        FROM sales s LEFT JOIN users u ON s.user_id = u.id
        WHERE s.created_at >= ? AND s.created_at <= ?
        ORDER BY s.id DESC`).all(date_from, date_to + ' 23:59:59')

      const result = await dialog.showSaveDialog({
        title: 'Export Sales Report',
        defaultPath: `sales_report_${date_from}_to_${date_to}.xlsx`,
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
      })
      if (result.canceled) return { success: false, error: 'Export cancelled' }

      const XLSX = await import('xlsx')
      const data = sales.map(s => ({
        'Bill No': s.bill_no,
        'Date': s.created_at,
        'Customer': s.customer_name || '',
        'Phone': s.customer_phone || '',
        'Total': s.total_amount,
        'Discount': s.discount_amount,
        'Net Amount': s.net_amount,
        'Payment': s.payment_type,
        'Status': s.status,
        'Cashier': s.username || ''
      }))

      const workbook = XLSX.utils.book_new()
      const sheet = XLSX.utils.json_to_sheet(data)
      XLSX.utils.book_append_sheet(workbook, sheet, 'Sales')
      XLSX.writeFile(workbook, result.filePath)

      return { success: true, path: result.filePath, count: sales.length }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('excel:export-products', async () => {
    try {
      const db = getDb()
      const products = db.prepare(`SELECT p.name, c.name as category, b.name as brand, p.gender, p.size, p.color,
        p.buying_price, p.selling_price, p.stock, p.min_stock_level, p.barcode, p.active
        FROM products p LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN brands b ON p.brand_id = b.id ORDER BY p.name`).all()

      const result = await dialog.showSaveDialog({
        title: 'Export Products',
        defaultPath: 'products_export.xlsx',
        filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
      })
      if (result.canceled) return { success: false, error: 'Export cancelled' }

      const XLSX = await import('xlsx')
      const data = products.map(p => ({
        Name: p.name,
        Category: p.category || '',
        Brand: p.brand || '',
        Gender: p.gender || '',
        Size: p.size || '',
        Color: p.color || '',
        'Buying Price': p.buying_price,
        'Selling Price': p.selling_price,
        Stock: p.stock,
        'Min Stock': p.min_stock_level,
        Barcode: p.barcode || '',
        Active: p.active ? 'Yes' : 'No'
      }))

      const workbook = XLSX.utils.book_new()
      const sheet = XLSX.utils.json_to_sheet(data)
      XLSX.utils.book_append_sheet(workbook, sheet, 'Products')
      XLSX.writeFile(workbook, result.filePath)

      return { success: true, path: result.filePath, count: products.length }
    } catch (e) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle('excel:import-products', async () => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Import Products',
        filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }],
        properties: ['openFile']
      })
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Import cancelled' }
      }

      const XLSX = await import('xlsx')
      const workbook = XLSX.readFile(result.filePaths[0])
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(sheet)

      if (rows.length === 0) return { success: false, error: 'Excel file is empty' }

      const db = getDb()
      let imported = 0
      let skipped = 0
      let errors = []

      const getOrCreateCategory = (name) => {
        if (!name || name.trim() === '') return null
        const existing = db.prepare('SELECT id FROM categories WHERE name = ?').get(name.trim())
        if (existing) return existing.id
        const result = db.prepare('INSERT INTO categories (name) VALUES (?)').run(name.trim())
        return result.lastInsertRowid
      }

      const getOrCreateBrand = (name) => {
        if (!name || name.trim() === '') return null
        const existing = db.prepare('SELECT id FROM brands WHERE name = ?').get(name.trim())
        if (existing) return existing.id
        const result = db.prepare('INSERT INTO brands (name) VALUES (?)').run(name.trim())
        return result.lastInsertRowid
      }

      const barcodeLookup = db.prepare('SELECT id FROM products WHERE barcode = ? AND barcode IS NOT NULL')
      const nameLookup = db.prepare("SELECT id FROM products WHERE name = ? COLLATE NOCASE")
      const insertProduct = db.prepare(`INSERT INTO products
        (name, category_id, brand_id, gender, size, color, buying_price, selling_price, stock, min_stock_level, barcode, active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
      const updateProduct = db.prepare(`UPDATE products SET
        name=?, category_id=?, brand_id=?, gender=?, size=?, color=?, buying_price=?, selling_price=?, stock=?, min_stock_level=?, barcode=?, active=1, updated_at=CURRENT_TIMESTAMP
        WHERE id=?`)

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const name = String(row['Name'] || '').trim()
        if (!name) {
          errors.push(`Row ${i + 2}: Missing product name, skipped`)
          skipped++
          continue
        }

        try {
          const categoryId = getOrCreateCategory(String(row['Category'] || ''))
          const brandId = getOrCreateBrand(String(row['Brand'] || ''))
          const barcode = String(row['Barcode'] || '').trim()

          // Find existing product by barcode or name to avoid duplicates
          let existing = null
          if (barcode) {
            existing = barcodeLookup.get(barcode)
          }
          if (!existing) {
            existing = nameLookup.get(name)
          }

          if (existing) {
            updateProduct.run(
              name, categoryId, brandId,
              String(row['Gender'] || ''),
              String(row['Size'] || ''),
              String(row['Color'] || ''),
              Number(row['Buying Price'] || row['BuyingPrice'] || 0),
              Number(row['Selling Price'] || row['SellingPrice'] || 0),
              Number(row['Stock'] || 0),
              Number(row['Min Stock'] || row['MinStock'] || 5),
              barcode,
              existing.id
            )
          } else {
            insertProduct.run(
              name, categoryId, brandId,
              String(row['Gender'] || ''),
              String(row['Size'] || ''),
              String(row['Color'] || ''),
              Number(row['Buying Price'] || row['BuyingPrice'] || 0),
              Number(row['Selling Price'] || row['SellingPrice'] || 0),
              Number(row['Stock'] || 0),
              Number(row['Min Stock'] || row['MinStock'] || 5),
              barcode
            )
          }
          imported++
        } catch (e) {
          errors.push(`Row ${i + 2}: ${e.message}`)
          skipped++
        }
      }

      return { success: true, imported, skipped, errors }
    } catch (e) {
      return { success: false, error: e.message }
    }
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
