/**
 * Email Service — sends branded emails via Resend HTTP API
 * Free tier: 100 emails/day, no domain verification needed for testing
 * Uses onboarding@resend.dev as sender during development
 */

const RESEND_API_URL = 'https://api.resend.com/emails'

/**
 * Send a branded invitation email to a new team member
 */
export async function sendInviteEmail({
  to,
  inviteeName,
  inviterName,
  orgName,
  role,
  inviteLink,
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('⚠ RESEND_API_KEY not set — skipping email send. Invite link:', inviteLink)
    return { success: false, reason: 'RESEND_API_KEY not configured' }
  }

  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1)
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

  // Build the accept invite URL with context params
  const acceptUrl = new URL(`${frontendUrl}/accept-invite`)
  // We pass the Supabase token hash through — the invite link from Supabase
  // contains everything needed. We'll redirect through it.
  // The actual invite link from Supabase needs to be the href.
  // But we want to add context for the UI.

  const htmlBody = buildInviteEmailHtml({
    inviteeName,
    inviterName,
    orgName,
    roleLabel,
    inviteLink,
  })

  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'CoreVork <onboarding@resend.dev>',
        to: [to],
        subject: `You've been invited to join ${orgName} on CoreVork`,
        html: htmlBody,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Resend API error:', errorData)
      return { success: false, reason: errorData.message || 'Resend API error' }
    }

    const data = await response.json()
    console.log(`✓ Invite email sent to ${to} (Resend ID: ${data.id})`)
    return { success: true, id: data.id }
  } catch (err) {
    console.error('Email send failed:', err)
    return { success: false, reason: err.message }
  }
}

/**
 * Build a beautiful branded HTML email for invitations
 */
function buildInviteEmailHtml({ inviteeName, inviterName, orgName, roleLabel, inviteLink }) {
  const firstName = inviteeName ? inviteeName.split(' ')[0] : 'there'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to CoreVork</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f8f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="480" style="max-width: 480px; width: 100%;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #0a0a0a; border-radius: 10px; padding: 10px 12px; display: inline-block;">
                    <span style="color: #ffffff; font-size: 16px; font-weight: 700; letter-spacing: -0.02em;">CV</span>
                  </td>
                  <td style="padding-left: 10px;">
                    <span style="font-size: 18px; font-weight: 600; color: #0a0a0a; letter-spacing: -0.02em;">CoreVork</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e8e8e8; padding: 48px 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">

              <!-- Invitation Badge -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <span style="display: inline-block; background-color: #f0fdf4; color: #16a34a; font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 100px; border: 1px solid #bbf7d0; letter-spacing: 0.04em; text-transform: uppercase;">
                      ✉ Team Invitation
                    </span>
                  </td>
                </tr>
              </table>

              <!-- Heading -->
              <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 700; color: #0a0a0a; text-align: center; line-height: 1.3; letter-spacing: -0.02em;">
                Hi ${firstName}, you're invited!
              </h1>

              <p style="margin: 0 0 28px 0; font-size: 15px; color: #6b7280; text-align: center; line-height: 1.6;">
                <strong style="color: #374151;">${inviterName}</strong> has invited you to join
                <strong style="color: #374151;">${orgName}</strong> on CoreVork as ${roleLabel === 'Admin' ? 'an' : 'a'}
                <strong style="color: #374151;">${roleLabel}</strong>.
              </p>

              <!-- Info Box -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 32px;">
                <tr>
                  <td style="background-color: #fafafa; border-radius: 12px; border: 1px solid #f0f0f0; padding: 20px 24px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <span style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;">Organization</span><br>
                          <span style="font-size: 15px; color: #0a0a0a; font-weight: 500;">${orgName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-bottom: 12px;">
                          <span style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;">Your Role</span><br>
                          <span style="font-size: 15px; color: #0a0a0a; font-weight: 500;">${roleLabel}</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <span style="font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;">Invited By</span><br>
                          <span style="font-size: 15px; color: #0a0a0a; font-weight: 500;">${inviterName}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${inviteLink}" target="_blank"
                       style="display: inline-block; background-color: #0a0a0a; color: #ffffff; font-size: 14px; font-weight: 600; padding: 14px 36px; border-radius: 10px; text-decoration: none; letter-spacing: -0.01em; box-shadow: 0 1px 2px rgba(0,0,0,0.1);">
                      Accept Invitation →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.6;">
                You'll be asked to create a password to set up your account.<br>
                This invitation link will expire in 24 hours.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 28px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #9ca3af;">
                CoreVork — Workspace Safety & Compliance Platform
              </p>
              <p style="margin: 0; font-size: 11px; color: #d1d5db;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}
