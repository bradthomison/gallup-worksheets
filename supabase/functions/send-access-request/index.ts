import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, name, organization, theme_id } = await req.json()
    if (!email || !name || !theme_id) throw new Error('email, name, and theme_id are required')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Look up theme name and owner
    const { data: theme } = await supabase
      .from('prompt_themes')
      .select('name, created_by')
      .eq('id', theme_id)
      .single()

    const themeName = theme?.name ?? 'Unknown Theme'

    // Get coach email
    let toEmail: string | null = null
    if (theme?.created_by) {
      const { data: { user } } = await supabase.auth.admin.getUserById(theme.created_by)
      toEmail = user?.email ?? null
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY secret not set')
    const rawFrom = Deno.env.get('RESEND_FROM_ADDRESS') ?? 'onboarding@resend.dev'
    const emailOnly = rawFrom.includes('<') ? rawFrom.match(/<(.+)>/)?.[1] ?? rawFrom : rawFrom
    const fromAddress = `Strengths Worksheet <${emailOnly}>`

    if (!toEmail) throw new Error('Could not determine coach email')

    const html = `
<!DOCTYPE html>
<html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" border="0" cellpadding="0" cellspacing="0"
             style="max-width:560px;width:100%;background-color:#ffffff;border:1px solid #e5e7eb;">

        <!-- Header -->
        <tr>
          <td style="background-color:#3b5bdb;padding:24px 32px;">
            <p style="margin:0;font-size:11px;color:#bfdbfe;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.08em;">LMS Access Request</p>
            <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;font-weight:700;font-family:Arial,Helvetica,sans-serif;line-height:1.3;">
              New Access Request
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0;font-size:14px;color:#374151;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
              Someone tried to access the <strong>${themeName}</strong> worksheet but their email wasn&rsquo;t found in the system.
              They have submitted the following details to request access:
            </p>

            <!-- Details table -->
            <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"
                   style="margin-top:24px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
              <tr style="background-color:#f9fafb;">
                <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#6b7280;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.05em;width:120px;">Name</td>
                <td style="padding:12px 16px;font-size:14px;color:#111827;font-family:Arial,Helvetica,sans-serif;">${name}</td>
              </tr>
              <tr style="border-top:1px solid #e5e7eb;">
                <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#6b7280;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.05em;">Email</td>
                <td style="padding:12px 16px;font-size:14px;color:#111827;font-family:Arial,Helvetica,sans-serif;">${email}</td>
              </tr>
              <tr style="background-color:#f9fafb;border-top:1px solid #e5e7eb;">
                <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#6b7280;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.05em;">Organization</td>
                <td style="padding:12px 16px;font-size:14px;color:#111827;font-family:Arial,Helvetica,sans-serif;">${organization || '&mdash;'}</td>
              </tr>
              <tr style="border-top:1px solid #e5e7eb;">
                <td style="padding:12px 16px;font-size:12px;font-weight:700;color:#6b7280;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.05em;">Worksheet</td>
                <td style="padding:12px 16px;font-size:14px;color:#111827;font-family:Arial,Helvetica,sans-serif;">${themeName}</td>
              </tr>
            </table>

            <p style="margin:24px 0 0;font-size:13px;color:#6b7280;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">
              To grant access, add this person to the LMS Learners page with the email address above.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #f3f4f6;background-color:#f9fafb;">
            <p style="margin:0;font-size:11px;color:#9ca3af;font-family:Arial,Helvetica,sans-serif;">
              This request was submitted automatically via the Gallup Strengths worksheet portal.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromAddress,
        to: toEmail,
        reply_to: `${name} <${email}>`,
        subject: `Access request: ${name} — ${themeName}`,
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Resend error: ${body}`)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
