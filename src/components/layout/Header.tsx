import { Menu, LogOut, User } from 'lucide-react'
import { useAuth } from '../../lib/auth'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const profile = useAuth((s) => s.profile)
  const signOut = useAuth((s) => s.signOut)

  return (
    <header className="h-16 bg-navy-800/40 backdrop-blur-xl border-b border-border/40 flex items-center justify-between px-4 lg:px-6">
      <button onClick={onMenuClick} className="lg:hidden p-2 text-text-muted hover:text-text-secondary rounded-lg hover:bg-surface-light">
        <Menu className="h-5 w-5" />
      </button>
      <div className="flex-1" />
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 text-sm">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-accent to-purple-accent flex items-center justify-center">
            <User className="h-4 w-4 text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-text-primary font-medium">{profile?.full_name}</p>
            <span className="text-xs text-text-muted capitalize">{profile?.role}</span>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="p-2 text-text-muted hover:text-danger rounded-lg hover:bg-danger-bg transition-colors"
          title="Sign out"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  )
}
