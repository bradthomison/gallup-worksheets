import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Strength domain colours (mirrors src/lib/strengthColors.js) ───────────────
const STRENGTH_HEADER_BG: Record<string, string> = {
  // Executing — purple
  Achiever: '#7c3aed', Arranger: '#7c3aed', Belief: '#7c3aed',
  Consistency: '#7c3aed', Deliberative: '#7c3aed', Discipline: '#7c3aed',
  Focus: '#7c3aed', Responsibility: '#7c3aed', Restorative: '#7c3aed',
  // Influencing — orange
  Activator: '#ea580c', Command: '#ea580c', Communication: '#ea580c',
  Competition: '#ea580c', Maximizer: '#ea580c', 'Self-Assurance': '#ea580c',
  Significance: '#ea580c', Woo: '#ea580c',
  // Relationship Building — blue
  Adaptability: '#2563eb', Connectedness: '#2563eb', Developer: '#2563eb',
  Empathy: '#2563eb', Harmony: '#2563eb', Includer: '#2563eb',
  Individualization: '#2563eb', Positivity: '#2563eb', Relator: '#2563eb',
  // Strategic Thinking — green
  Analytical: '#16a34a', Context: '#16a34a', Futuristic: '#16a34a',
  Ideation: '#16a34a', Input: '#16a34a', Intellection: '#16a34a',
  Learner: '#16a34a', Strategic: '#16a34a',
}
const strengthBg = (name: string) => STRENGTH_HEADER_BG[name] ?? '#3b5bdb'

// ── Shared HTML helpers ───────────────────────────────────────────────────────

function buildResponseTable(prompts: string[], strengths: string[], cellMap: Record<string, string>) {
  const strengthHeaders = strengths.map(s =>
    `<th style="padding:10px 14px;background:${strengthBg(s)};color:#ffffff;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;border:1px solid #e5e7eb;min-width:140px;">${s}</th>`
  ).join('')

  const rows = prompts.map((prompt, pi) => {
    const cells = strengths.map((_, si) => {
      const text = cellMap[`${pi}_${si}`] ?? ''
      return `<td style="padding:10px 14px;vertical-align:top;border:1px solid #e5e7eb;font-size:13px;color:#111827;line-height:1.5;">${text || '<span style="color:#d1d5db;">&#8212;</span>'}</td>`
    }).join('')
    return `
      <tr>
        <td style="padding:10px 14px;vertical-align:top;background:#f9fafb;border:1px solid #e5e7eb;font-size:12px;font-weight:600;color:#111827;min-width:160px;">${pi + 1}. ${prompt}</td>
        ${cells}
      </tr>`
  }).join('')

  return `
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;">
      <thead>
        <tr>
          <th style="padding:10px 14px;background:#f9fafb;color:#111827;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;border:1px solid #e5e7eb;text-align:left;">Prompt</th>
          ${strengthHeaders}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

function buildEmail(
  title: string,
  subtitle: string,
  bodyHtml: string,
  tableHtml: string,
  footerHtml: string,
  senderName: string,
) {
  return `
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
      <table role="presentation" width="700" border="0" cellpadding="0" cellspacing="0"
             style="max-width:700px;width:100%;background-color:#ffffff;border:1px solid #e5e7eb;">

        <!-- Header -->
        <tr>
          <td style="background-color:#3b5bdb;padding:24px 32px;">
            <p style="margin:0;font-size:11px;color:#bfdbfe;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.08em;">${subtitle}</p>
            <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;font-weight:700;font-family:Arial,Helvetica,sans-serif;line-height:1.3;">${title}</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px 20px;">
            <p style="margin:0;font-size:14px;color:#374151;font-family:Arial,Helvetica,sans-serif;line-height:1.6;">${bodyHtml}</p>
          </td>
        </tr>

        <!-- Response table -->
        <tr>
          <td style="padding:0 32px 32px;overflow-x:auto;">
            ${tableHtml}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #f3f4f6;background-color:#f9fafb;">
            <p style="margin:0;font-size:12px;color:#6b7280;font-family:Arial,Helvetica,sans-serif;">${footerHtml}</p>
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
}

