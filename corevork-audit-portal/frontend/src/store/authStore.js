import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: true,

  initialize: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        set({ session, user: session.user })
        await get().fetchProfile(session.user.id)
      }
    } catch (err) {
      console.error('Auth init error:', err)
    } finally {
      set({ loading: false })
    }

    // Only react to actual sign-in / sign-out events — NOT token refreshes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        set({ session, user: session.user })
        // Only fetch if we don't already have a profile for this user
        if (get().profile?.id !== session.user.id) {
          await get().fetchProfile(session.user.id)
        }
      } else if (event === 'SIGNED_OUT') {
        set({ session: null, user: null, profile: null })
      }
      // Ignore TOKEN_REFRESHED, USER_UPDATED, etc.
    })
  },

  fetchProfile: async (userId) => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, organizations(*)')
        .eq('id', userId)
        .maybeSingle()

      if (data) {
        set({ profile: data })
        return
      }

      // Profile row missing — build minimal one from auth metadata
      if (error) console.warn('Profile fetch failed:', error.message)

      const { data: { user } } = await supabase.auth.getUser()
      const meta = user?.user_metadata || {}
      set({
        profile: {
          id: userId,
          email: user?.email || '',
          full_name: meta.full_name || user?.email || 'User',
          role: 'admin',
          org_id: null,
          organizations: null,
        }
      })
    } catch (err) {
      console.error('fetchProfile exception:', err)
    }
  },

  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  signUp: async (email, password, fullName, orgName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, org_name: orgName } },
    })
    if (error) throw error
    return data
  },

  signOut: async () => {
    set({ user: null, profile: null, session: null })
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('signOut error:', err)
    }
  },

  resetPasswordEmail: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  },

  updateUserPassword: async (password) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  },
}))
