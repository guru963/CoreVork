import { Router } from 'express'
import { generateReport, getNarrative } from '../controllers/reportController.js'

const router = Router()

router.get('/:auditId',           generateReport)   // Full PDF download
router.get('/:auditId/narrative', getNarrative)     // AI narrative text only

export default router
