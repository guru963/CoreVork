import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, ClipboardList, ChevronRight, Wand2, BookOpen, Sparkles } from 'lucide-react'
import { useChecklistStore } from '@/store/checklistStore'
import { Badge, EmptyState, Spinner } from '@/components/ui'

const STANDARDS = ['', 'India Factories Act', 'OSHA', 'ISO 45001']
const standardColor = { 'India Factories Act': 'blue', 'OSHA': 'green', 'ISO 45001': 'yellow' }

export default function ChecklistsPage() {
  const { checklists, fetchChecklists, loading } = useChecklistStore()
  const [search, setSearch] = useState('')
  const [standard, setStandard] = useState('')
  const [tab, setTab] = useState('library')
  const navigate = useNavigate()

  useEffect(() => { fetchChecklists(search, standard) }, [search, standard])

  const library = checklists.filter(c => !c.is_custom)
  const custom = checklists.filter(c => c.is_custom)
  const displayed = tab === 'library' ? library : custom

  return (
    <div className="max-w-5xl mx-auto animate-slide-up">
      <div className="page-header flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Checklists</h1>
          <p className="page-subtitle">Use off-the-shelf templates or generate a custom checklist with AI.</p>
        </div>
        <button onClick={() => navigate('/checklists/generate')} className="btn-primary shrink-0 self-start">
          <Sparkles size={14} /> Generate with AI
        </button>
      </div>

      <div className="flex gap-1 p-1 bg-brand-gray-100 rounded-xl w-fit mb-5">
        <button onClick={() => setTab('library')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${tab === 'library' ? 'bg-white text-brand-black shadow-card' : 'text-brand-gray-500 hover:text-brand-black'}`}>
          <BookOpen size={13} /> Standard Library
          <span className="text-[10px] bg-brand-gray-200 text-brand-gray-600 px-1.5 py-0.5 rounded-full">{library.length}</span>
        </button>
        <button onClick={() => setTab('custom')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${tab === 'custom' ? 'bg-white text-brand-black shadow-card' : 'text-brand-gray-500 hover:text-brand-black'}`}>
          <Wand2 size={13} /> AI Generated
          <span className="text-[10px] bg-brand-gray-200 text-brand-gray-600 px-1.5 py-0.5 rounded-full">{custom.length}</span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gray-400" />
          <input className="input pl-9" placeholder="Search checklists..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {tab === 'library' && (
          <select className="input sm:w-auto" value={standard} onChange={e => setStandard(e.target.value)}>
            {STANDARDS.map(s => <option key={s} value={s}>{s || 'All standards'}</option>)}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size={24} /></div>
      ) : displayed.length === 0 ? (
        tab === 'custom' ? (
          <div className="card p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-brand-gray-100 flex items-center justify-center mx-auto mb-4">
              <Sparkles size={22} className="text-brand-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-brand-black mb-1">No custom checklists yet</h3>
            <p className="text-sm text-brand-gray-500 mb-5 max-w-xs mx-auto">Use the AI generator to create a checklist tailored to your industry in seconds.</p>
            <button onClick={() => navigate('/checklists/generate')} className="btn-primary"><Sparkles size={14} /> Generate with AI</button>
          </div>
        ) : (
          <EmptyState icon={ClipboardList} title="No checklists found" description="Try a different search or filter." />
        )
      ) : (
        <div className="grid gap-3">
          {displayed.map(cl => {
            const sectionCount = cl.sections?.length ?? 0
            const questionCount = cl.sections?.reduce((a, s) => a + (s.questions?.length ?? 0), 0) ?? 0
            return (
              <div key={cl.id} className="card-hover p-4 sm:p-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-gray-100 flex items-center justify-center shrink-0">
                  {cl.is_custom ? <Wand2 size={16} className="text-brand-gray-500" /> : <ClipboardList size={16} className="text-brand-gray-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <h3 className="font-semibold text-sm text-brand-black">{cl.title}</h3>
                    <Badge color={standardColor[cl.standard] || 'gray'}>{cl.standard}</Badge>
                    {cl.is_custom && <Badge color="black">AI</Badge>}
                  </div>
                  <p className="text-xs text-brand-gray-500 line-clamp-1 mb-1">{cl.description}</p>
                  <div className="flex gap-3 text-xs text-brand-gray-400">
                    <span>{sectionCount} sections</span><span>·</span><span>{questionCount} questions</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-brand-gray-300 shrink-0" />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
