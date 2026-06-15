import { useQuery } from '@tanstack/react-query'
import {
  BookOpen, BookCheck, BookX, Users, AlertTriangle,
  IndianRupee, TrendingUp, CalendarDays,
} from 'lucide-react'
import { Card, CardContent } from '../../components/ui/Card'
import { getDashboardStats, getTransactions } from '../../lib/db'
import { formatCurrency } from '../../lib/utils'
import { Badge } from '../../components/ui/Badge'

const statCards = [
  { key: 'total_books', label: 'Total Books', icon: BookOpen, color: 'from-accent to-blue-400' },
  { key: 'available_books', label: 'Available', icon: BookCheck, color: 'from-green-500 to-emerald-400' },
  { key: 'issued_books', label: 'Issued', icon: BookX, color: 'from-orange-500 to-amber-400' },
  { key: 'overdue_books', label: 'Overdue', icon: AlertTriangle, color: 'from-danger to-rose-400' },
  { key: 'lost_books', label: 'Lost', icon: BookX, color: 'from-purple-accent to-violet-400' },
  { key: 'total_students', label: 'Students', icon: Users, color: 'from-indigo-500 to-blue-400' },
  { key: 'total_fine', label: 'Total Fine', icon: IndianRupee, color: 'from-cyan-accent to-teal-400' },
  { key: 'today_transactions', label: "Today's Txns", icon: TrendingUp, color: 'from-pink-500 to-rose-400' },
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
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-muted mt-1">Overview of your library</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const value = stats ? (stats as any)[card.key] : 0
          const displayValue = card.key === 'total_fine' ? formatCurrency(value) : value
          return (
            <Card key={card.key} hover>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-text-muted uppercase tracking-wider">{card.label}</p>
                    <p className="text-2xl font-bold text-text-primary mt-1">
                      {isLoading ? (
                        <span className="inline-block w-12 h-6 rounded bg-navy-600 animate-pulse" />
                      ) : displayValue}
                    </p>
                  </div>
                  <div className={`bg-gradient-to-br ${card.color} p-3 rounded-lg shadow-lg`}>
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
            <CalendarDays className="h-5 w-5 text-text-muted" />
            <h2 className="text-lg font-semibold text-text-primary">Recent Transactions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border/50">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Book</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-text-muted uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {recentTxns.map((txn) => (
                  <tr key={txn.id} className="hover:bg-surface-light transition-colors">
                    <td className="px-4 py-3 text-sm text-text-primary">{txn.student?.name || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{txn.book?.title || 'N/A'}</td>
                    <td className="px-4 py-3">
                      <Badge variant={
                        txn.status === 'returned' ? 'success' :
                        txn.status === 'overdue' ? 'danger' : 'info'
                      }>
                        {txn.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {new Date(txn.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {recentTxns.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-text-muted">No transactions yet</td>
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
