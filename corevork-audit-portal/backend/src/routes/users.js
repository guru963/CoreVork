import express from 'express'
import { inviteUser, resendInvite, deleteUser } from '../controllers/userController.js'

const router = express.Router()

router.post('/invite', inviteUser)
router.post('/resend-invite', resendInvite)
router.delete('/:id', deleteUser)

export default router
