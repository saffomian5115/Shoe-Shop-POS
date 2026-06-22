/**
 * Reset admin user — run with: node scripts/reset-admin.cjs
 * Resets the admin user to username: admin, password: admin, role: admin, active: 1
 */
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
  const db = new Database(DB_PATH)
  db.pragma('foreign_keys = ON')

  const hash = crypto.createHash('sha256').update('admin').digest('hex')
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get('admin')

  if (existing) {
    db.prepare('UPDATE users SET password_hash = ?, role = ?, active = 1 WHERE id = ?').run(hash, 'admin', existing.id)
    console.log('✅ Admin user reset: username=admin, password=admin, role=admin')
  } else {
    db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run('admin', hash, 'admin')
    console.log('✅ Admin user created: username=admin, password=admin, role=admin')
  }

  db.close()
}

main()
