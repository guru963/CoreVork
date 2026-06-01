import { supabase } from '../lib/supabase.js'
import { generateChecklistAI } from '../lib/groq.js'

export async function generateChecklist(req, res) {
  const { industry, standard, description, sectionCount, questionsPerSection, orgId, createdBy } = req.body

  if (!industry || !standard) {
    return res.status(400).json({ error: 'industry and standard are required' })
  }

  try {
    // ── AI generates structure ─────────────────────────────────────────────
    const generated = await generateChecklistAI({
      industry,
      standard,
      description,
      sectionCount:        parseInt(sectionCount)        || 4,
      questionsPerSection: parseInt(questionsPerSection) || 5,
    })

    // ── Save to Supabase ───────────────────────────────────────────────────
    const { data: cl, error: clErr } = await supabase
      .from('checklists')
      .insert({
        title:       generated.title,
        standard,
        description: generated.description,
        is_active:   true,
        is_custom:   true,
        org_id:      orgId    || null,
        created_by:  createdBy || null,
      })
      .select()
      .single()

    if (clErr) throw clErr

    // Insert sections + questions
    for (let si = 0; si < generated.sections.length; si++) {
      const section = generated.sections[si]

      const { data: sec, error: secErr } = await supabase
        .from('sections')
        .insert({ checklist_id: cl.id, title: section.title, order_index: si })
        .select()
        .single()

      if (secErr) throw secErr

      const qs = (section.questions || [])
        .filter(q => q.text?.trim())
        .map((q, qi) => ({
          section_id:  sec.id,
          text:        q.text,
          guidance:    q.guidance || null,
          order_index: qi,
        }))

      if (qs.length > 0) {
        const { error: qErr } = await supabase.from('questions').insert(qs)
        if (qErr) throw qErr
      }
    }

    res.json({ checklist: cl, generated })
  } catch (err) {
    console.error('Checklist generation error:', err)
    res.status(500).json({ error: 'Checklist generation failed: ' + err.message })
  }
}
