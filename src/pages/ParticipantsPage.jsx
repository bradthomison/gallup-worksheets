import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import StrengthBadge from '../components/StrengthBadge'
import { STRENGTH_DOMAIN, getStrengthColors } from '../lib/strengthColors'
import { parseParticipants } from '../lib/parseParticipants'
import { getWorksheetPDFBlob, getBlankWorksheetPDFBlob } from '../lib/downloadWorksheetPDF'
import { downloadPersonalInsightsPDF, downloadCustomReportPDF, downloadBringNeedPDF, downloadPowerOfMePDF } from '../lib/downloadReportPDF'
import { P2_VARIANTS, P2_VARIANT_ORDER, p2Path } from '../data/powerOf2'
import { loadPowerOfMeContent } from '../lib/powerOf2Content'
import { formatDateShort } from '../lib/dateUtils'
import ResponseViewerModal from '../components/ResponseViewerModal'
import PersonalInsightsModal, { buildPersonalInsightsPrintHTML } from '../components/PersonalInsightsModal'
import BringNeedModal, { buildBringNeedPrintHTML } from '../components/BringNeedModal'

const ALL_STRENGTHS = Object.keys(STRENGTH_DOMAIN).sort()

const BLANK = { name: '', email: '', top5: ['', '', '', '', ''], team_id: '' }

