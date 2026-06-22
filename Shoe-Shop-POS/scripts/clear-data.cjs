/**
 * Clear seed data script — run with: node scripts/clear-data.cjs
 * Removes all seedable data (products, sales, purchases, suppliers, brands, cashier users)
 * while keeping the app functional (admin user, categories, shop info, settings).
 *
 * To fully reset the database, just delete the file and restart the app.
 */
const path = require('path')

let Database
try {
  Database = require('better-sqlite3')
} catch (e) {
  console.error('❌ better-sqlite3 native module not available.')
  console.error('   Run: npm rebuild better-sqlite3')
  process.exit(1)
}

const DB_PATH = 'C:\\ProgramData\\ShoeShopPOS\\pos.db'
const fs = require('fs')

function main() {
  const mode = process.argv[2] || 'seed'

  if (mode === 'all') {
    // Delete the entire database file
    if (fs.existsSync(DB_PATH)) {
      // Also delete WAL and SHM files
      try { fs.unlinkSync(DB_PATH) } catch (e) {}
      try { fs.unlinkSync(DB_PATH + '-wal') } catch (e) {}
      try { fs.unlinkSync(DB_PATH + '-shm') } catch (e) {}
      console.log('✅ Database file deleted. Restart the app to create a fresh database.')
    } else {
      console.log('⚠️  Database file not found at: ' + DB_PATH)
    }
    return
  }

  // Partial clear: remove seedable data but keep schema + defaults
  console.log('Opening database...')
  const db = new Database(DB_PATH)
  db.pragma('foreign_keys = ON')

  console.log('Clearing seed data...')

  // Order matters due to foreign key constraints
  db.exec(`
    DELETE FROM sale_items;
    DELETE FROM sales;
    DELETE FROM purchase_items;
    DELETE FROM purchases;
    DELETE FROM stock_adjustments;
    DELETE FROM products;
    DELETE FROM brands;
    DELETE FROM suppliers;
    DELETE FROM users WHERE username IN ('cashier1', 'cashier2');
    DELETE FROM settings;
  `)

  db.close()
  console.log('✅ Seed data cleared! The app will recreate defaults (admin user, categories, shop info) on next start.')
}

main()
