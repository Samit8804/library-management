import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BookOpen, BookCheck, BookX, Users, AlertTriangle,
  IndianRupee, TrendingUp, CalendarDays,
  Bell, BarChart3, BookMarked, GraduationCap,
  Clock, ArrowUpRight, ArrowDownRight,
  Library, Star,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { Card, CardContent, CardHeader } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { getDashboardStats, getTransactions, getBooks, getStudents } from '../../lib/db'
import { formatCurrency } from '../../lib/utils'
import type { Book } from '../../types'

const TOOLTIP_STYLE = {
  background: '#111d35', border: '1px solid rgba(30, 58, 95, 0.5)',
  borderRadius: '12px', color: '#f1f5f9', fontSize: '13px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
}

interface StatCardProps {
  label: string; value: string | number; icon: any; gradient: string;
  subtitle?: string; trend?: { value: number; up: boolean }; delay: number
}

function StatCard({ label, value, icon: Icon, gradient, subtitle, trend, delay }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05, duration: 0.4 }}
      className="relative group"
    >
      <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-br from-accent/10 via-transparent to-purple-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <Card className="relative overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-bold text-text-primary tracking-tight">{value}</p>
              {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
              {trend && (
                <div className={`flex items-center gap-1 text-xs font-medium ${trend.up ? 'text-success' : 'text-danger'}`}>
                  {trend.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {trend.value}%
                </div>
              )}
            </div>
            <div className={`bg-gradient-to-br ${gradient} p-3 rounded-xl shadow-lg shrink-0`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function DashboardPage() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  })
  const { data: transactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: getTransactions,
  })
  const { data: books } = useQuery({ queryKey: ['books'], queryFn: getBooks })
  const { data: students } = useQuery({ queryKey: ['students'], queryFn: getStudents })

  const recentTxns = (transactions || []).slice(0, 6)
  const recentNotifications = (transactions || [])
    .filter(t => t.status === 'overdue' || t.status === 'issued')
    .slice(0, 5)

  const monthlyData = useMemo(() => {
    const months: Record<string, { issued: number; returned: number; fine: number }> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      months[key] = { issued: 0, returned: 0, fine: 0 }
    }
    for (const t of transactions || []) {
      const key = new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      if (months[key]) {
        if (t.status === 'returned') months[key].returned++
        else months[key].issued++
        months[key].fine += t.fine_amount || 0
      }
    }
    return Object.entries(months).map(([month, data]) => ({ month, ...data }))
  }, [transactions])

  const mostBorrowed = useMemo(() => {
    const counts: Record<string, { count: number; book: Book }> = {}
    for (const t of transactions || []) {
      if (t.book) {
        const id = t.book.id
        if (!counts[id]) counts[id] = { count: 0, book: t.book }
        counts[id].count++
      }
    }
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [transactions])

  const studentStats = useMemo(() => {
    if (!students) return { total: 0, active: 0, byCourse: [] as { name: string; count: number }[], byYear: [] as { name: string; count: number }[] }
    const active = students.filter(s => s.status === 'active').length
    const courseMap: Record<string, number> = {}
    const yearMap: Record<string, number> = {}
    for (const s of students) {
      courseMap[s.course] = (courseMap[s.course] || 0) + 1
      const y = `Year ${s.year}`
      yearMap[y] = (yearMap[y] || 0) + 1
    }
    const byCourse = Object.entries(courseMap).map(([name, count]) => ({ name: name.length > 12 ? name.slice(0, 12) + '...' : name, count })).sort((a, b) => b.count - a.count)
    const byYear = Object.entries(yearMap).map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name))
    return { total: students.length, active, byCourse, byYear }
  }, [students])

  const bookCategories = useMemo(() => {
    const cats: Record<string, number> = {}
    for (const b of books || []) {
      cats[b.category] = (cats[b.category] || 0) + 1
    }
    return Object.entries(cats).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [books])

  const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#22c55e', '#f97316', '#ef4444', '#ec4899', '#6366f1']

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-muted mt-1">Real-time overview of your library operations</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-text-muted bg-surface border border-border/50 rounded-lg px-3 py-2">
          <Clock className="h-3.5 w-3.5" />
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Books" value={stats?.total_books ?? 0} icon={Library} gradient="from-accent to-blue-400" subtitle="In catalog" delay={0} />
        <StatCard label="Available" value={stats?.available_books ?? 0} icon={BookCheck} gradient="from-success to-emerald-400" subtitle="Ready to issue" delay={1} />
        <StatCard label="Issued" value={stats?.issued_books ?? 0} icon={BookMarked} gradient="from-warning to-amber-400" subtitle="Currently out" delay={2} />
        <StatCard label="Overdue" value={stats?.overdue_books ?? 0} icon={AlertTriangle} gradient="from-danger to-rose-400" subtitle="Past due date" delay={3} />
        <StatCard label="Students" value={stats?.total_students ?? 0} icon={GraduationCap} gradient="from-indigo-500 to-blue-400" subtitle={`${studentStats.active} active`} delay={4} />
        <StatCard label="Fine Collected" value={formatCurrency(stats?.total_fine ?? 0)} icon={IndianRupee} gradient="from-cyan-accent to-teal-400" delay={5} />
        <StatCard label="Today's Txns" value={stats?.today_transactions ?? 0} icon={TrendingUp} gradient="from-pink-500 to-rose-400" subtitle="Past 24 hours" delay={6} />
        <StatCard label="Lost Books" value={stats?.lost_books ?? 0} icon={BookX} gradient="from-purple-accent to-violet-400" delay={7} />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-accent" />
                <h2 className="text-base font-semibold text-text-primary">Monthly Trends</h2>
              </div>
              <Badge variant="info" className="text-[10px]">6 months</Badge>
            </CardHeader>
            <CardContent className="p-5">
              <div className="h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="issuedGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                      <linearGradient id="returnedGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="100%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Area type="monotone" dataKey="issued" stroke="#3b82f6" strokeWidth={2} fill="url(#issuedGrad)" name="Issued" />
                    <Area type="monotone" dataKey="returned" stroke="#22c55e" strokeWidth={2} fill="url(#returnedGrad)" name="Returned" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Book Categories */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-accent" />
                <h2 className="text-base font-semibold text-text-primary">Books by Category</h2>
              </div>
            </CardHeader>
            <CardContent className="p-5">
              <div className="h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={bookCategories} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                      paddingAngle={3} dataKey="value"
                    >
                      {bookCategories.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {bookCategories.slice(0, 6).map((cat, i) => (
                  <div key={cat.name} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-text-muted truncate">{cat.name}</span>
                    <span className="text-text-primary font-medium ml-auto">{cat.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Second Row: Most Borrowed + Student Stats */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Most Borrowed Books */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-warning" />
                <h2 className="text-base font-semibold text-text-primary">Most Borrowed Books</h2>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {mostBorrowed.length === 0 ? (
                <div className="p-8 text-center text-text-muted text-sm">No borrowing data yet</div>
              ) : (
                <div className="divide-y divide-border/50">
                  {mostBorrowed.map((item, i) => (
                    <div key={item.book.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-light transition-colors">
                      <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                        {i + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary truncate">{item.book.title}</p>
                        <p className="text-xs text-text-muted truncate">{item.book.author}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-text-primary">{item.count}</p>
                        <p className="text-[10px] text-text-muted uppercase">times</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Student Statistics */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-400" />
                <h2 className="text-base font-semibold text-text-primary">Student Statistics</h2>
              </div>
              <Badge variant="default" className="text-[10px]">{studentStats.total} total</Badge>
            </CardHeader>
            <CardContent className="p-5">
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="text-center p-3 rounded-xl bg-surface-light border border-border/50">
                  <p className="text-lg font-bold text-text-primary">{studentStats.total}</p>
                  <p className="text-[10px] text-text-muted uppercase">Total</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-success-bg border border-success/20">
                  <p className="text-lg font-bold text-success">{studentStats.active}</p>
                  <p className="text-[10px] text-text-muted uppercase">Active</p>
                </div>
                <div className="text-center p-3 rounded-xl bg-danger-bg border border-danger/20">
                  <p className="text-lg font-bold text-danger">{studentStats.total - studentStats.active}</p>
                  <p className="text-[10px] text-text-muted uppercase">Inactive</p>
                </div>
              </div>
              <div className="h-32 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={studentStats.byCourse}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Third Row: Recent Transactions + Notifications */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-accent" />
                <h2 className="text-base font-semibold text-text-primary">Recent Transactions</h2>
              </div>
              <span className="text-xs text-text-muted">Latest {recentTxns.length}</span>
            </CardHeader>
            <CardContent className="p-0">
              {recentTxns.length === 0 ? (
                <div className="p-8 text-center text-text-muted text-sm">No transactions yet</div>
              ) : (
                <div className="divide-y divide-border/50">
                  {recentTxns.map((txn) => (
                    <div key={txn.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-light transition-colors">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        txn.status === 'returned' ? 'bg-success-bg' :
                        txn.status === 'overdue' ? 'bg-danger-bg' : 'bg-info-bg'
                      }`}>
                        {txn.status === 'returned' ? <BookCheck className="h-4 w-4 text-success" /> :
                         txn.status === 'overdue' ? <AlertTriangle className="h-4 w-4 text-danger" /> :
                         <BookOpen className="h-4 w-4 text-accent" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary truncate">{txn.student?.name || 'Unknown'}</p>
                        <p className="text-xs text-text-muted truncate">{txn.book?.title || 'Unknown book'}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant={
                          txn.status === 'returned' ? 'success' :
                          txn.status === 'overdue' ? 'danger' : 'info'
                        } className="text-[10px]">
                          {txn.status}
                        </Badge>
                        <p className="text-[10px] text-text-muted mt-1">{formatDate(txn.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Notification Center */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-warning" />
                <h2 className="text-base font-semibold text-text-primary">Notifications</h2>
              </div>
              <Badge variant="danger" className="text-[10px]">{recentNotifications.length} active</Badge>
            </CardHeader>
            <CardContent className="p-0">
              {recentNotifications.length === 0 ? (
                <div className="p-8 text-center text-text-muted text-sm">All clear — no notifications</div>
              ) : (
                <div className="divide-y divide-border/50">
                  {recentNotifications.map((t) => (
                    <div key={t.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-surface-light transition-colors">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        t.status === 'overdue' ? 'bg-danger' : 'bg-accent'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-text-primary">
                          {t.status === 'overdue' ? (
                            <><span className="font-medium text-danger">Overdue:</span> {t.book?.title || 'Book'}</>
                          ) : (
                            <><span className="font-medium text-accent">Issued:</span> {t.book?.title || 'Book'}</>
                          )}
                        </p>
                        <p className="text-xs text-text-muted mt-0.5">
                          {t.student?.name} — due {formatDate(t.due_date)}
                        </p>
                      </div>
                      <span className="text-[10px] text-text-muted shrink-0">{formatDate(t.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
