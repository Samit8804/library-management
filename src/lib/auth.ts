import { create } from 'zustand'
import { supabase } from './supabase'
import type { Profile } from '../types'

const GUEST_PROFILE: Profile = {
  id: 'guest',
  email: 'guest@library',
  full_name: 'Guest',
  role: 'guest',
  created_at: new Date().toISOString(),
}

interface AuthState {
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signInAsGuest: () => void
  signOut: () => Promise<void>
  loadProfile: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  profile: null,
  loading: true,
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    if (data.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()
      set({ profile: profile as Profile })
    }
  },
  signInAsGuest: () => {
    set({ profile: GUEST_PROFILE })
  },
  signOut: async () => {
    await supabase.auth.signOut()
    set({ profile: null })
  },
  loadProfile: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      set({ loading: false })
      return
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    set({ profile: profile as Profile, loading: false })
  },
}))

export function useRequireAuth() {
  const profile = useAuth((s) => s.profile)
  const loading = useAuth((s) => s.loading)
  return { profile, loading, isAdmin: profile?.role === 'admin' }
}
