// ─── CoreVork Report Template ─────────────────────────────────────────────────
// Builds the full HTML for the PDF report.
// aiNarrative: string | null  — AI executive summary (injected if present)
// correctiveActions: array    — CAPA items auto-created from failed responses

export function buildReportHTML(audit, responsesMap, aiNarrative = null, correctiveActions = []) {
  const score        = audit.compliance_score ?? 0
  const scoreColor   = score >= 85 ? '#16a34a' : score >= 60 ? '#ca8a04' : '#dc2626'
  const scoreLabel   = score >= 85 ? 'Compliant' : score >= 60 ? 'Partially Compliant' : 'Non-Compliant'
  const scoreBg      = score >= 85 ? '#f0fdf4' : score >= 60 ? '#fefce8' : '#fef2f2'

  const fmt = (d) => d
    ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—'

  const answerBadge = (answer) => {
    if (answer === 'yes') return `<span style="color:#16a34a;font-weight:600;white-space:nowrap">✓ Yes</span>`
    if (answer === 'no')  return `<span style="color:#dc2626;font-weight:600;white-space:nowrap">✗ No</span>`
    if (answer === 'na')  return `<span style="color:#6b7280;font-weight:600;white-space:nowrap">— N/A</span>`
    return `<span style="color:#d1d5db;white-space:nowrap">Not answered</span>`
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const allSections  = audit.checklists?.sections || []
  const allQuestions = allSections.flatMap(s => s.questions || [])
  const totalQ       = allQuestions.length
  const answeredQ    = allQuestions.filter(q => responsesMap[q.id]?.answer).length
  const yesQ         = allQuestions.filter(q => responsesMap[q.id]?.answer === 'yes').length
  const noQ          = allQuestions.filter(q => responsesMap[q.id]?.answer === 'no').length
  const naQ          = allQuestions.filter(q => responsesMap[q.id]?.answer === 'na').length

  // ── Section findings ───────────────────────────────────────────────────────
  const sectionsHTML = allSections.map(section => {
    const questions     = section.questions || []
    const sYes          = questions.filter(q => responsesMap[q.id]?.answer === 'yes').length
    const sAnswered     = questions.filter(q => ['yes','no'].includes(responsesMap[q.id]?.answer)).length
    const sScore        = sAnswered > 0 ? Math.round((sYes / sAnswered) * 100) : null
    const sColor        = sScore === null ? '#6b7280' : sScore >= 85 ? '#16a34a' : sScore >= 60 ? '#ca8a04' : '#dc2626'

    return `
      <div style="margin-bottom:20px;page-break-inside:avoid">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 14px;background:#f9fafb;border-radius:8px;margin-bottom:6px;border:1px solid #f0f0f0">
          <h3 style="margin:0;font-size:12.5px;font-weight:700;color:#0a0a0a">${section.title}</h3>
          ${sScore !== null ? `<span style="font-size:12px;font-weight:700;color:${sColor}">${sScore}%</span>` : ''}
        </div>
        ${questions.map((q, qi) => {
          const resp = responsesMap[q.id]
          const rowBg = resp?.answer === 'no' ? '#fff8f8' : resp?.answer === 'yes' ? '#f9fff9' : 'white'
          return `
            <div style="padding:9px 14px;border-bottom:1px solid #f3f4f6;background:${rowBg};">
              <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px">
                <p style="margin:0;font-size:11.5px;color:#374151;line-height:1.5;flex:1">
                  <span style="color:#d1d5db;margin-right:6px;font-size:10px">${qi + 1}.</span>${q.text}
                </p>
                <div style="font-size:12px">${answerBadge(resp?.answer)}</div>
              </div>
              ${resp?.notes ? `<p style="margin:5px 0 0 16px;font-size:10.5px;color:#6b7280;font-style:italic">📝 ${resp.notes}</p>` : ''}
              ${resp?.photo_url ? `<p style="margin:4px 0 0 16px;font-size:10.5px;color:#2563eb">📷 Photo evidence attached</p>` : ''}
            </div>`
        }).join('')}
      </div>`
  }).join('')

  // ── Corrective actions table ───────────────────────────────────────────────
  const priorityColor = { critical: '#dc2626', high: '#d97706', medium: '#2563eb', low: '#6b7280' }
  const caHTML = correctiveActions.length === 0 ? '' : `
    <div style="page-break-before:always;padding-top:8px">
      <h2 style="font-size:14px;font-weight:700;color:#0a0a0a;margin-bottom:16px;padding-bottom:6px;border-bottom:2px solid #0a0a0a">
        Corrective Action Plan
      </h2>
      <p style="font-size:11px;color:#6b7280;margin-bottom:16px">
        ${correctiveActions.length} corrective action${correctiveActions.length > 1 ? 's' : ''} auto-generated from failed items.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:11px">
        <thead>
          <tr style="background:#0a0a0a;color:white">
            <th style="padding:8px 10px;text-align:left;font-weight:600;border-radius:0">#</th>
            <th style="padding:8px 10px;text-align:left;font-weight:600">Section</th>
            <th style="padding:8px 10px;text-align:left;font-weight:600">Finding</th>
            <th style="padding:8px 10px;text-align:left;font-weight:600">Action Required</th>
            <th style="padding:8px 10px;text-align:center;font-weight:600">Priority</th>
            <th style="padding:8px 10px;text-align:center;font-weight:600">Due</th>
          </tr>
        </thead>
        <tbody>
          ${correctiveActions.map((ca, i) => `
            <tr style="background:${i % 2 === 0 ? '#f9fafb' : 'white'};border-bottom:1px solid #f0f0f0">
              <td style="padding:8px 10px;color:#9ca3af">${i + 1}</td>
              <td style="padding:8px 10px;color:#374151">${ca.section_title || '—'}</td>
              <td style="padding:8px 10px;color:#374151;max-width:160px">${ca.question_text?.slice(0, 80)}${ca.question_text?.length > 80 ? '…' : ''}</td>
              <td style="padding:8px 10px;color:#0a0a0a;font-weight:500">${ca.action}</td>
              <td style="padding:8px 10px;text-align:center">
                <span style="color:${priorityColor[ca.priority] || '#6b7280'};font-weight:600;text-transform:uppercase;font-size:10px">${ca.priority}</span>
              </td>
              <td style="padding:8px 10px;text-align:center;color:#6b7280">${ca.due_date ? fmt(ca.due_date) : '30 days'}</td>
            </tr>`).join('')}
        </tbody>
      </table>
    </div>`

  // ── Score gauge SVG ────────────────────────────────────────────────────────
  const r    = 36
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ
  const gaugeSVG = `
    <svg width="90" height="90" viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">
      <circle cx="45" cy="45" r="${r}" fill="none" stroke="#f0f0f0" stroke-width="7"/>
      <circle cx="45" cy="45" r="${r}" fill="none" stroke="${scoreColor}" stroke-width="7"
        stroke-dasharray="${dash} ${circ - dash}" stroke-linecap="round"
        transform="rotate(-90 45 45)"/>
      <text x="45" y="49" text-anchor="middle" font-size="15" font-weight="700"
        fill="${scoreColor}" font-family="Helvetica,Arial,sans-serif">${score}%</text>
    </svg>`

  // ── Full HTML ──────────────────────────────────────────────────────────────
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; color:#0a0a0a; background:white; font-size:13px; line-height:1.5; }
    h2 { font-size:14px; font-weight:700; color:#0a0a0a; margin-bottom:14px; padding-bottom:6px; border-bottom:1px solid #e5e7eb; }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:18px;border-bottom:2.5px solid #0a0a0a;margin-bottom:22px">
    <div>
      <p style="font-size:20px;font-weight:800;letter-spacing:-0.5px;color:#0a0a0a">CoreVork</p>
      <p style="font-size:10px;color:#9ca3af;margin-top:2px;font-weight:500;text-transform:uppercase;letter-spacing:0.08em">Audit Report</p>
      <p style="font-size:11px;color:#6b7280;margin-top:6px">${audit.checklists?.title || 'Compliance Audit'}</p>
    </div>
    <div style="text-align:right">
      ${gaugeSVG}
      <p style="font-size:11px;font-weight:600;color:${scoreColor};margin-top:2px">${scoreLabel}</p>
    </div>
  </div>

  <!-- META GRID -->
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px">
    ${[
      ['Checklist',   audit.checklists?.title     || '—'],
      ['Standard',    audit.checklists?.standard   || '—'],
      ['Site',        audit.site_name              || '—'],
      ['Location',    audit.site_location          || '—'],
      ['Inspector',   audit.profiles?.full_name    || '—'],
      ['Organisation',audit.organizations?.name    || '—'],
      ['Submitted',   fmt(audit.submitted_at)],
      ['Score',       `${score}%`],
      ['Status',      scoreLabel],
    ].map(([k,v]) => `
      <div style="background:#f9fafb;border-radius:8px;padding:10px 12px;border:1px solid #f0f0f0">
        <p style="font-size:9.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:#9ca3af;margin-bottom:3px">${k}</p>
        <p style="font-size:12px;font-weight:600;color:#0a0a0a">${v}</p>
      </div>`).join('')}
  </div>

  <!-- STATS BAR -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:24px">
    ${[
      ['Total',      totalQ,    '#0a0a0a'],
      ['Answered',   answeredQ, '#2563eb'],
      ['Compliant',  yesQ,      '#16a34a'],
      ['Non-Compliant', noQ,    '#dc2626'],
    ].map(([l,v,c]) => `
      <div style="background:white;border:1px solid #f0f0f0;border-radius:8px;padding:10px;text-align:center">
        <p style="font-size:22px;font-weight:800;color:${c}">${v}</p>
        <p style="font-size:10px;color:#9ca3af;font-weight:500">${l}</p>
      </div>`).join('')}
  </div>

  <!-- AI EXECUTIVE SUMMARY -->
  ${aiNarrative ? `
  <div style="margin-bottom:24px;padding:14px 16px;background:#f8fafc;border-radius:10px;border-left:3px solid #0a0a0a">
    <p style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;margin-bottom:8px">✦ AI Executive Summary</p>
    <p style="font-size:12px;color:#374151;line-height:1.7">${aiNarrative}</p>
  </div>` : ''}

  <!-- SECTION FINDINGS -->
  <h2>Section Findings</h2>
  ${sectionsHTML}

  <!-- CORRECTIVE ACTIONS -->
  ${caHTML}

  <!-- FOOTER -->
  <div style="margin-top:28px;padding-top:14px;border-top:1px solid #f0f0f0;display:flex;justify-content:space-between;font-size:9.5px;color:#9ca3af">
    <span>Generated by CoreVork Audit Portal · ${fmt(new Date().toISOString())}</span>
    <span>CONFIDENTIAL — For internal use only</span>
  </div>

</body>
</html>`
}
