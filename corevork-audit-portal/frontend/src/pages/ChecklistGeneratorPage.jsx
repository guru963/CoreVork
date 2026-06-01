import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wand2, Sparkles, Plus, Trash2,
  ChevronDown, ChevronUp, ClipboardList, AlertCircle, CheckCircle2
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { generateChecklist } from '@/lib/groq'
import { useAuthStore } from '@/store/authStore'
import { Spinner, Badge } from '@/components/ui'

const STANDARDS = ['India Factories Act', 'OSHA', 'ISO 45001', 'ISO 14001', 'NEBOSH', 'Custom']
const INDUSTRIES = [
  'Manufacturing', 'Construction', 'Chemical / Petrochemical', 'Textile',
  'Food & Beverage', 'Pharmaceutical', 'Mining', 'Automotive', 'Warehousing & Logistics', 'Other',
]
const standardColor = {
  'India Factories Act': 'blue', 'OSHA': 'green', 'ISO 45001': 'yellow',
  'ISO 14001': 'green', 'NEBOSH': 'blue', 'Custom': 'gray',
}

export default function ChecklistGeneratorPage() {
  const { profile } = useAuthStore()
  const navigate = useNavigate()

  const [form, setForm] = useState({ industry: '', standard: '', description: '', sectionCount: 4, questionsPerSection: 5 })
  const [generated, setGenerated] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [expandedSections, setExpandedSections] = useState({})
  const [step, setStep] = useState('form')

  const update = f => e => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!form.industry || !form.standard) { setError('Please select industry and standard.'); return }
    setError('')
    setGenerating(true)
    try {
      const result = await generateChecklist({
        industry: form.industry, standard: form.standard,
        description: form.description,
        sectionCount: parseInt(form.sectionCount),
        questionsPerSection: parseInt(form.questionsPerSection),
      })
      setGenerated(result)
      setExpandedSections({ 0: true })
      setStep('preview')
    } catch (err) {
      setError('AI generation failed: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  const updateTitle = (val) => setGenerated(g => ({ ...g, title: val }))
  const updateDesc  = (val) => setGenerated(g => ({ ...g, description: val }))
  const updateSectionTitle = (si, val) => setGenerated(g => {
    const sections = [...g.sections]; sections[si] = { ...sections[si], title: val }; return { ...g, sections }
  })
  const updateQuestion = (si, qi, field, val) => setGenerated(g => ({
    ...g,
    sections: g.sections.map((s, i) => i !== si ? s : {
      ...s, questions: s.questions.map((q, j) => j === qi ? { ...q, [field]: val } : q)
    })
  }))
  const addQuestion    = (si) => setGenerated(g => ({ ...g, sections: g.sections.map((s, i) => i !== si ? s : { ...s, questions: [...s.questions, { text: '', guidance: '' }] }) }))
  const removeQuestion = (si, qi) => setGenerated(g => ({ ...g, sections: g.sections.map((s, i) => i !== si ? s : { ...s, questions: s.questions.filter((_, j) => j !== qi) }) }))
  const addSection     = () => setGenerated(g => ({ ...g, sections: [...g.sections, { title: 'New Section', questions: [{ text: '', guidance: '' }] }] }))
  const removeSection  = (si) => setGenerated(g => ({ ...g, sections: g.sections.filter((_, i) => i !== si) }))

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      // Build checklist payload — only include org_id if we actually have one
      const clPayload = {
        title: generated.title,
        standard: form.standard,
        description: generated.description,
        is_active: true,
        is_custom: true,
      }
      // Only attach org_id / created_by if they exist — avoids RLS violations
      if (profile?.org_id)  clPayload.org_id     = profile.org_id
      if (profile?.id)      clPayload.created_by  = profile.id

      const { data: cl, error: clErr } = await supabase
        .from('checklists')
        .insert(clPayload)
        .select()
        .single()

      if (clErr) {
        // Give a clear, actionable error message
        if (clErr.code === '42501' || clErr.message?.includes('policy')) {
          throw new Error('Permission denied. Run the supabase_additions.sql file to update RLS policies, then try again.')
        }
        throw new Error(clErr.message)
      }

      // Insert sections + questions sequentially
      for (let si = 0; si < generated.sections.length; si++) {
        const section = generated.sections[si]
        const { data: sec, error: secErr } = await supabase
          .from('sections')
          .insert({ checklist_id: cl.id, title: section.title, order_index: si })
          .select()
          .single()

        if (secErr) throw new Error('Section save failed: ' + secErr.message)

        const questions = (section.questions || [])
          .filter(q => q.text?.trim())
          .map((q, qi) => ({ section_id: sec.id, text: q.text, guidance: q.guidance || null, order_index: qi }))

        if (questions.length > 0) {
          const { error: qErr } = await supabase.from('questions').insert(questions)
          if (qErr) throw new Error('Questions save failed: ' + qErr.message)
        }
      }

      setStep('saved')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const totalQuestions = generated?.sections?.reduce((a, s) => a + s.questions.length, 0) || 0

  if (step === 'saved') return (
    <div className="max-w-lg mx-auto mt-20 text-center animate-slide-up px-4">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
        <CheckCircle2 size={28} className="text-green-600" />
      </div>
      <h2 className="text-xl font-semibold text-brand-black mb-2">Checklist saved!</h2>
      <p className="text-sm text-brand-gray-500 mb-8"><strong>{generated?.title}</strong> is now in your library.</p>
      <div className="flex gap-3 justify-center flex-wrap">
        <button onClick={() => navigate('/checklists')} className="btn-secondary">View Library</button>
        <button onClick={() => { setStep('form'); setGenerated(null) }} className="btn-primary"><Wand2 size={14} /> Generate Another</button>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <div className="page-header">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-xl bg-brand-black flex items-center justify-center">
            <Sparkles size={15} className="text-white" />
          </div>
          <h1 className="page-title">AI Checklist Generator</h1>
        </div>
        <p className="page-subtitle">Describe your industry — AI builds a complete audit checklist in seconds.</p>
      </div>

      {step === 'form' && (
        <form onSubmit={handleGenerate}>
          <div className="card p-6 mb-4">
            <h2 className="text-sm font-semibold text-brand-black mb-4">Tell us about your facility</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Industry *</label>
                <select className="input" value={form.industry} onChange={update('industry')} required>
                  <option value="">Select industry...</option>
                  {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Compliance standard *</label>
                <select className="input" value={form.standard} onChange={update('standard')} required>
                  <option value="">Select standard...</option>
                  {STANDARDS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Additional context (optional)</label>
                <textarea className="input h-20 resize-none" placeholder="e.g. Textile dyeing unit with chemical storage, 200 workers, night shifts..." value={form.description} onChange={update('description')} />
              </div>
              <div>
                <label className="label">Number of sections</label>
                <select className="input" value={form.sectionCount} onChange={update('sectionCount')}>
                  {[3,4,5,6,8].map(n => <option key={n} value={n}>{n} sections</option>)}
                </select>
              </div>
              <div>
                <label className="label">Questions per section</label>
                <select className="input" value={form.questionsPerSection} onChange={update('questionsPerSection')}>
                  {[4,5,6,8,10].map(n => <option key={n} value={n}>{n} questions</option>)}
                </select>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600 mb-4">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />{error}
            </div>
          )}
          <div className="flex justify-end">
            <button type="submit" disabled={generating} className="btn-primary gap-2 px-6">
              {generating ? <><Spinner size={14} /> Generating...</> : <><Wand2 size={14} /> Generate with AI</>}
            </button>
          </div>
        </form>
      )}

      {step === 'preview' && generated && (
        <div>
          <div className="card p-4 mb-4 flex flex-wrap items-center gap-3">
            <Badge color={standardColor[form.standard] || 'gray'}>{form.standard}</Badge>
            <Badge color="gray">{form.industry}</Badge>
            <Badge color="gray">{generated.sections?.length} sections</Badge>
            <Badge color="gray">{totalQuestions} questions</Badge>
            <div className="flex-1" />
            <button onClick={() => setStep('form')} className="btn-ghost text-xs py-1.5">← Regenerate</button>
          </div>

          <div className="card p-5 mb-4">
            <label className="label">Checklist title</label>
            <input className="input font-semibold mb-3" value={generated.title} onChange={e => updateTitle(e.target.value)} />
            <label className="label">Description</label>
            <textarea className="input h-16 resize-none text-sm" value={generated.description} onChange={e => updateDesc(e.target.value)} />
          </div>

          <div className="space-y-3 mb-4">
            {generated.sections?.map((section, si) => (
              <div key={si} className="card overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-3 bg-brand-gray-50 border-b border-brand-gray-100 cursor-pointer"
                  onClick={() => setExpandedSections(e => ({ ...e, [si]: !e[si] }))}>
                  <div className="w-6 h-6 rounded-md bg-brand-black flex items-center justify-center text-white text-xs font-semibold shrink-0">{si + 1}</div>
                  <input className="flex-1 bg-transparent font-semibold text-sm text-brand-black focus:outline-none"
                    value={section.title} onChange={e => { e.stopPropagation(); updateSectionTitle(si, e.target.value) }}
                    onClick={e => e.stopPropagation()} />
                  <span className="text-xs text-brand-gray-400">{section.questions.length}q</span>
                  <button onClick={e => { e.stopPropagation(); removeSection(si) }} className="text-brand-gray-300 hover:text-red-500 transition-colors p-1">
                    <Trash2 size={13} />
                  </button>
                  {expandedSections[si] ? <ChevronUp size={14} className="text-brand-gray-400" /> : <ChevronDown size={14} className="text-brand-gray-400" />}
                </div>

                {expandedSections[si] && (
                  <div className="p-4 space-y-3">
                    {section.questions.map((q, qi) => (
                      <div key={qi} className="flex gap-3 items-start group">
                        <div className="w-5 h-5 rounded-full bg-brand-gray-100 flex items-center justify-center text-[10px] font-medium text-brand-gray-500 shrink-0 mt-2.5">{qi + 1}</div>
                        <div className="flex-1 space-y-1.5">
                          <input className="input text-sm" placeholder="Question text..." value={q.text} onChange={e => updateQuestion(si, qi, 'text', e.target.value)} />
                          <input className="input text-xs text-brand-gray-400" placeholder="Guidance note (optional)..." value={q.guidance || ''} onChange={e => updateQuestion(si, qi, 'guidance', e.target.value)} />
                        </div>
                        <button 
                          onClick={() => removeQuestion(si, qi)} 
                          className="text-brand-gray-200 hover:text-red-400 transition-colors p-1 mt-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => addQuestion(si)} className="btn-ghost w-full justify-center text-xs py-1.5 border border-dashed border-brand-gray-200">
                      <Plus size={12} /> Add question
                    </button>
                  </div>
                )}
              </div>
            ))}

            <button onClick={addSection} className="btn-ghost w-full justify-center py-3 border border-dashed border-brand-gray-200 rounded-xl">
              <Plus size={14} /> Add section
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-xs text-red-600 mb-4">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />{error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button onClick={() => setStep('form')} className="btn-secondary">Regenerate</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary px-6">
              {saving ? <><Spinner size={14} /> Saving...</> : <><ClipboardList size={14} /> Save to Library</>}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
