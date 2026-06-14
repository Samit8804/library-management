import { useQuery } from '@tanstack/react-query'
import {
  BookOpen, BookCheck, BookX, Users, AlertTriangle,
  IndianRupee, TrendingUp, CalendarDays,
} from 'lucide-react'
import { Card, CardContent } from '../../components/ui/Card'
import { getDashboardStats, getTransactions } from '../../lib/db'
import { formatCurrency } from '../../lib/utils'

const statCards = [
  { key: 'total_books', label: 'Total Books', icon: BookOpen, color: 'bg-blue-500' },
  { key: 'available_books', label: 'Available', icon: BookCheck, color: 'bg-green-500' },
  { key: 'issued_books', label: 'Issued', icon: BookX, color: 'bg-orange-500' },
  { key: 'overdue_books', label: 'Overdue', icon: AlertTriangle, color: 'bg-red-500' },
  { key: 'lost_books', label: 'Lost', icon: BookX, color: 'bg-purple-500' },
  { key: 'total_students', label: 'Students', icon: Users, color: 'bg-indigo-500' },
  { key: 'total_fine', label: 'Total Fine', icon: IndianRupee, color: 'bg-teal-500' },
  { key: 'today_transactions', label: "Today's Txns", icon: TrendingUp, color: 'bg-pink-500' },
]

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  })

  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: getTransactions,
  })

  const recentTxns = transactions?.slice(0, 10) || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of your library</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const value = stats ? (stats as any)[card.key] : 0
          const displayValue = card.key === 'total_fine' ? formatCurrency(value) : value
          return (
            <Card key={card.key}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{card.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {isLoading ? '...' : displayValue}
                    </p>
                  </div>
                  <div className={`${card.color} p-3 rounded-lg`}>
                    <card.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Book</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentTxns.map((txn) => (
                  <tr key={txn.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">{txn.student?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{txn.book?.title || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        txn.status === 'returned' ? 'bg-green-100 text-green-800' :
                        txn.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {txn.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(txn.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {recentTxns.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No transactions yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
