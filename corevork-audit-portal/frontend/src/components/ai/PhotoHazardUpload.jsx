import { useState } from 'react'
import { Camera, AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react'
import { analysePhotoContext } from '@/lib/groq'

export default function PhotoHazardUpload({ question, sectionTitle, onUpload, currentUrl }) {
  const [uploading, setUploading] = useState(false)
  const [analysing, setAnalysing] = useState(false)
  const [hazardFlag, setHazardFlag] = useState(null)
  const [preview, setPreview] = useState(currentUrl || null)

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Local preview immediately
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setHazardFlag(null)
    setUploading(true)

    try {
      // AI hazard analysis first
      setAnalysing(true)
      const flag = await analysePhotoContext({
        questionText: question.text,
        sectionTitle,
        fileName: file.name,
      })
      setHazardFlag(flag)
      setAnalysing(false)

      // Upload via parent handler
      const url = await onUpload(file)
      setPreview(url)
    } catch (err) {
      console.error('Photo handling error', err)
      setAnalysing(false)
    } finally {
      setUploading(false)
    }
  }

  const isSafe = hazardFlag && hazardFlag.toLowerCase().includes('verify compliance')

  return (
    <div className="mt-2">
      {preview ? (
        <div className="space-y-2">
          <div className="relative w-full h-28 rounded-lg overflow-hidden border border-brand-gray-200">
            <img src={preview} alt="Evidence" className="w-full h-full object-cover" />
            <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
              <span className="text-white text-xs font-medium">Change photo</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </label>
          </div>

          {/* Hazard flag */}
          {analysing && (
            <div className="flex items-center gap-2 p-2 bg-brand-gray-50 rounded-lg border border-brand-gray-100">
              <Loader2 size={12} className="animate-spin text-brand-gray-400 shrink-0" />
              <span className="text-[11px] text-brand-gray-500">AI analysing photo...</span>
            </div>
          )}
          {hazardFlag && !analysing && (
            <div className={`flex items-start gap-2 p-2 rounded-lg border text-[11px] leading-relaxed ${
              isSafe
                ? 'bg-green-50 border-green-100 text-green-700'
                : 'bg-amber-50 border-amber-100 text-amber-800'
            }`}>
              {isSafe
                ? <CheckCircle2 size={12} className="shrink-0 mt-0.5" />
                : <AlertTriangle size={12} className="shrink-0 mt-0.5" />}
              <span>{hazardFlag}</span>
            </div>
          )}
        </div>
      ) : (
        <label className="flex items-center gap-2 cursor-pointer group">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-brand-gray-400 group-hover:text-brand-black transition-colors">
            {uploading
              ? <Loader2 size={11} className="animate-spin" />
              : <Camera size={11} />}
            {uploading ? 'Uploading...' : 'Add photo'}
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
      )}
    </div>
  )
}
