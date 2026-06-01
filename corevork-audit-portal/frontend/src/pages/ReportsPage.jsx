import { useEffect, useState } from 'react'
import { FileText, Download, Search, Sparkles, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useAuditStore } from '@/store/auditStore'
import { supabase } from '@/lib/supabase'
import { generateReportNarrative } from '@/lib/groq'
import { Badge, EmptyState, Spinner, ScoreRing } from '@/components/ui'
import { formatDate, getComplianceLabel } from '@/lib/utils'

export default function ReportsPage() {
  const { profile } = useAuthStore()
  const { audits, fetchAudits, loading } = useAuditStore()
  const [search, setSearch] = useState('')
  const [generating, setGenerating] = useState(null)
  const [narratives, setNarratives] = useState({})
  const [generatingNarrative, setGeneratingNarrative] = useState(null)

  useEffect(() => {
    if (profile) fetchAudits(profile.id, profile.role)
  }, [profile])

  const submitted = audits
    .filter(a => a.status === 'submitted')
    .filter(a => !search ||
      a.site_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.checklists?.title?.toLowerCase().includes(search.toLowerCase())
    )

  const handleGenerateNarrative = async (audit) => {
    setGeneratingNarrative(audit.id)
    try {
      // Fetch failed responses for this audit
      const { data: responses } = await supabase
        .from('responses')
        .select('*, questions(text, sections(title))')
        .eq('audit_id', audit.id)
        .eq('answer', 'no')

      const failedItems = (responses || []).map(r => ({
        section: r.questions?.sections?.title || 'General',
        question: r.questions?.text || '',
      }))

      const narrative = await generateReportNarrative({
        auditTitle: audit.checklists?.title,
        siteName: audit.site_name,
        standard: audit.checklists?.standard,
        score: audit.compliance_score,
        failedItems,
      })
      setNarratives(n => ({ ...n, [audit.id]: narrative }))
    } catch (err) {
      setNarratives(n => ({ ...n, [audit.id]: 'Failed to generate narrative: ' + err.message }))
    } finally {
      setGeneratingNarrative(null)
    }
  }

  const handleDownload = async (auditId) => {
    setGenerating(auditId)
    try {
      const pdfUrl = `${import.meta.env.VITE_PDF_SERVICE_URL}/reports/${auditId}`
      const res = await fetch(pdfUrl)
      if (!res.ok) throw new Error('PDF service not running')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-report-${auditId}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('PDF service not running. Start the backend service to download reports.')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="max-w-5xl mx-auto animate-slide-up">
      <div className="page-header">
        <h1 className="page-title">Reports</h1>
        <p className="page-subtitle">Download PDF reports and generate AI executive summaries.</p>
      </div>

      <div className="relative max-w-sm mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400" />
        <input className="input pl-9" placeholder="Search reports..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={24} /></div>
      ) : submitted.length === 0 ? (
        <EmptyState icon={FileText} title="No reports available" description="Submit an audit to generate a compliance report." />
      ) : (
        <div className="grid gap-4">
          {submitted.map(audit => {
            const compliance = getComplianceLabel(audit.compliance_score)
            const narrative = narratives[audit.id]
            return (
              <div key={audit.id} className="card overflow-hidden">
                <div className="p-5 flex items-center gap-5 flex-wrap sm:flex-nowrap">
                  <ScoreRing score={audit.compliance_score} size={56} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-sm text-brand-black">{audit.checklists?.title}</h3>
                      <Badge color={compliance.color}>{compliance.label}</Badge>
                    </div>
                    <p className="text-xs text-brand-gray-500">{audit.site_name}{audit.site_location ? ` · ${audit.site_location}` : ''}</p>
                    <p className="text-[11px] text-brand-gray-400 mt-0.5">Submitted {formatDate(audit.submitted_at)}</p>
                  </div>
                  <div className="flex gap-2 shrink-0 flex-wrap">
                    <button
                      onClick={() => handleGenerateNarrative(audit)}
                      disabled={generatingNarrative === audit.id}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      {generatingNarrative === audit.id
                        ? <><Loader2 size={12} className="animate-spin" /> Generating...</>
                        : <><Sparkles size={12} /> AI Summary</>}
                    </button>
                    <button onClick={() => handleDownload(audit.id)} disabled={generating === audit.id} className="btn-secondary text-xs py-1.5 px-3">
                      {generating === audit.id ? <Spinner size={12} /> : <Download size={12} />}
                      PDF
                    </button>
                  </div>
                </div>

                {/* AI Narrative */}
                {narrative && (
                  <div className="px-5 pb-5 border-t border-brand-gray-100 pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={12} className="text-brand-gray-500" />
                      <span className="text-[11px] font-semibold text-brand-gray-600 uppercase tracking-wide">AI Executive Summary</span>
                    </div>
                    <p className="text-sm text-brand-gray-700 leading-relaxed bg-brand-gray-50 rounded-lg p-3 border border-brand-gray-100">
                      {narrative}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
