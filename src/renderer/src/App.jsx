import { useState, useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import { useUiStore } from './store/uiStore'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
import Products from './pages/Products'
import Inventory from './pages/Inventory'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

function App() {
  const { isAuthenticated, user } = useAuthStore()
  const { theme, setTheme, setCurrentPage } = useUiStore()
  const [currentPage, setPage] = useState('dashboard')

  // Load theme from settings on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await window.api.getSetting('theme')
        if (savedTheme) {
          setTheme(savedTheme)
        }
      } catch (e) {
        // Settings not available yet
      }
    }
    loadTheme()
  }, [])

  // Redirect based on role after login
  useEffect(() => {
    if (isAuthenticated && user) {
      const defaultPage = user.role === 'cashier' ? 'pos' : 'dashboard'
      setPage(defaultPage)
      setCurrentPage(defaultPage)
    }
  }, [isAuthenticated, user])

  const handleNavigate = (page) => {
    setPage(page)
    setCurrentPage(page)
  }

  // If not authenticated, show login
  if (!isAuthenticated) {
    return <Login />
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />
      case 'pos':
        return <POS />
      case 'products':
        return <Products />
      case 'inventory':
        return <Inventory />
      case 'reports':
        return <Reports />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard onNavigate={handleNavigate} />
    }
  }

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate}>
      {renderPage()}
    </Layout>
  )
}

export default App
