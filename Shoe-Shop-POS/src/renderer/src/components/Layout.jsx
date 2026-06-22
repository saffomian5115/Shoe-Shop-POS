import { useState, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import { cn } from '../lib/utils'
import {
  LayoutDashboard, ShoppingCart, Package, Boxes, 
  BarChart3, Settings, LogOut, Menu, Sun, Moon,
  ChevronLeft, ChevronRight
} from 'lucide-react'
// User can place their shop icon file at: src/renderer/assets/icon.png
let shopIcon = null
try {
  shopIcon = new URL('../assets/icon.png', import.meta.url).href
} catch (e) {
  // Icon file not found — will show text only
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'cashier'] },
  { id: 'pos', label: 'POS / Billing', icon: ShoppingCart, roles: ['admin', 'cashier'] },
  { id: 'products', label: 'Products', icon: Package, roles: ['admin', 'cashier'] },
  { id: 'inventory', label: 'Inventory', icon: Boxes, roles: ['admin', 'cashier'] },
  { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['admin'] },
  { id: 'settings', label: 'Settings', icon: Settings, roles: ['admin'] }
]

export default function Layout({ children, currentPage, onNavigate }) {
  const { user, logout } = useAuthStore()
  const { theme, sidebarOpen, toggleSidebar, toggleTheme } = useUiStore()
  const [collapsed, setCollapsed] = useState(false)

  const visibleNavItems = navItems.filter(item => item.roles.includes(user?.role))

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Sidebar */}
      <aside className={cn(
        'flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-60'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              {shopIcon && (
                <img
                  src={shopIcon}
                  alt="Logo"
                  className="w-8 h-8 rounded-lg object-contain"
                  onError={(e) => { e.target.style.display = 'none' }}
                />
              )}
              <div>
                <h1 className="text-lg font-bold text-indigo-700 dark:text-indigo-400">Shoe Shop</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">POS System</p>
              </div>
            </div>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {visibleNavItems.map(item => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  currentPage === item.id
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={20} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-2 border-t border-gray-200 dark:border-gray-800 space-y-1">
          {!collapsed && (
            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 truncate">
              {user?.username} ({user?.role})
            </div>
          )}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            title={collapsed ? 'Toggle Theme' : undefined}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            {!collapsed && <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>}
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  )
}
