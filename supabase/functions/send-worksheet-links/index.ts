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
    const { session_id, app_origin, participant_ids } = await req.json()
    if (!session_id || !app_origin) throw new Error('session_id and app_origin are required')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Fetch session
    const { data: session, error: sessErr } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', session_id)
      .single()
    if (sessErr || !session) throw new Error('Session not found')

    // Fetch coach display name
    const { data: coachProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', session.created_by)
      .single()
    const coachName = coachProfile?.display_name ?? null

    // Fetch participants — optionally filtered to a specific subset
    const baseQuery = supabase
      .from('participants')
      .select('id, name, email, worksheet_url_slug')
      .eq('session_id', session_id)
      .order('name')
    const { data: participants, error: partErr } = await (
      Array.isArray(participant_ids) && participant_ids.length > 0
        ? baseQuery.in('id', participant_ids)
        : baseQuery
    )
    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY secret not set')
    const rawFrom = Deno.env.get('RESEND_FROM_ADDRESS') ?? 'onboarding@resend.dev'
    // If the address doesn't already have a display name, add one
    const fromAddress = rawFrom.includes('<') ? rawFrom : `Cascade Strengths <${rawFrom}>`

    let sent = 0
    for (const p of participants ?? []) {
      const worksheetUrl = `${app_origin}/worksheet/${p.worksheet_url_slug}`
      const firstName = p.name.split(' ')[0]

      const coachLine = coachName
        ? `Sent by your Gallup Strengths coach <strong>${coachName}</strong>`
        : `Sent by your Gallup Strengths coach`

      const sessionDateLine = session.date
        ? `<br/>Session date: ${new Date(session.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
        : ''

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

      <!-- Card -->
      <table role="presentation" width="560" border="0" cellpadding="0" cellspacing="0"
             style="max-width:560px;width:100%;background-color:#ffffff;border:1px solid #e5e7eb;">

        <!-- Header -->
        <tr>
          <td style="background-color:#3b5bdb;padding:24px 32px;">
            <p style="margin:0;font-size:11px;color:#bfdbfe;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.08em;">Gallup Strengths</p>
            <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;font-weight:700;font-family:Arial,Helvetica,sans-serif;line-height:1.3;">
              ${session.title}
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0;font-size:15px;color:#111827;font-family:Arial,Helvetica,sans-serif;">Hi ${firstName},</p>
            <p style="margin:12px 0 0;font-size:14px;color:#374151;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
              Your coach has prepared a Gallup Strengths worksheet for you.
              Click the button below to open your personal worksheet and share your reflections.
            </p>

            <!-- CTA button — VML for Outlook, standard anchor for everyone else -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
              <tr>
                <td align="center" style="padding:28px 0 0;">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml"
                    href="${worksheetUrl}"
                    style="height:46px;v-text-anchor:middle;width:224px;"
                    arcsize="12%" stroke="f" fillcolor="#3b5bdb">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;">
                      Open My Worksheet
                    </center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-->
                  <a href="${worksheetUrl}"
                     style="display:inline-block;background-color:#3b5bdb;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;line-height:46px;padding:0 28px;text-decoration:none;border-radius:8px;">
                    Open My Worksheet &rarr;
                  </a>
                  <!--<![endif]-->
                </td>
              </tr>
            </table>

            <!-- Small print -->
            <p style="margin:24px 0 0;font-size:12px;color:#6b7280;text-align:center;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
              This link is personal to you &mdash; please don&rsquo;t share it.${sessionDateLine}
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #f3f4f6;background-color:#f9fafb;">
            <p style="margin:0;font-size:12px;color:#6b7280;font-family:Arial,Helvetica,sans-serif;">${coachLine}</p>
            <p style="margin:8px 0 0;font-size:11px;color:#9ca3af;font-family:Arial,Helvetica,sans-serif;">
              You received this because you are a participant in this Gallup Strengths session.
              If you believe this was sent in error, please disregard it.
            </p>
          </td>
        </tr>

      </table>
      <!-- /Card -->

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
          to: p.email,
          subject: `Your Strengths Worksheet — ${session.title}`,
          html,
        }),
      })

      if (res.ok) sent++
    }

    return new Response(JSON.stringify({ ok: true, sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
