import { app } from 'electron'
import { join } from 'path'
import fs from 'fs'
import Database from 'better-sqlite3'
import crypto from 'crypto'

let db = null

const DB_PATH = 'C:\\ProgramData\\ShoeShopPOS\\pos.db'

export function getDb() {
  if (!db) {
    const dir = 'C:\\ProgramData\\ShoeShopPOS'
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

export async function initializeDatabase() {
  const database = getDb()

  database.exec(`
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

  // Seed default admin user if no users exist
  const userCount = database.prepare('SELECT COUNT(*) as count FROM users').get()
  if (userCount.count === 0) {
    const hash = crypto.createHash('sha256').update('admin').digest('hex')
    database.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', hash, 'admin')
  }

  // Seed default shop info
  const shopCount = database.prepare('SELECT COUNT(*) as count FROM shop_info').get()
  if (shopCount.count === 0) {
    database.prepare('INSERT INTO shop_info DEFAULT VALUES').run()
  }

  // Seed default categories if none exist
  const catCount = database.prepare('SELECT COUNT(*) as count FROM categories').get()
  if (catCount.count === 0) {
    const defaultCats = ['Sneakers', 'Sandals', 'Formal', 'Casual', 'Sports', 'Boots', 'Slippers', 'Heels']
    const insert = database.prepare('INSERT INTO categories (name) VALUES (?)')
    defaultCats.forEach(cat => insert.run(cat))
  }

  // Safety net: ensure admin user always exists with correct role and is active
  const adminUser = database.prepare('SELECT id, role, active FROM users WHERE username = ?').get('admin')
  if (!adminUser) {
    const hash = crypto.createHash('sha256').update('admin').digest('hex')
    database.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', hash, 'admin')
  } else {
    // Fix admin role if accidentally changed
    if (adminUser.role !== 'admin' || adminUser.active !== 1) {
      database.prepare('UPDATE users SET role = ?, active = 1 WHERE id = ?').run('admin', adminUser.id)
      console.log('⚠️  Admin user was corrupted — fixed role and reactivated')
    }
  }

  console.log('Database initialized successfully')
}

export function closeDatabase() {
  if (db) {
    db.close()
    db = null
  }
}
