import { Router } from 'express'
import {
  createCorrectiveActions,
  getCorrectiveActions,
  updateCorrectiveAction,
} from '../controllers/correctiveController.js'

const router = Router()

router.post('/',              createCorrectiveActions)   // Auto-create from audit submission
router.get('/org/:orgId',     getCorrectiveActions)      // List by org
router.patch('/:id',          updateCorrectiveAction)    // Update status/assignee

export default router
