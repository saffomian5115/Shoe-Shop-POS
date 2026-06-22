import { useEffect, useState } from 'react'
import { useUiStore } from '../store/uiStore'
import { Save, Users, Printer, Database, Download, Upload, Sun, Moon, Building2, TestTube, Edit2 } from 'lucide-react'

export default function Settings() {
  const { theme, toggleTheme } = useUiStore()
  const [activeTab, setActiveTab] = useState('shop')
  const [shopInfo, setShopInfo] = useState({ shop_name: '', address: '', phone: '', receipt_header: '', receipt_footer: '', logo_path: '' })
  const [users, setUsers] = useState([])
  const [showUserForm, setShowUserForm] = useState(false)
  const [showEditUser, setShowEditUser] = useState(null)
  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'cashier' })
  const [editUserForm, setEditUserForm] = useState({ id: null, username: '', password: '', role: 'cashier', active: true, isAdmin: false })
  const [backupStatus, setBackupStatus] = useState('')
  const [lastBackup, setLastBackup] = useState(null)
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [newCategory, setNewCategory] = useState('')
  const [newBrand, setNewBrand] = useState('')
  const [printerName, setPrinterName] = useState('')
  const [printerStatus, setPrinterStatus] = useState('')

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const [shop, usrs, cats, brds, lastBk, savedPrinterName] = await Promise.all([
        window.api.getShopInfo(),
        window.api.getUsers(),
        window.api.getCategories(),
        window.api.getBrands(),
        window.api.getLastBackupTime(),
        window.api.getSetting('printer_name')
      ])
      setShopInfo(shop || {})
      setUsers(usrs)
      setCategories(cats)
      setBrands(brds)
      setLastBackup(lastBk)
      if (savedPrinterName) setPrinterName(savedPrinterName)
    } catch (e) { console.error(e) }
  }

  const saveShopInfo = async () => {
    await window.api.updateShopInfo(shopInfo)
    setBackupStatus('Shop info saved!')
    setTimeout(() => setBackupStatus(''), 2000)
  }

  const createUser = async () => {
    const result = await window.api.createUser(userForm)
    if (result.success) {
      setShowUserForm(false)
      setUserForm({ username: '', password: '', role: 'cashier' })
      loadSettings()
    }
  }

  const deleteUser = async (id) => {
    if (confirm('Deactivate this user? They will no longer be able to log in.')) {
      await window.api.deleteUser(id)
      loadSettings()
    }
  }

  const openEditUser = (user) => {
    setEditUserForm({ id: user.id, username: user.username, password: '', role: user.role, active: user.active, isAdmin: user.username === 'admin' })
    setShowEditUser(user)
  }

  const saveEditUser = async () => {
    const data = { id: editUserForm.id, username: editUserForm.username, role: editUserForm.role, active: editUserForm.active }
    if (editUserForm.password) data.password = editUserForm.password
    const result = await window.api.updateUser(data)
    if (result.success) {
      setShowEditUser(null)
      loadSettings()
    }
  }

  const handleBackup = async () => {
    try {
      const result = await window.api.backupLocal()
      if (result.success) {
        setBackupStatus(`Backup saved to: ${result.path}`)
        await window.api.setSetting({ key: 'last_backup', value: new Date().toISOString() })
        setLastBackup(new Date().toISOString())
        setTimeout(() => setBackupStatus(''), 5000)
      }
    } catch (e) {
      setBackupStatus('Backup failed: ' + e.message)
    }
  }

  const addCategory = async () => {
    if (!newCategory.trim()) return
    await window.api.createCategory({ name: newCategory })
    setNewCategory('')
    loadSettings()
  }

  const addBrand = async () => {
    if (!newBrand.trim()) return
    await window.api.createBrand({ name: newBrand })
    setNewBrand('')
    loadSettings()
  }

  const handleTestPrint = async () => {
    if (!printerName) {
      setPrinterStatus('❌ Please enter a printer name first')
      return
    }
    setPrinterStatus('⏳ Testing printer...')
    try {
      const result = await window.api.testPrinter(printerName)
      if (result.success) {
        setPrinterStatus('✅ Test print sent successfully! Check your printer.')
      } else {
        setPrinterStatus(`❌ ${result.error}`)
      }
    } catch (e) {
      setPrinterStatus(`❌ ${e.message}`)
    }
    setTimeout(() => setPrinterStatus(''), 5000)
  }

  const tabs = [
    { id: 'shop', label: 'Shop Info', icon: Building2 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'printer', label: 'Printer', icon: Printer },
    { id: 'backup', label: 'Backup', icon: Database },
    { id: 'theme', label: 'Theme', icon: theme === 'light' ? Sun : Moon }
  ]

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500">Configure your shop and system preferences</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
              <Icon size={16} /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* Shop Info */}
      {activeTab === 'shop' && (
        <div className="max-w-xl space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shop Name</label>
              <input type="text" value={shopInfo.shop_name} onChange={(e) => setShopInfo({ ...shopInfo, shop_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
              <textarea value={shopInfo.address} onChange={(e) => setShopInfo({ ...shopInfo, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm" rows={2} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input type="text" value={shopInfo.phone} onChange={(e) => setShopInfo({ ...shopInfo, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Receipt Header</label>
              <input type="text" value={shopInfo.receipt_header} onChange={(e) => setShopInfo({ ...shopInfo, receipt_header: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="Custom header on receipts" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Receipt Footer</label>
              <input type="text" value={shopInfo.receipt_footer} onChange={(e) => setShopInfo({ ...shopInfo, receipt_footer: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm" placeholder="Thank you for shopping!" />
            </div>
            <button onClick={saveShopInfo} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all cursor-pointer">
              <Save size={18} /> Save Shop Info
            </button>
            {backupStatus && <p className="text-sm text-green-600">{backupStatus}</p>}
          </div>

          {/* Categories & Brands */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Categories</h3>
              <div className="flex gap-2 mb-3">
                <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="New category"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none" />
                <button onClick={addCategory} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg cursor-pointer">Add</button>
              </div>
              <div className="space-y-1">
                {categories.map(c => (
                  <div key={c.id} className="flex items-center justify-between px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Brands</h3>
              <div className="flex gap-2 mb-3">
                <input type="text" value={newBrand} onChange={(e) => setNewBrand(e.target.value)} placeholder="New brand"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none" />
                <button onClick={addBrand} className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg cursor-pointer">Add</button>
              </div>
              <div className="space-y-1">
                {brands.map(b => (
                  <div key={b.id} className="flex items-center justify-between px-2 py-1.5 bg-gray-50 dark:bg-gray-800 rounded text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users */}
      {activeTab === 'users' && (
        <div className="max-w-xl">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">User Management</h3>
              <button onClick={() => setShowUserForm(true)} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg cursor-pointer">
                + Add User
              </button>
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800">
                  <th className="p-3">Username</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Active</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="p-3 text-sm font-medium text-gray-900 dark:text-white">{u.username}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${u.role === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>{u.role}</span>
                    </td>
                    <td className="p-3">
                      <span className={`text-xs font-medium ${u.active ? 'text-green-600' : 'text-red-600'}`}>{u.active ? 'Yes' : 'No'}</span>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEditUser(u)} className="text-xs text-indigo-600 hover:text-indigo-700 cursor-pointer flex items-center gap-1"><Edit2 size={14} /> Edit</button>
                        {u.username !== 'admin' && (
                          <button onClick={() => deleteUser(u.id)} className="text-xs text-red-600 hover:text-red-700 cursor-pointer">Deactivate</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showUserForm && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowUserForm(false)}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Add User</h3>
                <div className="space-y-3">
                  <input type="text" placeholder="Username" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none text-sm" />
                  <input type="password" placeholder="Password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none text-sm" />
                  <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none text-sm">
                    <option value="cashier">Cashier</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex gap-2 mt-6">
                  <button onClick={() => setShowUserForm(false)} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm cursor-pointer">Cancel</button>
                  <button onClick={createUser} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold cursor-pointer">Create User</button>
                </div>
              </div>
            </div>
          )}

          {/* Edit User Modal */}
          {showEditUser && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowEditUser(null)}>
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Edit User</h3>
                <div className="space-y-3">
                  <input type="text" placeholder="Username" value={editUserForm.username} onChange={(e) => setEditUserForm({ ...editUserForm, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none text-sm" />
                  <input type="password" placeholder="New password (leave empty to keep current)" value={editUserForm.password} onChange={(e) => setEditUserForm({ ...editUserForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white outline-none text-sm" />
                  <div>
                    <select value={editUserForm.role} onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                      disabled={editUserForm.isAdmin}
                      className={`w-full px-3 py-2 border rounded-lg text-sm outline-none ${editUserForm.isAdmin ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-300 dark:border-gray-600'}`}>
                      <option value="cashier">Cashier</option>
                      <option value="admin">Admin</option>
                    </select>
                    {editUserForm.isAdmin && <p className="text-xs text-amber-600 mt-1">🔒 Admin role cannot be changed</p>}
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <input type="checkbox" checked={editUserForm.active} onChange={(e) => setEditUserForm({ ...editUserForm, active: e.target.checked })}
                      disabled={editUserForm.isAdmin}
                      className={`rounded border-gray-300 dark:border-gray-600 ${editUserForm.isAdmin ? 'cursor-not-allowed opacity-50' : 'text-indigo-600 focus:ring-indigo-500'}`} />
                    Active (can log in)
                    {editUserForm.isAdmin && <span className="text-xs text-amber-600">(always active)</span>}
                  </label>
                </div>
                <div className="flex gap-2 mt-6">
                  <button onClick={() => setShowEditUser(null)} className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm cursor-pointer">Cancel</button>
                  <button onClick={saveEditUser} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold cursor-pointer">Save Changes</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Printer Setup */}
      {activeTab === 'printer' && (
        <div className="max-w-xl space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Thermal Printer Setup</h3>
              <p className="text-sm text-gray-500 mt-1">Configure your 80mm thermal receipt printer</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Printer Name</label>
              <p className="text-xs text-gray-500 mb-2">Enter the printer name as shown in Windows Settings &gt; Printers &amp; Scanners</p>
              <input type="text" value={printerName} onChange={(e) => { setPrinterName(e.target.value); window.api.setSetting({ key: 'printer_name', value: e.target.value }) }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                placeholder="e.g. EPSON TM-T20" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleTestPrint} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all cursor-pointer">
                <TestTube size={18} /> Test Print
              </button>
            </div>
            {printerStatus && (
              <p className={`text-sm ${printerStatus.includes('✅') ? 'text-green-600' : printerStatus.includes('❌') ? 'text-red-600' : 'text-gray-600'}`}>
                {printerStatus}
              </p>
            )}
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-sm text-blue-700 dark:text-blue-400">
              💡 Make sure your thermal printer is installed as a Windows printer driver. 
              The printer name must match exactly what appears in Windows Settings → Printers &amp; Scanners.
              Receipts will be formatted for 80mm thermal paper.
            </p>
          </div>
        </div>
      )}

      {/* Backup */}
      {activeTab === 'backup' && (
        <div className="max-w-md space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Database Backup</h3>
              <p className="text-sm text-gray-500 mt-1">Backup your SQLite database to Documents folder</p>
            </div>
            {lastBackup && (
              <p className="text-sm text-gray-500">Last backup: {new Date(lastBackup).toLocaleString()}</p>
            )}
            <button onClick={handleBackup} className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all cursor-pointer">
              <Download size={18} /> Backup Now
            </button>
            {backupStatus && (
              <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-2 rounded">{backupStatus}</p>
            )}
          </div>
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              ⚡ Google Drive backup integration coming soon. For now, backups are saved locally to your Documents folder.
            </p>
          </div>
        </div>
      )}

      {/* Theme */}
      {activeTab === 'theme' && (
        <div className="max-w-md">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Appearance</h3>
                <p className="text-sm text-gray-500">Toggle between light and dark mode</p>
              </div>
              <button onClick={toggleTheme} className={`relative w-14 h-7 rounded-full transition-all cursor-pointer ${theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                <div className={`absolute w-5 h-5 bg-white rounded-full top-1 transition-all flex items-center justify-center ${theme === 'dark' ? 'left-8' : 'left-1'}`}>
                  {theme === 'dark' ? '🌙' : '☀️'}
                </div>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${theme === 'light' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700'}`} onClick={() => theme === 'dark' && toggleTheme()}>
                <Sun size={24} className="text-amber-500 mb-2" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">Light</p>
                <p className="text-xs text-gray-500">Default bright theme</p>
              </div>
              <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${theme === 'dark' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700'}`} onClick={() => theme === 'light' && toggleTheme()}>
                <Moon size={24} className="text-indigo-400 mb-2" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">Dark</p>
                <p className="text-xs text-gray-500">Easy on the eyes</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