function safeName(str) {
  return str.replace(/[/\\?%*:|"<>]/g, '-')
}

// ── Add-Team modal ────────────────────────────────────────────────────────────
function AddTeamModal({ onSave, onClose }) {
  const [form, setForm] = useState({ name: '', location: '', primary_coach: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave() {
    if (!form.name.trim()) { setError('Team name is required'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: team, error: err } = await supabase
      .from('teams')
      .insert({ ...form, created_by: user.id })
      .select()
      .single()
    setSaving(false)
    if (err) { setError(err.message); return }
    onSave(team)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-gray-900">Add Team</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Team Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onClose() }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Alpha Team"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
            <input
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="e.g. Chicago"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Primary Coach</label>
            <input
              value={form.primary_coach}
              onChange={e => setForm(f => ({ ...f, primary_coach: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Coach name"
            />
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
          >
            {saving ? 'Creating…' : 'Create Team'}
          </button>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Edit / Add row ────────────────────────────────────────────────────────────
function EditRow({ person, teams, onSave, onCancel, onOpenAddTeam, onDeletePerson }) {
  const [form, setForm] = useState({
    name: person.name,
    email: person.email,
    top5: [...(person.top5 ?? ['', '', '', '', ''])],
    team_id: person.team_id ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  function applyNewTeam(team) {
    setForm(f => ({ ...f, team_id: team.id }))
  }

  function setStrength(i, val) {
    const t = [...form.top5]
    t[i] = val
    setForm(f => ({ ...f, top5: t }))
  }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.email.includes('@')) { setError('Valid email required'); return }
    if (form.top5.some(s => !s.trim())) { setError('All 5 strengths required'); return }
    setSaving(true)
    setError(null)
    await onSave({
      ...form,
      top5: form.top5.map(s => s.trim()),
      team_id: form.team_id || null,
    })
    setSaving(false)
  }

  function handleTeamChange(e) {
    if (e.target.value === '__new__') {
      onOpenAddTeam(applyNewTeam)
    } else {
      setForm(f => ({ ...f, team_id: e.target.value }))
    }
  }

  return (
    <tr className="bg-blue-50">
      <td className="w-8 px-3 py-2"></td>
      <td className="px-4 py-2">
        <input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="Full name"
        />
      </td>
      <td className="px-4 py-2">
        <input
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          className="w-full rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          placeholder="email@example.com"
        />
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-1 flex-wrap">
          {form.top5.map((s, i) => (
            <select
              key={i}
              value={s}
              onChange={e => setStrength(i, e.target.value)}
              className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="">Strength {i + 1}…</option>
              {ALL_STRENGTHS.filter(opt => opt === s || !form.top5.includes(opt)).map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ))}
        </div>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </td>
      <td className="px-4 py-2">
        <select
          value={form.team_id}
          onChange={handleTeamChange}
          className="w-full rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">No team</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
          <option value="__new__">+ Create new team…</option>
        </select>
      </td>
      <td className="px-4 py-2">
        <div className="flex flex-col gap-1.5">
          {/* Row 1: Save + Cancel */}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs font-semibold bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white px-3 py-1 rounded-full border border-brand-500 transition-colors whitespace-nowrap"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={onCancel}
              className="text-xs font-medium text-gray-500 hover:text-gray-800 bg-white hover:bg-gray-50 px-3 py-1 rounded-full border border-gray-300 transition-colors whitespace-nowrap"
            >
              Cancel
            </button>
          </div>
          {/* Row 2: Delete */}
          {onDeletePerson && (
            <div className="flex gap-2">
              <button
                onClick={onDeletePerson}
                className="text-xs font-medium px-3 py-1 rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors whitespace-nowrap"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

// ── CustomReportModal ─────────────────────────────────────────────────────────
function buildCustomReportPrintHTML(reportName, personName, strengths, rows, insights) {
  const colWidth = Math.floor((100 - 16) / strengths.length)
  const headerCells = strengths.map(s => {
    const c = getStrengthColors(s)
    return `<th style="width:${colWidth}%;border:1px solid #d1d5db;background:${c.headerBg};color:${c.headerText};padding:5px 6px;font-size:12px;font-weight:700;text-align:center;">${s}</th>`
  }).join('')
  const bodyRows = rows.map(row => {
    const cells = strengths.map(s => `<td style="border:1px solid #d1d5db;padding:4px 6px;font-size:11px;color:#374151;vertical-align:top;word-wrap:break-word;">${insights?.[s]?.[row.id] ?? ''}</td>`).join('')
    return `<tr><th style="width:145px;border:1px solid #d1d5db;background:#f9fafb;padding:4px 6px;font-size:11px;font-weight:600;color:#374151;text-align:left;vertical-align:top;word-wrap:break-word;">${row.label}</th>${cells}</tr>`
  }).join('')
  return `<!DOCTYPE html><html><head><title>${reportName} — ${personName}</title><style>*{box-sizing:border-box;}html,body{height:100%;margin:0;padding:0;}body{font-family:Arial,sans-serif;display:flex;flex-direction:column;}h2{font-size:16px;margin:0 0 6px 0;color:#111;flex-shrink:0;}table{border-collapse:collapse;width:100%;table-layout:fixed;flex:1;}tfoot td{border-top:1px solid #d1d5db;padding:2px 5px;font-size:8px;color:#9ca3af;}@page{size:landscape;margin:0.35in;}-webkit-print-color-adjust:exact;print-color-adjust:exact;</style></head><body><h2>${reportName} — ${personName}</h2><table><colgroup><col style="width:145px;"/>${strengths.map(() => `<col style="width:${colWidth}%;"/>`).join('')}</colgroup><thead><tr><th style="border:1px solid #d1d5db;background:#f9fafb;"></th>${headerCells}</tr></thead><tbody>${bodyRows}</tbody><tfoot><tr><td colspan="${strengths.length + 1}">Cascade© 2021 Releasing Strengths Ltd. All rights reserved. Gallup®, CliftonStrengths® and the 34 theme names of CliftonStrengths® are trademarks of Gallup, Inc.</td></tr></tfoot></table></body></html>`
}

function CustomReportModal({ report, participant, onClose }) {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading] = useState(true)
  const strengths = (participant.top5 ?? []).filter(Boolean)
  const rows = report.rows ?? []

  useEffect(() => {
    async function load() {
      const map = {}
      strengths.forEach(s => { map[s] = {} })
      if (strengths.length > 0) {
        const { data } = await supabase
          .from('report_content')
          .select('strength_name, content')
          .eq('report_type', report.id)
          .in('strength_name', strengths)
        ;(data ?? []).forEach(r => { if (r.content) map[r.strength_name] = r.content })
      }
      setInsights(map)
      setLoading(false)
    }
    load()
  }, [report.id])

  function handlePrint() {
    const html = buildCustomReportPrintHTML(report.name, participant.name, strengths, rows, insights)
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 250)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 py-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{report.name}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{participant.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-medium transition-colors"
            >
              Print / PDF
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : rows.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">This report has no rows defined yet.</p>
              <p className="text-sm text-gray-400 mt-1">Go to Reports to add rows.</p>
            </div>
          ) : strengths.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No strengths entered for this participant.</p>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full border-collapse text-sm" style={{ minWidth: `${150 + strengths.length * 180}px` }}>
                <colgroup>
                  <col style={{ width: '150px' }} />
                  {strengths.map(s => <col key={s} />)}
                </colgroup>
                <thead>
                  <tr>
                    <th className="border border-gray-200 bg-gray-50 p-3" />
                    {strengths.map(s => {
                      const c = getStrengthColors(s)
                      return (
                        <th key={s} className="border border-gray-200 p-3 text-center font-bold text-sm"
                          style={{ background: c.headerBg, color: c.headerText }}>
                          {s}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} className="even:bg-gray-50/50">
                      <th className="border border-gray-200 bg-gray-50 p-3 text-left text-xs font-semibold text-gray-700 align-top">
                        {row.label}
                      </th>
                      {strengths.map(s => (
                        <td key={s} className="border border-gray-200 p-3 text-xs text-gray-700 align-top leading-relaxed">
                          {insights?.[s]?.[row.id] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── PersonReportsPanel ────────────────────────────────────────────────────────
function PersonReportsPanel({ person, reports, onClose, onOpenPersonalInsights, onOpenBringNeed, onOpenCustomReport }) {
  const strengths = (person.top5 ?? []).filter(Boolean)
  const [pdfLoading, setPdfLoading] = useState({})
  const [copied, setCopied] = useState({})
  const [sendLoading, setSendLoading] = useState({})
  const [p2Variant, setP2Variant] = useState('bring-need')

  const piUrl = `${window.location.origin}/personal-insights?email=${encodeURIComponent(person.email ?? '')}`
  const bnUrl = `${window.location.origin}/bring-need?email=${encodeURIComponent(person.email ?? '')}`
  const p2Url = `${window.location.origin}${p2Path(p2Variant)}?email=${encodeURIComponent(person.email ?? '')}${person.team_id ? `&teamId=${person.team_id}` : ''}`
  const pomUrl = `${window.location.origin}/power-of-me?email=${encodeURIComponent(person.email ?? '')}`

  function openPrintWindow(html) {
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 250)
  }

  async function handlePIPdf() {
    setPdfLoading(p => ({ ...p, pi: true }))
    await downloadPersonalInsightsPDF(person)
    setPdfLoading(p => ({ ...p, pi: false }))
  }

  async function handleBNPdf() {
    setPdfLoading(p => ({ ...p, bn: true }))
    await downloadBringNeedPDF(person)
    setPdfLoading(p => ({ ...p, bn: false }))
  }

  async function handlePomPdf() {
    setPdfLoading(p => ({ ...p, pom: true }))
    await downloadPowerOfMePDF(person, await loadPowerOfMeContent())
    setPdfLoading(p => ({ ...p, pom: false }))
  }

  async function handleCustomPdf(report) {
    setPdfLoading(p => ({ ...p, [report.id]: true }))
    const rows = report.rows ?? []
    const map = {}
    strengths.forEach(s => { map[s] = {} })
    if (strengths.length > 0 && rows.length > 0) {
      const { data } = await supabase
        .from('report_content')
        .select('strength_name, content')
        .eq('report_type', report.id)
        .in('strength_name', strengths)
      ;(data ?? []).forEach(r => { if (r.content) map[r.strength_name] = r.content })
    }
    await downloadCustomReportPDF(report.name, person, rows, map)
    setPdfLoading(p => ({ ...p, [report.id]: false }))
  }

  function copyLink(key, url) {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(c => ({ ...c, [key]: true }))
      setTimeout(() => setCopied(c => ({ ...c, [key]: false })), 2000)
    })
  }

  async function sendLink(url, reportName, key) {
    setSendLoading(s => ({ ...s, [key]: true }))
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.functions.invoke('send-report-link', {
      body: {
        to_email: person.email,
        to_name: person.name,
        report_name: reportName,
        report_url: url,
        coach_id: user?.id,
      },
    })
    setSendLoading(s => ({ ...s, [key]: false }))
  }

  const actionBtn = 'text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors'
  const actionBtnBrand = 'text-xs font-medium text-brand-500 hover:text-brand-700 transition-colors'

  return (
    <div className="bg-purple-50 border-t border-purple-100 px-6 py-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{person.name}'s Reports</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>
      {strengths.length === 0 ? (
        <p className="text-sm text-gray-400">No strengths entered — reports require CliftonStrengths data.</p>
      ) : (
        <div className="space-y-1.5">
          {/* Personal Insights */}
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Built-in</span>
              <span className="text-sm text-gray-700 truncate">Personal Insights</span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 ml-3 divide-x divide-gray-200">
              <button onClick={onOpenPersonalInsights} className={actionBtnBrand}>Open</button>
              <button onClick={handlePIPdf} disabled={pdfLoading['pi']} className={`pl-2.5 ${actionBtn} disabled:opacity-50`}>
                {pdfLoading['pi'] ? '…' : '↓ PDF'}
              </button>
              <button onClick={() => copyLink('pi', piUrl)} className={`pl-2.5 ${actionBtn}`}>
                {copied['pi'] ? '✓ Copied' : 'Copy Link'}
              </button>
              <button onClick={() => sendLink(piUrl, 'Personal Insights', 'pi')} disabled={sendLoading['pi']} className={`pl-2.5 ${actionBtn} disabled:opacity-50`}>
                {sendLoading['pi'] ? '…' : 'Send Link'}
              </button>
            </div>
          </div>

          {/* Bring - Need */}
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Built-in</span>
              <span className="text-sm text-gray-700 truncate">Bring - Need</span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 ml-3 divide-x divide-gray-200">
              <button onClick={onOpenBringNeed} className={actionBtnBrand}>Open</button>
              <button onClick={handleBNPdf} disabled={pdfLoading['bn']} className={`pl-2.5 ${actionBtn} disabled:opacity-50`}>
                {pdfLoading['bn'] ? '…' : '↓ PDF'}
              </button>
              <button onClick={() => copyLink('bn', bnUrl)} className={`pl-2.5 ${actionBtn}`}>
                {copied['bn'] ? '✓ Copied' : 'Copy Link'}
              </button>
              <button onClick={() => sendLink(bnUrl, 'Bring - Need', 'bn')} disabled={sendLoading['bn']} className={`pl-2.5 ${actionBtn} disabled:opacity-50`}>
                {sendLoading['bn'] ? '…' : 'Send Link'}
              </button>
            </div>
          </div>

          {/* The Power of 2 */}
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Built-in</span>
              <span className="text-sm text-gray-700 truncate">The Power of 2</span>
              <select
                value={p2Variant}
                onChange={e => setP2Variant(e.target.value)}
                className="text-xs rounded-md border border-gray-300 bg-white px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500"
                title="Choose which Power of 2 to open"
              >
                {P2_VARIANT_ORDER.map(v => <option key={v} value={v}>{P2_VARIANTS[v].label}</option>)}
              </select>
              {!person.team_id && (
                <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">Needs a team</span>
              )}
            </div>
            <div className="flex items-center gap-2.5 shrink-0 ml-3 divide-x divide-gray-200">
              <button onClick={() => window.open(p2Url, '_blank', 'noopener')} className={actionBtnBrand}>Open</button>
              <button onClick={() => copyLink('p2', p2Url)} className={`pl-2.5 ${actionBtn}`}>
                {copied['p2'] ? '✓ Copied' : 'Copy Link'}
              </button>
              <button onClick={() => sendLink(p2Url, `The Power of 2 (${P2_VARIANTS[p2Variant].label})`, 'p2')} disabled={sendLoading['p2']} className={`pl-2.5 ${actionBtn} disabled:opacity-50`}>
                {sendLoading['p2'] ? '…' : 'Send Link'}
              </button>
            </div>
          </div>

          {/* The Power of Me */}
          <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Built-in</span>
              <span className="text-sm text-gray-700 truncate">The Power of Me</span>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 ml-3 divide-x divide-gray-200">
              <button onClick={() => window.open(pomUrl, '_blank', 'noopener')} className={actionBtnBrand}>Open</button>
              <button onClick={handlePomPdf} disabled={pdfLoading['pom']} className={`pl-2.5 ${actionBtn} disabled:opacity-50`}>
                {pdfLoading['pom'] ? '…' : '↓ PDF'}
              </button>
              <button onClick={() => copyLink('pom', pomUrl)} className={`pl-2.5 ${actionBtn}`}>
                {copied['pom'] ? '✓ Copied' : 'Copy Link'}
              </button>
              <button onClick={() => sendLink(pomUrl, 'The Power of Me', 'pom')} disabled={sendLoading['pom']} className={`pl-2.5 ${actionBtn} disabled:opacity-50`}>
                {sendLoading['pom'] ? '…' : 'Send Link'}
              </button>
            </div>
          </div>

          {reports.length === 0 && (
            <p className="text-xs text-gray-400 pt-1">No custom reports yet. Create one on the Reports page.</p>
          )}

          {reports.map(report => {
            const reportUrl = `${window.location.origin}/report/${report.id}?email=${encodeURIComponent(person.email ?? '')}`
            return (
              <div key={report.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm text-gray-700 truncate">{report.name}</span>
                  {(report.rows ?? []).length === 0 && (
                    <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">No rows</span>
                  )}
                </div>
                <div className="flex items-center gap-2.5 shrink-0 ml-3 divide-x divide-gray-200">
                  <button onClick={() => onOpenCustomReport(report)} className={actionBtnBrand}>Open</button>
                  <button
                    onClick={() => handleCustomPdf(report)}
                    disabled={pdfLoading[report.id]}
                    className={`pl-2.5 ${actionBtn} disabled:opacity-50`}
                  >
                    {pdfLoading[report.id] ? '…' : '↓ PDF'}
                  </button>
                  <button onClick={() => copyLink(report.id, reportUrl)} className={`pl-2.5 ${actionBtn}`}>
                    {copied[report.id] ? '✓ Copied' : 'Copy Link'}
                  </button>
                  <button onClick={() => sendLink(reportUrl, report.name, report.id)} disabled={sendLoading[report.id]} className={`pl-2.5 ${actionBtn} disabled:opacity-50`}>
                    {sendLoading[report.id] ? '…' : 'Send Link'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── PersonWorksheetPanel ──────────────────────────────────────────────────────
function statusInfo(responses) {
  if (!responses || responses.length === 0) return { label: 'Pending', color: 'bg-gray-100 text-gray-600' }
  if (responses.some(r => r.submitted_at)) return { label: 'Submitted', color: 'bg-green-100 text-green-700' }
  return { label: 'In Progress', color: 'bg-amber-100 text-amber-700' }
}

function PersonWorksheetPanel({ person, onClose }) {
  const [sessionWs, setSessionWs] = useState(null)
  const [lmsWs, setLmsWs] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lmsDeleteConfirm, setLmsDeleteConfirm] = useState(null)
  const [lmsDeleting, setLmsDeleting] = useState(null)
  const [actionState, setActionState] = useState({}) // { [wsId]: null | 'downloading' | 'copying' | 'sending' | 'sent' | 'copied' }
  const [viewModal, setViewModal] = useState(null) // { participant, session, responses }

  useEffect(() => {
    async function load() {
      const [{ data: sWs }, { data: lWs }] = await Promise.all([
        supabase
          .from('participants')
          .select('id, worksheet_url_slug, session_id, responses(submitted_at), sessions:session_id(title, date, prompts)')
          .eq('email', person.email)
          .order('created_at', { ascending: false }),
        supabase
          .from('lms_worksheets')
          .select('id, worksheet_url_slug, lms_responses(submitted_at), theme:theme_id(name, prompts)')
          .eq('people_id', person.id)
          .order('created_at', { ascending: false }),
      ])
      setSessionWs(sWs ?? [])
      setLmsWs(lWs ?? [])
      setLoading(false)
    }
    load()
  }, [person.id, person.email])

  function wsAction(wsId) { return actionState[wsId] ?? null }
  function setWsAction(wsId, state) {
    setActionState(prev => ({ ...prev, [wsId]: state }))
  }

  async function downloadPDF(ws, type) {
    setWsAction(ws.id, 'downloading')
    try {
      const participantLike = { name: person.name, email: person.email, top5: person.top5 }
      let blob, filename

      if (type === 'session') {
        const sessionLike = { title: ws.sessions?.title ?? 'Session', prompts: ws.sessions?.prompts ?? [] }
        const status = statusInfo(ws.responses)
        if (status.label === 'Pending') {
          blob = await getBlankWorksheetPDFBlob(participantLike, sessionLike)
          filename = safeName(`${person.name} - ${ws.sessions?.title ?? 'Session'} (Blank).pdf`)
        } else {
          const { data: fullResponses } = await supabase.from('responses').select('*').eq('participant_id', ws.id)
          blob = await getWorksheetPDFBlob(participantLike, sessionLike, fullResponses ?? [])
          const label = status.label === 'In Progress' ? ' (In Progress)' : ''
          filename = safeName(`${person.name} - ${ws.sessions?.title ?? 'Session'}${label}.pdf`)
        }
      } else {
        const themeLike = { title: ws.theme?.name ?? 'LMS', prompts: ws.theme?.prompts ?? [] }
        const status = statusInfo(ws.lms_responses)
        if (status.label === 'Pending') {
          blob = await getBlankWorksheetPDFBlob(participantLike, themeLike)
          filename = safeName(`${person.name} - ${ws.theme?.name ?? 'LMS'} (Blank).pdf`)
        } else {
          const { data: fullResponses } = await supabase.from('lms_responses').select('*').eq('lms_worksheet_id', ws.id)
          blob = await getWorksheetPDFBlob(participantLike, themeLike, fullResponses ?? [])
          const label = status.label === 'In Progress' ? ' (In Progress)' : ''
          filename = safeName(`${person.name} - ${ws.theme?.name ?? 'LMS'}${label}.pdf`)
        }
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF error:', err)
    }
    setWsAction(ws.id, null)
  }

  async function copyLink(wsId, slug, type) {
    const url = type === 'session'
      ? `${window.location.origin}/worksheet/${slug}`
      : `${window.location.origin}/lms-worksheet/${slug}`
    await navigator.clipboard.writeText(url)
    setWsAction(wsId, 'copied')
    setTimeout(() => setWsAction(wsId, null), 2000)
  }

  async function sendLink(ws) {
    setWsAction(ws.id, 'sending')
    await supabase.functions.invoke('send-worksheet-links', {
      body: { session_id: ws.session_id, participant_ids: [ws.id], app_origin: window.location.origin },
    })
    setWsAction(ws.id, 'sent')
    setTimeout(() => setWsAction(ws.id, null), 3000)
  }

  async function handleOpenModal(ws, type) {
    const participantLike = { name: person.name, email: person.email, top5: person.top5 }
    let sessionLike, fullResponses

    if (type === 'session') {
      sessionLike = { title: ws.sessions?.title ?? 'Session', prompts: ws.sessions?.prompts ?? [] }
      const { data } = await supabase.from('responses').select('*').eq('participant_id', ws.id)
      fullResponses = data ?? []
    } else {
      sessionLike = { title: ws.theme?.name ?? 'LMS', prompts: ws.theme?.prompts ?? [] }
      const { data } = await supabase.from('lms_responses').select('*').eq('lms_worksheet_id', ws.id)
      fullResponses = data ?? []
    }

    setViewModal({ participant: participantLike, session: sessionLike, responses: fullResponses, ws, type })
  }

  async function handleUnsubmit() {
    const { ws, type } = viewModal
    if (type === 'session') {
      await supabase.from('responses').update({ submitted_at: null }).eq('participant_id', ws.id)
      setSessionWs(prev => prev.map(w => w.id === ws.id
        ? { ...w, responses: (w.responses ?? []).map(r => ({ ...r, submitted_at: null })) }
        : w
      ))
    } else {
      await supabase.from('lms_responses').update({ submitted_at: null }).eq('lms_worksheet_id', ws.id)
      setLmsWs(prev => prev.map(w => w.id === ws.id
        ? { ...w, lms_responses: (w.lms_responses ?? []).map(r => ({ ...r, submitted_at: null })) }
        : w
      ))
    }
    setViewModal(null)
  }

  async function handleDeleteLmsWs(ws) {
    setLmsDeleting(ws.id)
    await supabase.from('lms_worksheets').delete().eq('id', ws.id)
    setLmsWs(prev => prev.filter(w => w.id !== ws.id))
    setLmsDeleteConfirm(null)
    setLmsDeleting(null)
  }

  // Compact action button style
  const actionBtn = 'text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors'
  const actionBtnBrand = 'text-xs font-medium text-brand-500 hover:text-brand-700 transition-colors'

  return (
    <>
    {viewModal && (
      <ResponseViewerModal
        participant={viewModal.participant}
        session={viewModal.session}
        responses={viewModal.responses}
        onClose={() => setViewModal(null)}
        onUnsubmit={handleUnsubmit}
        onDownloadPDF={() =>
          getWorksheetPDFBlob(viewModal.participant, viewModal.session, viewModal.responses)
            .then(blob => {
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = safeName(`${viewModal.participant.name} - ${viewModal.session.title}.pdf`)
              a.click()
              URL.revokeObjectURL(url)
            })
            .catch(console.error)
        }
      />
    )}
    <div className="bg-blue-50 border-t border-blue-100 px-6 py-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{person.name}'s Worksheets</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <div className="space-y-5">
          {/* Session Worksheets */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Session Worksheets ({sessionWs.length})
            </p>
            {sessionWs.length === 0 ? (
              <p className="text-xs text-gray-400">None yet.</p>
            ) : (
              <div className="space-y-1.5">
                {sessionWs.map(ws => {
                  const sess = ws.sessions
                  const label = sess
                    ? `${sess.title}${sess.date ? ` · ${formatDateShort(sess.date)}` : ''}`
                    : 'Unknown session'
                  const status = statusInfo(ws.responses)
                  const act = wsAction(ws.id)
                  return (
                    <div key={ws.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                        <span className="text-sm text-gray-700 truncate">{label}</span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0 ml-3 divide-x divide-gray-200">
                        {status.label === 'Submitted' ? (
                          <button
                            onClick={() => handleOpenModal(ws, 'session')}
                            className={actionBtnBrand}
                          >
                            Open
                          </button>
                        ) : (
                          <a
                            href={`/worksheet/${ws.worksheet_url_slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className={actionBtnBrand}
                          >
                            Open
                          </a>
                        )}
                        <button
                          onClick={() => downloadPDF(ws, 'session')}
                          disabled={act === 'downloading'}
                          className={`pl-2.5 ${actionBtn} disabled:opacity-50`}
                        >
                          {act === 'downloading' ? '…' : '↓ PDF'}
                        </button>
                        <button
                          onClick={() => copyLink(ws.id, ws.worksheet_url_slug, 'session')}
                          className={`pl-2.5 ${actionBtn}`}
                        >
                          {act === 'copied' ? '✓ Copied' : 'Copy Link'}
                        </button>
                        <button
                          onClick={() => sendLink(ws)}
                          disabled={act === 'sending' || act === 'sent'}
                          className={`pl-2.5 ${actionBtn} disabled:opacity-50`}
                        >
                          {act === 'sending' ? '…' : act === 'sent' ? '✓ Sent' : 'Send Link'}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* LMS Worksheets */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              LMS Worksheets ({lmsWs.length})
            </p>
            {lmsWs.length === 0 ? (
              <p className="text-xs text-gray-400">None yet.</p>
            ) : (
              <div className="space-y-1.5">
                {lmsWs.map(ws => {
                  const status = statusInfo(ws.lms_responses)
                  const act = wsAction(ws.id)
                  return (
                    <div key={ws.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>{status.label}</span>
                        <span className="text-sm text-gray-700 truncate">{ws.theme?.name ?? 'Unknown session topic'}</span>
                      </div>
                      <div className="flex items-center gap-2.5 shrink-0 ml-3 divide-x divide-gray-200">
                        {status.label === 'Submitted' ? (
                          <button
                            onClick={() => handleOpenModal(ws, 'lms')}
                            className={actionBtnBrand}
                          >
                            Open
                          </button>
                        ) : (
                          <a
                            href={`/lms-worksheet/${ws.worksheet_url_slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className={actionBtnBrand}
                          >
                            Open
                          </a>
                        )}
                        <button
                          onClick={() => downloadPDF(ws, 'lms')}
                          disabled={act === 'downloading'}
                          className={`pl-2.5 ${actionBtn} disabled:opacity-50`}
                        >
                          {act === 'downloading' ? '…' : '↓ PDF'}
                        </button>
                        <button
                          onClick={() => copyLink(ws.id, ws.worksheet_url_slug, 'lms')}
                          className={`pl-2.5 ${actionBtn}`}
                        >
                          {act === 'copied' ? '✓ Copied' : 'Copy Link'}
                        </button>
                        {lmsDeleteConfirm === ws.id ? (
                          <span className="pl-2.5 flex items-center gap-1">
                            <span className="text-xs text-gray-500">Delete?</span>
                            <button
                              onClick={() => handleDeleteLmsWs(ws)}
                              disabled={lmsDeleting === ws.id}
                              className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
                            >Yes</button>
                            <button
                              onClick={() => setLmsDeleteConfirm(null)}
                              className="text-xs text-gray-400 hover:underline"
                            >No</button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setLmsDeleteConfirm(ws.id)}
                            className="pl-2.5 text-xs font-medium text-red-400 hover:text-red-600 transition-colors"
                          >Delete</button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
// ── Gallup roster import ──────────────────────────────────────────────────────

function parseGallupExport(arrayBuffer) {
  const wb = XLSX.read(arrayBuffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  const headerIdx = rows.findIndex(r => r.some(c => String(c).trim() === 'First Name'))
  if (headerIdx === -1) throw new Error("This doesn't look like a Gallup Signature Themes export. Make sure you're uploading the correct file.")

  const headers = rows[headerIdx].map(c => String(c).trim())
  const firstNameCol = headers.indexOf('First Name')
  const lastNameCol  = headers.indexOf('Last Name')
  const emailCol     = headers.indexOf('Email Address')
  const theme1Col    = headers.indexOf('Theme 1')

  if (emailCol === -1 || theme1Col === -1) throw new Error('Missing expected columns (Email Address, Theme 1). Check the file format.')

  const participants = []
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    const firstName = String(row[firstNameCol] ?? '').trim()
    const lastName  = String(row[lastNameCol]  ?? '').trim()
    const email     = String(row[emailCol]     ?? '').trim().toLowerCase()
    if (!email || !email.includes('@')) continue

    // Always take only the top 5 — never more, regardless of full-34 exports
    const top5 = []
    for (let t = 0; t < 5; t++) {
      const theme = String(row[theme1Col + t] ?? '').trim()
      if (theme) top5.push(theme)
    }

    participants.push({ name: [firstName, lastName].filter(Boolean).join(' '), email, top5 })
  }
  return participants
}

function ImportRosterModal({ teams, onClose, onImported }) {
  const [step, setStep]             = useState('upload') // upload | preview | duplicates | importing | done
  const [participants, setParticipants] = useState([])
  const [teamId, setTeamId]         = useState('')
  const [error, setError]           = useState(null)
  const [results, setResults]       = useState(null)
  const [dragging, setDragging]     = useState(false)
  const fileRef = useRef()

  // Local team list (grows when user creates a team inline)
  const [localTeams, setLocalTeams] = useState(teams)
  const [showNewTeamForm, setShowNewTeamForm] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamSaving, setNewTeamSaving] = useState(false)
  const [newTeamError, setNewTeamError] = useState(null)

  // Duplicate review
  const [duplicates, setDuplicates] = useState([]) // [{name, email, top5}]
  const [dupDecisions, setDupDecisions] = useState({}) // email → 'skip' | 'include'

  function handleFile(file) {
    if (!file) return
    setError(null)
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const parsed = parseGallupExport(e.target.result)
        if (parsed.length === 0) { setError('No valid participants found in the file.'); return }
        setParticipants(parsed)
        setStep('preview')
      } catch (err) { setError(err.message) }
    }
    reader.readAsArrayBuffer(file)
  }

  async function handleCreateTeam() {
    if (!newTeamName.trim()) { setNewTeamError('Team name is required'); return }
    setNewTeamSaving(true)
    setNewTeamError(null)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: team, error: err } = await supabase
      .from('teams')
      .insert({ name: newTeamName.trim(), created_by: user.id })
      .select()
      .single()
    setNewTeamSaving(false)
    if (err) { setNewTeamError(err.message); return }
    setLocalTeams(prev => [...prev, team])
    setTeamId(team.id)
    setNewTeamName('')
    setShowNewTeamForm(false)
  }

  async function handleCheckDuplicates() {
    const { data: existing } = await supabase.from('people').select('email')
    const existingEmails = new Set((existing ?? []).map(p => p.email.toLowerCase()))
    const dupes = participants.filter(p => existingEmails.has(p.email.toLowerCase()))
    if (dupes.length === 0) {
      await runImport(participants)
    } else {
      const decisions = {}
      dupes.forEach(p => { decisions[p.email.toLowerCase()] = 'skip' })
      setDuplicates(dupes)
      setDupDecisions(decisions)
      setStep('duplicates')
    }
  }

  async function runImport(toInsert) {
    setStep('importing')
    const { data: { user } } = await supabase.auth.getUser()
    if (toInsert.length > 0) {
      await supabase.from('people').insert(
        toInsert.map(p => ({ name: p.name, email: p.email, top5: p.top5, team_id: teamId || null, created_by: user.id }))
      )
    }
    const skipped = participants.length - toInsert.length
    setResults({ imported: toInsert.length, skipped })
    setStep('done')
    onImported()
  }

  async function handleImportWithDecisions() {
    const toInsert = participants.filter(p => {
      const key = p.email.toLowerCase()
      return dupDecisions[key] !== 'skip' || !duplicates.find(d => d.email.toLowerCase() === key)
    })
    // Participants that are duplicates and marked 'include' need updating — we'll insert them
    // (handleCheckDuplicates already excluded non-dupes from decisions, so non-dupes are always inserted)
    await runImport(toInsert)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Import from Gallup Roster</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {step === 'upload' && (
          <>
            <p className="text-sm text-gray-500">Upload a <strong>Signature Themes Export</strong> (.xlsx) downloaded from Gallup Access. Only the Top 5 themes will be imported.</p>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${dragging ? 'border-brand-400 bg-brand-50' : 'border-gray-300 hover:border-brand-400 hover:bg-gray-50'}`}
            >
              <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
              <p className="text-sm font-medium text-gray-700">Drop your Gallup export here</p>
              <p className="text-xs text-gray-400 mt-1">or click to browse — .xlsx files only</p>
              <input ref={fileRef} type="file" accept=".xlsx,.xlsm" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </>
        )}

        {step === 'preview' && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600"><span className="font-semibold text-gray-900">{participants.length}</span> participants found</p>
              <button onClick={() => { setStep('upload'); setParticipants([]) }} className="text-xs text-brand-500 hover:underline">Choose different file</button>
            </div>

            <div className="overflow-auto max-h-56 border border-gray-200 rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Name</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Email</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Top 5</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {participants.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">{p.name}</td>
                      <td className="px-3 py-2 text-gray-500">{p.email}</td>
                      <td className="px-3 py-2 text-gray-500">{p.top5.join(', ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Assign to team <span className="font-normal text-gray-400">(optional)</span></label>
              <div className="flex gap-2">
                <select
                  value={teamId}
                  onChange={e => { setTeamId(e.target.value); setShowNewTeamForm(false) }}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">— No team —</option>
                  {localTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button
                  onClick={() => { setShowNewTeamForm(v => !v); setNewTeamName(''); setNewTeamError(null) }}
                  className="shrink-0 flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  title="Create new team"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  New team
                </button>
              </div>

              {showNewTeamForm && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                  <p className="text-xs font-medium text-gray-600">Create new team</p>
                  <div className="flex gap-2">
                    <input
                      value={newTeamName}
                      onChange={e => setNewTeamName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleCreateTeam(); if (e.key === 'Escape') setShowNewTeamForm(false) }}
                      placeholder="Team name"
                      autoFocus
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      onClick={handleCreateTeam}
                      disabled={newTeamSaving}
                      className="shrink-0 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold px-3 py-1.5 rounded-lg text-sm transition-colors"
                    >
                      {newTeamSaving ? 'Creating…' : 'Create'}
                    </button>
                    <button
                      onClick={() => setShowNewTeamForm(false)}
                      className="shrink-0 text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                  {newTeamError && <p className="text-xs text-red-500">{newTeamError}</p>}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleCheckDuplicates} className="flex-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 text-sm transition-colors">
                Review &amp; Import {participants.length} Participants
              </button>
            </div>
          </>
        )}

        {step === 'duplicates' && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 4a8 8 0 100 16 8 8 0 000-16z" /></svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{duplicates.length} potential duplicate{duplicates.length !== 1 ? 's' : ''} found</p>
                <p className="text-xs text-gray-500">These emails already exist in your participant database. Choose what to do with each one.</p>
              </div>
            </div>

            <div className="overflow-auto max-h-72 border border-gray-200 rounded-xl divide-y divide-gray-100">
              {duplicates.map((p) => {
                const key = p.email.toLowerCase()
                const decision = dupDecisions[key] ?? 'skip'
                return (
                  <div key={key} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400 truncate">{p.email}</p>
                    </div>
                    <div className="flex rounded-lg border border-gray-300 overflow-hidden shrink-0 text-xs font-medium">
                      <button
                        onClick={() => setDupDecisions(d => ({ ...d, [key]: 'skip' }))}
                        className={`px-3 py-1.5 transition-colors ${decision === 'skip' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => setDupDecisions(d => ({ ...d, [key]: 'include' }))}
                        className={`px-3 py-1.5 border-l border-gray-300 transition-colors ${decision === 'include' ? 'bg-brand-500 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                      >
                        Include anyway
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400 px-1">
              <span>{Object.values(dupDecisions).filter(v => v === 'skip').length} will be skipped</span>
              <span>{Object.values(dupDecisions).filter(v => v === 'include').length} will be added anyway</span>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep('preview')} className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Back</button>
              <button onClick={handleImportWithDecisions} className="flex-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 text-sm transition-colors">
                Confirm &amp; Import
              </button>
            </div>
          </>
        )}

        {step === 'importing' && (
          <div className="py-10 text-center">
            <p className="text-sm text-gray-500">Importing participants…</p>
          </div>
        )}

        {step === 'done' && results && (
          <>
            <div className="py-6 text-center space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{results.imported} imported</p>
                {results.skipped > 0 && <p className="text-sm text-gray-500 mt-1">{results.skipped} skipped — already in the system</p>}
              </div>
            </div>
            <button onClick={onClose} className="w-full rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 text-sm transition-colors">Done</button>
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function ParticipantsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [people, setPeople] = useState([])
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [addingNew, setAddingNew] = useState(false)
  const [addMode, setAddMode] = useState('single') // 'single' | 'paste'
  const [pasteText, setPasteText] = useState('')
  const [pasteErrors, setPasteErrors] = useState([])
  const [pasteSaving, setPasteSaving] = useState(false)
  const [pasteTeamId, setPasteTeamId] = useState('')
  const [search, setSearch] = useState(() => searchParams.get('team') ?? '')
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [expandedPersonId, setExpandedPersonId] = useState(null)
  const [insightsModal, setInsightsModal] = useState(null)
  const [bulkReportModal, setBulkReportModal] = useState(null) // null | 'insights' | 'bringneed'
  const [bringNeedModal, setBringNeedModal] = useState(null)
  const [reportsPersonId, setReportsPersonId] = useState(null)
  const [customReportModal, setCustomReportModal] = useState(null)
  const [reports, setReports] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [approvingId, setApprovingId] = useState(null)
  const [showImportModal, setShowImportModal] = useState(false)

  // Add Team modal
  const [addTeamModal, setAddTeamModal] = useState(false)
  const [addTeamCallback, setAddTeamCallback] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data }, { data: teamsData }, { data: reportsData }, { data: pendingData }] = await Promise.all([
      supabase.from('people').select('*').order('name'),
      supabase.from('teams').select('*').order('name'),
      supabase.from('reports').select('*').order('name'),
      supabase.rpc('get_pending_requests'),
    ])
    setPeople(data ?? [])
    setTeams(teamsData ?? [])
    setReports(reportsData ?? [])
    setPendingRequests(pendingData ?? [])
    setLoading(false)
  }

  async function handleApprovePerson(id) {
    setApprovingId(id)
    await supabase.rpc('approve_participant', { p_people_id: id })
    setApprovingId(null)
    load()
  }

  async function handleSaveEdit(id, updates) {
    setSaveError(null)
    const { error } = await supabase.from('people').update(updates).eq('id', id)
    if (error) { setSaveError(error.message); return }
    setEditingId(null)
    load()
  }

  async function handleSaveNew(data) {
    setSaveError(null)
    const { data: { user: u } } = await supabase.auth.getUser()
    const { error } = await supabase.from('people').insert({ ...data, created_by: u.id })
    if (error) { setSaveError(error.message); return }
    setAddingNew(false)
    load()
  }

  async function handleDelete(id) {
    await supabase.from('people').delete().eq('id', id)
    setDeleteConfirm(null)
    setEditingId(null)
    setExpandedPersonId(null)
    load()
  }

  async function handleBulkDelete() {
    await supabase.from('people').delete().in('id', [...selectedIds])
    setSelectedIds(new Set())
    setBulkDeleteConfirm(false)
    setDeleteConfirm(null)
    setExpandedPersonId(null)
    load()
  }

  function printSingleNameTent(person) {
    const strengths = (person.top5 ?? []).filter(Boolean)
    if (!strengths.length) return
    const domainColor = {
      Analytical: '#16a34a', Context: '#16a34a', Futuristic: '#16a34a', Ideation: '#16a34a',
      Input: '#16a34a', Intellection: '#16a34a', Learner: '#16a34a', Strategic: '#16a34a',
      Activator: '#ea580c', Command: '#ea580c', Communication: '#ea580c', Competition: '#ea580c',
      Maximizer: '#ea580c', 'Self-Assurance': '#ea580c', Significance: '#ea580c', Woo: '#ea580c',
      Adaptability: '#2563eb', Connectedness: '#2563eb', Developer: '#2563eb', Empathy: '#2563eb',
      Harmony: '#2563eb', Includer: '#2563eb', Individualization: '#2563eb', Positivity: '#2563eb', Relator: '#2563eb',
      Achiever: '#7c3aed', Arranger: '#7c3aed', Belief: '#7c3aed', Consistency: '#7c3aed',
      Deliberative: '#7c3aed', Discipline: '#7c3aed', Focus: '#7c3aed', Responsibility: '#7c3aed', Restorative: '#7c3aed',
    }
    function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }
    const rows = strengths.map(s => `<div style="font-size:19pt;font-weight:800;color:${domainColor[s]||'#374151'};margin:3px 0;">${esc(s)}</div>`).join('')
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      @page{size:landscape;margin:0}*{box-sizing:border-box}body{margin:0;font-family:Arial,Helvetica,sans-serif;background:white}
      .page{width:100vw;height:100vh;display:flex;flex-direction:column}
      .fold-row{height:12px;position:relative;flex-shrink:0}
      .tick{position:absolute;top:0;bottom:0;width:1px;background:#555;transform:translateX(-50%)}
      .panels{flex:1;display:flex}
      .panel{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px 16px}
      .sep{border-left:1px solid #d1d5db;border-right:1px solid #d1d5db}
      .slist{display:flex;flex-direction:column;align-items:center}
      .name{font-size:46pt;font-weight:900;color:#111827;text-align:center;line-height:1.05;letter-spacing:-0.03em}
      @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
    </style></head><body>
    <div class="page">
      <div class="fold-row"><div class="tick" style="left:33.333%"></div><div class="tick" style="left:66.666%"></div></div>
      <div class="panels">
        <div class="panel" style="transform:rotate(180deg)"><div class="slist">${rows}</div></div>
        <div class="panel sep" style="transform:rotate(180deg)"><div class="name">${esc(person.name)}</div></div>
        <div class="panel"><div class="slist">${rows}</div><div class="name" style="margin-top:18px">${esc(person.name)}</div></div>
      </div>
      <div class="fold-row"><div class="tick" style="left:33.333%"></div><div class="tick" style="left:66.666%"></div></div>
    </div>
    <script>window.addEventListener('load',function(){window.print()})</script>
    </body></html>`
    const win = window.open('', '_blank', 'noopener')
    win.document.open(); win.document.write(html); win.document.close()
  }

  function handleBulkPrint(type) {
    const toPrint = people.filter(p => selectedIds.has(p.id) && (p.top5 ?? []).some(Boolean))
    if (toPrint.length === 0) return
    const isInsights = type === 'insights'
    const pages = toPrint.map(p =>
      isInsights
        ? buildPersonalInsightsPrintHTML(p.name, (p.top5 ?? []).filter(Boolean))
        : buildBringNeedPrintHTML(p.name, (p.top5 ?? []).filter(Boolean))
    )
    const pageSize = isInsights ? 'size:landscape;margin:0.35in;' : 'size:portrait;margin:0.4in;'
    const title = isInsights ? 'Personal Insights Reports' : 'Bring - Need Reports'
    const combined = `<!DOCTYPE html><html><head><title>${title}</title>
<style>
*{box-sizing:border-box;}html,body{margin:0;padding:0;font-family:Arial,sans-serif;}
.page{display:flex;flex-direction:column;height:100vh;page-break-after:always;}
.page:last-child{page-break-after:auto;}
h2{font-size:13px;margin:0 0 4px 0;color:#111;flex-shrink:0;}
table{border-collapse:collapse;width:100%;table-layout:fixed;flex:1;}
th,td{word-wrap:break-word;overflow-wrap:break-word;}
tfoot td{border-top:1px solid #d1d5db;padding:2px 5px;font-size:8px;color:#9ca3af;}
@page{${pageSize}}-webkit-print-color-adjust:exact;print-color-adjust:exact;
</style></head><body>
${pages.map(html => { const m = html.match(/<body>([\s\S]*)<\/body>/); return `<div class="page">${m ? m[1] : html}</div>` }).join('\n')}
</body></html>`
    const win = window.open('', '_blank')
    win.document.write(combined)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 250)
    setBulkReportModal(null)
  }

  async function handleBulkDownloadPDFs(type) {
    const toDownload = people.filter(p => selectedIds.has(p.id) && (p.top5 ?? []).some(Boolean))
    setBulkReportModal(null)
    for (const person of toDownload) {
      if (type === 'insights') await downloadPersonalInsightsPDF(person)
      else await downloadBringNeedPDF(person)
    }
  }

  async function handlePasteSave() {
    const { parsed, errors } = parseParticipants(pasteText)
    if (errors.length > 0) return
    if (parsed.length === 0) return
    setPasteSaving(true)
    setSaveError(null)
    const { data: { user: u } } = await supabase.auth.getUser()
    const { error } = await supabase.from('people').upsert(
      parsed.map(p => ({ name: p.name, email: p.email, top5: p.top5, created_by: u.id, team_id: pasteTeamId || null })),
      { onConflict: 'email,created_by' }
    )
    setPasteSaving(false)
    if (error) { setSaveError(error.message); return }
    setPasteText('')
    setPasteErrors([])
    setAddingNew(false)
    load()
  }

  function openAddTeamModal(callback = null) {
    setAddTeamCallback(() => callback)
    setAddTeamModal(true)
  }

  async function handleTeamCreated(team) {
    setAddTeamModal(false)
    await load()
    if (addTeamCallback) {
      addTeamCallback(team)
      setAddTeamCallback(null)
    }
  }

  const teamMap = {}
  teams.forEach(t => { teamMap[t.id] = t })

  const filtered = people.filter(p => {
    const teamName = p.team_id ? (teamMap[p.team_id]?.name ?? '') : ''
    const q = search.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      (p.top5 ?? []).some(s => s.toLowerCase().includes(q)) ||
      teamName.toLowerCase().includes(q)
    )
  })

  return (
    <Layout>
      {insightsModal && (
        <PersonalInsightsModal
          participant={insightsModal}
          onClose={() => setInsightsModal(null)}
        />
      )}
      {customReportModal && (
        <CustomReportModal
          report={customReportModal.report}
          participant={customReportModal.person}
          onClose={() => setCustomReportModal(null)}
        />
      )}
      {bulkReportModal && (() => {
        const isInsights = bulkReportModal === 'insights'
        const eligible = people.filter(p => selectedIds.has(p.id) && (p.top5 ?? []).some(Boolean))
        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
              <h2 className="text-lg font-bold text-gray-900">
                {isInsights ? 'Personal Insights Reports' : 'Bring - Need Reports'}
              </h2>
              <p className="text-sm text-gray-500">
                {eligible.length} participant{eligible.length !== 1 ? 's' : ''} selected
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleBulkPrint(bulkReportModal)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print All
                </button>
                <button
                  onClick={() => handleBulkDownloadPDFs(bulkReportModal)}
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PDFs
                </button>
                <button
                  onClick={() => setBulkReportModal(null)}
                  className="w-full px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )
      })()}
      {bringNeedModal && (
        <BringNeedModal
          participant={bringNeedModal}
          onClose={() => setBringNeedModal(null)}
        />
      )}
      {addTeamModal && (
        <AddTeamModal
          onSave={handleTeamCreated}
          onClose={() => { setAddTeamModal(false); setAddTeamCallback(null) }}
        />
      )}
      {showImportModal && (
        <ImportRosterModal
          teams={teams}
          onClose={() => setShowImportModal(false)}
          onImported={() => { setShowImportModal(false); load() }}
        />
      )}
      {pendingRequests.length > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-200 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">{pendingRequests.length}</span>
            <h2 className="text-sm font-bold text-amber-900">Access Requests Pending Approval</h2>
          </div>
          <div className="divide-y divide-amber-100">
            {pendingRequests.map(p => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.email}</p>
                  {(p.top5 ?? []).some(Boolean) && (
                    <p className="text-xs text-gray-400 mt-0.5">{(p.top5 ?? []).filter(Boolean).join(', ')}</p>
                  )}
                </div>
                <button
                  onClick={() => handleApprovePerson(p.id)}
                  disabled={approvingId === p.id}
                  className="shrink-0 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                >
                  {approvingId === p.id ? 'Approving…' : 'Approve'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Participants</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" /></svg>
            Import from Gallup
          </button>
          <button
            onClick={() => { setAddingNew(true); setAddMode('paste'); setEditingId(null) }}
            className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Paste Multiple
          </button>
          <button
            onClick={() => { setAddingNew(true); setAddMode('single'); setEditingId(null) }}
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            + Add Person
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, strength, or team…"
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-xs font-medium text-gray-500 hover:text-gray-800 border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-full transition-colors whitespace-nowrap"
          >
            Clear search
          </button>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
          {!bulkDeleteConfirm ? (
            <>
              <span className="text-sm text-gray-700 font-medium">
                {selectedIds.size} participant{selectedIds.size !== 1 ? 's' : ''} selected
              </span>
              <button
                onClick={() => setBulkReportModal('insights')}
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 border border-emerald-300 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                Personal Insights Reports
              </button>
              <button
                onClick={() => setBulkReportModal('bringneed')}
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 border border-emerald-300 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                Bring - Need Reports
              </button>
              <button
                onClick={() => setBulkDeleteConfirm(true)}
                className="text-sm font-semibold text-red-600 hover:text-red-800 border border-red-300 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                Delete {selectedIds.size} Selected
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-xs text-gray-400 hover:text-gray-600 ml-auto whitespace-nowrap"
              >
                Clear selection
              </button>
            </>
          ) : (
            <>
              <span className="text-sm text-red-700 font-medium">
                Permanently delete {selectedIds.size} participant{selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.
              </span>
              <button
                onClick={handleBulkDelete}
                className="text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                className="text-sm text-gray-500 hover:text-gray-800 whitespace-nowrap"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}

      {/* Paste multiple panel */}
      {addingNew && addMode === 'paste' && (
        <div className="bg-white rounded-2xl border border-brand-200 p-6 mb-4 space-y-3">
          <h2 className="font-semibold text-gray-900">Paste Multiple Participants</h2>
          <p className="text-sm text-gray-500">
            One per line:{' '}
            <code className="text-xs bg-gray-100 rounded px-1.5 py-0.5 text-gray-700">
              Name, Email, S1, S2, S3, S4, S5
            </code>
          </p>
          <textarea
            value={pasteText}
            onChange={e => { setPasteText(e.target.value); setPasteErrors(parseParticipants(e.target.value).errors) }}
            rows={8}
            placeholder={"Jane Smith, jane@example.com, Achiever, Learner, Relator, Futuristic, Strategic\nJohn Doe, john@example.com, Empathy, Communication, Developer, Harmony, Includer"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500 resize-y"
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign to team <span className="font-normal text-gray-400">(optional)</span></label>
            <select
              value={pasteTeamId}
              onChange={e => {
                if (e.target.value === '__new__') {
                  openAddTeamModal(team => setPasteTeamId(team.id))
                } else {
                  setPasteTeamId(e.target.value)
                }
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
            >
              <option value="">No team</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
              <option value="__new__">+ Create new team…</option>
            </select>
          </div>

          {pasteErrors.length > 0 && (
            <ul className="text-xs text-red-600 space-y-0.5">
              {pasteErrors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          )}
          {pasteText.trim() && pasteErrors.length === 0 && (
            <p className="text-xs text-green-600">
              {parseParticipants(pasteText).parsed.length} participant{parseParticipants(pasteText).parsed.length !== 1 ? 's' : ''} ready to add
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handlePasteSave}
              disabled={pasteSaving || pasteErrors.length > 0 || !pasteText.trim()}
              className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
            >
              {pasteSaving ? 'Saving…' : 'Add Participants'}
            </button>
            <button
              onClick={() => { setAddingNew(false); setPasteText(''); setPasteErrors([]); setPasteTeamId('') }}
              className="text-gray-500 hover:text-gray-800 font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {saveError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
          <strong>Error:</strong> {saveError}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
        {loading ? (
          <p className="text-gray-500 text-sm px-5 py-6">Loading…</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
              <tr>
                <th className="w-8 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every(p => selectedIds.has(p.id))}
                    ref={el => { if (el) el.indeterminate = filtered.some(p => selectedIds.has(p.id)) && !filtered.every(p => selectedIds.has(p.id)) }}
                    onChange={e => {
                      const next = new Set(selectedIds)
                      filtered.forEach(p => e.target.checked ? next.add(p.id) : next.delete(p.id))
                      setSelectedIds(next)
                    }}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Top 5 Strengths</th>
                <th className="px-4 py-3 text-left font-medium">Team</th>
                <th className="px-4 py-3 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {addingNew && addMode === 'single' && (
                <EditRow
                  person={BLANK}
                  teams={teams}
                  onSave={handleSaveNew}
                  onCancel={() => setAddingNew(false)}
                  onOpenAddTeam={openAddTeamModal}
                />
              )}
              {filtered.length === 0 && !addingNew && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400 text-sm">
                    {search ? 'No results.' : 'No participants yet. Add your first person above.'}
                  </td>
                </tr>
              )}
              {filtered.map(p => {
                const team = p.team_id ? teamMap[p.team_id] : null
                return editingId === p.id ? (
                  <EditRow
                    key={p.id}
                    person={p}
                    teams={teams}
                    onSave={data => handleSaveEdit(p.id, data)}
                    onCancel={() => setEditingId(null)}
                    onOpenAddTeam={openAddTeamModal}
                    onDeletePerson={() => { setDeleteConfirm(p.id); setEditingId(null) }}
                  />
                ) : (
                  <>
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="w-8 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(p.id)}
                          onChange={e => {
                            const next = new Set(selectedIds)
                            if (e.target.checked) next.add(p.id)
                            else next.delete(p.id)
                            setSelectedIds(next)
                          }}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{p.name}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-500 break-all">{p.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(p.top5 ?? []).map((s, i) => <StrengthBadge key={i} name={s} />)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {team ? (
                          <a
                            href={`/team/${p.team_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 px-2 py-0.5 rounded-full font-medium whitespace-nowrap transition-colors"
                          >
                            {team.name}
                          </a>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="grid gap-1.5" style={{ gridTemplateColumns: 'auto auto' }}>
                          {p.email ? (
                            <a
                              href={`/me?hint=${encodeURIComponent(p.email)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full text-center text-xs font-medium text-emerald-600 hover:text-emerald-800 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-lg transition-colors"
                            >
                              Participant Page
                            </a>
                          ) : <div />}
                          <button
                            onClick={() => printSingleNameTent(p)}
                            disabled={!(p.top5 ?? []).some(Boolean)}
                            className="w-full text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            title={!(p.top5 ?? []).some(Boolean) ? 'No strengths on file' : 'Print name tent'}
                          >
                            Print Name Tent
                          </button>
                          <button
                            onClick={() => { setExpandedPersonId(id => id === p.id ? null : p.id); setReportsPersonId(null); setEditingId(null) }}
                            className="w-full whitespace-nowrap text-xs font-medium text-brand-500 hover:text-brand-700 border border-brand-200 bg-brand-50 hover:bg-brand-100 px-3 py-1 rounded-lg transition-colors"
                          >
                            Worksheets {expandedPersonId === p.id ? '↑' : '›'}
                          </button>
                          <button
                            onClick={() => { setReportsPersonId(id => id === p.id ? null : p.id); setExpandedPersonId(null); setEditingId(null) }}
                            className="w-full whitespace-nowrap text-xs font-medium text-purple-600 hover:text-purple-800 border border-purple-200 bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-lg transition-colors"
                          >
                            Reports {reportsPersonId === p.id ? '↑' : '›'}
                          </button>
                          <button
                            onClick={() => { setEditingId(p.id); setAddingNew(false); setExpandedPersonId(null); setReportsPersonId(null) }}
                            className="col-span-2 w-full text-xs font-medium text-gray-600 hover:text-gray-900 border border-gray-200 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Edit Person
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedPersonId === p.id && deleteConfirm !== p.id && (
                      <tr key={`${p.id}-panel`}>
                        <td colSpan={6} className="p-0">
                          <PersonWorksheetPanel
                            person={p}
                            onClose={() => setExpandedPersonId(null)}
                          />
                        </td>
                      </tr>
                    )}
                    {reportsPersonId === p.id && deleteConfirm !== p.id && (
                      <tr key={`${p.id}-reports-panel`}>
                        <td colSpan={6} className="p-0">
                          <PersonReportsPanel
                            person={p}
                            reports={reports}
                            onClose={() => setReportsPersonId(null)}
                            onOpenPersonalInsights={() => { setInsightsModal(p); setReportsPersonId(null) }}
                            onOpenBringNeed={() => { setBringNeedModal(p); setReportsPersonId(null) }}
                            onOpenCustomReport={report => setCustomReportModal({ report, person: p })}
                          />
                        </td>
                      </tr>
                    )}
                    {deleteConfirm === p.id && (
                      <tr key={`${p.id}-del`}>
                        <td colSpan={6} className="px-4 py-2 bg-red-50 border-t border-red-100">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">Delete {p.name}? This will also remove all their worksheets and responses.</span>
                            <button onClick={() => handleDelete(p.id)} className="text-xs text-red-600 font-medium hover:underline">Yes, Delete</button>
                            <button onClick={() => setDeleteConfirm(null)} className="text-xs text-gray-500 hover:underline">Cancel</button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  )
}
