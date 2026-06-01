import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { suggestCorrectiveAction } from '@/lib/groq'

export const useCorrectiveStore = create((set, get) => ({
  actions: [],
  loading: false,

  fetchActions: async (orgId) => {
    set({ loading: true })

    let query = supabase
      .from('corrective_actions')
      .select('*, audits(site_name, checklists(title,standard)), profiles(full_name)')
      .order('created_at', { ascending: false })

    // If org_id exists filter by it, otherwise fetch all the user has RLS access to
    if (orgId) query = query.eq('org_id', orgId)

    const { data, error } = await query
    if (error) console.warn('fetchActions error:', error.message)
    set({ actions: data || [], loading: false })
  },

  createActionsFromAudit: async ({ auditId, orgId, failedResponses, standard }) => {
    const created = []
    for (const resp of failedResponses) {
      try {
        const suggestion = await suggestCorrectiveAction({
          questionText: resp.questionText,
          sectionTitle: resp.sectionTitle,
          standard,
          notes: resp.notes,
        })
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + (suggestion.due_days || 30))

        const payload = {
          audit_id:      auditId,
          question_text: resp.questionText,
          section_title: resp.sectionTitle,
          action:        suggestion.action,
          priority:      suggestion.priority,
          status:        'open',
          due_date:      dueDate.toISOString().split('T')[0],
        }
        if (orgId) payload.org_id = orgId

        const { data } = await supabase
          .from('corrective_actions')
          .insert(payload)
          .select()
          .single()

        if (data) created.push(data)
      } catch (err) {
        console.warn('Failed to create corrective action:', err.message)
      }
    }
    return created
  },

  updateStatus: async (id, status) => {
    const updates = { status }
    if (status === 'resolved') updates.resolved_at = new Date().toISOString()

    await supabase.from('corrective_actions').update(updates).eq('id', id)
    set(s => ({ actions: s.actions.map(a => a.id === id ? { ...a, ...updates } : a) }))
  },

  assignUser: async (id, assigneeId) => {
    await supabase.from('corrective_actions').update({ assignee_id: assigneeId }).eq('id', id)
    set(s => ({ actions: s.actions.map(a => a.id === id ? { ...a, assignee_id: assigneeId } : a) }))
  },
}))
