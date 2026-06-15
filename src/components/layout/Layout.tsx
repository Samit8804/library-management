import { useState, useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAuth } from '../../lib/auth'

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const profile = useAuth((s) => s.profile)
  const loading = useAuth((s) => s.loading)
  const loadProfile = useAuth((s) => s.loadProfile)

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-900">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-10 w-10 text-accent" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-text-muted text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  if (!profile) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-navy-900 flex relative overflow-hidden">
      {/* Glassmorphism background orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-accent/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 -right-32 w-80 h-80 bg-purple-accent/5 rounded-full blur-[100px]" />
        <div className="absolute top-2/3 left-1/3 w-64 h-64 bg-cyan-accent/4 rounded-full blur-[80px]" />
        <div className="absolute -top-20 right-1/4 w-72 h-72 bg-accent/4 rounded-full blur-[90px]" />
      </div>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 relative">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
