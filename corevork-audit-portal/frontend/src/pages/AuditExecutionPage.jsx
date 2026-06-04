import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Save, Send, CheckCircle2, XCircle, MinusCircle, FileText, AlertCircle } from 'lucide-react'
import { useAuditStore } from '@/store/auditStore'
import { useCorrectiveStore } from '@/store/correctiveStore'
import { useAuthStore } from '@/store/authStore'
import { Badge, ScoreRing, ConfirmDialog, Spinner, ProgressBar } from '@/components/ui'
import { calculateScore } from '@/lib/utils'
import AIAuditAssistant from '@/components/ai/AIAuditAssistant'
import PhotoHazardUpload from '@/components/ai/PhotoHazardUpload'
import StandardChatbot from '@/components/ai/StandardChatbot'

function AnswerButton({ value, current, onClick, icon: Icon, label, activeClass, disabled }) {
  const isActive = current === value
  return (
    <button
      disabled={disabled}
      onClick={() => onClick(value)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 ${
        isActive
          ? activeClass
          : 'border-brand-gray-200 text-brand-gray-500 hover:border-brand-gray-300 hover:text-brand-black bg-white dark:border-brand-gray-700 dark:text-brand-gray-400 dark:hover:border-brand-gray-600 dark:hover:text-white dark:bg-brand-gray-800'
      } ${disabled ? 'opacity-60 cursor-not-allowed hover:border-brand-gray-200 hover:text-brand-gray-500 dark:hover:border-brand-gray-700 dark:hover:text-brand-gray-400' : ''}`}
    >
      <Icon size={13} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function QuestionRow({ question, response, onAnswer, onNote, onPhoto, sectionTitle, standard, disabled }) {
  const [showNote, setShowNote] = useState(!!response?.notes)
  const handleAIApply = ({ answer, notes }) => {
    if (answer) onAnswer(answer)
    if (notes) { onNote(notes); setShowNote(true) }
  }
  return (
    <div className={`p-4 rounded-xl border transition-all duration-150 ${response?.answer ? 'border-brand-gray-200 bg-white dark:border-brand-gray-800 dark:bg-brand-gray-900' : 'border-brand-gray-100 bg-brand-gray-50/60 dark:border-brand-gray-800/60 dark:bg-brand-gray-900/40'}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap sm:flex-nowrap">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-brand-black dark:text-brand-white leading-snug">{question.text}</p>
          {question.guidance && <p className="text-xs text-brand-gray-400 dark:text-brand-gray-500 mt-1 italic">{question.guidance}</p>}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <AnswerButton value="yes" current={response?.answer} onClick={onAnswer} icon={CheckCircle2} label="Yes" activeClass="border-green-500 bg-green-50 text-green-700 dark:border-green-600/60 dark:bg-green-950/20 dark:text-green-400" disabled={disabled} />
          <AnswerButton value="no" current={response?.answer} onClick={onAnswer} icon={XCircle} label="No" activeClass="border-red-500 bg-red-50 text-red-600 dark:border-red-600/60 dark:bg-red-950/20 dark:text-red-400" disabled={disabled} />
          <AnswerButton value="na" current={response?.answer} onClick={onAnswer} icon={MinusCircle} label="N/A" activeClass="border-brand-gray-400 bg-brand-gray-100 text-brand-gray-700 dark:border-brand-gray-600 dark:bg-brand-gray-800 dark:text-brand-gray-300" disabled={disabled} />
        </div>
      </div>
      <div className="flex items-center gap-3 mt-3 flex-wrap">
        {(!disabled || response?.notes) && (
          <button onClick={() => setShowNote(!showNote)} className={`flex items-center gap-1 text-[11px] font-medium transition-colors ${showNote || response?.notes ? 'text-brand-black' : 'text-brand-gray-400 hover:text-brand-gray-600'}`}>
            <FileText size={11} />{disabled ? 'View note' : response?.notes ? 'Edit note' : 'Add note'}
          </button>
        )}
        {!disabled && <AIAuditAssistant question={question} sectionTitle={sectionTitle} standard={standard} onApply={handleAIApply} />}
      </div>
      <PhotoHazardUpload question={question} sectionTitle={sectionTitle} onUpload={onPhoto} currentUrl={response?.photo_url} disabled={disabled} />
      {showNote && <textarea disabled={disabled} className="input mt-2 text-xs h-16 resize-none" placeholder="Add observations or notes..." value={response?.notes || ''} onChange={e => onNote(e.target.value)} />}
    </div>
  )
}

export default function AuditExecutionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuthStore()
  const { currentAudit, responses, fetchAuditById, setResponse, saveResponses, submitAudit, uploadPhoto, saving, clearCurrentAudit } = useAuditStore()
  const { createActionsFromAudit } = useCorrectiveStore()
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState(0)
  const [showSubmit, setShowSubmit] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const isSubmitted = currentAudit?.status === 'submitted'
  const isViewer = profile?.role === 'viewer'

  useEffect(() => {
    fetchAuditById(id).then(() => setLoading(false)).catch(() => navigate('/audits'))
    return () => clearCurrentAudit()
  }, [id])

  useEffect(() => {
    if (isViewer || isSubmitted) return
    const interval = setInterval(() => saveResponses(), 30000)
    return () => clearInterval(interval)
  }, [responses, isViewer, isSubmitted])

  const sections = currentAudit?.checklists?.sections || []
  const allResponses = Object.values(responses)
  const score = calculateScore(allResponses)
  const answered = allResponses.filter(r => r.answer).length
  const totalQuestions = sections.reduce((a, s) => a + (s.questions?.length || 0), 0)
  const standard = currentAudit?.checklists?.standard || ''

  const handleAnswer = (qId, val) => setResponse(qId, 'answer', val)
  const handleNote = (qId, val) => setResponse(qId, 'notes', val)
  const handlePhoto = async (qId, file) => {
    const url = await uploadPhoto(id, qId, file)
    setResponse(qId, 'photo_url', url)
    return url
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    setError('')
    try {
      await submitAudit(score)
      const failedItems = sections.flatMap(s =>
        (s.questions || []).filter(q => responses[q.id]?.answer === 'no').map(q => ({
          questionText: q.text, sectionTitle: s.title, notes: responses[q.id]?.notes,
        }))
      )
      if (failedItems.length > 0) {
        await createActionsFromAudit({ auditId: id, orgId: profile?.org_id, failedResponses: failedItems, standard })
      }
      setShowSubmit(false)
      setSubmitted(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner size={24} /></div>

  if (submitted) return (
    <div className="max-w-lg mx-auto mt-16 text-center animate-slide-up px-4">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
        <CheckCircle2 size={28} className="text-green-600" />
      </div>
      <h2 className="text-xl font-semibold text-brand-black mb-2">Audit Submitted!</h2>
      <p className="text-brand-gray-500 mb-3 text-sm">Corrective actions auto-created for all failed items.</p>
      <div className="flex justify-center mb-8"><ScoreRing score={score} size={100} /></div>
      <div className="flex gap-3 justify-center flex-wrap">
        <button onClick={() => navigate('/corrective-actions')} className="btn-secondary">View Actions</button>
        <button onClick={() => navigate('/reports')} className="btn-primary">View Report</button>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <div className="mb-6">
        <button onClick={() => { saveResponses(); navigate('/audits') }} className="btn-ghost mb-3 -ml-2">
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="page-title">{currentAudit?.checklists?.title}</h1>
            <p className="page-subtitle">{currentAudit?.site_name}{currentAudit?.site_location ? ` · ${currentAudit.site_location}` : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            {saving && <span className="text-xs text-brand-gray-400 animate-pulse">Saving...</span>}
            <ScoreRing score={score} size={60} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <ProgressBar value={answered} max={totalQuestions || 1} />
          <span className="text-xs text-brand-gray-500 shrink-0">{answered}/{totalQuestions}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-5">
        <aside className="hidden sm:block w-40 shrink-0">
          <div className="sticky top-4 space-y-1">
            {sections.map((section, i) => {
              const sAns = section.questions?.filter(q => responses[q.id]?.answer).length || 0
              const sTotal = section.questions?.length || 0
              return (
                <button key={section.id} onClick={() => setActiveSection(i)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all duration-150 ${activeSection === i ? 'bg-brand-black text-white font-medium dark:bg-brand-white dark:text-brand-black' : 'text-brand-gray-600 hover:bg-brand-gray-100 dark:text-brand-gray-400 dark:hover:bg-brand-gray-800'}`}>
                  <span className="block font-medium truncate">{section.title}</span>
                  <span className="text-[10px] opacity-60">{sAns}/{sTotal}</span>
                </button>
              )
            })}
          </div>
        </aside>

        <div className="sm:hidden w-full mb-3">
          <select className="input" value={activeSection} onChange={e => setActiveSection(Number(e.target.value))}>
            {sections.map((s, i) => <option key={s.id} value={i}>{s.title}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-0">
          {sections[activeSection] && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-brand-black">{sections[activeSection].title}</h2>
                <Badge color="gray">{sections[activeSection].questions?.length} questions</Badge>
              </div>
              <div className="space-y-3">
                  {sections[activeSection].questions?.map(question => (
                    <QuestionRow
                      key={question.id}
                      question={question}
                      response={responses[question.id]}
                      sectionTitle={sections[activeSection].title}
                      standard={standard}
                      onAnswer={val => handleAnswer(question.id, val)}
                      onNote={val => handleNote(question.id, val)}
                      onPhoto={file => handlePhoto(question.id, file)}
                      disabled={isViewer || isSubmitted}
                    />
                  ))}
              </div>
              <div className="flex justify-between mt-6">
                <button onClick={() => setActiveSection(i => Math.max(0, i - 1))} disabled={activeSection === 0} className="btn-secondary disabled:opacity-40">
                  <ChevronLeft size={14} /> Previous
                </button>
                {activeSection < sections.length - 1 ? (
                  <button onClick={() => setActiveSection(i => i + 1)} className="btn-primary">Next</button>
                ) : !isSubmitted && !isViewer && (
                  <button onClick={() => setShowSubmit(true)} className="btn-primary bg-green-700 hover:bg-green-800">
                    <Send size={14} /> Submit Audit
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {!isSubmitted && !isViewer && (
        <div className="fixed bottom-24 right-6 z-30">
          <button onClick={saveResponses} disabled={saving} className="btn-secondary shadow-card">
            <Save size={14} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}

      {standard && <StandardChatbot standard={standard} />}

      <ConfirmDialog
        open={showSubmit}
        onClose={() => setShowSubmit(false)}
        onConfirm={handleSubmit}
        title="Submit Audit"
        message={`${answered} of ${totalQuestions} answered. Score: ${score}%. All "No" answers will auto-create corrective action tickets. Cannot be undone.`}
        confirmLabel={submitting ? 'Submitting...' : 'Submit'}
      />

      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-red-600 text-white text-xs px-4 py-2 rounded-lg shadow-modal">
          <AlertCircle size={13} /> {error}
        </div>
      )}
    </div>
  )
}
