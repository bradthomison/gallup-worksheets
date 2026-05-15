import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import StrengthBadge from '../components/StrengthBadge'
import ResponseViewerModal from '../components/ResponseViewerModal'
import { getWorksheetPDFBlob, downloadBlankWorksheetPDF } from '../lib/downloadWorksheetPDF'

function statusInfo(lmsResponses) {
  if (!lmsResponses || lmsResponses.length === 0) return { label: 'Pending', color: 'text-gray-500 bg-gray-100' }
  if (lmsResponses.some(r => r.submitted_at)) return { label: 'Submitted', color: 'text-green-700 bg-green-50' }
  return { label: 'In Progress', color: 'text-amber-700 bg-amber-50' }
}

function dotColor(label) {
  if (label === 'Submitted') return 'bg-green-500'
  if (label === 'In Progress') return 'bg-amber-400'
  return 'bg-gray-400'
}

function safeName(str) {
  return str.replace(/[/\\?%*:|"<>]/g, '-')
}

function ThemeGroup({ themeName, themeId, worksheets, onReload }) {
  const [collapsed, setCollapsed] = useState(false)
  const [viewModal, setViewModal] = useState(null) // { ws, responses, isSubmitted }
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [actionLoading, setActionLoading] = useState(null) // ws.id
  const [copied, setCopied] = useState(null) // ws.id

  async function handleOpenStatus(ws) {
    const status = statusInfo(ws.lms_responses)
    if (status.label === 'Pending') return // nothing to show
    setActionLoading(ws.id)
    const { data: responses } = await supabase
      .from('lms_responses')
      .select('*')
      .eq('lms_worksheet_id', ws.id)
    setActionLoading(null)
    setViewModal({ ws, responses: responses ?? [], isSubmitted: status.label === 'Submitted' })
  }

  async function handleDownloadBlank(ws) {
    setActionLoading(ws.id)
    try {
      await downloadBlankWorksheetPDF(
        ws.people,
        { title: ws.theme.name, prompts: ws.theme.prompts }
      )
    } catch (err) {
      console.error('PDF error:', err)
    }
    setActionLoading(null)
  }

  async function copyUrl(wsId, slug) {
    await navigator.clipboard.writeText(`${window.location.origin}/lms-worksheet/${slug}`)
    setCopied(wsId)
    setTimeout(() => setCopied(null), 2000)
  }

  async function handleDelete(ws) {
    setActionLoading(ws.id)
    await supabase.from('lms_worksheets').delete().eq('id', ws.id)
    setDeleteConfirm(null)
    setActionLoading(null)
    onReload()
  }

  async function handleUnsubmit(wsId) {
    await supabase
      .from('lms_responses')
      .update({ submitted_at: null })
      .eq('lms_worksheet_id', wsId)
    setViewModal(null)
    onReload()
  }

  function makeDownloadPDF(ws, isSubmitted) {
    const label = isSubmitted ? '' : ' (In Progress)'
    return async () => {
      try {
        const blob = await getWorksheetPDFBlob(
          ws.people,
          { title: ws.theme.name, prompts: ws.theme.prompts },
          viewModal?.responses ?? []
        )
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = safeName(`${ws.people.name} - ${ws.theme.name}${label}.pdf`)
        a.click()
        URL.revokeObjectURL(url)
      } catch (err) {
        console.error('PDF error:', err)
      }
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Group header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${collapsed ? '' : 'rotate-90'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-semibold text-gray-900">{themeName}</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {worksheets.length} learner{worksheets.length !== 1 ? 's' : ''}
          </span>
        </div>
      </button>

      {!collapsed && (
        <div className="border-t border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left font-medium">Name</th>
                <th className="px-5 py-3 text-left font-medium">Top 5</th>
                <th className="px-5 py-3 text-left font-medium">Status</th>
                <th className="px-5 py-3 text-left font-medium">Worksheet URL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {worksheets.map(ws => {
                const status = statusInfo(ws.lms_responses)
                const isClickable = status.label !== 'Pending'
                const loading = actionLoading === ws.id

                return (
                  <tr key={ws.id} className="hover:bg-gray-50 transition-colors">
                    {/* Name + email */}
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{ws.people.name}</p>
                      <p className="text-xs text-gray-400">{ws.people.email}</p>
                    </td>

                    {/* Top 5 with colored badges */}
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        {(ws.people.top5 ?? []).map((s, i) => (
                          <StrengthBadge key={i} name={s} />
                        ))}
                      </div>
                    </td>

                    {/* Status — clickable for in_progress and submitted */}
                    <td className="px-5 py-3.5">
                      {isClickable ? (
                        <button
                          onClick={() => handleOpenStatus(ws)}
                          disabled={loading}
                          className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full transition-colors hover:opacity-80 disabled:opacity-60 ${status.color}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${dotColor(status.label)}`}></span>
                          {loading ? '…' : `${status.label} — View`}
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                          Pending
                        </span>
                      )}
                    </td>

                    {/* Worksheet URL */}
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1">
                        {/* Row 1: URL + Copy */}
                        <div className="flex items-center gap-2">
                          <a
                            href={`/lms-worksheet/${ws.worksheet_url_slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-brand-500 hover:underline truncate max-w-[140px]"
                          >
                            /lms-worksheet/{ws.worksheet_url_slug.slice(0, 8)}…
                          </a>
                          <button
                            onClick={() => copyUrl(ws.id, ws.worksheet_url_slug)}
                            className="shrink-0 text-xs text-gray-400 hover:text-gray-700 transition-colors"
                          >
                            {copied === ws.id ? '✓ Copied' : 'Copy'}
                          </button>
                        </div>
                        {/* Row 2: Blank + Delete */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDownloadBlank(ws)}
                            disabled={loading}
                            className="text-xs text-gray-400 hover:text-brand-500 transition-colors disabled:opacity-60"
                            title="Download blank print-ready worksheet"
                          >
                            {loading ? '…' : '↓ Blank'}
                          </button>
                          {deleteConfirm === ws.id ? (
                            <span className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">Delete?</span>
                              <button
                                onClick={() => handleDelete(ws)}
                                disabled={loading}
                                className="text-xs font-medium text-red-600 hover:underline disabled:opacity-60"
                              >Yes</button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-xs text-gray-400 hover:underline"
                              >No</button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(ws.id)}
                              disabled={loading}
                              className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-60"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Response viewer modal */}
      {viewModal && (
        <ResponseViewerModal
          participant={viewModal.ws.people}
          session={{ title: viewModal.ws.theme.name, prompts: viewModal.ws.theme.prompts }}
          responses={viewModal.responses}
          onClose={() => setViewModal(null)}
          onUnsubmit={viewModal.isSubmitted ? () => handleUnsubmit(viewModal.ws.id) : undefined}
          onDownloadPDF={makeDownloadPDF(viewModal.ws, viewModal.isSubmitted)}
        />
      )}
    </div>
  )
}

export default function LMSLearnersPage() {
  const [worksheets, setWorksheets] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await supabase
      .from('lms_worksheets')
      .select('id, worksheet_url_slug, created_at, people:people_id(id, name, email, top5), theme:theme_id(id, name, prompts), lms_responses(id, submitted_at)')
      .order('created_at', { ascending: false })
    setWorksheets(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Group by theme id
  const groups = []
  const seen = {}
  ;(worksheets ?? []).forEach(ws => {
    const tid = ws.theme?.id
    if (!tid) return
    if (!seen[tid]) {
      seen[tid] = { themeId: tid, themeName: ws.theme.name, worksheets: [] }
      groups.push(seen[tid])
    }
    seen[tid].worksheets.push(ws)
  })

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">LMS Learners</h1>
        <p className="text-sm text-gray-500 mt-1">Worksheets created through your Acorn course links.</p>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : groups.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <p className="text-gray-500 mb-1">No LMS worksheets yet.</p>
          <p className="text-sm text-gray-400">Share an Acorn Course Link from the Themes page to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map(g => (
            <ThemeGroup
              key={g.themeId}
              themeId={g.themeId}
              themeName={g.themeName}
              worksheets={g.worksheets}
              onReload={load}
            />
          ))}
        </div>
      )}
    </Layout>
  )
}
