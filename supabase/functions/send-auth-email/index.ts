import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Signature verification ────────────────────────────────────────────────────

async function verifyHookSignature(rawBody: string, signatureHeader: string, secret: string): Promise<boolean> {
  try {
    // Secret format: v1,whsec_<base64>
    const b64Secret = secret.replace(/^v1,whsec_/, '')
    const keyBytes = Uint8Array.from(atob(b64Secret), c => c.charCodeAt(0))

    const key = await crypto.subtle.importKey(
      'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    )

    // Header format: v1=<base64-hmac>
    const b64Sig = signatureHeader.replace(/^v1=/, '')
    const sigBytes = Uint8Array.from(atob(b64Sig), c => c.charCodeAt(0))
    const bodyBytes = new TextEncoder().encode(rawBody)

    return crypto.subtle.verify('HMAC', key, sigBytes, bodyBytes)
  } catch {
    return false
  }
}

// ── Email HTML builder ────────────────────────────────────────────────────────

function buildMagicLinkEmail(opts: {
  firstName: string | null
  confirmUrl: string
  coachName: string | null
  actionType: string
}) {
  const { firstName, confirmUrl, coachName, actionType } = opts

  const greeting = firstName ? `Hi ${firstName},` : 'Hi,'
  const senderLine = coachName
    ? `Your Gallup Strengths coach, <strong>${coachName}</strong>, has invited you to sign in.`
    : 'Your Gallup Strengths coach has set up access for you.'

  const isSignup = actionType === 'signup'
  const subject = isSignup
    ? 'Welcome to Gallup Strengths Worksheets'
    : 'Your sign-in link — Gallup Strengths'

  const headline = isSignup ? 'Welcome!' : 'Sign in to your strengths'
  const bodyText = isSignup
    ? `${senderLine}<br/><br/>Click the button below to activate your account and view your strengths dashboard.`
    : `${senderLine}<br/><br/>Click the button below to sign in. This link expires in 1 hour and can only be used once.`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
  <tr>
    <td align="center" style="padding:40px 16px;">
      <table role="presentation" width="520" border="0" cellpadding="0" cellspacing="0"
             style="max-width:520px;width:100%;background-color:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background-color:#1e40af;padding:28px 36px;">
            <p style="margin:0;font-size:11px;color:#93c5fd;text-transform:uppercase;letter-spacing:.08em;">
              Gallup Strengths Worksheets
            </p>
            <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;font-weight:700;line-height:1.3;">
              ${headline}
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px 24px;">
            <p style="margin:0 0 8px;font-size:15px;color:#111827;font-weight:600;">${greeting}</p>
            <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">
              ${bodyText}
            </p>
          </td>
        </tr>

        <!-- Button -->
        <tr>
          <td style="padding:0 36px 32px;">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:8px;background-color:#1d4ed8;">
                  <a href="${confirmUrl}"
                     style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;letter-spacing:.01em;">
                    Sign in to my dashboard →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;">
              Or copy and paste this URL into your browser:<br/>
              <span style="color:#6b7280;word-break:break-all;">${confirmUrl}</span>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 36px;border-top:1px solid #f3f4f6;background-color:#f9fafb;">
            <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
              You received this because your email is registered with Gallup Strengths Worksheets.
              If you didn't request this, you can safely ignore it — your account won't be affected.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`

  return { html, subject }
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  try {
    const rawBody = await req.text()
    const hookSecret = Deno.env.get('SEND_AUTH_EMAIL_HOOK_SECRET')
    if (hookSecret) {
      const sig = req.headers.get('x-supabase-signature') ?? ''
      const valid = await verifyHookSignature(rawBody, sig, hookSecret)
      if (!valid) {
        return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 })
      }
    }

    const payload = JSON.parse(rawBody)
    const { user, email_data } = payload

    if (!user?.email || !email_data?.token_hash) {
      return new Response(JSON.stringify({ error: 'Invalid hook payload' }), { status: 400 })
    }

    const { token_hash, redirect_to, email_action_type } = email_data

    // Build the Supabase confirm URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const confirmUrl = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(redirect_to ?? supabaseUrl)}`

    // Look up the participant's first name and coach name
    const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: person } = await supabase
      .from('people')
      .select('name, team_id, teams(created_by)')
      .eq('email', user.email.toLowerCase())
      .maybeSingle()

    const firstName = person?.name?.split(' ')[0] ?? null

    let coachName: string | null = null
    const coachId = (person?.teams as any)?.created_by ?? null
    if (coachId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', coachId)
        .maybeSingle()
      coachName = profile?.display_name ?? null
    }

    // Build email
    const { html, subject } = buildMagicLinkEmail({
      firstName,
      confirmUrl,
      coachName,
      actionType: email_action_type,
    })

    // Send via Resend
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY secret not set')

    const rawFrom = Deno.env.get('RESEND_FROM_ADDRESS') ?? 'noreply@bradthomison.com'
    const emailOnly = rawFrom.includes('<') ? rawFrom.match(/<(.+)>/)?.[1] ?? rawFrom : rawFrom
    const senderName = coachName
      ? `${coachName} via Gallup Strengths`
      : 'Gallup Strengths'
    const fromAddress = `${senderName} <${emailOnly}>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: fromAddress, to: user.email, subject, html }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Resend error: ${body}`)
    }

    // Return empty object — required by Supabase Send Email Hook
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('send-auth-email error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
