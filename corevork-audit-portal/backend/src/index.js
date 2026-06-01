import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import reportRoutes from './routes/reports.js'
import correctiveRoutes from './routes/corrective.js'
import checklistRoutes from './routes/checklists.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }))
app.use(express.json())

// Health check
app.get('/health', (_, res) => res.json({
  status: 'ok',
  service: 'CoreVork PDF + AI Service',
  version: '2.0.0',
  timestamp: new Date().toISOString(),
}))

// Routes
app.use('/reports',    reportRoutes)
app.use('/corrective', correctiveRoutes)
app.use('/checklists', checklistRoutes)

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: err.message || 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`✓ CoreVork backend running on http://localhost:${PORT}`)
  console.log(`✓ Groq AI: ${process.env.GROQ_API_KEY ? 'configured' : 'MISSING — set GROQ_API_KEY'}`)
  console.log(`✓ Supabase: ${process.env.SUPABASE_URL ? 'configured' : 'MISSING — set SUPABASE_URL'}`)
})
