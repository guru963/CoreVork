import { supabase } from '../lib/supabase.js'
import { suggestCorrectiveAction } from '../lib/groq.js'

// Auto-create corrective actions after audit submission
export async function createCorrectiveActions(req, res) {
  const { auditId, orgId, failedResponses, standard } = req.body

  if (!auditId || !failedResponses?.length) {
    return res.status(400).json({ error: 'auditId and failedResponses are required' })
  }

  try {
    const created = []

    for (const item of failedResponses) {
      try {
        // AI suggests action + priority + due days
        const suggestion = await suggestCorrectiveAction({
          questionText:  item.questionText,
          sectionTitle:  item.sectionTitle,
          standard:      standard || 'General',
          notes:         item.notes,
        })

        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + (suggestion.due_days || 30))

        const { data, error } = await supabase
          .from('corrective_actions')
          .insert({
            audit_id:      auditId,
            org_id:        orgId,
            question_text: item.questionText,
            section_title: item.sectionTitle,
            action:        suggestion.action,
            priority:      suggestion.priority,
            status:        'open',
            due_date:      dueDate.toISOString().split('T')[0],
          })
          .select()
          .single()

        if (!error && data) created.push(data)
      } catch (itemErr) {
        console.warn('Failed to create action for item:', item.questionText, itemErr.message)
      }
    }

    res.json({ created: created.length, actions: created })
  } catch (err) {
    console.error('Corrective actions error:', err)
    res.status(500).json({ error: err.message })
  }
}

// Get all corrective actions for an org
export async function getCorrectiveActions(req, res) {
  const { orgId } = req.params
  const { status, priority } = req.query

  try {
    let query = supabase
      .from('corrective_actions')
      .select('*, audits(site_name, checklists(title, standard)), profiles(full_name)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (status)   query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)

    const { data, error } = await query
    if (error) throw error
    res.json({ actions: data || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Update status / assignee
export async function updateCorrectiveAction(req, res) {
  const { id } = req.params
  const updates = req.body

  // Only allow safe fields
  const allowed = ['status', 'assignee_id', 'notes', 'due_date']
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([k]) => allowed.includes(k))
  )

  if (filtered.status === 'resolved') {
    filtered.resolved_at = new Date().toISOString()
  }

  try {
    const { data, error } = await supabase
      .from('corrective_actions')
      .update({ ...filtered, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    res.json({ action: data })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
