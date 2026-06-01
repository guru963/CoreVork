import { supabase } from '../lib/supabase.js'
import { buildReportHTML } from '../services/reportTemplate.js'
import { generatePDF } from '../services/pdfService.js'
import { generateReportNarrative } from '../lib/groq.js'

export async function generateReport(req, res) {
  const { auditId } = req.params

  try {
    // ── 1. Fetch full audit ────────────────────────────────────────────────
    const { data: audit, error: auditErr } = await supabase
      .from('audits')
      .select(`
        *,
        checklists(*, sections(*, questions(*))),
        profiles(full_name, email),
        organizations(name)
      `)
      .eq('id', auditId)
      .single()

    if (auditErr || !audit) {
      return res.status(404).json({ error: 'Audit not found' })
    }

    // ── 2. Fetch responses ─────────────────────────────────────────────────
    const { data: responses } = await supabase
      .from('responses')
      .select('*')
      .eq('audit_id', auditId)

    const responsesMap = {}
    responses?.forEach(r => { responsesMap[r.question_id] = r })

    // ── 3. Fetch corrective actions for this audit ─────────────────────────
    const { data: correctiveActions } = await supabase
      .from('corrective_actions')
      .select('*')
      .eq('audit_id', auditId)
      .order('priority', { ascending: true })

    // ── 4. Build failed items list for AI ─────────────────────────────────
    const allSections  = audit.checklists?.sections || []
    const allQuestions = allSections.flatMap(s =>
      (s.questions || []).map(q => ({ ...q, sectionTitle: s.title }))
    )
    const totalQ    = allQuestions.length
    const answeredQ = allQuestions.filter(q => responsesMap[q.id]?.answer).length
    const failedItems = allQuestions
      .filter(q => responsesMap[q.id]?.answer === 'no')
      .map(q => ({ section: q.sectionTitle, question: q.text }))

    // ── 5. Generate AI narrative (non-blocking — fallback to null) ─────────
    let aiNarrative = null
    try {
      aiNarrative = await generateReportNarrative({
        auditTitle:        audit.checklists?.title,
        siteName:          audit.site_name,
        standard:          audit.checklists?.standard,
        score:             audit.compliance_score ?? 0,
        failedItems,
        totalQuestions:    totalQ,
        answeredQuestions: answeredQ,
      })
    } catch (aiErr) {
      console.warn('AI narrative generation skipped:', aiErr.message)
    }

    // ── 6. Build HTML → PDF ────────────────────────────────────────────────
    const html      = buildReportHTML(audit, responsesMap, aiNarrative, correctiveActions || [])
    const pdfBuffer = await generatePDF(html)

    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="corevork-report-${auditId}.pdf"`,
      'Content-Length':      pdfBuffer.length,
    })
    res.send(pdfBuffer)

  } catch (err) {
    console.error('Report generation error:', err)
    res.status(500).json({ error: 'Report generation failed: ' + err.message })
  }
}

// ── Narrative-only endpoint (used by frontend Reports page) ───────────────────
export async function getNarrative(req, res) {
  const { auditId } = req.params

  try {
    const { data: audit } = await supabase
      .from('audits')
      .select('*, checklists(title, standard, sections(*, questions(*)))')
      .eq('id', auditId)
      .single()

    if (!audit) return res.status(404).json({ error: 'Audit not found' })

    const { data: responses } = await supabase
      .from('responses')
      .select('*')
      .eq('audit_id', auditId)

    const responsesMap = {}
    responses?.forEach(r => { responsesMap[r.question_id] = r })

    const allSections  = audit.checklists?.sections || []
    const allQuestions = allSections.flatMap(s =>
      (s.questions || []).map(q => ({ ...q, sectionTitle: s.title }))
    )

    const failedItems = allQuestions
      .filter(q => responsesMap[q.id]?.answer === 'no')
      .map(q => ({ section: q.sectionTitle, question: q.text }))

    const narrative = await generateReportNarrative({
      auditTitle:        audit.checklists?.title,
      siteName:          audit.site_name,
      standard:          audit.checklists?.standard,
      score:             audit.compliance_score ?? 0,
      failedItems,
      totalQuestions:    allQuestions.length,
      answeredQuestions: allQuestions.filter(q => responsesMap[q.id]?.answer).length,
    })

    res.json({ narrative })
  } catch (err) {
    console.error('Narrative error:', err)
    res.status(500).json({ error: err.message })
  }
}
