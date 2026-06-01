import { useState } from 'react'
import { Sparkles, X, ThumbsUp, ThumbsDown, CheckCircle2, XCircle, MinusCircle, Loader2 } from 'lucide-react'
import { getAIAuditSuggestion } from '@/lib/groq'
import { cn } from '@/lib/utils'

export default function AIAuditAssistant({ question, sectionTitle, standard, onApply }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleAsk = async () => {
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const suggestion = await getAIAuditSuggestion({
        questionText: question.text,
        guidance: question.guidance,
        sectionTitle,
        standard,
        inspectorNote: note,
      })
      setResult(suggestion)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (result) {
      onApply({
        answer: result.answer,
        notes: result.observation,
      })
      setOpen(false)
      setResult(null)
      setNote('')
    }
  }

  const answerIcon = (a) => {
    if (a === 'yes') return <CheckCircle2 size={14} className="text-green-600" />
    if (a === 'no') return <XCircle size={14} className="text-red-500" />
    return <MinusCircle size={14} className="text-brand-gray-400" />
  }

  const confidenceColor = {
    high: 'text-green-600 bg-green-50',
    medium: 'text-yellow-600 bg-yellow-50',
    low: 'text-brand-gray-500 bg-brand-gray-100',
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-[11px] font-medium text-brand-gray-400 hover:text-brand-black transition-colors group"
        title="Ask AI for suggestion"
      >
        <Sparkles size={11} className="group-hover:text-brand-black transition-colors" />
        Ask AI
      </button>
    )
  }

  return (
    <div className="mt-3 rounded-xl border border-brand-gray-200 bg-brand-gray-50 overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-white border-b border-brand-gray-100">
        <div className="flex items-center gap-1.5">
          <Sparkles size={13} className="text-brand-black" />
          <span className="text-xs font-semibold text-brand-black">AI Audit Assistant</span>
        </div>
        <button onClick={() => { setOpen(false); setResult(null); setNote('') }} className="text-brand-gray-400 hover:text-brand-black p-0.5">
          <X size={13} />
        </button>
      </div>

      <div className="p-3 space-y-2.5">
        {/* Optional inspector note */}
        <div>
          <textarea
            className="input text-xs h-14 resize-none"
            placeholder="Describe what you observed on-site (optional — helps AI give a better suggestion)..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        <button
          onClick={handleAsk}
          disabled={loading}
          className="btn-primary w-full justify-center text-xs py-2"
        >
          {loading ? <><Loader2 size={12} className="animate-spin" /> Analysing...</> : <><Sparkles size={12} /> Get AI suggestion</>}
        </button>

        {error && <p className="text-xs text-red-500 px-1">{error}</p>}

        {result && (
          <div className="bg-white rounded-lg border border-brand-gray-200 p-3 space-y-2 animate-slide-up">
            {/* Suggested answer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {answerIcon(result.answer)}
                <span className="text-xs font-semibold text-brand-black capitalize">
                  Suggested: {result.answer || 'N/A'}
                </span>
              </div>
              {result.confidence && (
                <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', confidenceColor[result.confidence])}>
                  {result.confidence} confidence
                </span>
              )}
            </div>

            {/* Observation */}
            {result.observation && (
              <div>
                <p className="text-[10px] font-medium text-brand-gray-400 uppercase tracking-wide mb-0.5">Observation</p>
                <p className="text-xs text-brand-gray-700 leading-relaxed">{result.observation}</p>
              </div>
            )}

            {/* Recommendation */}
            {result.recommendation && (
              <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-[10px] font-medium text-amber-700 uppercase tracking-wide mb-0.5">Recommendation</p>
                <p className="text-xs text-amber-800 leading-relaxed">{result.recommendation}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button onClick={handleApply} className="btn-primary flex-1 justify-center text-xs py-1.5">
                <ThumbsUp size={11} /> Apply suggestion
              </button>
              <button
                onClick={() => { setResult(null); setNote('') }}
                className="btn-secondary text-xs py-1.5 px-3"
              >
                <ThumbsDown size={11} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
