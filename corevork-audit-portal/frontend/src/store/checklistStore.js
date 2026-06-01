import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useChecklistStore = create((set) => ({
  checklists: [],
  loading: false,

  fetchChecklists: async (search = '', standard = '') => {
    set({ loading: true })
    let query = supabase
      .from('checklists')
      .select('*, sections(*, questions(*))')
      .eq('is_active', true)
      .order('standard', { ascending: true })
      .order('title', { ascending: true })

    if (search) query = query.ilike('title', `%${search}%`)
    if (standard) query = query.eq('standard', standard)

    const { data, error } = await query
    if (!error) set({ checklists: data || [] })
    set({ loading: false })
  },

  fetchChecklistById: async (id) => {
    const { data, error } = await supabase
      .from('checklists')
      .select('*, sections(*, questions(*))')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },
}))
