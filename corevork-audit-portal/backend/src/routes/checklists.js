import { Router } from 'express'
import { generateChecklist } from '../controllers/checklistController.js'

const router = Router()

router.post('/generate', generateChecklist)   // AI checklist generation

export default router
