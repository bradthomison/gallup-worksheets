import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Layout from '../components/Layout'

export default function DashboardPage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id, title, date, created_at,
          participants (
            id,
            responses ( submitted_at )
          )
        `)
        .order('date', { ascending: false })

      if (!error) setSessions(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  function submittedCount(session) {
    return session.participants.filter(p =>
      p.responses && p.responses.some(r => r.submitted_at)
    ).length
  }

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
        <Link
          to="/sessions/new"
          className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          + New Session
        </Link>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Loading…</p>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
          <p className="text-gray-500 mb-4">No sessions yet.</p>
          <Link to="/sessions/new" className="text-brand-500 font-medium hover:underline text-sm">
            Create your first session →
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => {
            const total = session.participants.length
            const submitted = submittedCount(session)
            return (
              <Link
                key={session.id}
                to={`/sessions/${session.id}`}
                className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-4 hover:border-brand-500 hover:shadow-sm transition-all"
              >
                <div>
                  <p className="font-semibold text-gray-900">{session.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {session.date ? new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">{total} participant{total !== 1 ? 's' : ''}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {submitted}/{total} submitted
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </Layout>
  )
}
