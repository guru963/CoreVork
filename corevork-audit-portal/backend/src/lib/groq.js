// ─── Groq AI — Backend Service ────────────────────────────────────────────────
// Swap to Claude / OpenAI later by changing GROQ_API_URL, MODEL, and auth header.

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

async function groqChat(messages, { temperature = 0.4, max_tokens = 1000 } = {}) {
  const key = process.env.GROQ_API_KEY
  if (!key) {
    console.warn('GROQ_API_KEY not set — skipping AI generation')
    return null
  }

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model: MODEL, messages, temperature, max_tokens }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error?.message || `Groq API error ${res.status}`)
  }

  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}

// ── Executive summary for PDF report ──────────────────────────────────────────
export async function generateReportNarrative({
  auditTitle, siteName, standard, score,
  failedItems = [], totalQuestions, answeredQuestions,
}) {
  const failedList = failedItems.slice(0, 10)
    .map(f => `- [${f.section}] ${f.question}`)
    .join('\n')

  const messages = [
    {
      role: 'system',
      content: `You are a senior EHS compliance consultant writing an executive summary for a professional audit report.
Write exactly 3-4 sentences. Be direct and specific. Mention:
1. The standard and overall compliance score
2. The most critical gaps found
3. The risk implication and urgency
No bullet points. Plain professional prose only. Do not start with "This audit" or "The audit".`,
    },
    {
      role: 'user',
      content: `Audit: ${auditTitle}
Site: ${siteName}
Standard: ${standard}
Score: ${score}% compliance
Questions answered: ${answeredQuestions} of ${totalQuestions}
Failed items:
${failedList || 'No failed items — full compliance achieved.'}

Write the executive summary now.`,
    },
  ]

  return groqChat(messages, { temperature: 0.5, max_tokens: 350 })
}

// ── Corrective action suggestion ───────────────────────────────────────────────
export async function suggestCorrectiveAction({ questionText, sectionTitle, standard, notes }) {
  const messages = [
    {
      role: 'system',
      content: `You are a safety compliance expert. For a failed audit item, suggest a specific corrective action.
Return JSON ONLY — no markdown, no extra text:
{ "action": "<specific action in ≤20 words>", "priority": "critical"|"high"|"medium"|"low", "due_days": <number 1-90> }`,
    },
    {
      role: 'user',
      content: `Standard: ${standard}
Section: ${sectionTitle}
Failed item: ${questionText}
${notes ? `Inspector notes: ${notes}` : ''}
Return JSON only.`,
    },
  ]

  const raw = await groqChat(messages, { temperature: 0.3, max_tokens: 150 })
  if (!raw) return { action: 'Review and remediate this item promptly.', priority: 'medium', due_days: 30 }

  try {
    return JSON.parse(raw.replace(/```json|```/g, '').trim())
  } catch {
    return { action: 'Review and remediate this item promptly.', priority: 'medium', due_days: 30 }
  }
}

// ── AI Checklist generation ────────────────────────────────────────────────────
export async function generateChecklistAI({ industry, standard, description, sectionCount = 4, questionsPerSection = 5 }) {
  const messages = [
    {
      role: 'system',
      content: `You are a safety compliance expert. Generate a workplace audit checklist in JSON.
Return ONLY valid JSON — no markdown, no preamble:
{ "title": string, "description": string, "sections": [ { "title": string, "questions": [ { "text": string, "guidance": string|null } ] } ] }
Sections: ${sectionCount}. Questions per section: ${questionsPerSection}.
Make questions specific, auditable, and actionable.`,
    },
    {
      role: 'user',
      content: `Industry: ${industry}
Standard: ${standard}
${description ? `Context: ${description}` : ''}
Generate the checklist JSON now.`,
    },
  ]

  const raw = await groqChat(messages, { temperature: 0.6, max_tokens: 2500 })
  if (!raw) throw new Error('AI generation failed — no response from Groq.')

  return JSON.parse(raw.replace(/```json|```/g, '').trim())
}
