import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Sparkles, Loader2 } from 'lucide-react'
import { askStandardQuestion } from '@/lib/groq'
import { cn } from '@/lib/utils'

export default function StandardChatbot({ standard }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi! Ask me anything about **${standard}** — clauses, requirements, penalties, or best practices.` }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    const userMsg = { role: 'user', content: q }
    setMessages(m => [...m, userMsg])
    setLoading(true)
    try {
      const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
      const answer = await askStandardQuestion({ question: q, standard, history })
      setMessages(m => [...m, { role: 'assistant', content: answer }])
    } catch (err) {
      setMessages(m => [...m, { role: 'assistant', content: `Sorry, I ran into an error: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-40 w-12 h-12 bg-brand-black text-white rounded-full shadow-modal flex items-center justify-center hover:bg-brand-gray-800 transition-all duration-200 group dark:bg-brand-white dark:text-brand-black dark:hover:bg-brand-gray-100"
          title={`Ask about ${standard}`}
        >
          <MessageCircle size={20} />
          <span className="absolute -top-8 right-0 text-[10px] font-medium text-brand-gray-500 dark:text-brand-gray-400 opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
            Ask {standard}
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 w-[calc(100vw-32px)] sm:w-96 bg-white border border-brand-gray-200 rounded-2xl shadow-modal flex flex-col animate-slide-up overflow-hidden dark:bg-brand-gray-900 dark:border-brand-gray-800" style={{ height: 420 }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-brand-gray-100 bg-brand-black dark:border-brand-gray-800 dark:bg-brand-gray-950">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-white dark:text-brand-white" />
              <div>
                <p className="text-xs font-semibold text-white dark:text-brand-white leading-none">Standard Assistant</p>
                <p className="text-[10px] text-brand-gray-400 dark:text-brand-gray-500 mt-0.5">{standard}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-brand-gray-400 hover:text-white p-1 transition-colors">
              <X size={14} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-brand-black text-white rounded-br-sm dark:bg-brand-white dark:text-brand-black'
                    : 'bg-brand-gray-50 text-brand-black border border-brand-gray-100 rounded-bl-sm dark:bg-brand-gray-800 dark:text-brand-white dark:border-brand-gray-700/60'
                )}>
                  {msg.content.split('**').map((part, j) =>
                    j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-brand-gray-50 border border-brand-gray-100 rounded-xl rounded-bl-sm px-3 py-2 dark:bg-brand-gray-800 dark:border-brand-gray-700/60">
                  <Loader2 size={12} className="animate-spin text-brand-gray-400 dark:text-brand-gray-500" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-brand-gray-100 flex gap-2 dark:border-brand-gray-800">
            <input
              className="input text-xs flex-1 py-2"
              placeholder={`Ask about ${standard}...`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="w-8 h-8 bg-brand-black text-white rounded-lg flex items-center justify-center hover:bg-brand-gray-800 disabled:opacity-40 transition-all shrink-0 dark:bg-brand-white dark:text-brand-black dark:hover:bg-brand-gray-100"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
