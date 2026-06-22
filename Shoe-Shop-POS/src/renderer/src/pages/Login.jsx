import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useUiStore } from '../store/uiStore'
import { LogIn, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const { login, loading } = useAuthStore()
  const { theme, toggleTheme } = useUiStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const saved = localStorage.getItem('remembered_user')
    if (saved) {
      setUsername(saved)
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!username || !password) {
      setError('Please enter username and password')
      return
    }
    const user = await login(username, password)
    if (!user) {
      setError('Invalid username or password')
      return
    }
    if (rememberMe) {
      localStorage.setItem('remembered_user', username)
    } else {
      localStorage.removeItem('remembered_user')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-gray-950 dark:to-indigo-950 p-4">
      {/* Theme Toggle */}
      <button onClick={toggleTheme} className="absolute top-4 right-4 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-all">
        {theme === 'light' ? <span className="text-lg">🌙</span> : <span className="text-lg">☀️</span>}
      </button>

      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-8 space-y-6">
          {/* Logo & Title */}
          <div className="text-center space-y-2">
            <div className="text-5xl mb-3">👟</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shoe Shop POS</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Point of Sale System</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="Enter username"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all pr-10"
                  placeholder="Enter password"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
              </label>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium transition-all duration-150 cursor-pointer"
            >
              {loading ? (
                <span className="animate-spin">⏳</span>
              ) : (
                <LogIn size={18} />
              )}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            Default: admin / admin
          </p>
        </div>
      </div>
    </div>
  )
}
