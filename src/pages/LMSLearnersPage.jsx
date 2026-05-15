import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'
import ResponseViewerModal from '../components/ResponseViewerModal'
import { getWorksheetPDFBlob } from '../lib/downloadWorksheetPDF'

function statusInfo(lmsResponses) {
  if (!lmsResponses || lmsResponses.length === 0) return { label: 'Pending', color: 'bg-gray-100 text-gray-600' }
  if (lmsResponses.some(r => r.submitted_at)) return { label: 'Submitted', color: 'bg-green-100 text-green-700' }
  return { label: 'In Progress', color: 'bg-amber-100 text-amber-700' }
}

function safeName(str) {
  return str.replace(/[/\\?%*:|"<>]/g, '-')
}

function ThemeGroup({ themeName, themeId, worksheets, onReload }) {
  const [collapsed, setCollapsed] = useState(false)
  const [viewModal, setViewModal] = useState(null) // { ws, responses }
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [reopenConfirm, setReopenConfirm] = useState(null)
  const [actionLoading, setActionLoading] = useState(null) // ws.id

  async function handleView(ws) {
    const { data: responses } = await supabase
      .from('lms_responses')
      .select('*')
      .eq('lms_worksheet_id', ws.id)
    setViewModal({ ws, responses: responses ?? [] })
  }

  async function handleDownloadPDF(ws) {
    setActionLoading(ws.id)
    const { data: responses } = await supabase
      .from('lms_responses')
      .select('*')
      .eq('lms_worksheet_id', ws.id)
    const session = { title: ws.theme.name, prompts: ws.theme.prompts }
    try {
      const blob = await getWorksheetPDFBlob(ws.people, session, responses ?? [])
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = safeName(`${ws.people.name} - ${ws.theme.name}.pdf`)
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF error:', err)
    }
    setActionLoading(null)
  }

  async function handleReopen(ws) {
    setActionLoading(ws.id)
    await supabase
      .from('lms_responses')
      .update({ submitted_at: null })
      .eq('lms_worksheet_id', ws.id)
    setReopenConfirm(null)
    setActionLoading(null)
    onReload()
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
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Top 5 Strengths</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {worksheets.map(ws => {
                const status = statusInfo(ws.lms_responses)
                const isSubmitted = status.label === 'Submitted'
                const loading = actionLoading === ws.id

                return (
                  <tr key={ws.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{ws.people.name}</td>
                    <td className="px-4 py-3 text-gray-500">{ws.people.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {(ws.people.top5 ?? []).map((s, i) => (
                          <span key={i} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* View */}
                        {isSubmitted && (
                          <button
                            onClick={() => handleView(ws)}
                            disabled={loading}
                            className="text-xs font-medium text-brand-500 hover:text-brand-700 disabled:opacity-60"
                          >
                            View
                          </button>
                        )}

                        {/* PDF */}
                        <button
                          onClick={() => handleDownloadPDF(ws)}
                          disabled={loading}
                          className="text-xs font-medium text-gray-600 hover:text-gray-900 disabled:opacity-60"
                        >
                          {loading ? '…' : '↓ PDF'}
                        </button>

                        {/* Reopen */}
                        {isSubmitted && (
                          reopenConfirm === ws.id ? (
                            <span className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">Reopen?</span>
                              <button
                                onClick={() => handleReopen(ws)}
                                disabled={loading}
                                className="text-xs font-medium text-amber-600 hover:underline disabled:opacity-60"
                              >Yes</button>
                              <button
                                onClick={() => setReopenConfirm(null)}
                                className="text-xs text-gray-400 hover:underline"
                              >No</button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setReopenConfirm(ws.id)}
                              disabled={loading}
                              className="text-xs font-medium text-amber-600 hover:text-amber-800 disabled:opacity-60"
                            >
                              Reopen
                            </button>
                          )
                        )}

                        {/* Delete */}
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
                            className="text-xs font-medium text-red-400 hover:text-red-600 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        )}
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
          onUnsubmit={() => handleUnsubmit(viewModal.ws.id)}
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
