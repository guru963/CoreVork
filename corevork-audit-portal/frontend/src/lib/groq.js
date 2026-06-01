// ─── Groq AI Service ─────────────────────────────────────────────────────────
// All AI features route through this file.
// Later: swap GROQ_API_KEY → ANTHROPIC_API_KEY / OPENAI_API_KEY here only.

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile' // fast, capable, free-tier generous

async function groqChat(messages, { temperature = 0.4, max_tokens = 800 } = {}) {
  const key = import.meta.env.VITE_GROQ_API_KEY
  if (!key) throw new Error('VITE_GROQ_API_KEY is missing in your .env file.')

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

// ── Feature 1: Audit Assistant ────────────────────────────────────────────────
// Given a compliance question + optional inspector note → suggest answer + observation
export async function getAIAuditSuggestion({ questionText, guidance, standard, sectionTitle, inspectorNote }) {
  const messages = [
    {
      role: 'system',
      content: `You are an expert workplace safety compliance auditor specialising in ${standard || 'safety standards'}.
Your task: analyse an audit question and return a JSON object ONLY — no markdown, no extra text.
JSON shape: { "answer": "yes"|"no"|"na", "confidence": "high"|"medium"|"low", "observation": "<one professional sentence, ≤30 words>", "recommendation": "<one actionable recommendation if answer is no, else null>" }`,
    },
    {
      role: 'user',
      content: `Section: ${sectionTitle || 'General'}
Question: ${questionText}
${guidance ? `Guidance: ${guidance}` : ''}
${inspectorNote ? `Inspector note: ${inspectorNote}` : ''}

Return JSON only.`,
    },
  ]

  const raw = await groqChat(messages, { temperature: 0.2, max_tokens: 300 })
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return { answer: null, confidence: 'low', observation: raw.slice(0, 120), recommendation: null }
  }
}

// ── Feature 2: AI Report Narrative ───────────────────────────────────────────
// Given full audit data → generate executive summary paragraph for PDF
export async function generateReportNarrative({ auditTitle, siteName, standard, score, sections, failedItems }) {
  const failedSummary = failedItems.slice(0, 8).map(f => `- ${f.section}: "${f.question}"`).join('\n')

  const messages = [
    {
      role: 'system',
      content: `You are a senior EHS compliance consultant writing an executive summary for an audit report.
Write 3–4 sentences. Professional, direct, no fluff. Mention the standard, the score, the most critical gaps, and risk implication.
Do not use bullet points. Plain prose only.`,
    },
    {
      role: 'user',
      content: `Audit: ${auditTitle}
Site: ${siteName}
Standard: ${standard}
Compliance score: ${score}%
Failed items:\n${failedSummary || 'None'}

Write the executive summary now.`,
    },
  ]

  return groqChat(messages, { temperature: 0.5, max_tokens: 300 })
}

// ── Feature 3: Photo Hazard Detection (text-based analysis) ──────────────────
// Groq doesn't support vision yet — we analyse the filename + question context
// Claude/GPT-4V can be swapped in later for real vision
export async function analysePhotoContext({ questionText, sectionTitle, fileName }) {
  const messages = [
    {
      role: 'system',
      content: `You are a safety inspector reviewing a photo uploaded during a compliance audit.
Based on the audit question and photo filename, flag likely hazards in one sentence (≤20 words).
If no specific hazard can be inferred, say "Photo recorded. Verify compliance with visual inspection on-site."
Return plain text only.`,
    },
    {
      role: 'user',
      content: `Question: ${questionText}
Section: ${sectionTitle}
Photo filename: ${fileName}`,
    },
  ]

  return groqChat(messages, { temperature: 0.3, max_tokens: 100 })
}

// ── Feature 4: Corrective Action Suggestion ───────────────────────────────────
// For a failed question → suggest a corrective action
export async function suggestCorrectiveAction({ questionText, sectionTitle, standard, notes }) {
  const messages = [
    {
      role: 'system',
      content: `You are a safety compliance expert. For a failed audit item, suggest a specific corrective action.
Return JSON only: { "action": "<specific action, ≤20 words>", "priority": "critical"|"high"|"medium"|"low", "due_days": <number 1-90> }`,
    },
    {
      role: 'user',
      content: `Standard: ${standard}
Section: ${sectionTitle}
Failed item: ${questionText}
${notes ? `Notes: ${notes}` : ''}
Return JSON only.`,
    },
  ]

  const raw = await groqChat(messages, { temperature: 0.3, max_tokens: 200 })
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    return { action: 'Review and remediate this item.', priority: 'medium', due_days: 30 }
  }
}

// ── Feature 5: AI Checklist Generator ────────────────────────────────────────
// Given industry + standard → generate a full checklist with sections + questions
export async function generateChecklist({ industry, standard, description, sectionCount = 4, questionsPerSection = 5 }) {
  const messages = [
    {
      role: 'system',
      content: `You are a safety compliance expert. Generate a workplace audit checklist in JSON.
Return ONLY valid JSON, no markdown: 
{ "title": string, "description": string, "sections": [ { "title": string, "questions": [ { "text": string, "guidance": string|null } ] } ] }
Sections: ${sectionCount}. Questions per section: ${questionsPerSection}. Make questions specific, actionable, and auditable.`,
    },
    {
      role: 'user',
      content: `Industry: ${industry}
Compliance standard: ${standard}
${description ? `Additional context: ${description}` : ''}
Generate the checklist JSON now.`,
    },
  ]

  const raw = await groqChat(messages, { temperature: 0.6, max_tokens: 2000 })
  const clean = raw.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

// ── Feature 6: Ask-the-Standard Chatbot ──────────────────────────────────────
export async function askStandardQuestion({ question, standard, history = [] }) {
  const messages = [
    {
      role: 'system',
      content: `You are a compliance expert for ${standard}. Answer questions about this standard concisely (2–4 sentences). Be specific and cite clause numbers when known.`,
    },
    ...history.slice(-6),
    { role: 'user', content: question },
  ]

  return groqChat(messages, { temperature: 0.4, max_tokens: 400 })
}
