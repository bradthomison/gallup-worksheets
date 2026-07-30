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
    const { to_email, to_name, report_name, report_url, coach_id } = await req.json()
    if (!to_email || !to_name || !report_name || !report_url) {
      throw new Error('to_email, to_name, report_name, and report_url are required')
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY secret not set')

    const rawFrom = Deno.env.get('RESEND_FROM_ADDRESS') ?? 'onboarding@resend.dev'
    const emailOnly = rawFrom.includes('<') ? rawFrom.match(/<(.+)>/)?.[1] ?? rawFrom : rawFrom

    let coachName: string | null = null
    if (coach_id) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      )
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', coach_id)
        .single()
      coachName = profile?.display_name ?? null
    }

    const senderName = coachName ? `Strengths Coach ${coachName}` : 'Strengths Coach'
    const fromAddress = `${senderName} <${emailOnly}>`
    const firstName = to_name.split(' ')[0]
    const coachLine = coachName
      ? `Sent by your Gallup Strengths coach <strong>${coachName}</strong>`
      : `Sent by your Gallup Strengths coach`

    const html = `
<!DOCTYPE html>
<html lang="en" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:v="urn:schemas-microsoft-com:vml">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <!--[if mso]>
  <xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" border="0" cellpadding="0" cellspacing="0"
             style="max-width:560px;width:100%;background-color:#ffffff;border:1px solid #e5e7eb;">
        <tr>
          <td style="background-color:#3b5bdb;padding:24px 32px;">
            <p style="margin:0;font-size:11px;color:#bfdbfe;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.08em;">Gallup Strengths</p>
            <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;font-weight:700;font-family:Arial,Helvetica,sans-serif;line-height:1.3;">
              ${report_name}
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0;font-size:15px;color:#111827;font-family:Arial,Helvetica,sans-serif;">Hi ${firstName},</p>
            <p style="margin:12px 0 0;font-size:14px;color:#374151;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
              Your coach has shared your <strong>${report_name}</strong> report with you.
              Click the button below to view your personalised strengths content.
            </p>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center" style="padding:28px 0 0;">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml"
                    href="${report_url}"
                    style="height:46px;v-text-anchor:middle;width:224px;"
                    arcsize="12%" stroke="f" fillcolor="#3b5bdb">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;">
                      View My Report
                    </center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-->
                  <a href="${report_url}"
                     style="display:inline-block;background-color:#3b5bdb;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:46px;padding:0 28px;text-decoration:none;border-radius:8px;">
                    View My Report &rarr;
                  </a>
                  <!--<![endif]-->
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;font-size:12px;color:#6b7280;text-align:center;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
              This link opens directly to your report &mdash; no login required.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #f3f4f6;background-color:#f9fafb;">
            <p style="margin:0;font-size:12px;color:#6b7280;font-family:Arial,Helvetica,sans-serif;">${coachLine}</p>
            <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;font-family:Arial,Helvetica,sans-serif;">
              You received this because your coach shared a strengths report with you.
              If you believe this was sent in error, please disregard it.
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
        to: to_email,
        subject: `Your ${report_name} — Gallup Strengths`,
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
