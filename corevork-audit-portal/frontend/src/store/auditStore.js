import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export const useAuditStore = create((set, get) => ({
  audits: [],
  currentAudit: null,
  responses: {},
  autoSaveTimer: null,
  saving: false,
  loading: false,

  fetchAudits: async (userId, role) => {
    if (!userId) return
    set({ loading: true })

    let query = supabase
      .from('audits')
      .select('*, checklists(title, standard), profiles(full_name)')
      .order('created_at', { ascending: false })

    // Inspectors only see their own; admins/viewers see all they have RLS access to
    if (role === 'inspector') {
      query = query.eq('inspector_id', userId)
    }

    const { data, error } = await query
    if (error) console.warn('fetchAudits error:', error.message)
    set({ audits: data || [], loading: false })
  },

  fetchAuditById: async (id) => {
    const { data, error } = await supabase
      .from('audits')
      .select(`*, checklists(*, sections(*, questions(*))), profiles(full_name, email)`)
      .eq('id', id)
      .single()

    if (error) throw error

    const { data: existingResponses } = await supabase
      .from('responses')
      .select('*')
      .eq('audit_id', id)

    const responsesMap = {}
    existingResponses?.forEach(r => {
      responsesMap[r.question_id] = { answer: r.answer, notes: r.notes, photo_url: r.photo_url }
    })

    set({ currentAudit: data, responses: responsesMap })
    return data
  },

  createAudit: async ({ checklist_id, site_name, site_location, inspector_id, org_id }) => {
    const payload = { checklist_id, site_name, site_location, inspector_id, status: 'draft' }
    // Only attach org_id if it actually exists
    if (org_id) payload.org_id = org_id

    const { data, error } = await supabase
      .from('audits')
      .insert(payload)
      .select()
      .single()

    if (error) throw error
    return data
  },

  setResponse: (questionId, field, value) => {
    const responses = { ...get().responses }
    responses[questionId] = { ...responses[questionId], [field]: value }
    set({ responses })
    get().scheduleAutoSave()
  },

  scheduleAutoSave: () => {
    const timer = get().autoSaveTimer
    if (timer) clearTimeout(timer)
    const newTimer = setTimeout(() => get().saveResponses(), 30000)
    set({ autoSaveTimer: newTimer })
  },

  saveResponses: async () => {
    const { currentAudit, responses } = get()
    if (!currentAudit) return
    set({ saving: true })

    const upserts = Object.entries(responses).map(([question_id, data]) => ({
      audit_id: currentAudit.id,
      question_id,
      answer: data.answer || null,
      notes: data.notes || null,
      photo_url: data.photo_url || null,
    }))

    if (upserts.length > 0) {
      const { error } = await supabase
        .from('responses')
        .upsert(upserts, { onConflict: 'audit_id,question_id' })
      if (error) console.warn('saveResponses error:', error.message)
    }

    set({ saving: false })
  },

  submitAudit: async (complianceScore) => {
    const { currentAudit } = get()
    await get().saveResponses()

    const { data, error } = await supabase
      .from('audits')
      .update({
        status: 'submitted',
        compliance_score: complianceScore,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', currentAudit.id)
      .select()
      .single()

    if (error) throw error
    set({ currentAudit: data })
    return data
  },

  uploadPhoto: async (auditId, questionId, file) => {
    const ext = file.name.split('.').pop()
    const path = `${auditId}/${questionId}.${ext}`
    const { error } = await supabase.storage
      .from('audit-photos')
      .upload(path, file, { upsert: true })
    if (error) throw error
    const { data } = supabase.storage.from('audit-photos').getPublicUrl(path)
    return data.publicUrl
  },

  clearCurrentAudit: () => set({ currentAudit: null, responses: {} }),
}))
