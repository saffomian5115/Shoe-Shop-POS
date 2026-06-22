import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '../lib/utils'
import { Download, Printer, BarChart3, TrendingUp, PieChart } from 'lucide-react'

export default function Reports() {
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0])
  const [salesData, setSalesData] = useState([])
  const [profitData, setProfitData] = useState([])
  const [categoryData, setCategoryData] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [recentBills, setRecentBills] = useState([])
  const [activeTab, setActiveTab] = useState('sales')

  useEffect(() => {
    if (dateFrom && dateTo) loadReports()
  }, [dateFrom, dateTo])

  const loadReports = async () => {
    try {
      const [sales, profit, catData, topProd, bills] = await Promise.all([
        window.api.getSalesReport({ date_from: dateFrom, date_to: dateTo }),
        window.api.getProfitReport({ date_from: dateFrom, date_to: dateTo }),
        window.api.getCategoryBreakdown({ date_from: dateFrom, date_to: dateTo }),
        window.api.getTopProducts({ date_from: dateFrom, date_to: dateTo, limit: 10 }),
        window.api.getSales({ date_from: dateFrom, date_to: dateTo, status: 'active' })
      ])
      setSalesData(sales)
      setProfitData(profit)
      setCategoryData(catData)
      setTopProducts(topProd)
      setRecentBills(bills)
    } catch (e) { console.error(e) }
  }

  const totals = {
    revenue: profitData.reduce((sum, p) => sum + p.revenue, 0),
    cost: profitData.reduce((sum, p) => sum + p.cost, 0),
    profit: profitData.reduce((sum, p) => sum + p.profit, 0)
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-sm text-gray-500">Analyze your business performance</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm outline-none" />
          <span className="text-gray-400">to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm outline-none" />
        </div>
      </div>

      {/* Summary Cards */}
      {activeTab !== 'bills' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
            <p className="text-2xl font-bold mt-1 text-green-600">{formatCurrency(totals.revenue)}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Cost</p>
            <p className="text-2xl font-bold mt-1 text-orange-600">{formatCurrency(totals.cost)}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl p-5 border border-gray-200 dark:border-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">Net Profit</p>
            <p className="text-2xl font-bold mt-1 text-indigo-600">{formatCurrency(totals.profit)}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        {[
          { id: 'sales', label: 'Sales', icon: BarChart3 },
          { id: 'products', label: 'Top Products', icon: TrendingUp },
          { id: 'categories', label: 'Categories', icon: PieChart },
          { id: 'bills', label: 'Bill History', icon: Printer }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all cursor-pointer ${
              activeTab === tab.id
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}>
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Sales Report */}
      {activeTab === 'sales' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800">
                <th className="p-3">Period</th>
                <th className="p-3">Bills</th>
                <th className="p-3">Revenue</th>
                <th className="p-3">Discount</th>
                <th className="p-3">Net</th>
              </tr>
            </thead>
            <tbody>
              {salesData.map((row, i) => (
                <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="p-3 text-sm text-gray-900 dark:text-white">{row.period}</td>
                  <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{row.bill_count}</td>
                  <td className="p-3 text-sm text-gray-900 dark:text-white">{formatCurrency(row.revenue)}</td>
                  <td className="p-3 text-sm text-red-600">{formatCurrency(row.total_discount)}</td>
                  <td className="p-3 text-sm font-semibold text-green-600">{formatCurrency(row.revenue - row.total_discount)}</td>
                </tr>
              ))}
              {salesData.length === 0 && <tr><td colSpan={5} className="text-center text-sm text-gray-400 py-8">No data for selected period</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Top Products */}
      {activeTab === 'products' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800">
                <th className="p-3">#</th>
                <th className="p-3">Product</th>
                <th className="p-3">Qty Sold</th>
                <th className="p-3">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => (
                <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="p-3 text-sm text-gray-500">{i + 1}</td>
                  <td className="p-3 text-sm font-medium text-gray-900 dark:text-white">{p.product_name}</td>
                  <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{p.qty_sold}</td>
                  <td className="p-3 text-sm text-gray-900 dark:text-white">{formatCurrency(p.total_revenue)}</td>
                </tr>
              ))}
              {topProducts.length === 0 && <tr><td colSpan={4} className="text-center text-sm text-gray-400 py-8">No sales data</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Categories */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Category Breakdown</h3>
            <div className="space-y-3">
              {categoryData.map((cat, i) => {
                const maxTotal = Math.max(...categoryData.map(c => c.total))
                const pct = maxTotal > 0 ? (cat.total / maxTotal) * 100 : 0
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300">{cat.name}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(cat.total)}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                      <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
              {categoryData.length === 0 && <p className="text-center text-sm text-gray-400 py-4">No data</p>}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Profit Summary</h3>
            <div className="space-y-4">
              <div className="flex justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Revenue</span>
                <span className="text-sm font-bold text-green-600">{formatCurrency(totals.revenue)}</span>
              </div>
              <div className="flex justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cost</span>
                <span className="text-sm font-bold text-red-600">{formatCurrency(totals.cost)}</span>
              </div>
              <div className="flex justify-between p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Profit</span>
                <span className="text-sm font-bold text-indigo-600">{formatCurrency(totals.profit)}</span>
              </div>
              {totals.cost > 0 && (
                <div className="flex justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Margin</span>
                  <span className="text-sm font-bold text-purple-600">{((totals.profit / totals.revenue) * 100).toFixed(1)}%</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bill History */}
      {activeTab === 'bills' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-800">
                <th className="p-3">Bill No</th>
                <th className="p-3">Date</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Payment</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentBills.map(bill => (
                <tr key={bill.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                  <td className="p-3 text-sm font-mono text-gray-900 dark:text-white">{bill.bill_no}</td>
                  <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{formatDate(bill.created_at)}</td>
                  <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{bill.customer_name || '-'}</td>
                  <td className="p-3 text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(bill.net_amount)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${
                      bill.payment_type === 'cash' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      bill.payment_type === 'card' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                    }`}>{bill.payment_type}</span>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bill.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{bill.status}</span>
                  </td>
                </tr>
              ))}
              {recentBills.length === 0 && <tr><td colSpan={6} className="text-center text-sm text-gray-400 py-8">No bills found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
