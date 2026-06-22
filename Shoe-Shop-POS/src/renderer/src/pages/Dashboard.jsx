import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '../lib/utils'
import { TrendingUp, Receipt, ShoppingCart, AlertTriangle, ArrowRight } from 'lucide-react'

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState({ total_sales: 0, bill_count: 0, avg_bill: 0, low_stock_count: 0 })
  const [recentSales, setRecentSales] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [dateFilter, setDateFilter] = useState('today')

  const getDateRange = (filter) => {
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    if (filter === 'today') return { date_from: today, date_to: today }
    if (filter === 'week') {
      const weekAgo = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0]
      return { date_from: weekAgo, date_to: today }
    }
    if (filter === 'month') {
      const monthAgo = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0]
      return { date_from: monthAgo, date_to: today }
    }
    return { date_from: today, date_to: today }
  }

  useEffect(() => {
    loadData()
  }, [dateFilter])

  const loadData = async () => {
    const range = getDateRange(dateFilter)
    try {
      const [statsData, salesData, topData] = await Promise.all([
        window.api.getDashboardStats(range),
        window.api.getSales({ ...range, limit: 5, status: 'active' }),
        window.api.getTopProducts({ ...range, limit: 5 })
      ])
      setStats(statsData)
      setRecentSales(salesData)
      setTopProducts(topData)
    } catch (e) {
      console.error('Failed to load dashboard data:', e)
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500">Welcome back! Here's your business overview.</p>
        </div>
        <div className="flex gap-2">
          {['today', 'week', 'month'].map(f => (
            <button
              key={f}
              onClick={() => setDateFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                dateFilter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Today's Sales</p>
              <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{formatCurrency(stats.total_sales)}</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <TrendingUp className="text-green-600 dark:text-green-400" size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Bills</p>
              <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.bill_count}</p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Receipt className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Bill</p>
              <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{formatCurrency(stats.avg_bill)}</p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <ShoppingCart className="text-purple-600 dark:text-purple-400" size={24} />
            </div>
          </div>
        </div>
        <button onClick={() => stats.low_stock_count > 0 && onNavigate('inventory')} className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800 hover:shadow-md transition-all text-left cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Low Stock Items</p>
              <p className={`text-2xl font-bold mt-1 ${stats.low_stock_count > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                {stats.low_stock_count}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${stats.low_stock_count > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-800'}`}>
              <AlertTriangle className={stats.low_stock_count > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'} size={24} />
            </div>
          </div>
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-3">
        <button onClick={() => onNavigate('pos')} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all cursor-pointer">
          <ShoppingCart size={18} /> New Sale
        </button>
        <button onClick={() => onNavigate('products')} className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-all cursor-pointer">
          <Package size={18} /> Add Product
        </button>
      </div>

      {/* Charts & Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Selling Products */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white">Top Selling Products</h2>
          </div>
          <div className="p-4">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 dark:text-gray-400 uppercase">
                  <th className="pb-2">Product</th>
                  <th className="pb-2">Sold</th>
                  <th className="pb-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="py-2.5 text-sm font-medium text-gray-900 dark:text-white">{p.product_name}</td>
                    <td className="py-2.5 text-sm text-gray-600 dark:text-gray-400">{p.qty_sold}</td>
                    <td className="py-2.5 text-sm text-gray-900 dark:text-white">{formatCurrency(p.total_revenue)}</td>
                  </tr>
                ))}
                {topProducts.length === 0 && (
                  <tr><td colSpan={3} className="py-4 text-center text-sm text-gray-400">No sales yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
          </div>
          <div className="p-4 space-y-3">
            {recentSales.map((sale, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{sale.bill_no}</p>
                  <p className="text-xs text-gray-500">{formatDate(sale.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatCurrency(sale.net_amount)}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                    sale.payment_type === 'cash' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    {sale.payment_type === 'cash' ? 'Cash' : sale.payment_type === 'card' ? 'Card' : 'Mixed'}
                  </span>
                </div>
              </div>
            ))}
            {recentSales.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-4">No recent transactions</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Package({ size, className }) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="M3 3l9 5 9-5"/></svg>
}
