import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to_email, to_name, report_name, pdf_base64 } = await req.json()
    if (!to_email || !to_name || !report_name || !pdf_base64) {
      throw new Error('to_email, to_name, report_name, and pdf_base64 are required')
    }

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY secret not set')

    const rawFrom = Deno.env.get('RESEND_FROM_ADDRESS') ?? 'onboarding@resend.dev'
    const emailOnly = rawFrom.includes('<') ? rawFrom.match(/<(.+)>/)?.[1] ?? rawFrom : rawFrom
    const fromAddress = `Gallup Strengths <${emailOnly}>`

    const firstName = to_name.split(' ')[0]
    const safeName = (s: string) => s.replace(/[^a-z0-9 ]/gi, '-').trim()
    const filename = `${safeName(to_name)} - ${safeName(report_name)}.pdf`

    const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" border="0" cellpadding="0" cellspacing="0"
             style="max-width:560px;width:100%;background-color:#ffffff;border:1px solid #e5e7eb;">
        <tr>
          <td style="background-color:#3b5bdb;padding:24px 32px;">
            <p style="margin:0;font-size:11px;color:#bfdbfe;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.08em;">Gallup Strengths</p>
            <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;font-weight:700;font-family:Arial,Helvetica,sans-serif;line-height:1.3;">${report_name}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0;font-size:15px;color:#111827;font-family:Arial,Helvetica,sans-serif;">Hi ${firstName},</p>
            <p style="margin:12px 0 0;font-size:14px;color:#374151;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
              Your <strong>${report_name}</strong> report is attached to this email as a PDF.
              You can save it for easy reference anytime.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #f3f4f6;background-color:#f9fafb;">
            <p style="margin:0;font-size:11px;color:#9ca3af;font-family:Arial,Helvetica,sans-serif;">
              You received this because you requested your report be emailed to you.
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
        attachments: [{ filename, content: pdf_base64 }],
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
