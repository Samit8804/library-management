import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, BookOpen, Users, BookUp, BookDown,
  FileText, Bell, Settings, X,
} from 'lucide-react'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/students', label: 'Students', icon: Users },
  { to: '/books', label: 'Books', icon: BookOpen },
  { to: '/issue', label: 'Issue Book', icon: BookUp },
  { to: '/return', label: 'Return Book', icon: BookDown },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" onClick={onClose} />}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-navy-800/60 backdrop-blur-xl border-r border-border/40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto flex flex-col ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-purple-accent flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold text-text-primary">Smart Library</h1>
          </div>
          <button onClick={onClose} className="lg:hidden text-text-muted hover:text-text-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-accent/10 text-accent-light border border-accent/20'
                    : 'text-text-secondary hover:bg-surface-light hover:text-text-primary'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="shrink-0 p-4 border-t border-border/50">
          <div className="rounded-lg bg-gradient-to-r from-accent/5 to-purple-accent/5 border border-accent/10 p-3">
            <p className="text-xs text-text-muted">Library Management</p>
            <p className="text-xs text-accent-light mt-0.5">v2.0.0</p>
          </div>
        </div>
      </aside>
    </>
  )
}