// ── Handler ───────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { participant_id, pdf_base64, pdf_filename } = await req.json()
    if (!participant_id) throw new Error('participant_id is required')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Fetch participant + session
    const { data: participant, error: partErr } = await supabase
      .from('participants')
      .select('*, sessions(*)')
      .eq('id', participant_id)
      .single()
    if (partErr || !participant) throw new Error('Participant not found')

    const session = participant.sessions
    const prompts: string[] = session.prompts ?? []
    const strengths: string[] = participant.top5 ?? []

    // Fetch coach display name
    const { data: coachProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', session.created_by)
      .single()
    const coachName = coachProfile?.display_name ?? null
    const senderName = coachName ? `Strengths Coach ${coachName}` : 'Strengths Coach'
    const coachLine = coachName
      ? `Sent by your Strengths Coach, <strong>${coachName}</strong>`
      : `Sent by your Strengths Coach`

    // Fetch responses
    const { data: responses } = await supabase
      .from('responses')
      .select('*')
      .eq('participant_id', participant_id)

    const cellMap: Record<string, string> = {}
    ;(responses ?? []).forEach((r: any) => {
      cellMap[`${r.prompt_index}_${r.strength_index}`] = r.response_text
    })

    const resendKey = Deno.env.get('RESEND_API_KEY')
    if (!resendKey) throw new Error('RESEND_API_KEY secret not set')
    const rawFrom = Deno.env.get('RESEND_FROM_ADDRESS') ?? 'onboarding@resend.dev'
    const emailOnly = rawFrom.includes('<') ? rawFrom.match(/<(.+)>/)?.[1] ?? rawFrom : rawFrom
    const fromAddress = `${senderName} <${emailOnly}>`

    const table = buildResponseTable(prompts, strengths, cellMap)

    // PDF attachment (optional — passed from frontend)
    const attachments = pdf_base64 && pdf_filename
      ? [{ filename: pdf_filename, content: pdf_base64 }]
      : []

    // ── 1. Email participant their copy ───────────────────────────────────────
    const firstName = participant.name.split(' ')[0]
    const participantHtml = buildEmail(
      session.title,
      'Your Completed Worksheet',
      `Hi ${firstName},<br/><br/>Here&rsquo;s a copy of your completed Gallup Strengths worksheet. Great work reflecting on how your top strengths show up in your life and work.`,
      table,
      coachLine,
      senderName,
    )

    const participantRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromAddress,
        to: participant.email,
        subject: `Your Strengths Worksheet — ${session.title}`,
        html: participantHtml,
        ...(attachments.length > 0 ? { attachments } : {}),
      }),
    })
    if (!participantRes.ok) {
      const body = await participantRes.text()
      throw new Error(`Resend error (participant): ${body}`)
    }

    // ── 2. Email coach the submission ─────────────────────────────────────────
    const { data: { user: coachUser } } = await supabase.auth.admin.getUserById(session.created_by)

    if (coachUser?.email) {
      const coachHtml = buildEmail(
        session.title,
        'New Submission',
        `<strong style="font-size:15px;color:#111827;">${participant.name}</strong><br/>
         <span style="font-size:13px;color:#6b7280;">${participant.email}</span><br/><br/>
         A participant has just submitted their Gallup Strengths worksheet. Their responses are below.`,
        table,
        `Gallup Strengths &middot; ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
        senderName,
      )

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: `${participant.name} <${emailOnly}>`,
          to: coachUser.email,
          reply_to: `${participant.name} <${participant.email}>`,
          subject: `New submission: ${participant.name} — ${session.title}`,
          html: coachHtml,
          ...(attachments.length > 0 ? { attachments } : {}),
        }),
      })
      // We don't throw on coach email failure — participant email is the critical one
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
