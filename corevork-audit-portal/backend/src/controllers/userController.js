import { supabase } from '../lib/supabase.js'
import { sendInviteEmail } from '../services/emailService.js'

/**
 * Helper: fetch org name and inviter name for email context
 */
async function getInviteContext(orgId, inviterId) {
  let orgName = 'Your Organization'
  let inviterName = 'A team admin'

  try {
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()
    if (org?.name) orgName = org.name
  } catch (e) {
    console.warn('Could not fetch org name:', e.message)
  }

  try {
    const { data: inviter } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', inviterId)
      .single()
    if (inviter?.full_name) inviterName = inviter.full_name
    else if (inviter?.email) inviterName = inviter.email
  } catch (e) {
    console.warn('Could not fetch inviter name:', e.message)
  }

  return { orgName, inviterName }
}

export async function inviteUser(req, res) {
  const { email, fullName, role, orgId } = req.body

  if (!email || !role || !orgId) {
    return res.status(400).json({ error: 'email, role, and orgId are required' })
  }

  try {
    // 1. Verify requestor is authenticated and is an admin of the specified organization
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized: missing token' })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: invalid token' })
    }

    const { data: requestorProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role, org_id')
      .eq('id', user.id)
      .single()

    if (profileError || !requestorProfile || requestorProfile.role !== 'admin' || requestorProfile.org_id !== orgId) {
      return res.status(403).json({ error: 'Forbidden: only admins of this organization can invite users' })
    }

    // 2. Check if user already exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (existingProfile) {
      return res.status(400).json({ error: 'A user with this email is already registered.' })
    }

    // 3. Get context for the email FIRST (org name, inviter name) — needed for redirect URL
    const { orgName, inviterName } = await getInviteContext(orgId, user.id)

    // 4. Build redirect URL with org/role context embedded as query params
    const origin = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173'
    const redirectUrl = `${origin}/accept-invite?orgName=${encodeURIComponent(orgName)}&roleName=${encodeURIComponent(role)}&inviterName=${encodeURIComponent(inviterName)}`

    // 5. Call Supabase Auth Admin API to generate invite link (bypasses SMTP rate limits)
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        redirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role,
          org_id: orgId,
        }
      }
    })

    if (inviteError) {
      throw inviteError
    }

    // 6. Manually insert the public.profiles record using service role bypass
    const { error: insertError } = await supabase
      .from('profiles')
      .upsert({
        id: inviteData.user.id,
        email: email,
        full_name: fullName || email.split('@')[0],
        role: role,
        org_id: orgId,
      })

    if (insertError) {
      throw insertError
    }

    // 7. The Supabase action_link already contains the redirect_to with our params
    const inviteLink = inviteData.properties?.action_link || null

    // 8. Send branded invitation email via Resend
    let emailResult = { success: false, reason: 'No invite link generated' }
    if (inviteLink) {
      emailResult = await sendInviteEmail({
        to: email,
        inviteeName: fullName || email.split('@')[0],
        inviterName,
        orgName,
        role,
        inviteLink,
      })
    }

    res.json({ 
      message: emailResult.success 
        ? 'User invited successfully — invitation email sent!' 
        : 'User invited successfully', 
      user: inviteData.user,
      inviteLink: inviteLink,
      emailSent: emailResult.success,
      emailNote: emailResult.success ? undefined : `Email not sent: ${emailResult.reason}. You can share the invite link manually.`,
    })
  } catch (err) {
    console.error('Invite user error:', err)
    res.status(500).json({ error: err.message || 'Failed to invite user' })
  }
}

export async function resendInvite(req, res) {
  const { email, fullName, role, orgId } = req.body

  if (!email || !role || !orgId) {
    return res.status(400).json({ error: 'email, role, and orgId are required' })
  }

  try {
    // Verify requestor is authenticated and is an admin of the specified organization
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized: missing token' })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: invalid token' })
    }

    const { data: requestorProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role, org_id')
      .eq('id', user.id)
      .single()

    if (profileError || !requestorProfile || requestorProfile.role !== 'admin' || requestorProfile.org_id !== orgId) {
      return res.status(403).json({ error: 'Forbidden: only admins of this organization can manage invites' })
    }

    // Get context for the email FIRST — needed for redirect URL
    const { orgName, inviterName } = await getInviteContext(orgId, user.id)

    // Build redirect URL with org/role context embedded as query params
    const origin = req.headers.origin || process.env.FRONTEND_URL || 'http://localhost:5173'
    const redirectUrl = `${origin}/accept-invite?orgName=${encodeURIComponent(orgName)}&roleName=${encodeURIComponent(role)}&inviterName=${encodeURIComponent(inviterName)}`

    // Call Supabase Auth Admin API to generate invite link again (bypasses SMTP rate limits)
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        redirectTo: redirectUrl,
        data: {
          full_name: fullName,
          role: role,
          org_id: orgId,
        }
      }
    })

    if (inviteError) {
      throw inviteError
    }

    // The Supabase action_link already contains the redirect_to with our params
    const inviteLink = inviteData.properties?.action_link || null

    // Send branded email via Resend
    let emailResult = { success: false, reason: 'No invite link generated' }
    if (inviteLink) {
      emailResult = await sendInviteEmail({
        to: email,
        inviteeName: fullName || email.split('@')[0],
        inviterName,
        orgName,
        role,
        inviteLink,
      })
    }

    res.json({ 
      message: emailResult.success 
        ? 'Invitation resent — email sent!' 
        : 'Invitation resent successfully', 
      user: inviteData.user,
      inviteLink: inviteLink,
      emailSent: emailResult.success,
      emailNote: emailResult.success ? undefined : `Email not sent: ${emailResult.reason}. You can share the invite link manually.`,
    })
  } catch (err) {
    console.error('Resend invite error:', err)
    res.status(500).json({ error: err.message || 'Failed to resend invitation' })
  }
}

export async function deleteUser(req, res) {
  const { id } = req.params
  const { orgId } = req.query

  if (!id || !orgId) {
    return res.status(400).json({ error: 'User ID and organization ID are required' })
  }

  try {
    // Verify requestor is authenticated and is an admin of the specified organization
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized: missing token' })
    }

    const token = authHeader.split(' ')[1]
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized: invalid token' })
    }

    if (user.id === id) {
      return res.status(400).json({ error: 'You cannot delete your own admin account.' })
    }

    const { data: requestorProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role, org_id')
      .eq('id', user.id)
      .single()

    if (profileError || !requestorProfile || requestorProfile.role !== 'admin' || requestorProfile.org_id !== orgId) {
      return res.status(403).json({ error: 'Forbidden: only admins of this organization can remove members' })
    }

    // Verify target user belongs to the same organization
    const { data: targetProfile, error: targetError } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', id)
      .single()

    if (targetError || !targetProfile || targetProfile.org_id !== orgId) {
      return res.status(403).json({ error: 'Forbidden: you can only remove members belonging to your organization' })
    }

    // Delete user from auth.users (which cascades to profiles, or we delete manually to be safe)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(id)
    
    // Explicitly delete from profiles table just in case the trigger/cascade is not setup
    await supabase.from('profiles').delete().eq('id', id)

    if (deleteError && deleteError.status !== 404) {
      throw deleteError
    }

    res.json({ message: 'User removed successfully' })
  } catch (err) {
    console.error('Delete user error:', err)
    res.status(500).json({ error: err.message || 'Failed to remove user' })
  }
}
