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
      return `<td style="padding:10px 14px;vertical-align:top;border:1px solid #e5e7eb;font-size:13px;color:#111827;line-height:1.5;">${text || '<span style="color:#d1d5db;">—</span>'}</td>`
    }).join('')
    return `
      <tr>
        <td style="padding:10px 14px;vertical-align:top;background:#f9fafb;border:1px solid #e5e7eb;font-size:12px;font-weight:600;color:#111827;min-width:160px;">${pi + 1}. ${prompt}</td>
        ${cells}
      </tr>`
  }).join('')

  return `
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr>
          <th style="padding:10px 14px;background:#f9fafb;color:#111827;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;border:1px solid #e5e7eb;text-align:left;">Prompt</th>
          ${strengthHeaders}
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`
}

function buildEmail(headerHtml: string, bodyHtml: string, tableHtml: string, footerHtml: string) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,ui-sans-serif,system-ui,sans-serif;">
  <div style="max-width:700px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="background:#3b5bdb;padding:24px 32px;">
      ${headerHtml}
    </div>
    <div style="padding:28px 32px 20px;">
      ${bodyHtml}
    </div>
    <div style="padding:0 32px 32px;overflow-x:auto;">
      ${tableHtml}
    </div>
    <div style="padding:20px 32px;border-top:1px solid #f3f4f6;background:#f9fafb;">
      <p style="margin:0;font-size:12px;color:#111827;">${footerHtml}</p>
    </div>
  </div>
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
    const coachFooter = coachName
      ? `Sent by your Gallup Strengths coach <strong>${coachName}</strong>`
      : `Sent by your Gallup Strengths coach`

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
    const fromAddress = Deno.env.get('RESEND_FROM_ADDRESS') ?? 'onboarding@resend.dev'
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const table = buildResponseTable(prompts, strengths, cellMap)

    // PDF attachment (optional — passed from frontend)
    const attachments = pdf_base64 && pdf_filename
      ? [{ filename: pdf_filename, content: pdf_base64 }]
      : []

    // ── 1. Email participant their copy ───────────────────────────────────────
    const participantHtml = buildEmail(
      `<p style="margin:0;font-size:12px;color:#bfdbfe;text-transform:uppercase;letter-spacing:.08em;">Gallup Strengths</p>
       <h1 style="margin:6px 0 0;font-size:22px;color:#fff;font-weight:700;">${session.title}</h1>`,
      `<p style="margin:0;font-size:15px;color:#111827;">Hi ${participant.name.split(' ')[0]},</p>
       <p style="margin:10px 0 0;font-size:14px;color:#111827;line-height:1.6;">
         Here's a copy of your completed Gallup Strengths worksheet. Great work reflecting on how your top strengths show up in your life and work.
       </p>`,
      table,
      coachFooter,
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
        `<p style="margin:0;font-size:12px;color:#bfdbfe;text-transform:uppercase;letter-spacing:.08em;">New Submission</p>
         <h1 style="margin:6px 0 0;font-size:22px;color:#fff;font-weight:700;">${session.title}</h1>`,
        `<p style="margin:0;font-size:16px;font-weight:600;color:#111827;">${participant.name}</p>
         <p style="margin:2px 0 14px;font-size:13px;color:#111827;">${participant.email}</p>
         <p style="margin:0;font-size:14px;color:#111827;line-height:1.6;">
           A participant has just submitted their Gallup Strengths worksheet. Their responses are below.
         </p>`,
        table,
        `Gallup Strengths · ${dateStr}`,
      )

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: fromAddress,
          to: coachUser.email,
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
